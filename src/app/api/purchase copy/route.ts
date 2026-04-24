import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generatePurchaseNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";

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

  console.log("Fetched Purchases:", res.rows);
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

    if (!header || !details?.length) {
      return NextResponse.json(
        { success: false, error: "Header and at least one detail are required" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Generate purchase_no
    const purchaseNo = await generatePurchaseNo(schema);

    // Insert header
    const headerQuery = `
      INSERT INTO ${schema}.purchase_header
        (purchase_no, supplier_id, purchase_date, req_date,currency,conversion_rate, status,approval_status, subtotal, tax_amount, total_amount,created_by,created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      RETURNING id
    `;
    const headerValues = [
      purchaseNo,
      header.supplier_id,
      header.purchase_date,
      header.req_date,
      header.currency,
      header.conversion_rate === "" ? null : Number(header.conversion_rate),
      header.status || "Entered",
      header.approval_status || "Awaiting for approval",
      header.subtotal,
      header.tax_amount,
      header.total_amount,
      header.user_name
    ];

    const headerRes = await client.query(headerQuery, headerValues);
    if (!headerRes.rows.length) throw new Error("Failed to save purchase header");

    const purchaseId = headerRes.rows[0].id;

    // Insert details
    const detailQuery = `
      INSERT INTO ${schema}.purchase_detail
        (purchase_id, product_id,UOM,HSN_NO, rate,qty,tax_master_id, tax_amount, line_total,created_by,created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    `;

    for (const d of details) {
      const taxMasterId = d.tax_id && d.tax_id > 0 ? d.tax_id : null;
      console.log("taxMasterId : ",taxMasterId);
      await client.query(detailQuery, [
        purchaseId,
        d.product_id,
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
    console.error("Purchase Save Error:", err);
    let msg = "Internal server error";
    if (err.code === "23505") msg = "Duplicate entry detected";
    else if (err.message) msg = err.message;

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}