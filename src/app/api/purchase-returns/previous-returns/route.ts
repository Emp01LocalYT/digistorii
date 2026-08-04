import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

async function ensurePurchaseReturnTables(client: any, schema: string) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_returns (
      id BIGSERIAL PRIMARY KEY,
      tenant_id VARCHAR(80) NOT NULL,
      grn_id INT NOT NULL REFERENCES "${schema}".grn_header(id) ON DELETE RESTRICT,
      purchase_return_no VARCHAR(100) UNIQUE,
      txn_date DATE NOT NULL,
      refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_by VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_return_items (
      id BIGSERIAL PRIMARY KEY,
      purchase_return_id BIGINT NOT NULL REFERENCES "${schema}".purchase_returns(id) ON DELETE CASCADE,
      grn_line_id INT NOT NULL REFERENCES "${schema}".grn_detail(id) ON DELETE RESTRICT,
      product_id BIGINT NOT NULL REFERENCES "${schema}".product_variants(id) ON DELETE RESTRICT,
      warehouse_id INT REFERENCES "${schema}".warehouses(id) ON DELETE RESTRICT,
      locator_id INT REFERENCES "${schema}".locators(id) ON DELETE RESTRICT,
      returned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_header
    ON "${schema}".purchase_return_items(purchase_return_id);
  `);
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    await ensurePurchaseReturnTables(client, schema);

    const grnId = Number(req.nextUrl.searchParams.get("grn_id"));
    if (isNaN(grnId)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid grn_id" },
        { status: 400 }
      );
    }

    const result = await client.query(
      `
        SELECT
          pri.grn_line_id,
          COALESCE(SUM(pri.returned_qty), 0) AS total_returned_qty
        FROM "${schema}".purchase_return_items pri
        JOIN "${schema}".purchase_returns pr ON pr.id = pri.purchase_return_id
        WHERE pr.grn_id = $1
        GROUP BY pri.grn_line_id
      `,
      [grnId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch previous returns" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
