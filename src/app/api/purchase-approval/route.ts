import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);

    const res = await pool.query(`
      SELECT 
        ph.*,
        s.supplier_code,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone
      FROM ${schema}.purchase_header ph
      LEFT JOIN ${schema}.suppliers s
        ON ph.supplier_id = s.id
      ORDER BY ph.id DESC
    `);

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}