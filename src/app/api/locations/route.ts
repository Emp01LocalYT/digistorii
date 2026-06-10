import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;
const typeValues = ["global", "local"] as const;

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(typeValues),
  inactive_date: z.string().optional().nullable(),
  same_as_ship_to: z.boolean().optional(),
  description: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  landline: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  ship_to_location: z.string().optional().nullable(),
  ship_to_site: z.boolean().optional(),
  receiving_site: z.boolean().optional(),
  office_site: z.boolean().optional(),
  bill_to_site: z.boolean().optional(),
  internal_site: z.boolean().optional(),
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
    same_as_ship_to: asBool(data.same_as_ship_to),
    description: asNull(data.description),
    number: asNull(data.number),
    building: asNull(data.building),
    street: asNull(data.street),
    locality: asNull(data.locality),
    country: asNull(data.country),
    state: asNull(data.state),
    city: asNull(data.city),
    pincode: asNull(data.pincode),
    landline: asNull(data.landline),
    mobile: asNull(data.mobile),
    fax: asNull(data.fax),
    email,
    contact_person: asNull(data.contact_person),
    ship_to_location: asNull(data.ship_to_location),
    ship_to_site: asBool(data.ship_to_site),
    receiving_site: asBool(data.receiving_site),
    office_site: asBool(data.office_site),
    bill_to_site: asBool(data.bill_to_site),
    internal_site: asBool(data.internal_site),
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

    const result = await client.query(
      `SELECT
        id, name, type, inactive_date, same_as_ship_to, description,
        number, building, street, locality, country, state, city, pincode,
        landline, mobile, fax, email,
        contact_person, ship_to_location,
        ship_to_site, receiving_site, office_site, bill_to_site, internal_site,
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
          error: `Cannot create more than ${maxLocations} locations for your plan`,
        },
        { status: 400 }
      );
    }

    const result = await client.query(
      `INSERT INTO "${schema}".locations
       (
        name, type, inactive_date, same_as_ship_to, description,
        number, building, street, locality, country, state, city, pincode,
        landline, mobile, fax, email,
        contact_person, ship_to_location,
        ship_to_site, receiving_site, office_site, bill_to_site, internal_site,
        created_at, updated_at
       )
       VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,
        $18,$19,
        $20,$21,$22,$23,$24,
        NOW(), NOW()
       )
       RETURNING id, name, type, inactive_date, same_as_ship_to, description,
        number, building, street, locality, country, state, city, pincode,
        landline, mobile, fax, email,
        contact_person, ship_to_location,
        ship_to_site, receiving_site, office_site, bill_to_site, internal_site,
        created_at, updated_at`,
      [
        payload.name,
        payload.type,
        payload.inactive_date,
        payload.same_as_ship_to,
        payload.description,
        payload.number,
        payload.building,
        payload.street,
        payload.locality,
        payload.country,
        payload.state,
        payload.city,
        payload.pincode,
        payload.landline,
        payload.mobile,
        payload.fax,
        payload.email,
        payload.contact_person,
        payload.ship_to_location,
        payload.ship_to_site,
        payload.receiving_site,
        payload.office_site,
        payload.bill_to_site,
        payload.internal_site,
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
