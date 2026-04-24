import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

async function getNextDocNo(client: any, schema: string): Promise<string> {
  const result = await client.query(
    `
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(doc_no FROM 4) AS INTEGER)),
        0
      ) AS max_code
      FROM "${schema}".opening_stock
      WHERE doc_no ~ '^OPS[0-9]+$'
    `
  );

  const next = Number(result.rows[0]?.max_code || 0) + 1;
  return `OPS${String(next).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
console.log("Fetching next doc no for schema:", schema);
    const docNo = await getNextDocNo(client, schema);
    return NextResponse.json({ success: true, data: { doc_no: docNo } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
