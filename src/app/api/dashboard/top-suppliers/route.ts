import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);

    const result = await pool.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        SUM(ph.total_amount) as total_amount
      FROM ${schema}.purchase_header ph
      JOIN ${schema}.suppliers s ON s.id = ph.supplier_id
      GROUP BY s.id, s.name
      ORDER BY total_amount DESC
      LIMIT 5
    `);

    const total = result.rows.reduce(
      (sum, r) => sum + Number(r.total_amount),
      0
    );

    const data = result.rows.map((r) => ({
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      total_amount: Number(r.total_amount),
      percentage: total ? (r.total_amount / total) * 100 : 0,
    }));

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}