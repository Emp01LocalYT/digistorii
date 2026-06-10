import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { getNextProductCodeByType } from "@/lib/document-number-generator";
import {
  buildInternalBarcode,
  normalizeBarcode,
  validateBarcodeOrThrow,
} from "@/lib/product-barcode";
import { getTenantSchema } from "@/lib/tenant";

type FieldKey =
  | "name"
  | "description"
  | "category"
  | "material"
  | "uom"
  | "hsn_code"
  | "weight"
  | "length"
  | "width"
  | "height"
  | "color"
  | "size"
  | "fitting"
  | "gender"
  | "parent_sku"
  | "sku"
  | "low_stock_threshold"
  | "backorders_allowed"
  | "barcode";

type MappingConfig = {
  templateName?: string;
  sheetName: string;
  fields: Partial<Record<FieldKey, string>>;
};

type ParsedRow = {
  rowNumber: number;
  values: Partial<Record<FieldKey, string>>;
  errors: string[];
};

const REQUIRED_FIELDS: FieldKey[] = [
  "name",
  "category",
  "material",
  "uom",
  "color",
  "size",
];

const IMPORTABLE_FIELDS: FieldKey[] = [
  "name",
  "description",
  "category",
  "material",
  "uom",
  "hsn_code",
  "weight",
  "length",
  "width",
  "height",
  "color",
  "size",
  "fitting",
  "gender",
  "parent_sku",
  "sku",
  "low_stock_threshold",
  "backorders_allowed",
  "barcode",
];

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function asNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
}

async function loadLookupMap(client: PoolClient, schema: string, table: string, idCol: string, labelCols: string[]) {
  const query = `SELECT ${[idCol, ...labelCols].join(", ")} FROM "${schema}".${table}`;
  const res = await client.query(query);
  const map = new Map<string, string>();
  for (const row of res.rows) {
    for (const key of labelCols) {
      const value = stringValue(row[key]);
      if (value) map.set(value.toLowerCase(), String(row[idCol]));
    }
    if (labelCols.length > 1) {
      const combo = labelCols.map((key) => stringValue(row[key])).filter(Boolean).join(" - ");
      if (combo) map.set(combo.toLowerCase(), String(row[idCol]));
    }
  }
  return map;
}

function readWorkbook(buffer: Buffer) {
  return XLSX.read(buffer, { type: "buffer" });
}

function getRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function parseRows(rows: Record<string, unknown>[], mapping: MappingConfig): ParsedRow[] {
  return rows.map((row, index) => {
    const values: Partial<Record<FieldKey, string>> = {};
    const errors: string[] = [];
    for (const field of IMPORTABLE_FIELDS) {
      const header = mapping.fields[field];
      if (header) values[field] = stringValue(row[header]);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!stringValue(values[field])) {
        errors.push(`${field} is required`);
      }
    }
    if (values.barcode) {
      try {
        validateBarcodeOrThrow(values.barcode);
      } catch (error: any) {
        errors.push(error.message);
      }
    }
    if (values.backorders_allowed && asBoolean(values.backorders_allowed) === null) {
      errors.push("backorders_allowed must be yes/no or true/false");
    }
    for (const numericField of ["weight", "length", "width", "height", "low_stock_threshold"] as FieldKey[]) {
      const value = stringValue(values[numericField]);
      if (value && asNumber(value) === null) {
        errors.push(`${numericField} must be numeric`);
      }
    }
    return { rowNumber: index + 2, values, errors };
  });
}

async function saveTemplate(client: PoolClient, schema: string, mapping: MappingConfig) {
  const templateName = stringValue(mapping.templateName);
  if (!templateName) return null;
  const res = await client.query(
    `
      INSERT INTO "${schema}".product_import_mapping_templates (template_name, sheet_name, mapping_json, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (template_name)
      DO UPDATE SET sheet_name = EXCLUDED.sheet_name, mapping_json = EXCLUDED.mapping_json, updated_at = NOW()
      RETURNING id
    `,
    [templateName, mapping.sheetName, JSON.stringify(mapping)]
  );
  return Number(res.rows[0]?.id || 0) || null;
}

async function resolveLookupId(map: Map<string, string>, value: string, label: string, rowErrors: string[]) {
  if (!value) return null;
  const found = map.get(value.toLowerCase());
  if (!found) {
    rowErrors.push(`Unknown ${label}: ${value}`);
    return null;
  }
  return found;
}

