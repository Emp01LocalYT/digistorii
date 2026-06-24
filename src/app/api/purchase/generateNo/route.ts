import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generatePurchaseNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";


export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);
    const purchase_no = await generatePurchaseNo(schema);

    return NextResponse.json({
      success: true,
      purchase_no
    });

  } catch (err: any) {

    console.error("GenerateNo API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to generate purchase number"
      },
      { status: 500 }
    );
  }
}