//C:\Users\yanna\template_tailwind\src\app\api\suppliers\route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const supplierSchema = z.object({
  supplier_code: z.string().optional(),
  short_name: z.string().optional(),
  supplier_name: z.string().optional(),
  classification: z.union([z.number(), z.string()]).optional(),
  introduced_date: z.string().optional().nullable(),
  introduced_by: z.string().optional().nullable(),
  purchase_hold: z.boolean().optional(),
  qc_required: z.boolean().optional(),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  address_line3: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  skype: z.string().optional().nullable(),
  dispatch_terms: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  cin: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  beneficiary_name: z.string().optional().nullable(),
  beneficiary_code: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  ifsc_code: z.string().optional().nullable(),
  swift_code: z.string().optional().nullable(),
  contact_person1: z.string().optional().nullable(),
  contact_phone1: z.string().optional().nullable(),
  contact_email1: z.string().optional().nullable(),
  contact_person2: z.string().optional().nullable(),
  contact_phone2: z.string().optional().nullable(),
  contact_email2: z.string().optional().nullable(),
  contact_person3: z.string().optional().nullable(),
  contact_phone3: z.string().optional().nullable(),
  contact_email3: z.string().optional().nullable(),
  contacts: z
    .array(
      z.object({
        person: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
      })
    )
    .max(3)
    .optional(),

  name: z.string().optional(),
  phone: z.string().optional().nullable(),
});

function asNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizeClassification(value: unknown): number {
  const n = Number(value);
  return [1, 2, 3].includes(n) ? n : 3;
}

async function getNextSupplierCode(client: any, schema: string): Promise<string> {
  await client.query(`LOCK TABLE "${schema}".suppliers IN EXCLUSIVE MODE`);
  const result = await client.query(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 4) AS INTEGER)), 0) AS max_code
      FROM "${schema}".suppliers
      WHERE supplier_code ~ '^VEN[0-9]+$'
    `
  );
  const next = Number(result.rows[0]?.max_code || 0) + 1;
  return `VEN${String(next).padStart(3, "0")}`;
}

function incrementSupplierCode(code: string): string {
  const match = code.match(/^VEN(\d+)$/i);
  const current = Number(match?.[1] ?? 0);
  return `VEN${String(current + 1).padStart(3, "0")}`;
}

// CREATE & GET ALL
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
  
    console.log("Schema in POST /suppliers:", schema);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" });
    }

    const body = await req.json();
    const data = supplierSchema.parse(body);
    const contacts = data.contacts ?? [];
    const supplierName = asNull(data.supplier_name) || asNull(data.name) || "";
    const shortName = asNull(data.short_name) || supplierName;
    const mainEmail = asNull(data.email);
    const mainPhone = asNull(data.phone) || asNull(contacts[0]?.phone);

    await client.query("BEGIN");
    const supplierCode = await getNextSupplierCode(client, schema);
    const nextCode = incrementSupplierCode(supplierCode);
    const result= await client.query(
      `
      INSERT INTO "${schema}".suppliers
      (
        supplier_code, short_name, supplier_name, classification,
        introduced_date, introduced_by, effective_from, effective_to,
        purchase_hold, qc_required,
        address_line1, address_line2, address_line3, country, state, city, pincode,
        website, email, linkedin, skype,
        dispatch_terms, payment_terms, currency, gstin, cin,
        bank_name, beneficiary_name, beneficiary_code, branch, ifsc_code, swift_code,
        contact_person1, contact_phone1, contact_email1,
        contact_person2, contact_phone2, contact_email2,
        contact_person3, contact_phone3, contact_email3,
        name, phone, created_at, updated_at
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,
        $22,$23,$24,$25,$26,
        $27,$28,$29,$30,$31,$32,
        $33,$34,$35,
        $36,$37,$38,
        $39,$40,$41,
        $42,$43,NOW(),NOW()
      ) RETURNING *
    `,
      [
        supplierCode,
        shortName,
        supplierName,
        normalizeClassification(data.classification),
        asNull(data.introduced_date),
        asNull(data.introduced_by),
        asNull(data.effective_from),
        asNull(data.effective_to),
        Boolean(data.purchase_hold),
        Boolean(data.qc_required),
        asNull(data.address_line1),
        asNull(data.address_line2),
        asNull(data.address_line3),
        asNull(data.country),
        asNull(data.state),
        asNull(data.city),
        asNull(data.pincode),
        asNull(data.website),
        mainEmail,
        asNull(data.linkedin),
        asNull(data.skype),
        asNull(data.dispatch_terms),
        asNull(data.payment_terms),
        asNull(data.currency),
        asNull(data.gstin),
        asNull(data.cin),
        asNull(data.bank_name),
        asNull(data.beneficiary_name),
        asNull(data.beneficiary_code),
        asNull(data.branch),
        asNull(data.ifsc_code),
        asNull(data.swift_code),
        asNull(data.contact_person1) || asNull(contacts[0]?.person),
        asNull(data.contact_phone1) || asNull(contacts[0]?.phone),
        asNull(data.contact_email1) || asNull(contacts[0]?.email),
        asNull(data.contact_person2) || asNull(contacts[1]?.person),
        asNull(data.contact_phone2) || asNull(contacts[1]?.phone),
        asNull(data.contact_email2) || asNull(contacts[1]?.email),
        asNull(data.contact_person3) || asNull(contacts[2]?.person),
        asNull(data.contact_phone3) || asNull(contacts[2]?.phone),
        asNull(data.contact_email3) || asNull(contacts[2]?.email),
        supplierName,
        mainPhone,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true, supplier : result.rows[0],
      next_code: nextCode });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0].message });
    }

    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "Email already exists" });
    }
    return NextResponse.json({ success: false, error: "Insert failed" });
  } finally {
    client.release();
  }
}

//GET ALL SUPPLIERS
export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    console.log("Schema in GET /suppliers fetches:", schema);
    
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false });
    }

    const result = await client.query(
      `
      SELECT
        *,
        COALESCE(supplier_name, name) AS supplier_name,
        COALESCE(name, supplier_name) AS name,
        COALESCE(phone, contact_phone1) AS phone
      FROM "${schema}".suppliers
      ORDER BY id DESC
      `
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}
