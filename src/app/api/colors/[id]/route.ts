import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const colorSchema = z.object({
  color_name: z.string().trim().min(1, "Color name is required"),
  hex_code: z.string().trim().min(1, "Hex code is required"),
});

type ColorInput = z.infer<typeof colorSchema>;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const { id } = await params;
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed: ColorInput = colorSchema.parse(body);

    const result = await client.query(
      `
        UPDATE "${schema}".product_colors
        SET color_name = $1, hex_code = $2
        WHERE id = $3
        RETURNING id, color_name, hex_code, created_at
      `,
      [parsed.color_name.trim(), parsed.hex_code.trim(), Number(id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Color not found" }, { status: 404 });
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
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const { id } = await params;
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const result = await client.query(
      `
        DELETE FROM "${schema}".product_colors
        WHERE id = $1
        RETURNING id
      `,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Color not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Color deleted successfully" });
  } catch (error: any) {
    if (error.code === '23503') { // foreign_key_violation
      return NextResponse.json({ success: false, error: "Cannot delete color as it is being used." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
