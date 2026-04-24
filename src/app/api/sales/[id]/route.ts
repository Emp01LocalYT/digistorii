import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
 
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

const toPositiveInt = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

async function ensureSalesHeaderColumns(client: any, schema: string) {
    await client.query(
        `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS warehouse_id INT`
    );
    await client.query(
        `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS locator_id INT`
    );
    await client.query(
        `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100)`
    );
}
 
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
 
    const client = await pool.connect();
 
    try {
 
        const { schema } = await getTenantSchema(req);
        const { id: saleId } = await context.params;
 
        const headerRes = await client.query(
            `SELECT sh.*,s.name as customer_name,
            s.email as customer_email,
            s.phone as customer_phone,
            CONCAT_WS(', ', sa.address_line1, sa.address_line2, sa.city, sa.state, sa.pincode) as customer_address 
            FROM ${schema}.sales_header sh 
            LEFT JOIN ${schema}.customers s ON sh.customer_id = s.id 
            LEFT JOIN ${schema}.customer_addresses sa ON s.id = sa.customer_id
            WHERE sh.id=$1`,
            [saleId]
        );
 
        const detailRes = await client.query(
            `SELECT
                d.*,
                pv.id AS variant_id,
                p.product_code,
                p.name as product_name,
                p.description,
                d.tax_master_id AS tax_id,
                u.uom_code,
                u.uom_name,
                tr.tax_name,
                tr.total_percentage AS tax_percent,
                dis.value as discount
            FROM ${schema}.sales_detail d
            LEFT JOIN "${schema}".product_variants pv
                ON pv.id::text = d.product_id::text
            LEFT JOIN ${schema}.products p
                ON p.id::text = COALESCE(pv.product_id, d.product_id)::text
            LEFT JOIN "${schema}".uom u
                ON u.id::text = d.uom
            LEFT JOIN ${schema}.tax_master tr
                ON tr.id = d.tax_master_id
            LEFT JOIN ${schema}.discount_variants dv
                ON dv.variant_id = pv.id
            LEFT JOIN ${schema}.discounts dis
                ON dis.id = dv.discount_id
            WHERE d.sales_id = $1`,
            [saleId]
        );
 
        return NextResponse.json({
            success: true,
            data: {
                header: headerRes.rows[0],
                details: detailRes.rows
            }
        });
 
    } catch (error: any) {
 
        console.error("Fetch Sale Error:", error);
 
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
        const { id: salesId } = await context.params;
 
        const body = await req.json();
 
        const { header, details } = body;
 
        const {
            customer_id,
            sales_date,
            currency,
            warehouse_id,
            locator_id,
            branch_name,
            subtotal,
            tax_amount,
            total_amount,
            user_name
        } = header;
        console.log("Received Update Data:", body);
 
        await client.query("BEGIN");
        await ensureSalesHeaderColumns(client, schema);

        const normalizedWarehouseId = toPositiveInt(warehouse_id);
        const normalizedLocatorId = toPositiveInt(locator_id);
        const normalizedBranchName = branch_name ? String(branch_name).trim() : null;
 
        // UPDATE HEADER
        await client.query(
            `
      UPDATE ${schema}.sales_header
      SET customer_id=$1,
          sales_date=$2,
          currency=$3,
          warehouse_id=$4,
          locator_id=$5,
          branch_name=$6,
          subtotal=$7,
          tax_amount=$8,
          total_amount=$9,
          updated_by=$10,
          updated_at=NOW()
      WHERE id=$11
      `,
            [
                customer_id,
                sales_date,
                currency,
                normalizedWarehouseId,
                normalizedLocatorId,
                normalizedBranchName,
                subtotal,
                tax_amount,
                total_amount,
                user_name,
                salesId
            ]
        );
 
        // FETCH existing detail ids from DB
        const existingRes = await client.query(
            `SELECT id FROM ${schema}.sales_detail WHERE sales_id=$1`,
            [salesId]
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
                `DELETE FROM ${schema}.sales_detail
         WHERE id = ANY($1::int[])`,
                [deletedIds]
            );
        }
 
        // LOOP details
        for (const item of details) {
            const taxMasterId = item.tax_id && item.tax_id > 0 ? item.tax_id : null;
            const variantId = await resolveVariantId(client, schema, item.product_id);
 
            if (item.id) {
 
                // UPDATE EXISTING ROW
                await client.query(
                    `
          UPDATE ${schema}.sales_detail
          SET product_id=$1,
                UOM=$2,
                rate=$3,
                qty=$4,
                discount=$5,
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
                        item.rate,
                        item.qty,
                        item.discount,
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
          INSERT INTO ${schema}.sales_detail
          (
            sales_id,
            product_id,
            UOM,
            rate,
            qty,
            discount,
            tax_master_id,
            tax_amount,
            line_total,
            created_by,
            created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
          `,
                    [
                        salesId,
                        variantId,
                        item.uom,
                        item.rate,
                        item.qty,
                        item.discount,
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
            message: "Sale Updated Successfully",
            id: Number(salesId)
        });
 
    } catch (error: any) {
 
        await client.query("ROLLBACK");
 
        console.error("Sale Update Error:", error);
 
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
