import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
 
export async function GET(req: NextRequest) {
    try {
        const { schema } = await getTenantSchema(req);
 
        const res = await pool.query(`
      SELECT
        c.id,
        c.currency_code as code,
        c.currency_name as name,
        cr.country,
        cr.region,
        cr.conversion_rate as "conversionRate"
      FROM ${schema}.currencies c
      LEFT JOIN ${schema}.currency_rates cr
        ON cr.currency_id = c.id
      ORDER BY c.currency_code
    `);
 
        return NextResponse.json({
            success: true,
            data: res.rows,
        });
 
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
 
export async function POST(req: NextRequest) {
    const client = await pool.connect();
 
    try {
        const { schema } = await getTenantSchema(req);
        const body = await req.json(); // array of rows
        const { user_name, data } = body;
        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { success: false, error: "No data provided" },
                { status: 400 }
            );
        }
 
        await client.query("BEGIN");
 
        for (const row of data) {
            const {
                code,
                country,
                region,
                conversionRate
            } = row;
 
            if (
                conversionRate === '' ||
                conversionRate === null ||
                isNaN(Number(conversionRate))
            ) continue;
 
             const currencyRes = await client.query(
        `SELECT id FROM ${schema}.currencies WHERE currency_code = $1`,
        [code]
      );
if (currencyRes.rows.length === 0) continue;
 
      const currency_id = currencyRes.rows[0].id;
 
            await client.query(
                `
        INSERT INTO ${schema}.currency_rates
          (currency_id, country, region, conversion_rate, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (currency_id)
        DO UPDATE SET
          conversion_rate = EXCLUDED.conversion_rate,
          updated_by = $5,
          updated_at = NOW()
        `,
                [
                    currency_id,
                    country,
                    region,
                    Number(conversionRate),
                    user_name
                ]
            );
        }
 
        await client.query("COMMIT");
 
        return NextResponse.json({
            success: true,
            message: "Currency converstion rates saved successfully",
        });
 
    } catch (err: any) {
        await client.query("ROLLBACK");
 
        console.error("Currency Converstion Rate Save Error:", err);
 
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}