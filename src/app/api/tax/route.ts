import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;


export async function GET(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);

    if (!schemaValidator.test(schema)) {
      return NextResponse.json({ success: false });
    }

    const client = await pool.connect();

    const result = await client.query(
      `SELECT * FROM "${schema}".tax_master ORDER BY id DESC`
    );
    // console.log("Fetched tax_master data (raw):", result.rows);
   
    client.release();
//     const formatted = result.rows.map((row) => ({
//   ...row,
//   effective_from: row.effective_from
//     ? row.effective_from.toISOString().split("T")[0]
//     : null,
//   effective_to: row.effective_to
//     ? row.effective_to.toISOString().split("T")[0]
//     : null,
// }));
//  console.log("Fetched tax_master data:", formatted);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

/* ================= SAVE TAX MASTER ================= */
export async function POST(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();

    const {
      tax_name,
      total_percentage,
      effective_from,
      effective_to,
      is_active,
    } = body;

    if (!tax_name || !total_percentage || !effective_from) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      });
    }

    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO "${schema}".tax_master
      (tax_name, total_percentage, effective_from, effective_to, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        tax_name,
        total_percentage,
        effective_from,
        effective_to || null,
        Boolean(is_active),
      ]
    );

    client.release();

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

