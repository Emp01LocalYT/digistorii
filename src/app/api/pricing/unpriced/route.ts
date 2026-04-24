import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getLatestPurchasePrice } from "@/lib/pricing";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    

    const variantRows = await client.query(
      `
        SELECT v.id AS variant_id, v.sku
        FROM "${schema}".product_variants v
        WHERE v.status = 1
          AND NOT EXISTS (
            SELECT 1
            FROM "${schema}".product_pricing pp
            WHERE pp.tenant_id = $1
              AND pp.variant_id = v.id
              AND pp.is_active = TRUE
          )
        ORDER BY v.id ASC
      `,
      [company]
    );

    const rows = await Promise.all(
      variantRows.rows.map(async (item: { variant_id: number; sku: string }) => {
        const latestPurchase = await getLatestPurchasePrice(client, schema, item.sku);
        return {
          variant_id: item.variant_id,
          sku: item.sku,
          base_cost: latestPurchase ?? 0,
          operational_cost: 0,
          landed_price: latestPurchase ?? 0,
          margin_type: "percentage",
          margin_value: 0,
          margin_amount: 0,
          unit_price: latestPurchase ?? 0,
          tax_percent: 18,
          tax_amount: 0,
          final_selling_price: latestPurchase ?? 0,
          active_from: new Date().toISOString().slice(0, 10),
          expires_at: "",
        };
      })
    );

    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch unpriced SKUs" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
