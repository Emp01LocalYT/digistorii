import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const fittingSchema = z.object({
  fitting_name: z.string().trim().min(1, "Fitting name is required"),
});

type FittingInput = z.infer<typeof fittingSchema>;

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const { id } = params;
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed: FittingInput = fittingSchema.parse(body);

    const result = await client.query(
      `
        UPDATE "${schema}".product_fittings
        SET fitting_name = $1
        WHERE id = $2
        RETURNING id, fitting_name, created_at
      `,
      [parsed.fitting_name.trim(), Number(id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Fitting not found" }, { status: 404 });
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
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const { id } = params;
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const result = await client.query(
      `
        DELETE FROM "${schema}".product_fittings
        WHERE id = $1
        RETURNING id
      `,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Fitting not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Fitting deleted successfully" });
  } catch (error: any) {
    if (error.code === '23503') { // foreign_key_violation
      return NextResponse.json({ success: false, error: "Cannot delete fitting as it is being used." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
