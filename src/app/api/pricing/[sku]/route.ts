import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { calculatePricing, parsePricingRowInput } from "@/lib/pricing";
import { getTenantSchema } from "@/lib/tenant";

type PricingUpdateBody = {
  company: string;
  base_cost?: number | string;
  operational_cost?: number | string;
  margin_type?: "percentage" | "amount" | string;
  margin_value?: number | string;
  tax_id?: number | string | null;
  tax_percent?: number | string;
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
    const rawParam = String(sku || "").trim();

    if (!rawParam) {
      return NextResponse.json({ message: "Variant ID is required" }, { status: 400 });
    }

    const isNumeric = Number.isFinite(Number(rawParam));
    const variantCheck = await client.query(
      `
        SELECT
          pv.id AS variant_id,
          pv.sku,
          pv.barcode,
          pv.product_id,
          p.source AS source_type
        FROM "${schema}".product_variants pv
        INNER JOIN "${schema}".products p
          ON p.id = pv.product_id
        WHERE ${
          isNumeric ? "pv.id = $1" : "pv.sku = $1"
        }
          AND pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
        LIMIT 1
      `,
      [rawParam]
    );
    if (!variantCheck.rows.length) {
      return NextResponse.json({ message: "Variant not found" }, { status: 404 });
    }

    const parsed = parsePricingRowInput(
      {
        variant_id: String(variantCheck.rows[0].variant_id),
        base_cost: body.base_cost,
        operational_cost: body.operational_cost,
        margin_type: body.margin_type,
        margin_value: body.margin_value,
        tax_percent: body.tax_percent,
        effective_date: body.effective_date,
        expires_at: body.expires_at,
      },
      "Pricing update"
    );

    const variantMeta = variantCheck.rows[0] as {
      variant_id: number;
      product_id: number | string;
      source_type: "vendor" | "own";
    };

    let resolvedTaxPercent = parsed.taxPercent;
    if (body.tax_id != null && String(body.tax_id).trim() !== "") {
      const taxResult = await client.query(
        `
          SELECT total_percentage
          FROM "${schema}".tax_master
          WHERE id = $1 AND is_active = TRUE
          LIMIT 1
        `,
        [Number(body.tax_id)]
      );
      if (taxResult.rows[0]?.total_percentage != null) {
        resolvedTaxPercent = Number(taxResult.rows[0].total_percentage || 0);
      }
    }

    const calculated = calculatePricing({
      baseCost: parsed.baseCost,
      operationalCost: parsed.operationalCost,
      marginType: parsed.marginType,
      marginValue: parsed.marginValue,
      taxPercent: resolvedTaxPercent,
    });

    await client.query("BEGIN");
    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET is_active = FALSE, expires_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND variant_id = $2 AND is_active = TRUE
      `,
      [company, variantMeta.variant_id]
    );

    await client.query(
      `
        INSERT INTO "${schema}".product_pricing
          (
            tenant_id,
            product_id,
            variant_id,
            source_type,
            base_cost,
            operational_cost,
            landed_price,
            margin_type,
            margin_value,
            margin_amount,
            unit_price,
            tax_percent,
            tax_amount,
            final_selling_price,
            active_from,
            expires_at,
            is_active
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)
      `,
      [
        company,
        variantMeta.product_id,
        variantMeta.variant_id,
        variantMeta.source_type,
        parsed.baseCost,
        parsed.operationalCost,
        calculated.landedPrice,
        parsed.marginType,
        parsed.marginValue,
        calculated.marginAmount,
        calculated.unitPrice,
        resolvedTaxPercent,
        calculated.taxAmount,
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



