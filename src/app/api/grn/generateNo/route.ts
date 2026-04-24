import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateGRNNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";


export async function GET(req: NextRequest) {
    try {
        const { company, schema } = await getTenantSchema(req);
        const grn_no = await generateGRNNo(schema);

        return NextResponse.json({
            success: true,
            grn_no
        });

    } catch (err: any) {

        console.error("GenerateNo API Error:", err);

        return NextResponse.json(
            {
                success: false,
                error: err.message || "Failed to generate receipt number"
            },
            { status: 500 }
        );
    }
}