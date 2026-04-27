import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
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
 
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
 
    const client = await pool.connect();
 
    try {
 
        const { schema } = await getTenantSchema(req);
        const { id: purchaseId } = await context.params;
 
        const headerRes = await client.query(
            `SELECT
              ph.*,
              s.supplier_code,
              s.name as supplier_name,
              s.email as supplier_email,
              s.phone as supplier_phone,
              s.currency as curr,
			  c.currency_code as currency,
              CONCAT_WS(', ', s.address_line1, s.address_line2, s.address_line3, s.city, s.state, s.pincode) as supplier_address,
              bt.supplier_code as bill_to_code,
              bt.name as bill_to_name,
              CONCAT_WS(', ', bt.address_line1, bt.address_line2, bt.address_line3, bt.city, bt.state, bt.pincode) as bill_to_address,
              st.supplier_code as ship_to_code,
              st.name as ship_to_name,
              CONCAT_WS(', ', st.address_line1, st.address_line2, st.address_line3, st.city, st.state, st.pincode) as ship_to_address,
              dt.despatch_name as despatch_terms_name,
              pt.name as payment_terms_name,
              c.currency_code as currency_code
            FROM ${schema}.purchase_header ph
            LEFT JOIN ${schema}.suppliers s
              ON ph.supplier_id = s.id
            Left Join tenant_7.currencies c
			  ON ph.currency=c.id
            LEFT JOIN ${schema}.suppliers bt
              ON ph.bill_to = bt.id
            LEFT JOIN ${schema}.suppliers st
              ON ph.ship_to = st.id
            LEFT JOIN "${schema}".despatch_terms dt
              ON ph.despatch_terms = dt.id
            LEFT JOIN "${schema}".payment_terms pt
              ON ph.payment_terms = pt.id
            LEFT JOIN "${schema}".currencies cr
              ON cr.id::text = ph.currency::text
            WHERE ph.id=$1`,
            [purchaseId]
        );
 
        const detailRes = await client.query(
            `SELECT
                d.*,
                p.product_code,
                p.name AS product_name,
                p.description,
                d.tax_master_id AS tax_id,
                tr.tax_name,
                tr.total_percentage AS tax_percent,
                u.uom_code,
                u.uom_name,
                pv.sku
            FROM ${schema}.purchase_detail d
            LEFT JOIN ${schema}.product_variants pv
              ON pv.id = d.product_id
            LEFT JOIN ${schema}.products p
              ON p.id = COALESCE(pv.product_id, d.product_id)
            LEFT JOIN "${schema}".uom u
              ON u.id::text = p.uom
            LEFT JOIN ${schema}.tax_master tr
              ON tr.id = d.tax_master_id
            WHERE d.purchase_id = $1`,
            [purchaseId]
        );
 
        return NextResponse.json({
            success: true,
            data: {
                header: headerRes.rows[0],
                details: detailRes.rows
            }
        });
 
    } catch (error: any) {
 
        console.error("Fetch Purchase Error:", error);
 
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
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
 
        const { schema } = await getTenantSchema(req);
        const { id: purchaseId } = await context.params;
 
        const body = await req.json();
 
        const { header, details } = body;
 
        const {
            po_type,
            purchase_no,
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
            user_name
        } = header;
     

        await client.query("BEGIN");

        const poType = po_type || "standard";
        const purchaseNo = String(purchase_no || "").trim();
        if (poType === "manual" && !purchaseNo) {
            throw new Error("PO number is required for manual type");
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
        const freightBase = toNumber(freight_charges);
        const freightTaxAmount = toNumber(freight_tax_amount);
        const packagingAmount = toNumber(packaging_amount);
        const extraChargesTotal = freightBase + freightTaxAmount + packagingAmount;
        const grandTotal = subtotal + productTax + extraChargesTotal;

        // UPDATE HEADER
        await client.query(
            `
      UPDATE ${schema}.purchase_header
      SET po_type=$1,
          purchase_no=$2,
          bill_to=$3,
          ship_to=$4,
          despatch_terms=$5,
          payment_terms=$6,
          freight_charges=$7,
          freight_tax=$8,
          freight_tax_amount=$9,
          packaging_amount=$10,
          notes=$11,
          attachment_url=$12,
          supplier_id=$13,
          purchase_date=$14,
          req_date=$15,
          currency=$16,
          conversion_rate=$17,
          status=$18,
          subtotal=$19,
          tax_amount=$20,
          total_amount=$21,
          updated_by=$22,
          updated_at=NOW()
      WHERE id=$23
      `,
            [
                poType,
                purchaseNo || null,
                bill_to ? Number(bill_to) : null,
                ship_to ? Number(ship_to) : null,
                despatch_terms ? Number(despatch_terms) : null,
                payment_terms ? Number(payment_terms) : null,
                Number(freight_charges || 0),
                Number(freight_tax || 0),
                Number(freight_tax_amount || 0),
                Number(packaging_amount || 0),
                notes || null,
                attachment_url || null,
                supplier_id,
                purchase_date,
                req_date,
                currency,
                conversion_rate,
                status || "Awaiting for approval",
                round2(subtotal),
                round2(productTax),
                round2(grandTotal),
                user_name,
                purchaseId
            ]
        );
 
        // FETCH existing detail ids from DB
        const existingRes = await client.query(
            `SELECT id FROM ${schema}.purchase_detail WHERE purchase_id=$1`,
            [purchaseId]
        );
 
        const existingIds = existingRes.rows.map((r) => r.id);
 
        const incomingIds = details
            .filter((d: any) => d.id)
            .map((d: any) => d.id);
 
        // FIND deleted rows
        const deletedIds = existingIds.filter(
            (id: number) => !incomingIds.includes(id)
        );
 
        if (deletedIds.length > 0) {
            await client.query(
                `DELETE FROM ${schema}.purchase_detail
         WHERE id = ANY($1::int[])`,
                [deletedIds]
            );
        }
 
        // LOOP details
        for (const item of details) {
 
            const taxMasterId = item.tax_id && item.tax_id > 0 ? item.tax_id : null;
            let variantId = item.product_id;
            // HANDLE MANUAL PRODUCT
            if (item.isManual || !item.product_id) {
 
                // Check by product_code (BEST)
                const checkQuery = `
      SELECT id FROM ${schema}.products
      WHERE LOWER(product_code) = LOWER($1)
      LIMIT 1
    `;
 
                const checkRes = await client.query(checkQuery, [item.product_code]);
 
                if (checkRes.rows.length > 0) {
                    // already exists
                    // productId = checkRes.rows[0].id;
                    throw new Error(`Product Code '${item.product_code}' already exists`);
                } else {
                    // insert new product
                    const insertProductQuery = `
        INSERT INTO ${schema}.products
        (product_code, name, description, uom,hsn_code,created_at)
        VALUES ($1,$2,$3,$4,$5,NOW())
        RETURNING id
      `;
 
                    const productRes = await client.query(insertProductQuery, [
                        item.product_code,
                        item.product_name,
                        item.description,
                        item.uom,
                        item.hsn_no
                    ]);
 
                    const productId = productRes.rows[0].id;
                    const baseSku = buildAutoSku(String(item.product_code || ""), "NA", "NA");
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
                variantId = await resolveVariantId(client, schema, item.product_id);
            }

            if (item.id) {
               
 
                // UPDATE EXISTING ROW
                await client.query(
                    `
          UPDATE ${schema}.purchase_detail
          SET product_id=$1,
              UOM=$2,
              HSN_NO=$3,
              rate=$4,
              qty=$5,
              tax_master_id=$6,
              tax_amount=$7,
              line_total=$8,
              updated_by=$9,
              updated_at=NOW()
          WHERE id=$10
          `,
                    [
                        variantId,
                        item.uom,
                        item.hsn_no,
                        item.rate,
                        item.qty,
                        taxMasterId,
                        item.tax_amount,
                        item.line_total,
                        user_name,
                        item.id
                    ]
                );
 
            } else {
 
                // INSERT NEW ROW
                await client.query(
                    `
          INSERT INTO ${schema}.purchase_detail
          (
            purchase_id,
            product_id,
            UOM,
            HSN_NO,
            rate,
            qty,
            tax_master_id,
            tax_amount,
            line_total,
            created_by,
            created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
          `,
                    [
                        purchaseId,
                        variantId,
                        item.uom,
                        item.hsn_no,
                        item.rate,
                        item.qty,
                        taxMasterId,
                        item.tax_amount,
                        item.line_total,
                        user_name
                    ]
                );
            }
        }
 
        await client.query("COMMIT");
 
        return NextResponse.json({
            success: true,
            message: "Purchase Updated Successfully"
        });
 
    } catch (error: any) {
 
        await client.query("ROLLBACK");
 
        console.error("Purchase Update Error:", error);
 
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
 
    } finally {
 
        client.release();
 
    }
}
 
