import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const paymentModeSchema = z.object({
  payment_mode_name: z.string().trim().min(1, "Payment Mode Name is required"),
});

function clean(value: string): string {
  return value.trim();
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
         id,
         name AS payment_mode_name,
         is_default,
         is_active,
         created_at,
         updated_at
       FROM "${schema}".payment_modes
       ORDER BY id DESC`
    );
    console.log("payment mode opened")

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
    const parsed = paymentModeSchema.parse(body);
    const paymentModeName = clean(parsed.payment_mode_name);

    const duplicate = await client.query(
      `SELECT id FROM "${schema}".payment_modes WHERE lower(name) = lower($1) LIMIT 1`,
      [paymentModeName]
    );
    if (duplicate.rowCount) {
      return NextResponse.json({ success: false, error: "Payment Mode Name already exists" }, { status: 409 });
    }

    const result = await client.query(
      `INSERT INTO "${schema}".payment_modes (name, is_default, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING
         id,
         name AS payment_mode_name,
         is_default,
         is_active,
         created_at,
         updated_at`,
      [paymentModeName, body.is_default, body.is_active]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "Payment Mode Name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
