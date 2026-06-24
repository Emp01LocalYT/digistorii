import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import { ensureLocationTableShape } from "@/lib/locationSchema";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;
const typeValues = ["global", "local"] as const;

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(typeValues),
  inactive_date: z.string().optional().nullable(),
  same_as_registered: z.boolean().optional(),
  same_as_bill_to: z.boolean().optional(),
  description: z.string().optional().nullable(),
  registered_address_line_1: z.string().optional().nullable(),
  registered_address_line_2: z.string().optional().nullable(),
  registered_country: z.string().optional().nullable(),
  registered_state: z.string().optional().nullable(),
  registered_city: z.string().optional().nullable(),
  registered_pincode: z.string().optional().nullable(),
  bill_address_line_1: z.string().optional().nullable(),
  bill_address_line_2: z.string().optional().nullable(),
  bill_country: z.string().optional().nullable(),
  bill_state: z.string().optional().nullable(),
  bill_city: z.string().optional().nullable(),
  bill_pincode: z.string().optional().nullable(),
  ship_address_line_1: z.string().optional().nullable(),
  ship_address_line_2: z.string().optional().nullable(),
  ship_country: z.string().optional().nullable(),
  ship_state: z.string().optional().nullable(),
  ship_city: z.string().optional().nullable(),
  ship_pincode: z.string().optional().nullable(),
  landline: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
});

type LocationInput = z.infer<typeof locationSchema>;

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function asNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function asBool(value?: boolean) {
  return Boolean(value);
}

function validateEmail(value?: string | null) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePayload(data: LocationInput) {
  const email = asNull(data.email);
  if (email && !validateEmail(email)) {
    throw new Error("Invalid email");
  }

  return {
    name: data.name.trim(),
    type: data.type,
    inactive_date: asNull(data.inactive_date),
    same_as_registered: asBool(data.same_as_registered),
    same_as_bill_to: asBool(data.same_as_bill_to),
    description: asNull(data.description),
    registered_address_line_1: asNull(data.registered_address_line_1),
    registered_address_line_2: asNull(data.registered_address_line_2),
    registered_country: asNull(data.registered_country),
    registered_state: asNull(data.registered_state),
    registered_city: asNull(data.registered_city),
    registered_pincode: asNull(data.registered_pincode),
    bill_address_line_1: asNull(data.bill_address_line_1),
    bill_address_line_2: asNull(data.bill_address_line_2),
    bill_country: asNull(data.bill_country),
    bill_state: asNull(data.bill_state),
    bill_city: asNull(data.bill_city),
    bill_pincode: asNull(data.bill_pincode),
    ship_address_line_1: asNull(data.ship_address_line_1),
    ship_address_line_2: asNull(data.ship_address_line_2),
    ship_country: asNull(data.ship_country),
    ship_state: asNull(data.ship_state),
    ship_city: asNull(data.ship_city),
    ship_pincode: asNull(data.ship_pincode),
    landline: asNull(data.landline),
    mobile: asNull(data.mobile),
    fax: asNull(data.fax),
    email,
    contact_person: asNull(data.contact_person),
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await ensureLocationTableShape(client, schema);

    const result = await client.query(
      `SELECT
        id, name, type, inactive_date, same_as_registered, same_as_bill_to, description,
        registered_address_line_1, registered_address_line_2, registered_country, registered_state, registered_city, registered_pincode,
        bill_address_line_1, bill_address_line_2, bill_country, bill_state, bill_city, bill_pincode,
        ship_address_line_1, ship_address_line_2, ship_country, ship_state, ship_city, ship_pincode,
        landline, mobile, fax, email,
        contact_person,
        created_at, updated_at
       FROM "${schema}".locations
       WHERE id = $1`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await ensureLocationTableShape(client, schema);

    const body = await req.json();
    const parsed = locationSchema.parse(body);
    const payload = normalizePayload(parsed);

    const result = await client.query(
      `UPDATE "${schema}".locations
       SET
        name = $1,
        type = $2,
        inactive_date = $3,
        same_as_registered = $4,
        same_as_bill_to = $5,
        description = $6,
        registered_address_line_1 = $7,
        registered_address_line_2 = $8,
        registered_country = $9,
        registered_state = $10,
        registered_city = $11,
        registered_pincode = $12,
        bill_address_line_1 = $13,
        bill_address_line_2 = $14,
        bill_country = $15,
        bill_state = $16,
        bill_city = $17,
        bill_pincode = $18,
        ship_address_line_1 = $19,
        ship_address_line_2 = $20,
        ship_country = $21,
        ship_state = $22,
        ship_city = $23,
        ship_pincode = $24,
        landline = $25,
        mobile = $26,
        fax = $27,
        email = $28,
        contact_person = $29,
        updated_at = NOW()
       WHERE id = $30
       RETURNING id, name, type, inactive_date, same_as_registered, same_as_bill_to, description,
        registered_address_line_1, registered_address_line_2, registered_country, registered_state, registered_city, registered_pincode,
        bill_address_line_1, bill_address_line_2, bill_country, bill_state, bill_city, bill_pincode,
        ship_address_line_1, ship_address_line_2, ship_country, ship_state, ship_city, ship_pincode,
        landline, mobile, fax, email,
        contact_person,
        created_at, updated_at`,
      [
        payload.name,
        payload.type,
        payload.inactive_date,
        payload.same_as_registered,
        payload.same_as_bill_to,
        payload.description,
        payload.registered_address_line_1,
        payload.registered_address_line_2,
        payload.registered_country,
        payload.registered_state,
        payload.registered_city,
        payload.registered_pincode,
        payload.bill_address_line_1,
        payload.bill_address_line_2,
        payload.bill_country,
        payload.bill_state,
        payload.bill_city,
        payload.bill_pincode,
        payload.ship_address_line_1,
        payload.ship_address_line_2,
        payload.ship_country,
        payload.ship_state,
        payload.ship_city,
        payload.ship_pincode,
        payload.landline,
        payload.mobile,
        payload.fax,
        payload.email,
        payload.contact_person,
        recordId,
      ]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Update failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const recordId = parseId(id);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM "${schema}".locations WHERE id = $1 RETURNING id`,
      [recordId]
    );
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
