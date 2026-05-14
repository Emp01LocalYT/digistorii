import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generatePurchaseNo, getNextProductCodeByType } from "@/lib/document-number-generator";
import { buildAutoSku, getTenantSchema } from "@/lib/tenant";

async function skuExists(client: any, schema: string, sku: string) {
  const res = await client.query(
    `SELECT 1 FROM "${schema}".product_variants WHERE upper(sku) = upper($1) LIMIT 1`,
    [sku]
  );
  return res.rowCount > 0;
}

async function resolveUniqueSku(client: any, schema: string, baseSku: string) {
  let candidate = baseSku;
  let counter = 1;
  while (await skuExists(client, schema, candidate)) {
    candidate = `${baseSku}-${counter}`;
    counter += 1;
  }
  return candidate;
}

async function resolveVariantId(
  client: any,
  schema: string,
  idValue: any
): Promise<number> {
  const id = Number(idValue);
  if (!Number.isFinite(id)) throw new Error("Invalid variant id");
  const variantRes = await client.query(
    `SELECT id FROM "${schema}".product_variants WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (variantRes.rows.length) return Number(variantRes.rows[0].id);

  const fallbackRes = await client.query(
    `SELECT id FROM "${schema}".product_variants WHERE product_id = $1 ORDER BY id ASC LIMIT 1`,
    [id]
  );
  if (fallbackRes.rows.length) return Number(fallbackRes.rows[0].id);
  throw new Error("Variant not found for selected product");
}

async function createVariantForNewProduct(
  client: any,
  schema: string,
  detail: any,
  newProduct: any,
  tempKey: string,
  cache: Map<string, number>
) {
  console.log("CREATE TEMP PRODUCT", {
    tempKey,
    productName: newProduct?.name || detail?.product_name,
    sku: newProduct?.sku,
    detailProductId: detail?.product_id,
  });
  if (cache.has(tempKey)) {
    const cachedVariantId = cache.get(tempKey)!;
    console.log("REUSE CACHED TEMP PRODUCT VARIANT", { tempKey, variantId: cachedVariantId });
    return cachedVariantId;
  }

  const productName = String(newProduct?.name || detail?.product_name || "").trim();
  if (!productName) {
    throw new Error("New product name is required");
  }
  const type =
    detail?.type === "raw_material" || detail?.type === "other" ? detail.type : "finished_good";
  const source = newProduct?.source === "vendor" ? "vendor" : "own";
  const categoryId = String(newProduct?.categoryId || "").trim();
  const productCode = await getNextProductCodeByType(schema, type);

  const productRes = await client.query(
    `
      INSERT INTO "${schema}".products
        (product_code, name, category, material, uom, hsn_code, description, type, source, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW())
      RETURNING id
    `,
    [
      productCode,
      productName,
      categoryId || null,
      null,
      String(detail?.uom || "").trim() || null,
      String(detail?.hsn_no || "").trim() || null,
      String(detail?.description || "").trim() || null,
      type,
      source,
    ]
  );

  const productId = Number(productRes.rows[0]?.id);
  if (!Number.isFinite(productId)) {
    throw new Error("Failed to create product for purchase item");
  }

  const requestedSku = String(newProduct?.sku || "").trim();
  let sku = requestedSku;
  if (requestedSku) {
    if (await skuExists(client, schema, requestedSku)) {
      throw new Error(`SKU "${requestedSku}" already exists`);
    }
  } else {
    const baseSku = buildAutoSku(productCode, "NA", "NA");
    sku = await resolveUniqueSku(client, schema, baseSku);
  }

  const variantRes = await client.query(
    `
      INSERT INTO "${schema}".product_variants
        (product_id, color, size, sku, qty, low_stock_threshold, backorders_allowed, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING id
    `,
    [productId, "NA", "NA", sku, 0, 5, false]
  );
  const variantId = Number(variantRes.rows[0]?.id);
  if (!Number.isFinite(variantId)) {
    throw new Error("Failed to create variant for purchase item");
  }

  await client.query(
    `
      UPDATE "${schema}".product_variants
      SET barcode = LPAD(id::text, 10, '0')
      WHERE id = $1
    `,
    [variantId]
  );
  cache.set(tempKey, variantId);
  return variantId;
}
 
// ---------------- GET: fetch all purchases with details ----------------
// export async function GET(req: NextRequest) {
//   try {
 
//     const { tenant, schema } = await getTenantSchema(req);
 
//     const res = await pool.query(`
//       SELECT
//         h.id as purchase_id,
//         h.purchase_no,
//         h.supplier_id,
//         h.purchase_date,
//         h.req_date,
//         h.currency,
//         h.conversion_rate,
//         h.status,
//         h.approval_status,
//         h.reject_reason,
//         h.subtotal,
//         h.tax_amount,
//         h.total_amount,
//         h.created_by,
//         d.id as detail_id,
//         d.product_id,
//         p.name as product_name,
//         d.UOM,
//         d.HSN_NO,
//         d.rate,
//         d.qty,
//         d.tax_amount,
//         d.line_total,
//         s.supplier_code,
//         s.name as supplier_name,
//         s.email as supplier_email,
//         s.phone as supplier_phone,
//         CONCAT_WS(', ',
//           s.address_line1,
//           s.address_line2,
//           s.address_line3,
//           s.city,
//           s.state,
//           s.pincode
//         ) as supplier_address,
//          tr.tax_name,
//          tr.total_percentage as tax_percent
//       FROM ${schema}.purchase_header h
//       LEFT JOIN ${schema}.purchase_detail d
//         ON d.purchase_id = h.id
//       LEFT JOIN ${schema}.suppliers s
//         ON h.supplier_id = s.id
//       LEFT JOIN ${schema}.products p
//         ON p.id::text = d.product_id::text
//       LEFT JOIN ${schema}.tax_master tr
//         ON tr.id = d.tax_master_id
//       ORDER BY h.id DESC
//     `);
 
//     const dataMap: Record<string, any> = {};
 
//     for (const row of res.rows) {
 
//       if (!dataMap[row.purchase_id]) {
//         dataMap[row.purchase_id] = {
//           id: row.purchase_id,
//           purchase_no: row.purchase_no,
//           supplier_id: row.supplier_id,
//           req_date: row.req_date,
//           currency:row.currency,
//           conversion_rate:row.conversion_rate,
//           status:row.status,
//           approval_status:row.approval_status,
//           reject_reason:row.reject_reason,
//           supplier_code: row.supplier_code,
//           supplier_name: row.supplier_name,
//           supplier_email: row.supplier_email,
//           supplier_phone: row.supplier_phone,
//           supplier_address: row.supplier_address,
//           purchase_date: row.purchase_date,
//           subtotal: row.subtotal,
//           tax_amount: row.tax_amount,
//           total_amount: row.total_amount,
//           created_by:row.created_by,
//           details: []
//         };
//       }
 
//       if (row.detail_id) {
//         dataMap[row.purchase_id].details.push({
//           id: row.detail_id,
//           product_id: row.product_id,
//           product_name: row.product_name,
//           uom:row.UOM,
//           hsn_no:row.HSN_NO,
//           tax_name:row.taxname,
//           tax_percent:row.tax_percent,
//           rate: row.rate,
//           qty: row.qty,
//           tax_amount: row.tax_amount,
//           line_total: row.line_total
//         });
//       }
//     }
//     console.log("Fetched Purchases:", Object.values(dataMap));
//     return NextResponse.json({
//       success: true,
//       data: Object.values(dataMap)
//     });
 
//   } catch (err: any) {
 
//     console.error("Purchase Fetch DB Error:", err);
 
//     if (err.code === "42P01") {
//       return NextResponse.json(
//         { success: false, error: "Table purchase_header or purchase_detail does not exist" },
//         { status: 500 }
//       );
//     }
 
//     if (err.code === "28P01") {
//       return NextResponse.json(
//         { success: false, error: "Database authentication failed" },
//         { status: 500 }
//       );
//     }
 
//     return NextResponse.json(
//       {
//         success: false,
//         error: err.message || "Database query failed"
//       },
//       { status: 500 }
//     );
//   }
// }
 
export async function GET(req: NextRequest) {
  try {
 
    const { company, schema } = await getTenantSchema(req);
 
    const res = await pool.query(`
      SELECT
        h.*,
        s.supplier_code,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        CONCAT_WS(', ',
          s.address_line1,
          s.address_line2,
          s.address_line3,
          s.city,
          s.state,
          s.pincode
        ) as supplier_address
      FROM ${schema}.purchase_header h
      LEFT JOIN ${schema}.suppliers s
        ON h.supplier_id = s.id
      ORDER BY h.id DESC
    `);
 
    // console.log("Fetched Purchases:", res.rows);
    return NextResponse.json({ success: true, data: res.rows });
 
  } catch (err: any) {
 
    console.error("Purchase Fetch DB Error:", err);
 
    if (err.code === "42P01") {
      return NextResponse.json(
        { success: false, error: "Table purchase_header or purchase_detail does not exist" },
        { status: 500 }
      );
    }
 
    if (err.code === "28P01") {
      return NextResponse.json(
        { success: false, error: "Database authentication failed" },
        { status: 500 }
      );
    }
 
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Database query failed"
      },
      { status: 500 }
    );
  }
}
 
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();
    const { header, details } = body;
    console.log("RECEIVED PO PAYLOAD", {
      header: { po_type: header?.po_type, purchase_no: header?.purchase_no, supplier_id: header?.supplier_id },
      detailCount: Array.isArray(details) ? details.length : 0,
      detailSummaries: Array.isArray(details)
        ? details.map((d: any) => ({ product_id: d.product_id, product_code: d.product_code, hasNewProduct: !!d.newProduct }))
        : [],
    });

    const supplierRes = await client.query(
  `SELECT purchase_hold FROM ${schema}.suppliers WHERE id = $1`,
  [header.supplier_id]
);

if (supplierRes.rows[0]?.purchase_hold) {
  return NextResponse.json(
    { success: false, message: "Supplier is on purchase hold" },
    { status: 400 }
  );
}
 
    if (!header || !details?.length) {
      return NextResponse.json(
        { success: false, error: "Header and at least one detail are required" },
        { status: 400 }
      );
    }
 
    await client.query("BEGIN");
 
    const poType = header.po_type || "standard";
    let purchaseNo = String(header.purchase_no || "").trim();

    if (poType === "manual") {
      if (!purchaseNo) {
        throw new Error("PO number is required for manual type");
      }
    } else {
      // Generate purchase_no
      purchaseNo = await generatePurchaseNo(schema);
    }
 
    const toNumber = (value: any) => Number(value || 0);
    const round2 = (value: number) => Number(value.toFixed(2));
    const subtotal = details.reduce(
      (sum: number, d: any) => sum + toNumber(d.qty) * toNumber(d.rate),
      0
    );
    const productTax = details.reduce(
      (sum: number, d: any) => sum + toNumber(d.tax_amount),
      0
    );
    const freightBase = toNumber(header.freight_charges);
    const freightTaxAmount = toNumber(header.freight_tax_amount);
    const packagingAmount = toNumber(header.packaging_amount);
    const extraChargesTotal = freightBase + freightTaxAmount + packagingAmount;
    const grandTotal = subtotal + productTax + extraChargesTotal;

    // Insert header
    const headerQuery = `
      INSERT INTO ${schema}.purchase_header
        (
          po_type,
          purchase_no,
          ref_no,
          bill_to,
          ship_to,
          despatch_terms,
          payment_terms,
          freight_charges,
          freight_tax,
          freight_tax_amount,
          packaging_amount,
          notes,
          attachment_url,
          supplier_id,
          purchase_date,
          req_date,
          currency,
          conversion_rate,
          status,
          approval_status,
          subtotal,
          tax_amount,
          total_amount,
          renewed_from_po_id,
          created_by,
          created_at
        )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW())
      RETURNING id
    `;
    const headerValues = [
      poType,
      purchaseNo,
      header.ref_no,
      header.bill_to ? Number(header.bill_to) : null,
      header.ship_to ? Number(header.ship_to) : null,
      header.despatch_terms ? Number(header.despatch_terms) : null,
      header.payment_terms ? Number(header.payment_terms) : null,
      Number(header.freight_charges || 0),
      Number(header.freight_tax || 0),
      Number(header.freight_tax_amount || 0),
      Number(header.packaging_amount || 0),
      header.notes || null,
      header.attachment_url || null,
      header.supplier_id,
      header.purchase_date,
      header.req_date,
      header.currency,
      header.conversion_rate === "" ? null : Number(header.conversion_rate),
      header.status || "Awaiting for approval",
      header.approval_status || "Awaiting for approval",
      round2(subtotal),
      round2(productTax),
      round2(grandTotal),
      header.renewed_from_po_id ? Number(header.renewed_from_po_id) : null,
      header.user_name
    ];
 
    const headerRes = await client.query(headerQuery, headerValues);
    if (!headerRes.rows.length) throw new Error("Failed to save purchase header");
 
    const purchaseId = headerRes.rows[0].id;
 
    // Insert details
    const detailQuery = `
      INSERT INTO ${schema}.purchase_detail
        (purchase_id, product_id,UOM,HSN_NO, rate,qty,tax_master_id, tax_amount, line_total,created_by,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    `;

    const createdTempVariantMap = new Map<string, number>();
 
    console.log("DETECTED NEW PRODUCTS", details.filter((d: any) => d?.newProduct && typeof d.newProduct === "object").map((d: any) => ({ product_id: d.product_id, product_code: d.product_code, newProduct: d.newProduct })));
    for (const d of details) {
      let variantId = d.product_id;
      if (d?.newProduct && typeof d.newProduct === "object") {
        const tempKey = String(d.product_id || d.newProduct?.sku || d.newProduct?.name || "");
        variantId = await createVariantForNewProduct(
          client,
          schema,
          d,
          d.newProduct,
          tempKey,
          createdTempVariantMap
        );
        console.log("CREATED PRODUCT IDS", { tempKey, product_id: d.product_id, variantId });
      }
      // Step A: Check if manual
      else if (d.isManual) {
        // Check if product already exists (by name)
        const checkQuery = `
      SELECT id FROM ${schema}.products
      WHERE LOWER(product_code) = LOWER($1)
      LIMIT 1
    `;
        const checkRes = await client.query(checkQuery, [d.product_code]);
        if (checkRes.rows.length > 0) {
          // Product exists → reuse
          // productId = checkRes.rows[0].id;
          throw new Error(`Product Code '${d.product_code}' already exists`);
        } else {
          // Insert new product
          const insertProductQuery = `
        INSERT INTO ${schema}.products
          (product_code,name, description,uom,hsn_code, created_at)
        VALUES ($1,$2,$3,$4,$5,NOW())
        RETURNING id
      `;
 
          const productRes = await client.query(insertProductQuery, [
            d.product_code,
            d.product_name,
            d.description,
            d.uom,
            d.hsn_no
          ]);

          const productId = productRes.rows[0].id;
          const baseSku = buildAutoSku(String(d.product_code || ""), "NA", "NA");
          const sku = await resolveUniqueSku(client, schema, baseSku);
          const variantRes = await client.query(
            `
            INSERT INTO "${schema}".product_variants
              (product_id, color, size, sku, qty, low_stock_threshold, backorders_allowed, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
            RETURNING id
          `,
            [productId, "NA", "NA", sku, 0, 5, false]
          );
          variantId = variantRes.rows[0].id;
          await client.query(
            `
              UPDATE "${schema}".product_variants
              SET barcode = LPAD(id::text, 10, '0')
              WHERE id = $1
            `,
            [variantId]
          );
        }

      } else {
        variantId = await resolveVariantId(client, schema, d.product_id);
      }
      const taxMasterId = d.tax_id && d.tax_id > 0 ? d.tax_id : null;
      await client.query(detailQuery, [
        purchaseId,
        variantId,
        d.uom,
        d.hsn_no,
        d.rate,
        d.qty,
        taxMasterId,
        d.tax_amount,
        d.line_total,
        header.user_name
      ]);
    }
 
    await client.query("COMMIT");
 
    return NextResponse.json({
      success: true,
      message: "Purchase saved successfully",
      purchase_no: purchaseNo,
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Purchase Save Failed, rolling back:", err);
    let msg = "Internal server error";
    if (err.code === "23505") msg = "Duplicate entry detected";
    else if (err.message) msg = err.message;
 
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  } finally {
    client.release();
  }
}
