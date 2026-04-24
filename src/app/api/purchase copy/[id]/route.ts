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
        const { id: purchaseId } = await context.params;

        const headerRes = await client.query(
            `SELECT ph.*,s.supplier_code,s.name as supplier_name,s.email as supplier_email,s.phone as supplier_phone,
            CONCAT_WS(', ', s.address_line1, s.address_line2,s.address_line3, s.city, s.state, s.pincode) 
            as supplier_address FROM ${schema}.purchase_header ph 
            LEFT JOIN ${schema}.suppliers s ON ph.supplier_id = s.id WHERE ph.id=$1`,
   
            [purchaseId]
        );

        const detailRes = await client.query(
            `SELECT 
                d.*,
                p.product_code,
                p.name AS product_name,
                d.tax_master_id AS tax_id,
                tr.tax_name,
                tr.total_percentage AS tax_percent
            FROM ${schema}.purchase_detail d
            LEFT JOIN ${schema}.products p
            ON p.id = d.product_id
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
            supplier_id,
            purchase_date,
            req_date,
            currency,
            conversion_rate,
            status,
            subtotal,
            tax_amount,
            total_amount,
            user_name
        } = header;
        console.log("Received Update Data:", body);

        await client.query("BEGIN");

        // UPDATE HEADER
        await client.query(
            `
      UPDATE ${schema}.purchase_header
      SET supplier_id=$1,
          purchase_date=$2,
          req_date=$3,
          currency=$4,
          conversion_rate=$5,
          status=$6,
          subtotal=$7,
          tax_amount=$8,
          total_amount=$9,
          updated_by=$10,
          updated_date=NOW()
      WHERE id=$11
      `,
            [
                supplier_id,
                purchase_date,
                req_date,
                currency,
                conversion_rate,
                status||"Entered",
                subtotal,
                tax_amount,
                total_amount,
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
              updated_date=NOW()
          WHERE id=$10
          `,
                    [
                        item.product_id,
                        item.uom,
                        item.hsn_no,
                        item.rate,
                        item.qty,
                        item.tax_id ?? null,
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
            created_date
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
          `,
                    [
                        purchaseId,
                        item.product_id,
                        item.uom,
                        item.hson_no,
                        item.rate,
                        item.qty,
                        item.tax_id ?? null,
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