import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import {
  calculatePricing,
  parsePricingRowInput,
  PRICING_MAX_BULK_ROWS,
} from "@/lib/pricing";

type PricingBulkRow = {
  variant_id: string | number;
  base_cost?: number | string;
  operational_cost?: number | string;
  margin_type?: "percentage" | "amount" | string;
  margin_value?: number | string;
  tax_id?: number | string | null;
  tax_percent?: number | string;
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
          pv.id AS variant_id,
          p.id AS product_id,
          p.product_code,
          p.name AS product_name,
          p.description,
          p.category AS category_name,
          pv.sku,
          pv.color,
          pv.barcode,
          pp.active_from AS effective_date
          FROM "${schema}".product_variants pv
          INNER JOIN "${schema}".products p
            ON p.id = pv.product_id
          LEFT JOIN "${schema}".product_pricing pp
            ON pp.tenant_id = $1
            AND pp.variant_id = pv.id
            AND pp.is_active = TRUE
        WHERE pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
          ORDER BY p.id ASC, pv.id ASC
        `,
        [company]
      );

      return NextResponse.json({ products: result.rows });
    }

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
          p.category AS category_name,
          pv.sku,
          pv.color,
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
          pp.is_active,
          pp.created_at,
          pp.updated_at
        FROM "${schema}".product_pricing pp
        LEFT JOIN "${schema}".product_variants pv
          ON pv.id = pp.variant_id
        LEFT JOIN "${schema}".products p
          ON p.id = pv.product_id
        WHERE pp.tenant_id = $1
        ORDER BY pp.is_active DESC, pp.created_at DESC
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


    const variantResult = await client.query(
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
        WHERE pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
      `
    );
    const variantMap = new Map(
      variantResult.rows.map(
        (item: { variant_id: number; sku: string; product_id: number | string; source_type: "vendor" | "own" }) => [
          String(item.variant_id),
          { productId: item.product_id, sourceType: item.source_type, sku: item.sku },
        ]
      )
    );

    const normalizedRows = rows.map((row, index) =>
      parsePricingRowInput(
        {
          ...row,
          active_from: row.effective_date,
          margin_type: row.margin_type,
          margin_value: row.margin_value,
          tax_percent: row.tax_percent,
        },
        `Row ${index + 2}`
      )
    );

    const invalidVariantRows = normalizedRows.filter((row) => !variantMap.has(row.variantId));
    if (invalidVariantRows.length > 0) {
      const firstInvalid = invalidVariantRows[0];
      return NextResponse.json(
        {
          message: `Variant ID "${firstInvalid.variantId}" does not exist`,
        },
        { status: 400 }
      );
    }

    const taxResult = await client.query(
      `
        SELECT id, tax_name, total_percentage
        FROM "${schema}".tax_master
        WHERE is_active = TRUE
        ORDER BY id
      `
    );
    const taxById = new Map<number, { name: string; percent: number }>(
      taxResult.rows.map((row: { id: number; tax_name: string; total_percentage: number }) => [
        row.id,
        { name: row.tax_name, percent: Number(row.total_percentage || 0) },
      ])
    );

    const variantIds: string[] = [];
    const baseCosts: number[] = [];
    const operationalCosts: number[] = [];
    const landedPrices: number[] = [];
    const marginTypes: string[] = [];
    const marginValues: number[] = [];
    const marginAmounts: number[] = [];
    const unitPrices: number[] = [];
    const taxPercents: number[] = [];
    const taxAmounts: number[] = [];
    const finalSellingPrices: number[] = [];
    const effectiveDates: string[] = [];
    const expiresAtDates: (string | null)[] = [];
    const productIds: (number | string)[] = [];
    const sourceTypes: ("vendor" | "own")[] = [];

    normalizedRows.forEach((row) => {
      const variantMeta = variantMap.get(row.variantId);
      if (!variantMeta) {
        throw new Error(`Variant ID "${row.variantId}" does not exist`);
      }

      let resolvedTaxPercent = row.taxPercent;
      const taxIdRaw = rows.find((r) => String(r.variant_id) === String(row.variantId))?.tax_id;
      if (taxIdRaw != null && String(taxIdRaw).trim() !== "") {
        const taxId = Number(taxIdRaw);
        if (Number.isFinite(taxId) && taxById.has(taxId)) {
          resolvedTaxPercent = taxById.get(taxId)?.percent ?? 0;
        }
      }

      const calculated = calculatePricing({
        baseCost: row.baseCost,
        operationalCost: row.operationalCost,
        marginType: row.marginType,
        marginValue: row.marginValue,
        taxPercent: resolvedTaxPercent,
      });

      variantIds.push(row.variantId);
      baseCosts.push(row.baseCost);
      operationalCosts.push(row.operationalCost);
      landedPrices.push(calculated.landedPrice);
      marginTypes.push(row.marginType);
      marginValues.push(row.marginValue);
      marginAmounts.push(calculated.marginAmount);
      unitPrices.push(calculated.unitPrice);
      taxPercents.push(resolvedTaxPercent);
      taxAmounts.push(calculated.taxAmount);
      finalSellingPrices.push(calculated.finalSellingPrice);
      effectiveDates.push(row.effectiveDate);
      expiresAtDates.push(row.expiresAt);
      productIds.push(variantMeta.productId);
      sourceTypes.push(variantMeta.sourceType);
    });

    await client.query("BEGIN");
    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET is_active = FALSE, expires_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1
          AND is_active = TRUE
          AND variant_id = ANY($2::bigint[])
      `,
      [company, variantIds]
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
        SELECT
          $1::varchar(80),
          payload.product_id,
          payload.variant_id,
          payload.source_type,
          payload.base_cost,
          payload.operational_cost,
          payload.landed_price,
          payload.margin_type,
          payload.margin_value,
          payload.margin_amount,
          payload.unit_price,
          payload.tax_percent,
          payload.tax_amount,
          payload.final_selling_price,
          payload.effective_date,
          payload.expires_at,
          TRUE
        FROM unnest(
          $2::bigint[],
          $3::bigint[],
          $4::text[],
          $5::numeric[],
          $6::numeric[],
          $7::numeric[],
          $8::text[],
          $9::numeric[],
          $10::numeric[],
          $11::numeric[],
          $12::numeric[],
          $13::numeric[],
          $14::numeric[],
          $15::date[],
          $16::date[]
        ) AS payload(
          variant_id,
          product_id,
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
          effective_date,
          expires_at
        )
      `,
      [
        company,
        variantIds,
        productIds,
        sourceTypes,
        baseCosts,
        operationalCosts,
        landedPrices,
        marginTypes,
        marginValues,
        marginAmounts,
        unitPrices,
        taxPercents,
        taxAmounts,
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

// Batch stock check for sales
export async function PATCH(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();
    
    // Check if this is a batch stock check request
    if (!Array.isArray(body?.items)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const toNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    // Get user's warehouse from request headers
    const warehouseId = req.headers.get("x-warehouse-id");
    if (!warehouseId) {
      return NextResponse.json(
        { success: false, error: "Warehouse not set for user" },
        { status: 400 }
      );
    }
    const normalizedWarehouseId = toNumber(warehouseId);
    if (normalizedWarehouseId === null || normalizedWarehouseId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid warehouse id" },
        { status: 400 }
      );
    }

    const items = body.items;
    if (!items.length) {
      return NextResponse.json(
        { success: true, errors: [] }
      );
    }

    // Extract product IDs and quantities
    const itemMap: Record<number, number> = {};
    const productIds: number[] = [];
    
    items.forEach((item: any) => {
      const productId = toNumber(item.product_id);
      const qty = toNumber(item.qty);
      
      if (productId !== null && qty !== null && qty > 0) {
        if (!itemMap.hasOwnProperty(productId)) {
          productIds.push(productId);
        }
        itemMap[productId] = qty;
      }
    });

    if (!productIds.length) {
      return NextResponse.json(
        { success: true, errors: [] }
      );
    }

    // Query available stock for each product
    const result = await client.query(
      `
        SELECT
          product_id,
          SUM(qty_remaining) as available_qty
        FROM "${schema}".stock_layers
        WHERE product_id = ANY($1::bigint[])
          AND warehouse_id = $2
          AND qty_remaining > 0
        GROUP BY product_id
      `,
      [productIds, normalizedWarehouseId]
    );

    // Build availability map
    const availabilityMap: Record<number, number> = {};
    result.rows.forEach((row: any) => {
      const productId = Number(row.product_id);
      availabilityMap[productId] = Number(row.available_qty || 0);
    });

    // Check if all items have sufficient stock
    const errors: Array<{
      product_id: number;
      requested: number;
      available: number;
      product_name?: string;
    }> = [];

    let insufficientStock = false;
    for (const [productId, requestedQty] of Object.entries(itemMap)) {
      const prodId = Number(productId);
      const available = availabilityMap[prodId] || 0;
      
      if (requestedQty > available) {
        insufficientStock = true;
        errors.push({
          product_id: prodId,
          requested: requestedQty,
          available: available,
        });
        console.warn(`Insufficient stock for product ${prodId}: requested ${requestedQty}, available ${available}`);
      }
    }

    // If there are errors, fetch product names for better error messages
    if (errors.length > 0) {
      const errorProductIds = errors.map((e) => e.product_id);
      const productRes = await client.query(
        `
          SELECT id, product_name
          FROM "${schema}".product_variants
          WHERE id = ANY($1::bigint[])
        `,
        [errorProductIds]
      );

      const productNameMap: Record<number, string> = {};
      productRes.rows.forEach((row: any) => {
        productNameMap[Number(row.id)] = String(row.product_name || "");
      });

      errors.forEach((err) => {
        err.product_name = productNameMap[err.product_id] || "Unknown Product";
      });
    }

    return NextResponse.json({
      success: !insufficientStock,
      errors: insufficientStock ? errors : [],
    });
  } catch (error: any) {
    console.error("Stock availability batch check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check stock availability" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
