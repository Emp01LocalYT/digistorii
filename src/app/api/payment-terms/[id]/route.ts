import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;
const typeValues = ["immediate", "days", "month"] as const;

const paymentTermsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(typeValues),
  days: z.union([z.number(), z.null(), z.undefined()]).optional(),
  month: z.union([z.number(), z.null(), z.undefined()]).optional(),
  description: z.string().optional().nullable(),
});

type PaymentTermsInput = z.infer<typeof paymentTermsSchema>;

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizePayload(data: PaymentTermsInput) {
  const name = data.name.trim();
  const type = data.type;
  const description = data.description?.trim() ? data.description.trim() : null;
  const rawDays = data.days === null || data.days === undefined ? null : Number(data.days);
  const rawMonth = data.month === null || data.month === undefined ? null : Number(data.month);

  if (type === "immediate") {
    return { name, type, days: null as number | null, month: null as number | null, description };
  }
  if (type === "days") {
    if (!rawDays || rawDays < 1 || rawDays > 30) {
      throw new Error("Select valid days between 1 and 30");
    }
    return { name, type, days: rawDays, month: null as number | null, description };
  }
  if (!rawMonth || rawMonth < 1 || rawMonth > 30) {
    throw new Error("Select valid month day between 1 and 30");
  }
  return { name, type, days: null as number | null, month: rawMonth, description };
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
      `SELECT id, name, type, days, month, description, created_at, updated_at
       FROM "${schema}".payment_terms
       WHERE id = $1`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Payment term not found" }, { status: 404 });
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
    const parsed = paymentTermsSchema.parse(body);
    const normalized = normalizePayload(parsed);

    const result = await client.query(
      `UPDATE "${schema}".payment_terms
       SET name = $1, type = $2, days = $3, month = $4, description = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, type, days, month, description, created_at, updated_at`,
      [normalized.name, normalized.type, normalized.days, normalized.month, normalized.description, recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Payment term not found" }, { status: 404 });
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
      `DELETE FROM "${schema}".payment_terms WHERE id = $1 RETURNING id`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Payment term not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
