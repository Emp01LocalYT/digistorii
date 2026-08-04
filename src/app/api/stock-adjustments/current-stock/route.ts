import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const searchParams = req.nextUrl.searchParams;
    const warehouseId = Number(searchParams.get("warehouse_id"));
    const locatorId = Number(searchParams.get("locator_id"));
    const productId = Number(searchParams.get("product_id"));

    if (isNaN(warehouseId) || isNaN(locatorId) || isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid warehouse_id, locator_id, or product_id" },
        { status: 400 }
      );
    }

    // Query the current stock view
    const result = await client.query(
      `
        SELECT COALESCE(SUM(current_stock), 0) AS current_stock
        FROM "${schema}".current_stock
        WHERE tenant_id = $1
          AND warehouse_id = $2
          AND locator_id = $3
          AND product_id = $4
      `,
      [company, warehouseId, locatorId, productId]
    );

    const currentStock = Number(result.rows[0]?.current_stock || 0);

    return NextResponse.json({
      success: true,
      current_stock: currentStock,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stock" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
