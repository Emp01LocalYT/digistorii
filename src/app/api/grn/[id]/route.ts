import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {

    const client = await pool.connect();

    try {

        const { schema } = await getTenantSchema(req);
        const { id: grnId } = await context.params;

        const headerRes = await client.query(
            `SELECT gh.*,ph.purchase_no,s.supplier_code,s.name as supplier_name,CONCAT_WS('-',s.supplier_code,s.supplier_name) as supplier,s.email as supplier_email,s.phone as supplier_phone,CONCAT_WS(', ', s.address_line1, s.address_line2,s.address_line3, s.city, s.state, s.pincode) as supplier_address FROM ${schema}.grn_header gh LEFT JOIN ${schema}.purchase_header ph ON gh.purchase_id = ph.id LEFT JOIN ${schema}.suppliers s ON gh.supplier_id = s.id WHERE gh.id=$1`,
            [grnId]
        );

        const detailRes = await client.query(
            `SELECT 
                d.*,
                p.product_code,
                p.name AS product_name,
                p.description,u.uom_code,u.uom_name
            FROM ${schema}.grn_detail d
            LEFT JOIN ${schema}.products p
            ON p.id = d.product_id
            LEFT JOIN "${schema}".uom u
            ON u.id::text = d.uom
            WHERE d.grn_id = $1`,
            [grnId]
        );

        return NextResponse.json({
            success: true,
            data: {
                header: headerRes.rows[0],
                details: detailRes.rows
            }
        });

    } catch (error: any) {

        console.error("Fetch GRN Error:", error);

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
        const { id: grnId } = await context.params;

        // CHECK IF GRN EXISTS
    const checkRes = await client.query(
      `SELECT id,status FROM ${schema}.grn_header WHERE id=$1`,
      [grnId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "GRN not found" },
        { status: 404 }
      );
    }

    // BLOCK EDITING
    return NextResponse.json(
      {
        success: false,
        error: "GRN cannot be edited. It is already generated. Only view allowed."
      },
      { status: 400 }
    );

    //     const body = await req.json();

    //     const { header, details } = body;

    //     const {
    //         grn_date,
    //         purchase_id,
    //         supplier_id,
    //         status,
    //         po_status,
    //         user_name
    //     } = header;
    //     console.log("Received Update Data:", body);

    //     await client.query("BEGIN");

    //     // UPDATE HEADER
    //     await client.query(
    //         `
    //   UPDATE ${schema}.grn_header
    //   SET grn_date=$1,
    //       purchase_id=$2,
    //       supplier_id=$3,
    //       status=$4,
    //       po_status=$5,
    //       updated_by=$6,
    //       updated_at=NOW()
    //   WHERE id=$7
    //   `,
    //         [
    //             grn_date,
    //             purchase_id,
    //             supplier_id,
    //             status || "Entered",
    //             po_status || "Approved",
    //             user_name,
    //             grnId
    //         ]
    //     );

    //     // FETCH existing detail ids from DB
    //     const existingRes = await client.query(
    //         `SELECT id FROM ${schema}.grn_detail WHERE grn_id=$1`,
    //         [grnId]
    //     );

    //     const existingIds = existingRes.rows.map((r) => r.id);

    //     const incomingIds = details
    //         .filter((d: any) => d.id)
    //         .map((d: any) => d.id);

    //     // FIND deleted rows
    //     const deletedIds = existingIds.filter(
    //         (id: number) => !incomingIds.includes(id)
    //     );

    //     if (deletedIds.length > 0) {
    //         await client.query(
    //             `DELETE FROM ${schema}.grn_detail 
    //      WHERE id = ANY($1::int[])`,
    //             [deletedIds]
    //         );
    //     }

    //     // LOOP details
    //     for (const item of details) {

    //         if (item.id) {

    //             // UPDATE EXISTING ROW
    //             await client.query(
    //                 `
    //       UPDATE ${schema}.grn_detail
    //       SET product_id=$1,
    //           UOM=$2,
    //           HSN_NO=$3,
    //           order_qty=$4,
    //           qty=$5,
    //           updated_by=$6,
    //           updated_at=NOW()
    //       WHERE id=$7
    //       `,
    //                 [
    //                     item.product_id,
    //                     item.uom,
    //                     item.hsn_no,
    //                     item.order_qty,
    //                     item.qty,
    //                     user_name,
    //                     item.id
    //                 ]
    //             );

    //         } else {

    //             // INSERT NEW ROW
    //             await client.query(
    //                 `
    //       INSERT INTO ${schema}.grn_detail
    //       (
    //         grn_id,
    //         product_id,
    //         UOM,
    //         HSN_NO,
    //         order_qty,
    //         qty,
    //         created_by,
    //         created_at
    //       )
    //       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    //       `,
    //                 [
    //                     grnId,
    //                     item.product_id,
    //                     item.uom,
    //                     item.hson_no,
    //                     item.order_qty,
    //                     item.qty,
    //                     user_name
    //                 ]
    //             );
    //         }
    //     }

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "GRN Updated Successfully"
        });

    } catch (error: any) {

        await client.query("ROLLBACK");

        console.error("GRN Update Error:", error);

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