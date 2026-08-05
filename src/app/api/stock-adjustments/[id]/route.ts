import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const adjustmentId = Number(id);

    if (isNaN(adjustmentId)) {
      return NextResponse.json({ success: false, error: "Invalid adjustment ID" }, { status: 400 });
    }

    const headerRes = await client.query(
      `
        SELECT
          sa.id AS adjustment_id,
          sa.txn_date,
          sa.reason,
          sa.created_by,
          sa.created_at,
          w.name AS warehouse_name,
          l.locator_name
        FROM "${schema}".stock_adjustments sa
        LEFT JOIN "${schema}".warehouses w ON w.id = sa.warehouse_id
        LEFT JOIN "${schema}".locators l ON l.id = sa.locator_id
        WHERE sa.tenant_id = $1 AND sa.id = $2
      `,
      [company, adjustmentId]
    );

    if (headerRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Stock adjustment not found" }, { status: 404 });
    }

    const header = headerRes.rows[0];

    const itemsRes = await client.query(
      `
        SELECT
          sai.id AS item_id,
          sai.system_qty,
          sai.physical_qty,
          sai.adjustment_qty,
          p.name AS product_name,
          pv.sku,
          pc.color_name AS color
        FROM "${schema}".stock_adjustment_items sai
        LEFT JOIN "${schema}".product_variants pv ON pv.id = sai.product_id
        LEFT JOIN "${schema}".products p ON p.id = pv.product_id
        LEFT JOIN "${schema}".product_colors pc ON pc.id::text = pv.color_id::text
        WHERE sai.adjustment_id = $1
        ORDER BY sai.id ASC
      `,
      [adjustmentId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...header,
        items: itemsRes.rows,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stock adjustment details" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
