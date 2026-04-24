import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import { ensureCurrenciesSeeded } from "@/lib/currencySeed";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const createSchema = z.object({
  currency_code: z.string().trim().min(1, "Currency code is required"),
  currency_name: z.string().trim().min(1, "Currency name is required"),
});

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    await ensureCurrenciesSeeded(client, schema);

    const result = await client.query(
      `
        SELECT id, currency_code, currency_name
        FROM "${schema}".currencies
        ORDER BY currency_code ASC
      `
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
    const parsed = createSchema.parse(body);
    const code = parsed.currency_code.trim();
    const name = parsed.currency_name.trim();

    const duplicate = await client.query(
      `SELECT id FROM "${schema}".currencies WHERE lower(currency_code) = lower($1) LIMIT 1`,
      [code]
    );
    if (duplicate.rowCount) {
      return NextResponse.json({ success: false, error: "Currency code already exists" }, { status: 409 });
    }

    const result = await client.query(
      `
        INSERT INTO "${schema}".currencies (currency_code, currency_name)
        VALUES ($1, $2)
        RETURNING id, currency_code, currency_name
      `,
      [code, name]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "Currency code already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
