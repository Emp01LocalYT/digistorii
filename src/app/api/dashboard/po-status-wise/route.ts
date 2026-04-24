import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);

    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM ${schema}.purchase_header
      GROUP BY status
    `);

    const total = result.rows.reduce(
      (sum, r) => sum + Number(r.count),
      0
    );

    const data = result.rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      percentage: total ? (r.count / total) * 100 : 0,
    }));

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}