import { NextRequest, NextResponse } from "next/server";
import { getTenantSchema } from "@/lib/tenant";
import { getMonthlySales } from "@/lib/dashboardService";

export async function GET(req: NextRequest) {

  try {

    const { schema } = await getTenantSchema(req);

    const data = await getMonthlySales(schema);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (err: any) {

    console.error("Monthly Sales API Error");
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Monthly sales fetch failed"
      },
      { status: 500 }
    );

  }

}