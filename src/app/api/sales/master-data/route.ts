import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import { generateSalesNo } from "@/lib/document-number-generator";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const [
      customersRes,
      uomsRes,
      taxesRes,
      currenciesRes,
      warehousesRes,
      locatorsRes,
      paymentModesRes,
      salesNo,
    ] = await Promise.all([
      client.query(
        `
        SELECT
          *,
          COALESCE(cust_name, name) AS cust_name,
          COALESCE(name, cust_name) AS name,
          COALESCE(phone, phone) AS phone
        FROM "${schema}".customers
        ORDER BY id DESC
        `
      ),
      client.query(
        `
        SELECT
          id::int,
          uom_code,
          uom_name
        FROM "${schema}".uom
        ORDER BY id
        `
      ),
      client.query(
        `
        SELECT
          id::int,
          tax_name,
          total_percentage,
          effective_from,
          effective_to,
          is_active
        FROM "${schema}".tax_master
        WHERE is_active = TRUE
        ORDER BY id
        `
      ),
      client.query(
        `
        SELECT
          c.id::int,
          c.currency_code,
          c.currency_name,
          cr.conversion_rate
        FROM "${schema}".currencies c
        LEFT JOIN "${schema}".currency_rates cr
          ON cr.currency_id = c.id
        ORDER BY c.id
        `
      ),
      client.query(
        `
        SELECT
          w.id, w.code, w.name, w.location_id, w.type, w.effective_from, w.effective_to,
          w.description, w.landline, w.mobile_no, w.fax, w.email,
          w.contact_person_name, w.contact_person_mobile, w.contact_person_email,
          w.pan, w.gstin, w.created_at, w.updated_at,
          l.name AS location_name
        FROM "${schema}".warehouses w
        LEFT JOIN "${schema}".locations l ON w.location_id = l.id
        ORDER BY w.id DESC
        `
      ),
      client.query(
        `
        SELECT
          l.id, l.locator_name, l.row, l.rack, l.bin,
          l.effective_from, l.effective_to, l.warehouse_id, l.type,
          l.max_qty, l.current_qty, l.suggested_qty, l.description,
          l.created_at, l.updated_at,
          w.name AS warehouse_name
        FROM "${schema}".locators l
        LEFT JOIN "${schema}".warehouses w ON l.warehouse_id = w.id
        ORDER BY l.id DESC
        `
      ),
      client.query(
        `
        SELECT
          id::int,
          name AS payment_mode_name,
          is_default,
          is_active
        FROM "${schema}".payment_modes
        WHERE is_active = TRUE
        ORDER BY is_default DESC, name ASC
        `
      ),
      generateSalesNo(schema),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        customers: customersRes.rows,
        uoms: uomsRes.rows,
        taxes: taxesRes.rows,
        currencies: currenciesRes.rows,
        warehouses: warehousesRes.rows,
        locators: locatorsRes.rows,
        payment_modes: paymentModesRes.rows,
        sales_no: salesNo,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load master data" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
