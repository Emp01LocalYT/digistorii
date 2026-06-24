import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const materialSchema = z.object({
  material_code: z.string().trim().min(1, "Material code is required"),
  material_name: z.string().trim().min(1, "Material name is required"),
});
function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
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
      return NextResponse.json({ success: false, error: "Invalid material id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = materialSchema.parse(body);
    const materialCode = parsed.material_code.trim();
    const materialName = parsed.material_name.trim();


    const result = await client.query(
      `
        UPDATE "${schema}".product_materials
        SET material_code = $1, material_name = $2
        WHERE id = $3
        RETURNING id, material_code, material_name, created_at
      `,
      [materialCode, materialName, recordId]
    );

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

export async function DELETE(req: NextRequest, 
  context: { params: Promise<{ id: string }> }) {
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


    await client.query(`DELETE FROM "${schema}".product_materials WHERE id = $1`, [recordId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
