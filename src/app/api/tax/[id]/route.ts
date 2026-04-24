import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;


/* ================= GET SINGLE TAX ================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { company, schema } = await getTenantSchema(req);

    // MUST AWAIT PARAMS IN NEXT 16
    const { id: taxId } = await context.params;

    if (!schemaValidator.test(schema)) {
      return NextResponse.json({ success: false });
    }

    const masterRes = await client.query(
      `SELECT * FROM "${schema}".tax_master WHERE id = $1`,
      [taxId]
    );

    if (!masterRes.rows.length) {
      return NextResponse.json({
        success: false,
        error: "Tax not found",
      });
    }

    const taxRow = masterRes.rows[0];
    const formattedTax = {
      ...taxRow,
      effective_from: taxRow.effective_from
        ? new Date(taxRow.effective_from).toISOString().split("T")[0]
        : null,
      effective_to: taxRow.effective_to
        ? new Date(taxRow.effective_to).toISOString().split("T")[0]
        : null,
    };

    const componentRes = await client.query(
      `SELECT id, component_name, component_percentage
       FROM "${schema}".tax_component
       WHERE tax_master_id = $1`,
      [taxId]
    );
    console.log("Components fetched : ", componentRes.rows);
    // const tax = masterRes.rows[0];
    // tax.components = componentRes.rows;
     formattedTax.components = componentRes.rows;

    return NextResponse.json({
      success: true,
      data: formattedTax,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
}


export async function PUT(req: NextRequest) {
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();

    const {
      id,                 // Tax Master ID to update
      tax_name,
      total_percentage,
      effective_from,
      effective_to,
      is_active,
    } = body;

    if (!id || !tax_name || !total_percentage || !effective_from) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      });
    }

    const client = await pool.connect();

    // UPDATE only the fields sent
    const result = await client.query(
      `UPDATE "${schema}".tax_master
       SET tax_name = $1,
           total_percentage = $2,
           effective_from = $3,
           effective_to = $4,
           is_active = $5
       WHERE id = $6
       RETURNING *`,
      [
        tax_name,
        total_percentage,
        effective_from,
        effective_to || null,
        Boolean(is_active),
        id,      // WHERE clause to update the correct tax
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