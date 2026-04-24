// import { NextRequest, NextResponse } from "next/server";
// import { pool } from "@/lib/db";
// import { z } from "zod";
// import { error } from "console";
// import { getTenantSchema } from "@/lib/tenant";

// const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

// const customerSchema = z.object({
//   name: z.string().min(3),
//   email: z.string().email().optional().or(z.literal("")),
//   phone: z.string().min(10).optional(),
//   address_line1: z.string().optional(),
//   address_line2: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   pincode: z.string().optional(),
//   country: z.string().optional(),
// });

// // CREATE & GET ALL
// export async function POST(req: NextRequest) {
//   try {
//     const { company, schema } = await getTenantSchema(req);
//     console.log("Received POST request for schema:", schema);
//     if (!schema || !schemaValidator.test(schema)) {
//       return NextResponse.json({ success: false, error: "Invalid schema" });
//     }

//     const body = await req.json();
//     const data = customerSchema.parse(body);

//     const client = await pool.connect();

//     await client.query(
//       `
//       INSERT INTO "${schema}".customers
//       (name, email, phone, address_line1, address_line2, city, state, pincode, country)
//       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
//     `,
//       [
//         data.name,
//         data.email || null,
//         data.phone || null,
//         data.address_line1 || null,
//         data.address_line2 || null,
//         data.city || null,
//         data.state || null,
//         data.pincode || null,
//         data.country || null,
//       ]
//     );

//     client.release();

//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     if (error.name === "ZodError") {
//       return NextResponse.json({ success: false, error: error.errors[0].message });
//     }

//     if (error.code === "23505") {
//       return NextResponse.json({ success: false, error: "Email already exists" });
//     }

//     return NextResponse.json({ success: false, error: "Insert failed" });
//   }
// }

// //GET ALL CUSTOMERS
// export async function GET(req: NextRequest) {
//   try {
//     const { company, schema } = await getTenantSchema(req);
//     console.log("Received GET request for schema:", schema);

//     if (!schema || !schemaValidator.test(schema)) {
//       return NextResponse.json({ success: false });
//     }

//     const client = await pool.connect();

//     const result = await client.query(
//       `SELECT * FROM "${schema}".customers ORDER BY id DESC`
//     );

//     client.release();

//     return NextResponse.json({ success: true, data: result.rows });
//   } catch (error: any) {
//     console.error("Error fetching customers:", error);
//     return NextResponse.json({ success: false, error: error.message });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;
const custSchema = z.object({
  cust_code: z.string().optional(),
  cust_name: z.string().optional().nullable(),
  name: z.string().min(3),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  address_line3: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
});

function asNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

async function getNextCustCode(client: any, schema: string): Promise<string> {
  await client.query(`LOCK TABLE "${schema}".customers IN EXCLUSIVE MODE`);
  const result = await client.query(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(cust_code FROM 4) AS INTEGER)), 0) AS max_code
      FROM "${schema}".customers
      WHERE cust_code ~ '^CUS[0-9]+$'
    `
  );
  const next = Number(result.rows[0]?.max_code || 0) + 1;
  return `CUS${String(next).padStart(3, "0")}`;
}

// CREATE & GET ALL
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    console.log("Schema in POST /customers:", schema);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" });
    }

    const body = await req.json();
    const data = custSchema.parse(body);
    const custName = asNull(data.cust_name) || asNull(data.name) || "";
    const mainEmail = asNull(data.email);
    const mainPhone = asNull(data.phone);

    await client.query("BEGIN");
    const custCode = await getNextCustCode(client, schema);

    const insertResult = await client.query(
      `
      INSERT INTO "${schema}".customers
      (
        cust_code,
        cust_name,
        name,
        email,
        phone,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      RETURNING id
    `,
      [
        custCode,
        custName,
        custName,
        mainEmail,
        mainPhone,
      ]
    );

    const customerId = insertResult.rows[0]?.id;
    if (customerId) {
      await client.query(
        `
        DELETE FROM "${schema}".customer_addresses
        WHERE customer_id = $1 AND is_default = TRUE
        `,
        [customerId]
      );

      await client.query(
        `
        INSERT INTO "${schema}".customer_addresses
          (customer_id, address_line1, address_line2, address_line3, country, state, city, pincode, is_default, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW(),NOW())
      `,
        [
          customerId,
          asNull(data.address_line1),
          asNull(data.address_line2),
          asNull(data.address_line3),
          asNull(data.country),
          asNull(data.state),
          asNull(data.city),
          asNull(data.pincode),
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      customer: {
        id: customerId,
        customer_code: custCode,
        cust_code: custCode,
        name: custName,
        cust_name: custName,
        email: mainEmail,
        phone: mainPhone,
        address_line1: null,
        address_line2: null,
        address_line3: null,
        country: null,
        state: null,
        city: null,
        pincode: null,
      },
    });
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

//GET ALL CUSTOMERS
export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    console.log("Schema in GET /customers:", schema);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false });
    }

    const result = await client.query(
      `
      SELECT
        c.id,
        c.cust_code,
        COALESCE(c.cust_name, c.name) AS name,
        c.email,
        c.phone,
        ca.id AS address_id,
        ca.address_line1,
        ca.address_line2,
        ca.address_line3,
        ca.city,
        ca.state,
        ca.pincode,
        ca.country,
        ca.is_default
      FROM "${schema}".customers c
      LEFT JOIN "${schema}".customer_addresses ca
        ON ca.customer_id = c.id AND ca.is_default = true
      ORDER BY c.id DESC
      `
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}
