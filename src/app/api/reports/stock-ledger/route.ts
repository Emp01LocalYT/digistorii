import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({
        success: false,
        message: "From Date and To Date required"
      }, { status: 400 });
    }

    if (new Date(from) > new Date(to)) {
      return NextResponse.json({
        success: false,
        message: "Invalid date range"
      }, { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT
        sl.txn_date,
        sl.txn_type,
        sl.ref_type,
        sl.ref_id,
        sl.ref_line_id,
        COALESCE(os.doc_no, gh.grn_no, sh.sales_no, sl.ref_id::text) AS document_no,
        w.name AS warehouse_name,
        l.locator_name,
        pv.sku,
        p.name AS product_name,
        sl.qty_in,
        sl.qty_out
      FROM "${schema}".stock_ledger sl
      LEFT JOIN "${schema}".warehouses w ON w.id = sl.warehouse_id
      LEFT JOIN "${schema}".locators l ON l.id = sl.locator_id
      LEFT JOIN "${schema}".product_variants pv ON pv.id = sl.product_id
      LEFT JOIN "${schema}".products p ON p.id = pv.product_id
      LEFT JOIN "${schema}".opening_stock os
        ON os.id = sl.ref_id AND sl.ref_type = 'opening_stock'
      LEFT JOIN "${schema}".grn_header gh
        ON gh.id = sl.ref_id AND sl.ref_type = 'grn_header'
      LEFT JOIN "${schema}".sales_header sh
        ON sh.id = sl.ref_id AND sl.ref_type = 'sales_header'
      WHERE sl.txn_date BETWEEN $1 AND $2
      ORDER BY sl.txn_date DESC, sl.id DESC
      `,
      [from, to]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error("Stock Ledger Report Error:", err);
    return NextResponse.json({
      success: false,
      message: "Database error occurred while fetching report"
    }, { status: 500 });
  }
}
