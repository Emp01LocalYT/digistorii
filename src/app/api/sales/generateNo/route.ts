import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateSalesNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";


export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);
    const sales_no = await generateSalesNo(schema);

    return NextResponse.json({
      success: true,
      sales_no
    });

  } catch (err: any) {

    console.error("GenerateNo API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to generate sales number"
      },
      { status: 500 }
    );
  }
}