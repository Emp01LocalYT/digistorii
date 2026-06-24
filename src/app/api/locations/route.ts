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

async function getCompanyLocationLimit(client: any, companySlug: string): Promise<number> {
  const result = await client.query(
    `SELECT
       COALESCE(
         cs.max_locations,
         (
           SELECT pf.value_int
           FROM public.plan_features pf
           WHERE pf.plan_id = cs.plan_id
             AND pf.feature_key = 'max_locations'
           LIMIT 1
         ),
         cs.max_warehouses,
         1
       ) AS max_locations
     FROM public.companies c
     LEFT JOIN public.company_subscriptions cs
       ON cs.company_id = c.id
     WHERE c.subdomain_url = $1
     ORDER BY cs.updated_at DESC NULLS LAST, cs.id DESC NULLS LAST
     LIMIT 1`,
    [companySlug]
  );
  return Number(result.rows[0]?.max_locations ?? 1);
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
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
       ORDER BY id DESC`
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema, company } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    await ensureLocationTableShape(client, schema);

    const body = await req.json();
    const parsed = locationSchema.parse(body);
    const payload = normalizePayload(parsed);

    const maxLocations = await getCompanyLocationLimit(client, company);
    const locationCount = await client.query(
      `SELECT COUNT(*)::int AS count FROM "${schema}".locations`
    );
    const currentCount = Number(locationCount.rows[0]?.count || 0);
    if (currentCount >= maxLocations) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create more than ${maxLocations} locations for subscription plan`,
        },
        { status: 400 }
      );
    }

    const result = await client.query(
      `INSERT INTO "${schema}".locations
       (
        name, type, inactive_date, same_as_registered, same_as_bill_to, description,
        registered_address_line_1, registered_address_line_2, registered_country, registered_state, registered_city, registered_pincode,
        bill_address_line_1, bill_address_line_2, bill_country, bill_state, bill_city, bill_pincode,
        ship_address_line_1, ship_address_line_2, ship_country, ship_state, ship_city, ship_pincode,
        landline, mobile, fax, email,
        contact_person,
        created_at, updated_at
       )
       VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,
        $29,
        NOW(), NOW()
       )
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
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
