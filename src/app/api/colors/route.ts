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

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const result = await client.query(
      `
        SELECT id, color_name, hex_code, created_at
        FROM "${schema}".product_colors
        ORDER BY color_name ASC
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
    const parsed: ColorInput = colorSchema.parse(body);

    const result = await client.query(
      `
        INSERT INTO "${schema}".product_colors
          (color_name, hex_code, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id, color_name, hex_code, created_at
      `,
      [parsed.color_name.trim(), parsed.hex_code.trim()]
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
