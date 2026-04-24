import { NextRequest, NextResponse } from "next/server";
import { getTenantSchema } from "@/lib/tenant";
import { getStatisticsChart } from "@/lib/dashboardService";

export async function GET(req: NextRequest) {
    try {
        const { schema } = await getTenantSchema(req);

        const data = await getStatisticsChart(schema);

        return NextResponse.json({
            success: true,
            data
        });

    } catch (err: any) {
        console.error("Statistics API Error:", err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || "Statistics fetch failed"
            },
            { status: 500 }
        );
    }

}