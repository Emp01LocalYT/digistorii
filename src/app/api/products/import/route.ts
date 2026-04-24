import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import { normalizeSku } from "@/lib/product-utils";
import { toTenantKey } from "@/lib/image-master";
import { getTenantSchema } from "@/lib/tenant";
import { PoolClient } from "pg";

type ParsedVariant = {
  row: number;
  parentSku: string;
  sku: string;
  color: string;
  size: string;
  fitting: string;
  gender: string;
  lowStockAmount: number | null;
  backordersAllowed: boolean;
  images: Array<{ imageId: number; imageUrl: string }>;
  rawImages: string;
};

type ParsedParent = {
  row: number;
  sku: string;
  isSkuAuto: boolean;
  name: string;
  categoryId: string | null;
  materialId: string | null;
  uomId: string | null;
  source: "own" | "vendor";
  hsnCode: string | null;
  description: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  variants: ParsedVariant[];
};

type Lookups = {
  categoryByLabel: Map<string, string>;
  materialByLabel: Map<string, string>;
  uomByLabel: Map<string, string>;
};

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cell(row: Record<string, unknown>, header: string): string {
  const normalized = normalizeHeader(header);
  for (const [key, value] of Object.entries(row)) {
    if (normalizeHeader(key) === normalized) {
      return stringValue(value);
    }
  }
  return "";
}

function asNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRef(value: string): string {
  return value.trim().toLowerCase();
}

function splitImageNames(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function logImportIssues(stage: string, errors: string[], warnings: string[] = []) {
  if (errors.length) {
    console.error(`[Product Import] ${stage} errors:`, errors);
  }
  if (warnings.length) {
    console.warn(`[Product Import] ${stage} warnings:`, warnings);
  }
}

async function loadLookups(client: PoolClient, schema: string): Promise<Lookups> {
  const categoryRows = await client.query(
    `
      SELECT id, path_string, category_name
      FROM "${schema}".product_categories
      ORDER BY path_string ASC
    `
  );
  const categoryByLabel = new Map<string, string>();
  categoryRows.rows.forEach((row: { id: number; path_string: string | null; category_name: string }) => {
    const label = row.path_string || row.category_name;
    if (!label) return;
    const idText = String(row.id);
    categoryByLabel.set(normalizeLookupKey(label), idText);
  });

  const materialRows = await client.query(
    `
      SELECT id, material_code, material_name
      FROM "${schema}".product_materials
      ORDER BY material_name ASC
    `
  );
  const materialByLabel = new Map<string, string>();
  materialRows.rows.forEach((row: { id: number; material_code: string; material_name: string }) => {
    const code = String(row.material_code || "").trim();
    const name = String(row.material_name || "").trim();
    const label = code && name ? `${code} - ${name}` : "";
    if (!label) return;
    materialByLabel.set(normalizeLookupKey(label), String(row.id));
  });

  const uomRows = await client.query(
    `
      SELECT id, uom_name
      FROM "${schema}".uom
      ORDER BY uom_name ASC
    `
  );
  const uomByLabel = new Map<string, string>();
  uomRows.rows.forEach((row: { id: number; uom_name: string }) => {
    const label = String(row.uom_name || "").trim();
    if (!label) return;
    uomByLabel.set(normalizeLookupKey(label), String(row.id));
  });

  return { categoryByLabel, materialByLabel, uomByLabel };
}

function parseBooleanFlexible(
  value: string,
  label: string,
  rowNumber: number,
  errors: string[]
): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  errors.push(`Row ${rowNumber}: ${label} must be yes/no, true/false, or 1/0.`);
  return null;
}

function resolveCategory(
  value: string,
  lookups: Lookups,
  rowNumber: number,
  errors: string[]
): string {
  if (!value) return "";
  const normalized = normalizeLookupKey(value);
  const resolved = lookups.categoryByLabel.get(normalized);
  if (!resolved) {
    errors.push(`Row ${rowNumber}: Invalid category. Please use dropdown values only.`);
    return "";
  }
  return resolved;
}

function resolveMaterial(
  value: string,
  lookups: Lookups,
  rowNumber: number,
  errors: string[]
): string {
  if (!value) return "";
  const normalized = normalizeLookupKey(value);
  const resolved = lookups.materialByLabel.get(normalized);
  if (!resolved) {
    errors.push(`Row ${rowNumber}: Invalid material. Please use dropdown values only.`);
    return "";
  }
  return resolved;
}