async function importRows(options: {
  client: PoolClient;
  schema: string;
  fileName: string;
  mapping: MappingConfig;
  parsedRows: ParsedRow[];
}) {
  const { client, schema, fileName, mapping, parsedRows } = options;
  const categoryMap = await loadLookupMap(client, schema, "product_categories", "id", [
    "path_string",
    "category_name",
  ]);
  const materialMap = await loadLookupMap(client, schema, "product_materials", "id", [
    "material_code",
    "material_name",
  ]);
  const uomMap = await loadLookupMap(client, schema, "uom", "id", ["uom_name", "uom_code"]);
  const barcodeSet = new Set<string>();
  const productCodeCache = new Map<string, string>();
  const productIdCache = new Map<string, number>();
  const uploadSkuSet = new Set<string>();
  const batchTemplateId = await saveTemplate(client, schema, mapping);
  const batchRes = await client.query(
    `
      INSERT INTO "${schema}".product_import_batches
        (sheet_name, mapping_template_id, source_file_name, total_rows, imported_products, imported_variants, status)
      VALUES ($1, $2, $3, $4, 0, 0, 'completed')
      RETURNING id
    `,
    [mapping.sheetName, batchTemplateId, fileName, parsedRows.length]
  );
  const batchId = Number(batchRes.rows[0].id);
  let productCount = 0;
  let variantCount = 0;
  const rowErrors: Array<{ rowNumber: number; errors: string[] }> = [];

  for (const row of parsedRows) {
    if (Object.values(row.values).every((value) => !stringValue(value))) continue;
    const errors = [...row.errors];
    const name = stringValue(row.values.name);
    const categoryId = await resolveLookupId(categoryMap, stringValue(row.values.category), "category", errors);
    const materialId = await resolveLookupId(materialMap, stringValue(row.values.material), "material", errors);
    const uomId = await resolveLookupId(uomMap, stringValue(row.values.uom), "uom", errors);
    const barcode = normalizeBarcode(row.values.barcode);
    if (barcode) {
      if (barcodeSet.has(barcode)) {
        errors.push(`Duplicate barcode "${barcode}" in upload`);
      } else {
        const existingBarcode = await client.query(
          `SELECT 1 FROM "${schema}".product_variants WHERE barcode = $1 LIMIT 1`,
          [barcode]
        );
        if ((existingBarcode.rowCount || 0) > 0) errors.push(`Barcode "${barcode}" already exists`);
        barcodeSet.add(barcode);
      }
    }
    const parentSku = stringValue(row.values.parent_sku);
    const sku = stringValue(row.values.sku);
    if (sku) {
      const normalizedSku = sku.toUpperCase();
      if (uploadSkuSet.has(normalizedSku)) {
        errors.push(`Duplicate SKU "${sku}" in upload`);
      }
      const existingSku = await client.query(
        `SELECT 1 FROM "${schema}".product_variants WHERE upper(sku) = upper($1) LIMIT 1`,
        [sku]
      );
      if ((existingSku.rowCount || 0) > 0) errors.push(`SKU "${sku}" already exists`);
      uploadSkuSet.add(normalizedSku);
    }
    if (parentSku) {
      const normalizedParentSku = parentSku.toUpperCase();
      if (sku && normalizedParentSku === sku.toUpperCase()) {
        errors.push(`parent_sku cannot be the same as sku for "${sku}"`);
      }
    }
    if (errors.length) {
      rowErrors.push({ rowNumber: row.rowNumber, errors });
      continue;
    }

    const groupKey = parentSku || sku || `${name.toLowerCase()}::${stringValue(row.values.color).toLowerCase()}::${stringValue(
      row.values.size
    ).toLowerCase()}`;
    let productCode = productCodeCache.get(groupKey);
    let productId = productIdCache.get(groupKey) ?? null;
    if (!productCode || !productId) {
      productCode = await getNextProductCodeByType(schema, "finished_good");
      productCodeCache.set(groupKey, productCode);
      const productRes = await client.query(
        `
          INSERT INTO "${schema}".products
            (product_code, name, description, category, material, uom, hsn_code, weight, length, width, height, type, source, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'finished_good', 'vendor', 1)
          RETURNING id
        `,
        [
          productCode,
          name,
          stringValue(row.values.description) || null,
          categoryId,
          materialId,
          uomId,
          stringValue(row.values.hsn_code) || null,
          asNumber(stringValue(row.values.weight)),
          asNumber(stringValue(row.values.length)),
          asNumber(stringValue(row.values.width)),
          asNumber(stringValue(row.values.height)),
        ]
      );
      productId = Number(productRes.rows[0].id);
      productIdCache.set(groupKey, productId);
      productCount += 1;
      await client.query(
        `INSERT INTO "${schema}".product_import_batch_items (batch_id, product_id, row_number, item_type) VALUES ($1, $2, $3, 'product')`,
        [batchId, productId, row.rowNumber]
      );
    }

    const variantRes = await client.query(
      `
        INSERT INTO "${schema}".product_variants
          (product_id, color, size, fitting, gender, sku, qty, low_stock_threshold, backorders_allowed, status, barcode)
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'draft', $9)
        RETURNING id, barcode
      `,
      [
        productId,
        stringValue(row.values.color) || null,
        stringValue(row.values.size) || null,
        stringValue(row.values.fitting) || null,
        stringValue(row.values.gender) || null,
        sku || `${productCode}-${stringValue(row.values.color) || "NA"}-${stringValue(row.values.size) || "NA"}`,
        asNumber(stringValue(row.values.low_stock_threshold)) ?? 5,
        asBoolean(stringValue(row.values.backorders_allowed)) ?? false,
        barcode || null,
      ]
    );
    const variantId = Number(variantRes.rows[0].id);
    if (!stringValue(variantRes.rows[0].barcode)) {
      await client.query(`UPDATE "${schema}".product_variants SET barcode = $2 WHERE id = $1`, [
        variantId,
        buildInternalBarcode(variantId),
      ]);
    }
    variantCount += 1;
    await client.query(
      `INSERT INTO "${schema}".product_import_batch_items (batch_id, product_id, variant_id, row_number, item_type) VALUES ($1, $2, $3, $4, 'variant')`,
      [batchId, productId, variantId, row.rowNumber]
    );
  }

  await client.query(
    `UPDATE "${schema}".product_import_batches SET imported_products = $2, imported_variants = $3 WHERE id = $1`,
    [batchId, productCount, variantCount]
  );
  return {
    batchId,
    productCount,
    variantCount,
    uploadedRows: variantCount,
    failedRows: rowErrors.length,
    rowErrors,
  };
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const templates = await client.query(
      `SELECT id, template_name, sheet_name, mapping_json, updated_at FROM "${schema}".product_import_mapping_templates ORDER BY updated_at DESC`
    );
    const lastBatch = await client.query(
      `SELECT id, source_file_name, imported_products, imported_variants, created_at FROM "${schema}".product_import_batches ORDER BY created_at DESC LIMIT 1`
    );
    return NextResponse.json({ templates: templates.rows, lastBatch: lastBatch.rows[0] || null });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to load import metadata" }, { status: 400 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const form = await req.formData();
    const action = stringValue(form.get("action") || "parse");

    if (action === "undo") {
      await client.query("BEGIN");
      const batchRes = await client.query(
        `SELECT id FROM "${schema}".product_import_batches ORDER BY created_at DESC LIMIT 1`
      );
      const batchId = Number(batchRes.rows[0]?.id || 0);
      if (!batchId) throw new Error("No import batch available to undo");
      const productsRes = await client.query(
        `SELECT DISTINCT product_id FROM "${schema}".product_import_batch_items WHERE batch_id = $1 AND product_id IS NOT NULL`,
        [batchId]
      );
      for (const row of productsRes.rows) {
        await client.query(`DELETE FROM "${schema}".products WHERE id = $1`, [row.product_id]);
      }
      await client.query(`DELETE FROM "${schema}".product_import_batches WHERE id = $1`, [batchId]);
      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "Last import undone" });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = readWorkbook(buffer);

    if (action === "parse") {
      const sheets = workbook.SheetNames.map((sheetName) => {
        const rows = getRows(workbook, sheetName);
        const headers = rows[0] ? Object.keys(rows[0]) : [];
        return {
          sheetName,
          headers,
          previewRows: rows.slice(0, 5),
        };
      });
      return NextResponse.json({ success: true, sheets, requiredFields: REQUIRED_FIELDS, fields: IMPORTABLE_FIELDS });
    }

    const mapping = JSON.parse(String(form.get("mapping") || "{}")) as MappingConfig;
    if (!mapping.sheetName) {
      return NextResponse.json({ message: "sheetName is required in mapping" }, { status: 400 });
    }
    const rows = getRows(workbook, mapping.sheetName);
    const parsedRows = parseRows(rows, mapping);

    if (action === "preview") {
      return NextResponse.json({
        success: parsedRows.every((row) => row.errors.length === 0),
        totalRows: parsedRows.length,
        validRows: parsedRows.filter((row) => row.errors.length === 0).length,
        failedRows: parsedRows.filter((row) => row.errors.length > 0).length,
        previewRows: parsedRows.slice(0, 10),
        rowErrors: parsedRows.filter((row) => row.errors.length > 0),
      });
    }

    if (action === "import") {
      await client.query("BEGIN");
      const result = await importRows({
        client,
        schema,
        fileName: file.name,
        mapping,
        parsedRows,
      });
      if (result.variantCount === 0 && result.rowErrors.length > 0) {
        throw new Error(`Upload failed. 0 rows uploaded and ${result.rowErrors.length} row(s) failed.`);
      }
      await client.query("COMMIT");
      return NextResponse.json({
        success: result.rowErrors.length === 0,
        batchId: result.batchId,
        productCount: result.productCount,
        variantCount: result.variantCount,
        uploadedRows: result.uploadedRows,
        failedRows: result.failedRows,
        message:
          result.rowErrors.length > 0
            ? `Uploaded ${result.uploadedRows} row(s) as ${result.productCount} product(s) and ${result.variantCount} variant(s). ${result.failedRows} row(s) failed.`
            : `Uploaded ${result.uploadedRows} row(s) as ${result.productCount} product(s) and ${result.variantCount} variant(s).`,
        rowErrors: result.rowErrors,
      });
    }

    return NextResponse.json({ message: `Unsupported action "${action}"` }, { status: 400 });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json({ message: error.message || "Failed to import products" }, { status: 400 });
  } finally {
    client.release();
  }
}
