import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {

    try {

        const { company, schema } = await getTenantSchema(req);

        const { searchParams } = new URL(req.url);

        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const supplier = searchParams.get("supplier");

        if (!from || !to) {
            return NextResponse.json({
                success: false,
                message: "From Date and To Date required"
            });
        }

        if (new Date(from) > new Date(to)) {
            return NextResponse.json({
                success: false,
                message: "Invalid date range"
            });
        }

        const result = await pool.query(
            `
            SELECT 
            ph.purchase_no,
            ph.purchase_date,
            ph.req_date,
            ph.approval_status,
            ph.status,
            ph.reject_reason,
            s.supplier_code,
            s.name supplier_name,
            SUM(pd.qty) total_qty
            FROM ${schema}.purchase_header ph
            JOIN ${schema}.suppliers s
            ON s.id = ph.supplier_id
            JOIN ${schema}.purchase_detail pd
            ON pd.purchase_id = ph.id
            WHERE ph.purchase_date BETWEEN $1 AND $2
            AND ($3::int IS NULL OR ph.supplier_id = $3)
            GROUP BY
            ph.purchase_no,
            ph.purchase_date,
            ph.req_date,
            s.supplier_code,
            s.name,
            ph.status,
            ph.approval_status,
            ph.reject_reason

            ORDER BY ph.purchase_date DESC
            `,
            [from, to, supplier ? Number(supplier) : null]

        );

        return NextResponse.json({
            success: true,
            data: result.rows
        });

    } catch (err: any) {

       console.error("PO Summary Report Error:", err);

        return NextResponse.json({
            success: false,
            message: "Database error occurred"
        });

    }

}