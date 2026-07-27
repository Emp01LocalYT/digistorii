import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();
    const variantIds = body.variantIds;

    if (!variantIds || !Array.isArray(variantIds)) {
      return NextResponse.json(
        { success: false, message: "variantIds array is required" },
        { status: 400 }
      );
    }

    if (variantIds.length === 0) {
      return NextResponse.json({ success: true, prices: {} });
    }

    // Convert all to numbers/strings of bigint
    const ids = variantIds.map((id) => Number(id)).filter((id) => !isNaN(id));

    const result = await client.query(
      `
      SELECT DISTINCT ON (d.product_id)
        d.product_id AS variant_id,
        d.rate::numeric AS rate
      FROM "${schema}".purchase_detail d
      JOIN "${schema}".purchase_header h ON d.purchase_id = h.id
      WHERE d.product_id = ANY($1::bigint[])
        AND h.status IN ('Completed', 'Partial')
      ORDER BY d.product_id, h.purchase_date DESC, h.id DESC
      `,
      [ids]
    );

    const prices: Record<string, number> = {};
    result.rows.forEach((row: { variant_id: string | number; rate: string | number }) => {
      prices[String(row.variant_id)] = Number(row.rate);
    });

    return NextResponse.json({ success: true, prices });
  } catch (error: any) {
    console.error("Fetch latest purchase prices error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch latest purchase prices" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
