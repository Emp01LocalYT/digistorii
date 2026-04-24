import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);

    const sales = await pool.query(`
      SELECT COALESCE(SUM(total_amount),0) as total FROM ${schema}.sales_header
    `);

    const purchase = await pool.query(`
      SELECT COALESCE(SUM(total_amount),0) as total FROM ${schema}.purchase_header
    `);

    return NextResponse.json({
      success: true,
      data: {
        sales: Number(sales.rows[0].total),
        purchase: Number(purchase.rows[0].total),
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}