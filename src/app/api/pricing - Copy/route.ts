import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import {
  calculatePricing,
  parsePricingRowInput,
  PRICING_MAX_BULK_ROWS,
} from "@/lib/pricing";

type PricingBulkRow = {
  sku: string;
  base_cost?: number | string;
  operational_cost?: number | string;
  margin_percent?: number | string;
  effective_date?: string;
  expires_at?: string | null;
};

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const includeCatalog = String(req.nextUrl.searchParams.get("catalog") || "").toLowerCase() === "yes";

    if (includeCatalog) {
      const result = await client.query(
        `
          SELECT
            p.id AS product_id,
            p.name AS product_name,
            pv.sku,
            pv.barcode,
            pp.active_from AS effective_date
          FROM "${schema}".product_variants pv
          INNER JOIN "${schema}".products p
            ON p.id = pv.product_id
          LEFT JOIN "${schema}".product_pricing pp
            ON pp.tenant_id = $1
            AND pp.sku = pv.sku
            AND pp.is_active = TRUE
          WHERE pv.status IN ('draft', 'active', 'out_of_stock')
            AND p.status = 1
          ORDER BY p.id ASC, pv.sku ASC
        `,
        [company]
      );

      return NextResponse.json({ products: result.rows });
    }

    const result = await client.query(
      `
        SELECT
          id,
          tenant_id,
          product_id,
          sku,
          source_type,
          base_cost,
          operational_cost,
          landed_price,
          margin_percent,
          unit_price,
          tax_percent,
          final_selling_price,
          active_from,
          expires_at,
          is_active,
          created_at,
          updated_at
        FROM "${schema}".product_pricing
        WHERE tenant_id = $1 AND is_active = TRUE
        ORDER BY created_at DESC
      `,
      [company]
    );

    return NextResponse.json({ pricing: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch pricing" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();
    const rows = (body.rows || []) as PricingBulkRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: "rows are required" }, { status: 400 });
    }
    if (rows.length > PRICING_MAX_BULK_ROWS) {
      return NextResponse.json(
        { message: `rows cannot exceed ${PRICING_MAX_BULK_ROWS}` },
        { status: 400 }
      );
    }


    const skuResult = await client.query(
      `
        SELECT
          pv.sku,
            pv.barcode,
          pv.product_id,
          p.source AS source_type
        FROM "${schema}".product_variants pv
        INNER JOIN "${schema}".products p
          ON p.id = pv.product_id
        WHERE pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
      `
    );
    const skuMap = new Map(
      skuResult.rows.map((item: { sku: string; product_id: number | string; source_type: "vendor" | "own" }) => [
        item.sku,
        { productId: item.product_id, sourceType: item.source_type },
      ])
    );

    const normalizedRows = rows.map((row, index) =>
      parsePricingRowInput(
        { ...row, active_from: row.effective_date },
        `Row ${index + 2}`
      )
    );

    const invalidSkuRows = normalizedRows.filter((row) => !skuMap.has(row.sku));
    if (invalidSkuRows.length > 0) {
      const firstInvalid = invalidSkuRows[0];
      return NextResponse.json(
        {
          message: `SKU "${firstInvalid.sku}" does not exist`,
        },
        { status: 400 }
      );
    }

    const skus: string[] = [];
    const baseCosts: number[] = [];
    const operationalCosts: number[] = [];
    const landedPrices: number[] = [];
    const marginPercents: number[] = [];
    const sellingPrices: number[] = [];
    const finalSellingPrices: number[] = [];
    const effectiveDates: string[] = [];
    const expiresAtDates: (string | null)[] = [];
    const productIds: (number | string)[] = [];
    const sourceTypes: ("vendor" | "own")[] = [];

    normalizedRows.forEach((row) => {
      const skuMeta = skuMap.get(row.sku);
      if (!skuMeta) {
        throw new Error(`SKU "${row.sku}" does not exist`);
      }

      const calculated = calculatePricing({
        baseCost: row.baseCost,
        operationalCost: row.operationalCost,
        marginPercent: row.marginPercent,
      });

      skus.push(row.sku);
      baseCosts.push(row.baseCost);
      operationalCosts.push(row.operationalCost);
      landedPrices.push(calculated.landedPrice);
      marginPercents.push(row.marginPercent);
      sellingPrices.push(calculated.sellingPrice);
      finalSellingPrices.push(calculated.finalSellingPrice);
      effectiveDates.push(row.effectiveDate);
      expiresAtDates.push(row.expiresAt);
      productIds.push(skuMeta.productId);
      sourceTypes.push(skuMeta.sourceType);
    });

    await client.query("BEGIN");
    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET is_active = FALSE, expires_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1
          AND is_active = TRUE
          AND sku = ANY($2::text[])
      `,
      [company, skus]
    );

    await client.query(
      `
        INSERT INTO "${schema}".product_pricing
          (
            tenant_id,
            product_id,
            sku,
            source_type,
            base_cost,
            operational_cost,
            landed_price,
            margin_percent,
            unit_price,
            tax_percent,
            final_selling_price,
            active_from,
            expires_at,
            is_active
          )
        SELECT
          $1::varchar(80),
          payload.product_id,
          payload.sku,
          payload.source_type,
          payload.base_cost,
          payload.operational_cost,
          payload.landed_price,
          payload.margin_percent,
          payload.unit_price,
          0::numeric,
          payload.final_selling_price,
          payload.effective_date,
          payload.expires_at,
          TRUE
        FROM unnest(
          $2::text[],
          $3::bigint[],
          $4::text[],
          $5::numeric[],
          $6::numeric[],
          $7::numeric[],
          $8::numeric[],
          $9::numeric[],
          $10::numeric[],
          $11::date[],
          $12::date[]
        ) AS payload(
          sku,
          product_id,
          source_type,
          base_cost,
          operational_cost,
          landed_price,
          margin_percent,
          unit_price,
          final_selling_price,
          effective_date,
          expires_at
        )
      `,
      [
        company,
        skus,
        productIds,
        sourceTypes,
        baseCosts,
        operationalCosts,
        landedPrices,
        marginPercents,
        sellingPrices,
        finalSellingPrices,
        effectiveDates,
        expiresAtDates,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({ message: "Pricing saved", insertedCount: normalizedRows.length });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { message: error.message || "Failed to save pricing" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}



