import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const billId = Number(id);
    if (!Number.isFinite(billId)) {
      return NextResponse.json({ success: false, error: "Invalid bill id" }, { status: 400 });
    }

    const headerRes = await client.query(
      `
        SELECT
          sh.sales_no,
          sh.sales_date,
          sh.subtotal,
          sh.tax_amount,
          sh.total_amount,
          c.name AS customer_name,
          c.email AS customer_email,
          c.phone AS customer_phone,
          CONCAT_WS(', ', ca.address_line1, ca.address_line2, ca.city, ca.state, ca.pincode) AS customer_address
        FROM ${schema}.sales_header sh
        LEFT JOIN ${schema}.customers c ON sh.customer_id = c.id
        LEFT JOIN ${schema}.customer_addresses ca ON c.id = ca.customer_id
        WHERE sh.id = $1
      `,
      [billId]
    );

    if (!headerRes.rows.length) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    const detailsRes = await client.query(
      `
        SELECT
          d.id,
          d.qty,
          d.rate,
          d.discount AS discount_amount,
          d.tax_amount,
          d.line_total,
          tr.id AS tax_id,
          tr.total_percentage AS tax_percent,
          p.name AS product_name
        FROM ${schema}.sales_detail d
        LEFT JOIN "${schema}".product_variants pv
          ON pv.id::text = d.product_id::text
        LEFT JOIN ${schema}.products p
          ON p.id::text = COALESCE(pv.product_id, d.product_id)::text
        LEFT JOIN ${schema}.tax_master tr
          ON tr.id = d.tax_master_id
        WHERE d.sales_id = $1
        ORDER BY d.id
      `,
      [billId]
    );

    const detailRows = detailsRes.rows || [];
    const taxIds = Array.from(
      new Set(
        detailRows
          .map((row: any) => Number(row.tax_id))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );

    let taxComponentsById = new Map<number, Array<{ component_name: string; component_percentage: number }>>();
    if (taxIds.length) {
      const componentsRes = await client.query(
        `
          SELECT
            tax_master_id,
            component_name,
            component_percentage
          FROM "${schema}".tax_component
          WHERE tax_master_id = ANY($1::int[])
          ORDER BY id
        `,
        [taxIds]
      );
      taxComponentsById = componentsRes.rows.reduce((map, row) => {
        const taxId = Number(row.tax_master_id);
        if (!map.has(taxId)) map.set(taxId, []);
        map.get(taxId)!.push({
          component_name: row.component_name,
          component_percentage: Number(row.component_percentage || 0),
        });
        return map;
      }, new Map<number, Array<{ component_name: string; component_percentage: number }>>());
    }

    const details = detailRows.map((row: any) => ({
      product_name: row.product_name,
      qty: Number(row.qty || 0),
      rate: Number(row.rate || 0),
      discount_amount: Number(row.discount_amount || 0),
      tax_percent: Number(row.tax_percent || 0),
      tax_amount: Number(row.tax_amount || 0),
      line_total: Number(row.line_total || 0),
      tax_components: taxComponentsById.get(Number(row.tax_id)) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        header: headerRes.rows[0],
        details,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch bill" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
