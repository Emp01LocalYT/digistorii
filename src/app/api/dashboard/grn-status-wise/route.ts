import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
    try {
        const { schema } = await getTenantSchema(req);
        const result = await pool.query(`
      WITH purchase_qty AS (
  SELECT ph.id, SUM(pd.qty) AS purchase_qty
  FROM ${schema}.purchase_header ph
  JOIN ${schema}.purchase_detail pd 
    ON pd.purchase_id = ph.id
  WHERE ph.approval_status = 'Approved'
  GROUP BY ph.id
),
grn_qty AS (
  SELECT gh.purchase_id, SUM(gd.qty) AS grn_qty
  FROM ${schema}.grn_header gh
  JOIN ${schema}.grn_detail gd 
    ON gd.grn_id = gh.id
  GROUP BY gh.purchase_id
),
status_calc AS (
  SELECT 
    p.id,
    p.purchase_qty,
    COALESCE(g.grn_qty, 0) AS grn_qty,
    CASE
      /* WHEN COALESCE(g.grn_qty, 0) = 0 THEN 'Pending'*/
      WHEN COALESCE(g.grn_qty, 0) < p.purchase_qty THEN 'Partial'
      ELSE 'Completed'
    END AS status
  FROM purchase_qty p
  LEFT JOIN grn_qty g 
    ON g.purchase_id = p.id
)
SELECT 
  status,COUNT(*) AS count,SUM(purchase_qty) AS total_purchase_qty,
  SUM(grn_qty) AS total_grn_qty,
  ROUND(sum(grn_qty) * 100.0 / sum(purchase_qty),2) AS completion_percentage
FROM status_calc
GROUP BY status
ORDER BY completion_percentage DESC;
    `);

        const total = result.rows.reduce(
            (sum, r) => sum + Number(r.count),
            0
        );

        const data = result.rows.map((r) => ({
            status: r.status,
            count: Number(r.count),
            total_purchase_qty: Number(r.total_purchase_qty),
            total_grn_qty: Number(r.total_grn_qty),
            completion_percentage: Number(r.completion_percentage),
        }));

        return NextResponse.json({ success: true, data });

    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}