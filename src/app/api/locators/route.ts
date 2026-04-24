import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;
const typeValues = [
  "receiving",
  "main_storage",
  "bulk_storage",
  "despatch",
  "return_area",
  "scrap",
] as const;

const locatorSchema = z.object({
  row: z.string().trim().min(1, "Row is required"),
  rack: z.string().trim().min(1, "Rack is required"),
  bin: z.string().trim().min(1, "Bin is required"),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  warehouse_id: z.union([z.number(), z.string()]),
  type: z.enum(typeValues),
  max_qty: z.union([z.number(), z.string()]).optional(),
  current_qty: z.union([z.number(), z.string()]).optional(),
  suggested_qty: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional().nullable(),
});

type LocatorInput = z.infer<typeof locatorSchema>;

function asNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function parseWarehouseId(value: string | number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseQty(value?: string | number) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildLocatorName(row: string, rack: string, bin: string) {
  return `R${row}-RK${rack}-B${bin}`;
}

function normalizePayload(data: LocatorInput) {
  const row = data.row.trim();
  const rack = data.rack.trim();
  const bin = data.bin.trim();

  return {
    row,
    rack,
    bin,
    locator_name: buildLocatorName(row, rack, bin),
    effective_from: asNull(data.effective_from),
    effective_to: asNull(data.effective_to),
    warehouse_id: parseWarehouseId(data.warehouse_id),
    type: data.type,
    max_qty: parseQty(data.max_qty),
    current_qty: parseQty(data.current_qty),
    suggested_qty: parseQty(data.suggested_qty),
    description: asNull(data.description),
  };
}

async function ensureWarehouse(client: any, schema: string, warehouseId: number) {
  const result = await client.query(
    `SELECT id FROM "${schema}".warehouses WHERE id = $1`,
    [warehouseId]
  );
  return result.rowCount ? true : false;
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const result = await client.query(
      `SELECT
        l.id, l.locator_name, l.row, l.rack, l.bin,
        l.effective_from, l.effective_to, l.warehouse_id, l.type,
        l.max_qty, l.current_qty, l.suggested_qty, l.description,
        l.created_at, l.updated_at,
        w.name AS warehouse_name
       FROM "${schema}".locators l
       LEFT JOIN "${schema}".warehouses w ON l.warehouse_id = w.id
       ORDER BY l.id DESC`
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = locatorSchema.parse(body);
    const payload = normalizePayload(parsed);

    if (!payload.warehouse_id) {
      return NextResponse.json({ success: false, error: "Warehouse is required" }, { status: 400 });
    }

    const warehouseExists = await ensureWarehouse(client, schema, payload.warehouse_id);
    if (!warehouseExists) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 400 });
    }

    const result = await client.query(
      `INSERT INTO "${schema}".locators
       (
        locator_name, row, rack, bin, effective_from, effective_to,
        warehouse_id, type, max_qty, current_qty, suggested_qty, description,
        created_at, updated_at
       )
       VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        NOW(), NOW()
       )
       RETURNING id, locator_name, row, rack, bin, effective_from, effective_to,
        warehouse_id, type, max_qty, current_qty, suggested_qty, description,
        created_at, updated_at`,
      [
        payload.locator_name,
        payload.row,
        payload.rack,
        payload.bin,
        payload.effective_from,
        payload.effective_to,
        payload.warehouse_id,
        payload.type,
        payload.max_qty,
        payload.current_qty,
        payload.suggested_qty,
        payload.description,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