function resolveUom(
  value: string,
  lookups: Lookups,
  rowNumber: number,
  errors: string[]
): string {
  if (!value) return "";
  const normalized = normalizeLookupKey(value);
  const resolved = lookups.uomByLabel.get(normalized);
  if (!resolved) {
    errors.push(`Row ${rowNumber}: Invalid UOM. Please use dropdown values only.`);
    return "";
  }
  return resolved;
}

function normalizeImageReference(value: string, tenant: string): { filePath: string; filename: string } {
  const raw = String(value || "").trim();
  if (!raw) return { filePath: "", filename: "" };
  let normalized = raw;
  const uploadsIndex = raw.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex !== -1) {
    normalized = raw.slice(uploadsIndex + "/uploads/".length);
  } else if (raw.toLowerCase().startsWith("uploads/")) {
    normalized = raw.slice("uploads/".length);
  } else if (raw.startsWith("/")) {
    normalized = raw.slice(1);
  }
  normalized = normalized.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("/")) {
    const filename = normalized.split("/").pop() || "";
    return { filePath: normalized, filename };
  }
  return { filePath: `${tenant}/image-master/${normalized}`, filename: normalized };
}

async function resolveImageFromMaster(options: {
  client: PoolClient;
  schema: string;
  tenant: string;
  imageRef: string;
}): Promise<{ imageId: number; imageUrl: string } | null> {
  const { filePath, filename } = normalizeImageReference(options.imageRef, options.tenant);
  if (!filePath && !filename) return null;

  let result = await options.client.query(
    `
      SELECT id, file_path
      FROM "${options.schema}".image_master
      WHERE file_path = $1
      LIMIT 1
    `,
    [filePath]
  );

  if (!result.rows.length && filename) {
    result = await options.client.query(
      `
        SELECT id, file_path
        FROM "${options.schema}".image_master
        WHERE filename = $1
        LIMIT 1
      `,
      [filename]
    );
  }

  if (!result.rows.length) return null;
  const row = result.rows[0] as { id: number; file_path: string };
  return { imageId: Number(row.id), imageUrl: `/uploads/${row.file_path}` };
}

