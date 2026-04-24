import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/dashboardService";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {

  try {

    const { company, schema } = await getTenantSchema(req);

    const data = await getDashboardMetrics(schema);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (err: any) {

    console.error("Dashboard API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Dashboard fetch failed"
      },
      { status: 500 }
    );
  }

}