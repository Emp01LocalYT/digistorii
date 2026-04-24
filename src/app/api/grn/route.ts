import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateGRNNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";
import { isFinalStatus, postGrnToLedger } from "@/lib/stockLedger";

// ---------------- GET: fetch all GRN with details ----------------
// export async function GET(req: NextRequest) {
//   try {

//     const { tenant, schema } = await getTenantSchema(req);

//     const res = await pool.query(`
//       SELECT 
//         h.id as grn_id,
//         h.grn_no,
//         h.grn_date,
//         h.purchase_id,
//         h.supplier_id,
//         h.status,
//         h.po_status,
//         h.created_by,
//         d.id as detail_id,
//         d.product_id,
//         p.name as product_name,
//         d.UOM,
//         d.HSN_NO,
//         d.order_qty,
//         d.qty,
//         ph.purchase_no,
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
//         ) as supplier_address
//       FROM ${schema}.grn_header h
//       LEFT JOIN ${schema}.grn_detail d
//         ON d.grn_id = h.id
//       LEFT JOIN ${schema}.purchase_header ph
//         ON h.purchase_id = ph.id
//       LEFT JOIN ${schema}.suppliers s
//         ON h.supplier_id = s.id
//       LEFT JOIN ${schema}.products p
//         ON p.id::text = d.product_id::text
//       ORDER BY h.id DESC
//     `);

//     const dataMap: Record<string, any> = {};

//     for (const row of res.rows) {

//       if (!dataMap[row.grn_id]) {
//         dataMap[row.grn_id] = {
//           id: row.grn_id,
//           grn_no: row.grn_no,
//           grn_date: row.grn_date,
//           purchase_id:row.purchase_id,
//           purchase_no:row.purchase_no,
//           supplier_id: row.supplier_id,
//           supplier_code: row.supplier_code,
//           supplier_name: row.supplier_name,
//           supplier_email: row.supplier_email,
//           supplier_phone: row.supplier_phone,
//           supplier_address: row.supplier_address,
//           status: row.status,
//           po_status: row.po_status,
//           created_by:row.created_by,
//           details: []
//         };
//       }

//       if (row.detail_id) {
//         dataMap[row.grn_id].details.push({
//           id: row.detail_id,
//           product_id: row.product_id,
//           product_name: row.product_name,
//           uom:row.UOM,
//           hsn_no:row.HSN_NO,
//           order_qty: row.order_qty,
//           qty: row.qty
//         });
//       }
//     }
//     console.log("Fetched GRN:", Object.values(dataMap));
//     return NextResponse.json({
//       success: true,
//       data: Object.values(dataMap)
//     });

//   } catch (err: any) {

//     console.error("GRN Fetch DB Error:", err);

//     if (err.code === "42P01") {
//       return NextResponse.json(
//         { success: false, error: "Table grn_header or grn_detail does not exist" },
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
        ph.purchase_no,
        ph.status,
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
      FROM ${schema}.grn_header h
      LEFT JOIN ${schema}.purchase_header ph
        ON h.purchase_id = ph.id
      LEFT JOIN ${schema}.suppliers s
        ON h.supplier_id = s.id
      ORDER BY h.id DESC
    `);
    // console.log("Fetched GRN:", res.rows);
    return NextResponse.json({ success: true, data: res.rows });

  } catch (err: any) {

    console.error("GRN Fetch DB Error:", err);

    if (err.code === "42P01") {
      return NextResponse.json(
        { success: false, error: "Table grn_header or grn_detail does not exist" },
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

    // Generate grn_no
    const grnNo = await generateGRNNo(schema);

    // Insert header
    const headerQuery = `
      INSERT INTO ${schema}.grn_header
        (grn_no,grn_date,purchase_id,supplier_id, status,po_status,created_by,created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      RETURNING id
    `;
    const statusValue = header.status || "Entered";
    const headerValues = [
      grnNo,
      header.grn_date,
      header.purchase_id,
      header.supplier_id,
      statusValue,
      header.po_status || "Approved",
      header.user_name
    ];
    const headerRes = await client.query(headerQuery, headerValues);
    if (!headerRes.rows.length) throw new Error("Failed to save grn header");

    const grnId = headerRes.rows[0].id;

    // Insert details
    const detailQuery = `
      INSERT INTO ${schema}.grn_detail
        (grn_id, product_id, warehouse_id, locator_id, UOM, HSN_NO, order_qty, received_qty, qty, created_by, created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    `;

    for (const d of details) {
      const orderQty = Number(d.order_qty);
      const newQty = Number(d.qty);
      const receivedRes = await client.query(
        `
        SELECT COALESCE(SUM(qty),0) as received_qty
        FROM ${schema}.grn_detail gd
        JOIN ${schema}.grn_header gh
        ON gh.id = gd.grn_id
        WHERE gh.purchase_id=$1
        AND gd.product_id=$2
        `,
        [header.purchase_id, d.product_id]
      );
      const receivedQty = Number(receivedRes.rows[0].received_qty);

      if ((receivedQty + newQty) > orderQty) {
        throw new Error(
          `Product ${d.product_id} exceeds order qty. Ordered ${orderQty}, Received ${receivedQty}`
        );
      }
      await client.query(detailQuery, [
        grnId,
        d.product_id,
        d.warehouse_id,
        d.locator_id,
        d.uom,
        d.hsn_no,
        d.order_qty,
        d.received_qty,
        newQty,
        header.user_name
      ]);
    }

    // -------- UPDATE PO STATUS --------
    const statusRes = await client.query(
      `
      SELECT 
    pd.purchase_id,
    SUM(pd.qty) AS order_qty,
    COALESCE(SUM(grn.received_qty),0) AS received_qty
FROM ${schema}.purchase_detail pd
LEFT JOIN (
    SELECT 
        gh.purchase_id,
        gd.product_id,
        SUM(gd.qty) AS received_qty
    FROM ${schema}.grn_detail gd
    JOIN ${schema}.grn_header gh
        ON gh.id = gd.grn_id
    GROUP BY gh.purchase_id, gd.product_id
) grn
    ON grn.purchase_id = pd.purchase_id
    AND grn.product_id = pd.product_id
WHERE pd.purchase_id = $1
GROUP BY pd.purchase_id;
      `,
      [header.purchase_id]
    );

    const orderQty = Number(statusRes.rows[0].order_qty);
    const receivedQty = Number(statusRes.rows[0].received_qty);

    let poStatus = "Approved";

    if (receivedQty === 0) poStatus = "Approved";
    else if (receivedQty < orderQty) poStatus = "Partial";
    else poStatus = "Completed";

    await client.query(
      `UPDATE ${schema}.purchase_header
       SET status=$1
       WHERE id=$2`,
      [poStatus, header.purchase_id]
    );

    await client.query(
      `UPDATE ${schema}.grn_header
       SET po_status=$1
       WHERE id=$2`,
      [poStatus, grnId]
    );

    if (isFinalStatus(statusValue)) {
      await postGrnToLedger(client, schema, company, grnId);
      console.log(`GRN ${grnNo} posted to ledger`);
      console.log('final status',statusValue);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "GRN saved successfully",
      grn_no: grnNo,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("GRN Save Error:", err);
    let msg = "Internal server error";
    if (err.code === "23505") msg = "Duplicate entry detected";
    else if (err.message) msg = err.message;

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
