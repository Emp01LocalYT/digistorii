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

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const result = await client.query(
      `SELECT
        id, locator_name, row, rack, bin, effective_from, effective_to,
        warehouse_id, type, max_qty, current_qty, suggested_qty, description,
        created_at, updated_at
       FROM "${schema}".locators
       WHERE id = $1`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Locator not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
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
      `UPDATE "${schema}".locators
       SET
        locator_name = $1,
        row = $2,
        rack = $3,
        bin = $4,
        effective_from = $5,
        effective_to = $6,
        warehouse_id = $7,
        type = $8,
        max_qty = $9,
        current_qty = $10,
        suggested_qty = $11,
        description = $12,
        updated_at = NOW()
       WHERE id = $13
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
        recordId,
      ]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Locator not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Update failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM "${schema}".locators WHERE id = $1 RETURNING id`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Locator not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