async function parseSheet(
  buffer: Buffer,
  options: { tenant: string; lookups: Lookups; client: PoolClient; schema: string }
) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Template is empty");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const parents = new Map<string, ParsedParent>();
  const variants: ParsedVariant[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const generatedSkus: string[] = [];
  const orphanVariants: ParsedVariant[] = [];

  const requiredHeaders = [
    "SKU",
    "Name",
    "Category",
    "Material",
    "UOM",
    "Source",
    "HSN Code",
    "Description",
    "Low stock amount",
    "Backorders allowed",
    "Weight (kg)",
    "Length (cm)",
    "Width (cm)",
    "Height (cm)",
    "Images",
    "Parent SKU",
    "Color",
    "Size",
    "Fitting",
    "Gender",
  ];

  if (rows.length === 0) {
    return {
      parents: [],
      orphanVariants: [],
      errors: ["Template has no data rows."],
      warnings,
      generatedSkus,
    };
  }

  const isRowEmpty = (row: Record<string, unknown>) =>
    requiredHeaders.every((header) => !cell(row, header));

  rows.forEach((row: Record<string, unknown>, index: number) => {
    const rowNumber = index + 2;
    if (isRowEmpty(row)) {
      return;
    }

    const sku = cell(row, "SKU");
    const name = cell(row, "Name");
    const categoryRaw = cell(row, "Category");
    const materialRaw = cell(row, "Material");
    const uomRaw = cell(row, "UOM");
    const sourceRaw = cell(row, "Source");
    const hsnCode = cell(row, "HSN Code");
    const description = cell(row, "Description");
    const lowStockRaw = cell(row, "Low stock amount");
    const backordersRaw = cell(row, "Backorders allowed");
    const weightRaw = cell(row, "Weight (kg)");
    const lengthRaw = cell(row, "Length (cm)");
    const widthRaw = cell(row, "Width (cm)");
    const heightRaw = cell(row, "Height (cm)");
    const images = cell(row, "Images");
    const parentSkuRaw = cell(row, "Parent SKU");
    const color = cell(row, "Color");
    const size = cell(row, "Size");
    const fitting = cell(row, "Fitting");
    const gender = cell(row, "Gender");

    const isParent = !parentSkuRaw;
    const parentSku = parentSkuRaw || sku;

    let source: "own" | "vendor" = "own";
    if (sourceRaw) {
      const normalized = sourceRaw.trim().toLowerCase();
      if (normalized !== "own" && normalized !== "vendor") {
        errors.push(`Row ${rowNumber}: Source must be "own" or "vendor".`);
      } else {
        source = normalized as "own" | "vendor";
      }
    }

    const lowStockAmount = lowStockRaw ? asNumber(lowStockRaw) : null;
    if (lowStockRaw && lowStockAmount === null) {
      errors.push(`Row ${rowNumber}: Low stock amount must be a number.`);
    }

    const backordersAllowed = parseBooleanFlexible(
      backordersRaw,
      "Backorders allowed",
      rowNumber,
      errors
    );

    const weight = weightRaw ? asNumber(weightRaw) : null;
    const length = lengthRaw ? asNumber(lengthRaw) : null;
    const width = widthRaw ? asNumber(widthRaw) : null;
    const height = heightRaw ? asNumber(heightRaw) : null;

    if (weightRaw && weight === null) {
      errors.push(`Row ${rowNumber}: Weight must be a number.`);
    }
    if (lengthRaw && length === null) {
      errors.push(`Row ${rowNumber}: Length must be a number.`);
    }
    if (widthRaw && width === null) {
      errors.push(`Row ${rowNumber}: Width must be a number.`);
    }
    if (heightRaw && height === null) {
      errors.push(`Row ${rowNumber}: Height must be a number.`);
    }

    const categoryId = categoryRaw
      ? resolveCategory(categoryRaw, options.lookups, rowNumber, errors)
      : "";
    const materialId = materialRaw
      ? resolveMaterial(materialRaw, options.lookups, rowNumber, errors)
      : "";
    const uomId = uomRaw ? resolveUom(uomRaw, options.lookups, rowNumber, errors) : "";

    if (isParent) {
      if (!name) {
        errors.push(`Row ${rowNumber}: Name is required for parent product rows.`);
      }
      const parentSku = sku || `AUTO-${rowNumber}`;
      const parentKey = normalizeLookupKey(parentSku);
      if (parents.has(parentKey)) {
        errors.push(`Row ${rowNumber}: Duplicate parent SKU "${sku || parentSku}".`);
        return;
      }

      const parent: ParsedParent = {
        row: rowNumber,
        sku: parentSku,
        isSkuAuto: !sku,
        name,
        categoryId: categoryId || null,
        materialId: materialId || null,
        uomId: uomId || null,
        source,
        hsnCode: hsnCode || null,
        description: description || null,
        weight,
        length,
        width,
        height,
        variants: [],
      };

      parents.set(parentKey, parent);

      parent.variants.push({
        row: rowNumber,
        parentSku: parentSku,
        sku,
        color,
        size,
        fitting,
        gender,
        lowStockAmount,
        backordersAllowed: backordersAllowed ?? false,
        images: [],
        rawImages: images,
      });
      return;
    }

    if (!parentSkuRaw) {
      errors.push(`Row ${rowNumber}: Parent SKU is required for variants.`);
      return;
    }

    variants.push({
      row: rowNumber,
      parentSku: parentSkuRaw,
      sku,
      color,
      size,
      fitting,
      gender,
      lowStockAmount,
      backordersAllowed: backordersAllowed ?? false,
      images: [],
      rawImages: images,
    });

    const parentKey = normalizeLookupKey(parentSkuRaw);
    const parent = parents.get(parentKey);
    if (parent) {
      if (!parent.name && name) parent.name = name;
      if (!parent.categoryId && categoryId) parent.categoryId = categoryId;
      if (!parent.materialId && materialId) parent.materialId = materialId;
      if (!parent.uomId && uomId) parent.uomId = uomId;
      if (!parent.hsnCode && hsnCode) parent.hsnCode = hsnCode;
      if (!parent.description && description) parent.description = description;
      if (parent.weight == null && weight != null) parent.weight = weight;
      if (parent.length == null && length != null) parent.length = length;
      if (parent.width == null && width != null) parent.width = width;
      if (parent.height == null && height != null) parent.height = height;
    }
  });

  for (const variant of variants) {
    const parentKey = normalizeLookupKey(variant.parentSku);
    const parent = parents.get(parentKey);
    if (!parent) {
      orphanVariants.push(variant);
      continue;
    }
    parent.variants.push(variant);
  }

  const buildVariantSku = (parentSku: string, color: string, size: string, fitting: string) => {
    const safeParent = normalizeSku(parentSku || "NA");
    const safeColor = normalizeSku(color || "NA");
    const safeSize = normalizeSku(size || "NA");
    const safeFitting = normalizeSku(fitting || "NA");
    return `${safeParent}-${safeColor}-${safeSize}-${safeFitting}`;
  };

  const skuSet = new Map<string, number>();
  for (const parent of parents.values()) {
    for (const variant of parent.variants) {
      if (!variant.sku) {
        variant.sku = buildVariantSku(parent.sku, variant.color, variant.size, variant.fitting);
        generatedSkus.push(variant.sku);
      }
      const key = normalizeLookupKey(variant.sku);
      if (skuSet.has(key)) {
        errors.push(`Row ${variant.row}: Duplicate SKU "${variant.sku}".`);
      } else {
        skuSet.set(key, variant.row);
      }
    }
  }

  for (const parent of parents.values()) {
    for (const variant of parent.variants) {
      const imageNames = splitImageNames(variant.rawImages);
      if (!imageNames.length) continue;
      for (const imageName of imageNames) {
        const resolved = await resolveImageFromMaster({
          tenant: options.tenant,
          schema: options.schema,
          client: options.client,
          imageRef: imageName,
        });
        if (!resolved) {
          warnings.push(
            `Row ${variant.row}: Image "${imageName}" not found in image-master for tenant "${options.tenant}".`
          );
          continue;
        }
        variant.images.push(resolved);
      }
    }
  }

  return { parents: [...parents.values()], orphanVariants, errors, warnings, generatedSkus };
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const form = await req.formData();
    const tenant = toTenantKey(company);
    const confirm = String(form.get("confirm") || "").toLowerCase() === "true";
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }

    
    const buffer = Buffer.from(await file.arrayBuffer());
    const lookups = await loadLookups(client, schema);
    const parsed = await parseSheet(buffer, {
      tenant,
      lookups,
      client,
      schema,
    });

    if (!confirm) {
      logImportIssues("Preview", parsed.errors, parsed.warnings);
      return NextResponse.json({
        success: parsed.errors.length === 0,
        preview: true,
        inserted: 0,
        generated_skus: parsed.generatedSkus,
        errors: parsed.errors,
        warnings: parsed.warnings,
      });
    }

    if (parsed.errors.length > 0) {
      logImportIssues("Validation", parsed.errors, parsed.warnings);
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          generated_skus: parsed.generatedSkus,
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    if (parsed.parents.length === 0 && parsed.orphanVariants.length === 0) {
      logImportIssues("Validation", ["No valid product rows found"], parsed.warnings);
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          generated_skus: parsed.generatedSkus,
          errors: ["No valid product rows found"],
        },
        { status: 400 }
      );
    }

    const allSkus = [
      ...parsed.parents.flatMap((parent) => parent.variants.map((variant) => variant.sku)),
      ...parsed.orphanVariants.map((variant) => variant.sku),
    ];
    const uniqueSkuMap = new Map<string, string>();
    allSkus.forEach((sku) => {
      const key = normalizeLookupKey(sku);
      if (!uniqueSkuMap.has(key)) uniqueSkuMap.set(key, sku);
    });

    if (uniqueSkuMap.size > 0) {
      const existing = await client.query(
        `
          SELECT sku
          FROM "${schema}".product_variants
          WHERE sku = ANY($1::text[])
        `,
        [[...uniqueSkuMap.values()]]
      );
      if (existing.rows.length > 0) {
        const dupes = existing.rows.map((row: { sku: string }) => row.sku);
        logImportIssues(
          "Validation",
          dupes.map((sku) => `SKU \"${sku}\" already exists.`),
          parsed.warnings
        );
        return NextResponse.json(
          {
            success: false,
            inserted: 0,
            generated_skus: parsed.generatedSkus,
            errors: dupes.map((sku) => `SKU "${sku}" already exists.`),
          },
          { status: 400 }
        );
      }
    }

    await client.query("BEGIN");
    let existingParentMap = new Map<string, number>();
    if (parsed.orphanVariants.length) {
      const uniqueParentSkus = [
        ...new Set(parsed.orphanVariants.map((variant) => variant.parentSku)),
      ];
      const parentRes = await client.query(
        `
          SELECT sku, product_id
          FROM "${schema}".product_variants
          WHERE sku = ANY($1::text[])
        `,
        [uniqueParentSkus]
      );
      existingParentMap = new Map(
        parentRes.rows.map((row: { sku: string; product_id: number }) => [row.sku, row.product_id])
      );

      parsed.orphanVariants.forEach((variant) => {
        if (!existingParentMap.has(variant.parentSku)) {
          parsed.errors.push(
            `Row ${variant.row}: Parent SKU "${variant.parentSku}" not found in upload or database.`
          );
        }
      });
    }

    if (parsed.errors.length > 0) {
      await client.query("ROLLBACK");
      logImportIssues("Validation", parsed.errors, parsed.warnings);
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          generated_skus: parsed.generatedSkus,
          errors: parsed.errors,
          warnings: parsed.warnings,
        },
        { status: 400 }
      );
    }

    const nextProductCode = async () => {
      const result = await client.query(
        `
          SELECT COALESCE(
            MAX(CAST(SUBSTRING(product_code FROM 4) AS INTEGER)),
            0
          ) AS max_code
          FROM "${schema}".products
          WHERE product_code ~ $1
        `,
        ["^PR-[0-9]+$"]
      );
      const maxCode = Number(result.rows[0]?.max_code || 0);
      let current = maxCode + 1;
      return () => `PR-${String(current++).padStart(3, "0")}`;
    };

    const getNextCode = await nextProductCode();
    let insertedRows = 0;
    try {
      for (const group of parsed.parents) {
        const productCode = getNextCode();
        const productInsert = await client.query(
          `
            INSERT INTO "${schema}".products
              (product_code, name, category, material, uom, hsn_code, description, weight, length, width, height, source, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
            RETURNING id
          `,
          [
            productCode,
            group.name,
            group.categoryId || null,
            group.materialId || null,
            group.uomId || null,
            group.hsnCode || null,
            group.description || null,
            group.weight,
            group.length,
            group.width,
            group.height,
            group.source || "own",
          ]
        );
        const productId = productInsert.rows[0].id as number;

        let firstImageSet = false;
        for (const variant of group.variants) {
          const variantInsert = await client.query(
            `
              INSERT INTO "${schema}".product_variants
                (product_id, color, size, fitting, gender, sku, qty, low_stock_threshold, backorders_allowed, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
              RETURNING id
            `,
            [
              productId,
              variant.color || null,
              variant.size || null,
              variant.fitting || null,
              variant.gender || null,
              variant.sku,
              0,
              variant.lowStockAmount ?? 5,
              variant.backordersAllowed,
            ]
          );
          const variantId = variantInsert.rows[0].id as number;
          await client.query(
            `
              UPDATE "${schema}".product_variants
              SET barcode = LPAD(id::text, 10, '0')
              WHERE id = $1
            `,
            [variantId]
          );
          insertedRows += 1;

          for (const image of variant.images) {
            await client.query(
              `
                INSERT INTO "${schema}".product_images
                  (product_id, variant_id, image_id, image_url, alt_text, is_primary, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, 1)
              `,
              [productId, variantId, image.imageId, image.imageUrl, null, !firstImageSet]
            );
            if (!firstImageSet) firstImageSet = true;
          }
        }
      }

      if (existingParentMap.size > 0) {
        for (const variant of parsed.orphanVariants) {
          const productId = existingParentMap.get(variant.parentSku);
          if (!productId) continue;

          const variantInsert = await client.query(
            `
              INSERT INTO "${schema}".product_variants
                (product_id, color, size, fitting, gender, sku, qty, low_stock_threshold, backorders_allowed, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
              RETURNING id
            `,
            [
              productId,
              variant.color || null,
              variant.size || null,
              variant.fitting || null,
              variant.gender || null,
              variant.sku,
              0,
              variant.lowStockAmount ?? 5,
              variant.backordersAllowed,
            ]
          );
          const variantId = variantInsert.rows[0].id as number;
          await client.query(
            `
              UPDATE "${schema}".product_variants
              SET barcode = LPAD(id::text, 10, '0')
              WHERE id = $1
            `,
            [variantId]
          );
          insertedRows += 1;

          let firstImageSet = false;
          for (const image of variant.images) {
            await client.query(
              `
                INSERT INTO "${schema}".product_images
                  (product_id, variant_id, image_id, image_url, alt_text, is_primary, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, 1)
              `,
              [productId, variantId, image.imageId, image.imageUrl, null, !firstImageSet]
            );
            if (!firstImageSet) firstImageSet = true;
          }
        }
      }
    } catch (importError: any) {
      await client.query("ROLLBACK");
      const detail = importError?.detail || importError?.message || "Unknown import error";
      logImportIssues("Import", [`Import failed. ${detail}`], parsed.warnings);
      return NextResponse.json(
        {
          message: `Import failed. No changes were committed. ${detail}`,
          detail,
          code: importError?.code || null,
        },
        { status: 400 }
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      inserted:  insertedRows,
      generated_skus: parsed.generatedSkus,
      errors: [],
      warnings: parsed.warnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, errors: [error.message || "Failed to import products"], inserted: 0 },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
