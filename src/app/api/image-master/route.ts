import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  deleteImageMasterFile,
  sanitizeFilename,
  toTenantKey,
} from "@/lib/image-master";
import { getTenantSchema } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const result = await client.query(
      `
        SELECT
          im.id,
          im.filename,
          im.file_path,
          c.category_name,
          m.material_name,
          u.uom_name,
          im.source,
          im.created_at
        FROM "${schema}".image_master im
        LEFT JOIN "${schema}".product_categories c ON im.category_id = c.id
        LEFT JOIN "${schema}".product_materials m ON im.material_id = m.id
        LEFT JOIN "${schema}".uom u ON im.uom_id = u.id
        ORDER BY im.created_at DESC
      `
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to list images" }, { status: 400 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { company } = await getTenantSchema(req);
    const filename = String(req.nextUrl.searchParams.get("filename") || "").trim();
    const tenant = toTenantKey(company);
    const safeName = sanitizeFilename(filename);

    await deleteImageMasterFile(tenant, safeName);
    return NextResponse.json({ success: true, message: "Image deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to delete image" }, { status: 400 });
  }
}
