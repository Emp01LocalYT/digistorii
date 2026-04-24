import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db"; 
import { getTenantSchema } from "@/lib/tenant"; 

export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);

   
    const result = await pool.query(`
      SELECT 
        sh.id,
        sh.sales_no,
        sh.status,
        sd.id AS detail_id,
        sd.rate as price,
        p.product_code AS product_code,
        p.name AS product_name,
        p.category as category
      FROM ${schema}.sales_header sh
      JOIN ${schema}.sales_detail sd ON sh.id = sd.sales_id
      JOIN ${schema}.products p ON sd.product_id = p.id
      ORDER BY sh.id DESC
      LIMIT 5
    `);


    return NextResponse.json({
      success: true,
      data: result.rows,
    });

  } catch (err: any) {
    console.error("Recent Orders Error:", err);

    if (err.code === "42P01") {
      return NextResponse.json(
        { success: false, error: "Table not found in schema" },
        { status: 500 }
      );
    }

    if (err.code === "28P01") {
      return NextResponse.json(
        { success: false, error: "Database authentication failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Database query failed",
      },
      { status: 500 }
    );
  }
}