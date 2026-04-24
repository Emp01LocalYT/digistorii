//C:\Users\yanna\template_tailwind\src\app\api\suppliers\[id]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";


const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

function asNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizeClassification(value: unknown): number {
  const n = Number(value);
  return [1, 2, 3].includes(n) ? n : 3;
}


// GET SINGLE SUPPLIER
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" });
    }

    const result = await client.query(
      `
      SELECT
        *,
        COALESCE(supplier_name, name) AS supplier_name,
        COALESCE(name, supplier_name) AS name,
        COALESCE(phone, contact_phone1) AS phone,
        c.currency_code as currency_code
      FROM "${schema}".suppliers
      
      WHERE id=$1
      `,
      [id]
    );
    console.log("Supplier query result:", result.rows[0]);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } finally {
    client.release();
  }
}

// UPDATE SUPPLIER
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const body = await req.json();
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    const supplierName = asNull(body.supplier_name) || asNull(body.name) || "";
    const shortName = asNull(body.short_name) || supplierName;
    const mainPhone = asNull(body.phone) || asNull(contacts[0]?.phone);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" });
    }

    await client.query("BEGIN");
    await client.query(
      `
      UPDATE "${schema}".suppliers
      SET
        short_name=$1,
        supplier_name=$2,
        classification=$3,
        introduced_date=$4,
        introduced_by=$5,
        effective_from=$6,
        effective_to=$7,
        purchase_hold=$8,
        qc_required=$9,
        address_line1=$10,
        address_line2=$11,
        address_line3=$12,
        country=$13,
        state=$14,
        city=$15,
        pincode=$16,
        website=$17,
        email=$18,
        linkedin=$19,
        skype=$20,
        dispatch_terms=$21,
        payment_terms=$22,
        currency=$23,
        gstin=$24,
        cin=$25,
        bank_name=$26,
        beneficiary_name=$27,
        beneficiary_code=$28,
        branch=$29,
        ifsc_code=$30,
        swift_code=$31,
        contact_person1=$32,
        contact_phone1=$33,
        contact_email1=$34,
        contact_person2=$35,
        contact_phone2=$36,
        contact_email2=$37,
        contact_person3=$38,
        contact_phone3=$39,
        contact_email3=$40,
        name=$41,
        phone=$42,
        updated_at=NOW()
      WHERE id=$43
    `,
      [
        shortName,
        supplierName,
        normalizeClassification(body.classification),
        asNull(body.introduced_date),
        asNull(body.introduced_by),
        asNull(body.effective_from),
        asNull(body.effective_to),
        Boolean(body.purchase_hold),
        Boolean(body.qc_required),
        asNull(body.address_line1),
        asNull(body.address_line2),
        asNull(body.address_line3),
        asNull(body.country),
        asNull(body.state),
        asNull(body.city),
        asNull(body.pincode),
        asNull(body.website),
        asNull(body.email),
        asNull(body.linkedin),
        asNull(body.skype),
        asNull(body.dispatch_terms),
        asNull(body.payment_terms),
        asNull(body.currency),
        asNull(body.gstin),
        asNull(body.cin),
        asNull(body.bank_name),
        asNull(body.beneficiary_name),
        asNull(body.beneficiary_code),
        asNull(body.branch),
        asNull(body.ifsc_code),
        asNull(body.swift_code),
        asNull(body.contact_person1) || asNull(contacts[0]?.person),
        asNull(body.contact_phone1) || asNull(contacts[0]?.phone),
        asNull(body.contact_email1) || asNull(contacts[0]?.email),
        asNull(body.contact_person2) || asNull(contacts[1]?.person),
        asNull(body.contact_phone2) || asNull(contacts[1]?.phone),
        asNull(body.contact_email2) || asNull(contacts[1]?.email),
        asNull(body.contact_person3) || asNull(contacts[2]?.person),
        asNull(body.contact_phone3) || asNull(contacts[2]?.phone),
        asNull(body.contact_email3) || asNull(contacts[2]?.email),
        supplierName,
        mainPhone,
        id,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ success: false });
  } finally {
    client.release();
  }
}
