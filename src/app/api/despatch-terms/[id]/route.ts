import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const despatchSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  despatch_name: z.string().trim().min(1, "Despatch Name is required"),
});

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
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
      `SELECT id, code, despatch_name, created_at, updated_at
       FROM "${schema}".despatch_terms
       WHERE id = $1`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Despatch term not found" }, { status: 404 });
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
    const parsed = despatchSchema.parse(body);
    const code = parsed.code.trim();
    const despatchName = parsed.despatch_name.trim();

    const duplicate = await client.query(
      `SELECT id FROM "${schema}".despatch_terms
       WHERE lower(code) = lower($1) AND id <> $2
       LIMIT 1`,
      [code, recordId]
    );
    if (duplicate.rowCount) {
      return NextResponse.json({ success: false, error: "Code already exists" }, { status: 409 });
    }

    const result = await client.query(
      `UPDATE "${schema}".despatch_terms
       SET code = $1, despatch_name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, code, despatch_name, created_at, updated_at`,
      [code, despatchName, recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Despatch term not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "Code already exists" }, { status: 409 });
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
      `DELETE FROM "${schema}".despatch_terms WHERE id = $1 RETURNING id`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Despatch term not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
