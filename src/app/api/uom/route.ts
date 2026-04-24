import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const uomSchema = z.object({
  uom_code: z.string().trim().min(1, "UOM Code is required"),
  uom_name: z.string().trim().min(1, "UOM Name is required"),
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
      `SELECT id, uom_code, uom_name, created_at, updated_at
       FROM "${schema}".uom
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
    const parsed = uomSchema.parse(body);
    const uomCode = clean(parsed.uom_code);
    const uomName = clean(parsed.uom_name);

    const duplicate = await client.query(
      `SELECT id FROM "${schema}".uom WHERE lower(uom_code) = lower($1) LIMIT 1`,
      [uomCode]
    );
    if (duplicate.rowCount) {
      return NextResponse.json({ success: false, error: "UOM Code already exists" }, { status: 409 });
    }

    const result = await client.query(
      `INSERT INTO "${schema}".uom (uom_code, uom_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, uom_code, uom_name, created_at, updated_at`,
      [uomCode, uomName]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "UOM Code already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
