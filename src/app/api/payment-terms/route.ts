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

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const result = await client.query(
      `SELECT id, name, type, days, month, description, created_at, updated_at
       FROM "${schema}".payment_terms
       ORDER BY id DESC`
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
    const parsed = paymentTermsSchema.parse(body);
    const normalized = normalizePayload(parsed);

    const result = await client.query(
      `INSERT INTO "${schema}".payment_terms
       (name, type, days, month, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, type, days, month, description, created_at, updated_at`,
      [normalized.name, normalized.type, normalized.days, normalized.month, normalized.description]
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
