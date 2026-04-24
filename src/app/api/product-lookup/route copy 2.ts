import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
 
export async function GET(req: NextRequest) {
  const client = await pool.connect();
 
  try {
    const { company, schema } = await getTenantSchema(req);
 
    const type = req.nextUrl.searchParams.get("type"); // "products" or "taxes"
 
    let result;
    if (type === "uoms") {
      result = await client.query(`
        SELECT
          id::int,
          uom_code,
          uom_name
        FROM "${schema}".uom
        ORDER BY id
      `);
      return NextResponse.json({ success: true, data: result.rows });
    }else if (type === "taxes") {
      result = await client.query(`
        SELECT
          id::int,
          tax_name,
          total_percentage,
          effective_from,
          effective_to,
          is_active
        FROM "${schema}".tax_master
        WHERE is_active = TRUE
        ORDER BY id
      `);
      return NextResponse.json({ success: true, data: result.rows });
    } else if(type === "polist"){
 
         result = await client.query(
      `
      SELECT
      h.id as purchase_id,
      h.purchase_no,
      h.supplier_id,
      h.status as po_status,
      h.approval_status,
      s.supplier_code,
      s.name as supplier_name
    FROM ${schema}.purchase_header h
    LEFT JOIN ${schema}.suppliers s
      ON h.supplier_id = s.id
    WHERE h.approval_status ='Approved'
    ORDER BY h.id DESC
      `
    );
 
    return NextResponse.json(result.rows);
 
    }else if (type === "poitems") {
  const poId = req.nextUrl.searchParams.get("po_id");
  if (!poId) return NextResponse.json({ success: false, message: "PO ID required" }, { status: 400 });
 
  const result = await client.query(
    `
    SELECT  ph.status as po_status,d.id AS detail_id,d.product_id,p.product_code,p.name AS product_name,
    p.description,
    d.uom,d.hsn_no,d.qty AS order_qty,
    COALESCE(SUM(gd.qty),0) AS received_qty
FROM ${schema}.purchase_detail d
LEFT JOIN ${schema}.purchase_header ph
    ON ph.id = d.purchase_id
LEFT JOIN ${schema}.products p
ON p.id::text = d.product_id::text
LEFT JOIN ${schema}.grn_detail gd
ON gd.product_id::text = d.product_id::text
AND gd.order_qty = d.qty
AND gd.grn_id IN (
    SELECT id FROM ${schema}.grn_header
    WHERE purchase_id = d.purchase_id
)
WHERE d.purchase_id = $1
GROUP BY d.id,d.product_id,p.product_code,p.name,d.uom,d.hsn_no,d.qty,ph.status
HAVING (d.qty - COALESCE(SUM(gd.qty),0)) > 0
ORDER BY d.id
    `,
    [poId]
  );
 
  return NextResponse.json({ success: true, items: result.rows });
}else {
         result = await client.query(
      `
      SELECT
        p.id::int AS id,
        p.product_code,
        p.name AS product_name,
        p.description,
        p.category,
        p.material,
        p.uom,
        p.hsn_code,
        p.weight,
        p.length,
        u.uom_name,u.uom_code
      FROM "${schema}".products p
       LEFT JOIN "${schema}".uom u
        ON u.id::text = p.uom
      WHERE p.status = 1
      ORDER BY p.id
      `
      
    );
 
    return NextResponse.json(result.rows);
    }
 
 
   
} catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch products" },
      { status: 400 }
    );  
} finally {
    client.release();
  }
}