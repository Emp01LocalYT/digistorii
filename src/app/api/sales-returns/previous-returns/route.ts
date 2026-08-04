import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

// Helper to ensure the sales return tables exist in the schema
async function ensureSalesReturnTables(client: any, schema: string) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".sales_returns (
      id BIGSERIAL PRIMARY KEY,
      tenant_id VARCHAR(80) NOT NULL,
      sales_invoice_id INT NOT NULL REFERENCES "${schema}".sales_header(id) ON DELETE RESTRICT,
      txn_date DATE NOT NULL,
      refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_by VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".sales_return_items (
      id BIGSERIAL PRIMARY KEY,
      sales_return_id BIGINT NOT NULL REFERENCES "${schema}".sales_returns(id) ON DELETE CASCADE,
      sales_invoice_line_id INT NOT NULL REFERENCES "${schema}".sales_detail(id) ON DELETE RESTRICT,
      product_id BIGINT NOT NULL REFERENCES "${schema}".product_variants(id) ON DELETE RESTRICT,
      warehouse_id INT REFERENCES "${schema}".warehouses(id) ON DELETE RESTRICT,
      locator_id INT REFERENCES "${schema}".locators(id) ON DELETE RESTRICT,
      returned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_sales_return_items_header
    ON "${schema}".sales_return_items(sales_return_id);
  `);
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    await ensureSalesReturnTables(client, schema);

    const salesInvoiceId = Number(req.nextUrl.searchParams.get("sales_invoice_id"));
    if (isNaN(salesInvoiceId)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid sales_invoice_id" },
        { status: 400 }
      );
    }

    const result = await client.query(
      `
        SELECT
          sri.sales_invoice_line_id,
          COALESCE(SUM(sri.returned_qty), 0) AS total_returned_qty
        FROM "${schema}".sales_return_items sri
        JOIN "${schema}".sales_returns sr ON sr.id = sri.sales_return_id
        WHERE sr.sales_invoice_id = $1
        GROUP BY sri.sales_invoice_line_id
      `,
      [salesInvoiceId]
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
