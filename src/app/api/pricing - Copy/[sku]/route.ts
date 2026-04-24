import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { calculatePricing, parsePricingRowInput } from "@/lib/pricing";
import { getTenantSchema } from "@/lib/tenant";

type PricingUpdateBody = {
  company: string;
  base_cost?: number | string;
  operational_cost?: number | string;
  margin_percent?: number | string;
  effective_date?: string;
  expires_at?: string | null;
};

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ sku: string }> }
) {
  const client = await pool.connect();
  try {
    const { sku } = await context.params;
    const { company, schema } = await getTenantSchema(req);
    const body = (await req.json()) as PricingUpdateBody;
    const cleanSku = String(sku || "").trim();

    if (!cleanSku) {
      return NextResponse.json({ message: "SKU is required" }, { status: 400 });
    }


    const skuCheck = await client.query(
      `
        SELECT
          pv.sku,
            pv.barcode,
          pv.product_id,
          p.source AS source_type
        FROM "${schema}".product_variants pv
        INNER JOIN "${schema}".products p
          ON p.id = pv.product_id
        WHERE pv.sku = $1
          AND pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
        LIMIT 1
      `,
      [cleanSku]
    );
    if (!skuCheck.rows.length) {
      return NextResponse.json({ message: "SKU not found" }, { status: 404 });
    }

    const parsed = parsePricingRowInput(
      {
        sku: cleanSku,
        base_cost: body.base_cost,
        operational_cost: body.operational_cost,
        margin_percent: body.margin_percent,
        effective_date: body.effective_date,
        expires_at: body.expires_at,
      },
      "Pricing update"
    );

    const skuMeta = skuCheck.rows[0] as {
      product_id: number | string;
      source_type: "vendor" | "own";
    };

    const calculated = calculatePricing({
      baseCost: parsed.baseCost,
      operationalCost: parsed.operationalCost,
      marginPercent: parsed.marginPercent,
    });

    await client.query("BEGIN");
    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET is_active = FALSE, expires_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND sku = $2 AND is_active = TRUE
      `,
      [company, cleanSku]
    );

    await client.query(
      `
        INSERT INTO "${schema}".product_pricing
          (tenant_id, product_id, sku, source_type, base_cost, operational_cost, landed_price, margin_percent, unit_price, tax_percent, final_selling_price, active_from, expires_at, is_active)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
      `,
      [
        company,
        skuMeta.product_id,
        cleanSku,
        skuMeta.source_type,
        parsed.baseCost,
        parsed.operationalCost,
        calculated.landedPrice,
        parsed.marginPercent,
        calculated.sellingPrice,
        0,
        calculated.finalSellingPrice,
        parsed.effectiveDate,
        parsed.expiresAt,
      ]
    );
    await client.query("COMMIT");

    return NextResponse.json({ message: "Pricing updated" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { message: error.message || "Failed to update pricing" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}



