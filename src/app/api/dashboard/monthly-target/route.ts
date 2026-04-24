import { NextRequest, NextResponse } from "next/server";
import { getTenantSchema } from "@/lib/tenant";
import { getMonthlyTargetMetrics } from "@/lib/dashboardService";

export async function GET(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);
    const url = new URL(req.url);
    const salesTargetParam = url.searchParams.get("sales_target");
    // console.log("salesTargetParam : ",salesTargetParam);
    const salesTarget = Number(salesTargetParam);
    // console.log("salesTarget Backend : ",salesTarget);
    const data = await getMonthlyTargetMetrics(schema,salesTarget);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error("Monthly Target API Error", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Monthly target fetch failed"
      },
      { status: 500 }
    );
  }
}