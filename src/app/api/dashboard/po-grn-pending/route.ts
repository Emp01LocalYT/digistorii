import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);

    // MAIN QUERY (PO LEVEL AGGREGATION)
    const result = await pool.query(`
      WITH purchase_qty AS (
  SELECT 
    pd.purchase_id,
    pd.product_id,
    SUM(pd.qty) AS purchase_qty
  FROM ${schema}.purchase_header ph
  JOIN ${schema}.purchase_detail pd
  ON pd.purchase_id = ph.id
  WHERE ph.approval_status='Approved'
  GROUP BY pd.purchase_id, pd.product_id
),
grn_qty AS (
  SELECT 
    gh.purchase_id,
    gd.product_id,
    SUM(gd.qty) AS grn_qty
  FROM ${schema}.grn_header gh
  JOIN ${schema}.grn_detail gd 
    ON gd.grn_id = gh.id
  GROUP BY gh.purchase_id, gd.product_id
),
final_calc AS (
  SELECT 
    p.purchase_id,
    p.product_id,
    p.purchase_qty,
    COALESCE(g.grn_qty, 0) AS received_qty,
    (p.purchase_qty - COALESCE(g.grn_qty, 0)) AS pending_qty
  FROM purchase_qty p
  LEFT JOIN grn_qty g
    ON g.purchase_id = p.purchase_id
   AND g.product_id = p.product_id
)
SELECT 
  ph.id AS purchase_id,
  ph.purchase_no,
  ph.purchase_date,
  ph.status AS po_status,
  s.id AS supplier_id,
  s.supplier_code,
  s.name AS supplier_name,
  SUM(f.purchase_qty) AS total_qty,
  SUM(f.received_qty) AS received_qty,
  SUM(f.pending_qty) AS pending_qty
FROM ${schema}.purchase_header ph
JOIN final_calc f 
  ON f.purchase_id = ph.id
LEFT JOIN ${schema}.suppliers s 
  ON ph.supplier_id = s.id
WHERE ph.status IN ('Approved', 'Partial')
GROUP BY 
  ph.id,
  ph.purchase_no,
  ph.purchase_date,
  ph.status,
  s.id,
  s.supplier_code,
  s.name
HAVING SUM(f.pending_qty) > 0
ORDER BY ph.id DESC;
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });

  } catch (err: any) {
    console.error("PO-GRN Pending Error:", err);

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