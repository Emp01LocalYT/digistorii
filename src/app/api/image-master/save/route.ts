import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const imageSchema = z.object({
  filename: z.string().trim().min(1),
  file_path: z.string().trim().min(1),
  category_id: z.number().int().positive(),
  material_id: z.number().int().positive(),
  uom_id: z.number().int().positive(),
  source: z.enum(["vendor", "own"]),
});

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ success: false, error: "Payload must be a non-empty array" }, { status: 400 });
    }

    const parsed = body.map((row) => imageSchema.parse(row));

    await client.query("BEGIN");
    for (const row of parsed) {
      await client.query(
        `
          INSERT INTO "${schema}".image_master
            (filename, file_path, category_id, material_id, uom_id, source, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          row.filename,
          row.file_path,
          row.category_id,
          row.material_id,
          row.uom_id,
          row.source,
        ]
      );
    }
    await client.query("COMMIT");

    return NextResponse.json({ success: true, count: parsed.length });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to save images" }, { status: 400 });
  } finally {
    client.release();
  }
}
