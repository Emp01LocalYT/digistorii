import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import {
  calculatePricing,
  parseDateOnly,
  parseNonNegativeNumber,
} from "@/lib/pricing";
import { getTenantSchema } from "@/lib/tenant";

type UploadRowInput = {
  rowNumber: number;
  sku: string;
  baseCost: number;
  operationalCost: number;
  marginPercent: number;
  effectiveDate: string;
  expiresAt: string | null;
};

type UploadValidationError = {
  row: number;
  sku: string;
  message: string;
};

function isXlsxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx");
}

function buildErrorReportFile(errors: UploadValidationError[]): Buffer {
  const rows = errors.map((error) => ({
    Row: error.row,
    SKU: error.sku,
    Error: error.message,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function cellAsText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return cellAsText(value).toLowerCase().replace(/\s+/g, " ");
}

function parseWorksheetRows(buffer: Buffer): {
  rows: UploadRowInput[];
  errors: UploadValidationError[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Template is empty");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
  });

  if (data.length <= 1) {
    return { rows: [], errors: [] };
  }

  const rows: UploadRowInput[] = [];
  const errors: UploadValidationError[] = [];
  const headers = (data[0] || []).map((value) => normalizeHeader(value));

  const skuIndex = headers.indexOf("sku");
  const productNameIndex = headers.indexOf("product name");
  const baseCostIndex = headers.indexOf("base cost");
  const operationalCostIndex = headers.indexOf("operational cost");
  const landedPriceIndex = headers.indexOf("landed price");
  const sellingPriceIndex = headers.indexOf("selling price");
  const marginIndex = headers.findIndex((header) => header === "margin %" || header === "margin");
  const effectiveDateIndex = headers.indexOf("effective date");
  const expiresAtIndex = headers.findIndex(
    (header) => header === "expires at" || header === "expires at (optional)"
  );

  if (skuIndex < 0 || baseCostIndex < 0 || effectiveDateIndex < 0) {
    throw new Error("Invalid template columns");
  }
  if (operationalCostIndex < 0) {
    throw new Error("Template must include Operational Cost column");
  }

  for (let index = 1; index < data.length; index += 1) {
    const current = data[index] || [];
    const rowNumber = index + 1;
    const sku = cellAsText(current[skuIndex]);
    const productNameRaw = productNameIndex >= 0 ? cellAsText(current[productNameIndex]) : "";
    const baseCostRaw = baseCostIndex >= 0 ? cellAsText(current[baseCostIndex]) : "";
    const operationalCostRaw =
      operationalCostIndex >= 0 ? cellAsText(current[operationalCostIndex]) : "";
    const landedPriceRaw = landedPriceIndex >= 0 ? cellAsText(current[landedPriceIndex]) : "";
    const sellingPriceRaw = sellingPriceIndex >= 0 ? cellAsText(current[sellingPriceIndex]) : "";
    const marginRaw = cellAsText(current[marginIndex]);
    const effectiveDateRaw = cellAsText(current[effectiveDateIndex]);
    const expiresAtRaw = expiresAtIndex >= 0 ? cellAsText(current[expiresAtIndex]) : "";

    const isEmpty =
      !sku &&
      !productNameRaw &&
      !baseCostRaw &&
      !operationalCostRaw &&
      !landedPriceRaw &&
      !sellingPriceRaw &&
      !marginRaw &&
      !effectiveDateRaw &&
      !expiresAtRaw;
    if (isEmpty) {
      continue;
    }

    if (!sku) {
      errors.push({ row: rowNumber, sku: "", message: "SKU is required" });
      continue;
    }

    try {
      const baseCost = parseNonNegativeNumber(baseCostRaw, "Base Cost", true);
      const operationalCost = parseNonNegativeNumber(operationalCostRaw || "0", "Operational Cost", true);

      const expiresAt =
        expiresAtRaw === "" ? null : parseDateOnly(expiresAtRaw, "Expires At");
      const today = new Date().toISOString().slice(0, 10);
      const effectiveDate = parseDateOnly(effectiveDateRaw, "Effective Date");
      if (effectiveDate < today) {
        throw new Error("Effective Date cannot be in the past");
      }
      if (expiresAt && expiresAt < effectiveDate) {
        throw new Error("Expires At cannot be before Effective Date");
      }

      rows.push({
        rowNumber,
        sku,
        baseCost,
        operationalCost,
        marginPercent:
          marginRaw === "" ? 0 : parseNonNegativeNumber(marginRaw, "Margin", true),
        effectiveDate,
        expiresAt,
      });
    } catch (error: any) {
      errors.push({
        row: rowNumber,
        sku,
        message: error.message || "Invalid row",
      });
    }
  }

  return { rows, errors };
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }
    if (!isXlsxFile(file)) {
      return NextResponse.json({ message: "Only .xlsx files are allowed" }, { status: 400 });
    }

    
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseWorksheetRows(buffer);

    // if (parsed.rows.length === 0) {
    //   return NextResponse.json({ message: "No pricing rows found in upload file" }, { status: 400 });
    // }

    const skuResult = await client.query<{
      sku: string;
      product_id: string | number;
      source_type: "vendor" | "own";
    }>(
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
      skuResult.rows.map((item) => [
        item.sku,
        { productId: item.product_id, sourceType: item.source_type },
      ])
    );

    const validationErrors: UploadValidationError[] = [...parsed.errors];
    const seenSku = new Set<string>();
    for (const row of parsed.rows) {
      const skuMeta = skuMap.get(row.sku);
      if (!skuMeta) {
        validationErrors.push({
          row: row.rowNumber,
          sku: row.sku,
          message: "SKU does not exist",
        });
      }
      if (seenSku.has(row.sku)) {
        validationErrors.push({
          row: row.rowNumber,
          sku: row.sku,
          message: "Duplicate SKU in upload",
        });
      }
      if (skuMeta) {
        // source type is resolved from DB; upload no longer carries a type column
      }
      seenSku.add(row.sku);
    }

    if (validationErrors.length > 0) {
      const reportBuffer = buildErrorReportFile(validationErrors);
      return NextResponse.json(
        {
          message: "Validation failed. Fix rows and re-upload.",
          errorCount: validationErrors.length,
          errors: validationErrors,
          errorReport: reportBuffer.toString("base64"),
          errorReportFileName: "pricing-upload-errors.xlsx",
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
    const productIds: (string | number)[] = [];
    const sourceTypes: ("vendor" | "own")[] = [];

    parsed.rows.forEach((row) => {
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

    return NextResponse.json({
      message: "Pricing uploaded successfully",
      updatedRows: parsed.rows.length,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { message: error.message || "Failed to upload pricing" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}



