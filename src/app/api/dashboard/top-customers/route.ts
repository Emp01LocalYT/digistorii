import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);

    const result = await pool.query(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        SUM(sh.total_amount) as total_amount
      FROM ${schema}.sales_header sh
      JOIN ${schema}.customers c ON c.id = sh.customer_id
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
      LIMIT 5
    `);

    const total = result.rows.reduce(
      (sum, r) => sum + Number(r.total_amount),
      0
    );

    const data = result.rows.map((r) => ({
      customer_id: r.customer_id,
      customer_name: r.customer_name,
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