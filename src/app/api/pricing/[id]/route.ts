import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { calculatePricing, parsePricingRowInput } from "@/lib/pricing";
import { getTenantSchema } from "@/lib/tenant";

type PricingUpdateBody = {
  base_cost?: number | string;
  operational_cost?: number | string;
  margin_type?: "percentage" | "amount" | string;
  margin_value?: number | string;
  tax_id?: number | string | null;
  tax_percent?: number | string;
  effective_date?: string;
  expires_at?: string | null;
};

function isRowActive(effectiveDate: string, expiresAt?: string | null): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const starts = today >= effectiveDate;
  const ends = !expiresAt || today <= expiresAt;
  return starts && ends;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema, company } = await getTenantSchema(req);
    const { id } = await context.params;
    const pricingId = Number(String(id || "").trim());

    if (!Number.isFinite(pricingId) || pricingId <= 0) {
      return NextResponse.json({ success: false, message: "Valid pricing id is required" }, { status: 400 });
    }

    const pricingRow = await client.query(
      `
        SELECT
          variant_id
        FROM "${schema}".product_pricing pp
        WHERE pp.tenant_id = $1
          AND pp.id = $2
        LIMIT 1
      `,
      [company, pricingId]
    );

    if (!pricingRow.rows.length) {
      return NextResponse.json({ success: false, message: "Pricing row not found" }, { status: 404 });
    }

    const variantId = Number(pricingRow.rows[0].variant_id);

    const result = await client.query(
      `
        SELECT
          pp.id,
          pp.tenant_id,
          pp.product_id,
          pp.variant_id,
          p.product_code,
          p.name AS product_name,
          p.description,
          p.category,
          pc.path_string AS category_name,
          pv.sku,
          pv.color_id,
          pcl.color_name AS color,
          pp.source_type,
          pp.base_cost,
          pp.operational_cost,
          pp.landed_price,
          pp.margin_type,
          pp.margin_value,
          pp.margin_amount,
          pp.unit_price,
          pp.tax_percent,
          pp.tax_amount,
          pp.final_selling_price,
          pp.active_from,
          pp.expires_at,
          CASE
            WHEN pp.is_active = TRUE
              AND CURRENT_DATE >= pp.active_from::date
              AND (
                pp.expires_at IS NULL
                OR CURRENT_DATE <= pp.expires_at::date
              )
            THEN TRUE
            ELSE FALSE
          END AS is_active,
          CASE
            WHEN pp.is_active = TRUE
              AND CURRENT_DATE >= pp.active_from::date
              AND (
                pp.expires_at IS NULL
                OR CURRENT_DATE <= pp.expires_at::date
              )
            THEN 'Active'
            ELSE 'Inactive'
          END AS status,
          tm.id AS tax_id,
          tm.tax_name,
          pp.created_at,
          pp.updated_at
        FROM "${schema}".product_pricing pp
        LEFT JOIN "${schema}".product_variants pv
          ON pv.id = pp.variant_id
        LEFT JOIN "${schema}".products p
          ON p.id = pv.product_id
        LEFT JOIN "${schema}".product_colors pcl
          ON pcl.id::text = pv.color_id::text
        LEFT JOIN "${schema}".product_categories pc
          ON pc.id::text = p.category::text
        LEFT JOIN "${schema}".tax_master tm
          ON tm.total_percentage = pp.tax_percent
          AND tm.is_active = TRUE
        WHERE pp.variant_id = $1
          AND pp.tenant_id = $2
        ORDER BY
          CASE
            WHEN pp.is_active = TRUE
              AND CURRENT_DATE >= pp.active_from::date
              AND (
                pp.expires_at IS NULL
                OR CURRENT_DATE <= pp.expires_at::date
              )
            THEN 1
            ELSE 0
          END DESC,
          pp.active_from DESC,
          pp.created_at DESC
      `,
      [variantId, company]
    );

    return NextResponse.json({
      success: true,
      variant_id: variantId,
      pricing: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch pricing details" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await context.params;
    const { company, schema } = await getTenantSchema(req);
    const body = (await req.json()) as PricingUpdateBody;
    const pricingId = Number(String(id || "").trim());

    if (!Number.isFinite(pricingId) || pricingId <= 0) {
      return NextResponse.json({ message: "Valid pricing id is required" }, { status: 400 });
    }

    const pricingRowRes = await client.query(
      `
        SELECT
          pp.id,
          pp.variant_id,
          pp.product_id,
          pp.source_type
        FROM "${schema}".product_pricing pp
        WHERE pp.tenant_id = $1
          AND pp.id = $2
        LIMIT 1
      `,
      [company, pricingId]
    );

    if (!pricingRowRes.rows.length) {
      return NextResponse.json({ message: "Pricing row not found" }, { status: 404 });
    }

    const pricingRow = pricingRowRes.rows[0] as {
      id: number;
      variant_id: number;
      product_id: number;
      source_type: "vendor" | "own";
    };

    const parsed = parsePricingRowInput(
      {
        variant_id: String(pricingRow.variant_id),
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

    const nextIsActive = isRowActive(parsed.effectiveDate, parsed.expiresAt);

    await client.query("BEGIN");

    if (nextIsActive) {
      await client.query(
        `
          UPDATE "${schema}".product_pricing
          SET is_active = FALSE, expires_at = NOW(), updated_at = NOW()
          WHERE tenant_id = $1
            AND variant_id = $2
            AND id <> $3
            AND is_active = TRUE
        `,
        [company, pricingRow.variant_id, pricingId]
      );
    }

    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET
          base_cost = $1,
          operational_cost = $2,
          landed_price = $3,
          margin_type = $4,
          margin_value = $5,
          margin_amount = $6,
          unit_price = $7,
          tax_percent = $8,
          tax_amount = $9,
          final_selling_price = $10,
          active_from = $11,
          expires_at = $12,
          is_active = $13,
          updated_at = NOW()
        WHERE tenant_id = $14
          AND id = $15
      `,
      [
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
        nextIsActive,
        company,
        pricingId,
      ]
    );

    await client.query(
      `
        UPDATE "${schema}".product_variants
        SET status = 'active', updated_at = NOW()
        WHERE id = $1
          AND status = 'draft'
      `,
      [pricingRow.variant_id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Pricing updated",
      pricing_id: pricingId,
      is_active: nextIsActive,
      effective_date: parsed.effectiveDate,
      expires_at: parsed.expiresAt ?? null,
    });
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
