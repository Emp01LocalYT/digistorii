import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const result = await client.query(
      `
        SELECT
          id::int,
          tax_name,
          total_percentage,
          effective_from,
          effective_to,
          is_active
        FROM "${schema}".tax_master
        WHERE is_active = TRUE
        ORDER BY id
      `
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch tax master" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
