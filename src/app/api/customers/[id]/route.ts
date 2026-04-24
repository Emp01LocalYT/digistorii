// import { NextRequest, NextResponse } from "next/server";
// import { pool } from "@/lib/db";
// import { getTenantSchema } from "@/lib/tenant";


// const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;


// // GET SINGLE CUSTOMER
// export async function GET(
//   req: NextRequest,
//   context: { params: Promise<{ id: string }> }
// ) {
//   const { company, schema } = await getTenantSchema(req);
//   const { id } = await context.params;

//   if (!schema || !schemaValidator.test(schema)) {
//     return NextResponse.json({ success: false, error: "Invalid schema" });
//   }

//   const client = await pool.connect();

//   const result = await client.query(
//     `SELECT * FROM "${schema}".customers WHERE id=$1`,
//     [id]
//   );

//   client.release();

//   return NextResponse.json({ success: true, data: result.rows[0] });
// }

// // UPDATE CUSTOMER
// export async function PUT(
//   req: NextRequest,
//   context: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { company, schema } = await getTenantSchema(req);
//     const { id } = await context.params;
//     const body = await req.json();

//     if (!schema || !schemaValidator.test(schema)) {
//       return NextResponse.json({ success: false, error: "Invalid schema" });
//     }

//     const client = await pool.connect();

//     await client.query(
//       `
//       UPDATE "${schema}".customers
//       SET name=$1, email=$2, phone=$3,
//           address_line1=$4, address_line2=$5,
//           city=$6, state=$7, pincode=$8, country=$9,
//           updated_at=NOW()
//       WHERE id=$10
//     `,
//       [
//         body.name,
//         body.email,
//         body.phone,
//         body.address_line1,
//         body.address_line2,
//         body.city,
//         body.state,
//         body.pincode,
//         body.country,
//         id,
//       ]
//     );

//     client.release();

//     return NextResponse.json({ success: true });
//   } catch {
//     return NextResponse.json({ success: false });
//   }
// }

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


// GET SINGLE CUSTOMER
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
      WHERE c.id=$1
      `,
      [id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } finally {
    client.release();
  }
}

// UPDATE CUSTOMER
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const { id } = await context.params;
    const body = await req.json();
    const custName = asNull(body.cust_name) || asNull(body.name) || "";
    const mainPhone = asNull(body.phone);

    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" });
    }

    await client.query("BEGIN");
    await client.query(
      `
      UPDATE "${schema}".customers
      SET
        cust_name=$1,
        name=$2,
        email=$3,
        phone=$4,
        updated_at=NOW()
      WHERE id=$5
    `,
      [
        custName,
        custName,
        asNull(body.email),
        asNull(body.phone),
        id,
      ]
    );

    await client.query(
      `
      DELETE FROM "${schema}".customer_addresses
      WHERE customer_id = $1 AND is_default = TRUE
      `,
      [id]
    );

    await client.query(
      `
      INSERT INTO "${schema}".customer_addresses
        (customer_id, address_line1, address_line2, address_line3, country, state, city, pincode, is_default, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW(),NOW())
      `,
      [
        id,
        asNull(body.address_line1),
        asNull(body.address_line2),
        asNull(body.address_line3),
        asNull(body.country),
        asNull(body.state),
        asNull(body.city),
        asNull(body.pincode),
      ]
    );

    await client.query("COMMIT");
    console.log("Customer updated", { id, ...body });
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
