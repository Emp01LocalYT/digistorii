import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);

    const result = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name AS product_name,
        SUM(sd.qty) as qty,
        SUM(sd.line_total) as total_amount
      FROM ${schema}.sales_detail sd
      JOIN ${schema}.products p ON p.id = sd.product_id
      GROUP BY p.id, p.name
      ORDER BY qty DESC
      LIMIT 5
    `);

    const totalQty = result.rows.reduce(
  (sum, r) => sum + Number(r.qty),
  0
);

    const data = result.rows.map((r) => ({
  product_id: r.product_id,
  product_name: r.product_name,
  qty: Number(r.qty),
  total_amount: Number(r.total_amount),
  percentage: totalQty ? (r.qty / totalQty) * 100 : 0,
}));

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error("Top Selling Products Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}