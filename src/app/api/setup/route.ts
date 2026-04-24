import { pool } from "../../../lib/db";
import { hashPassword } from "../../../lib/hash";
import { NextResponse } from "next/server";
import { createCompanySchema } from "../../../lib/schema";

// export async function POST(req: Request) {
//     const body = await req.json();
//     const client = await pool.connect();

//     try {
//         await client.query("BEGIN");
//    /* ---------------- Check if company exists ---------------- */
//         const existingCompany = await client.query(
//             `SELECT id, schema_name FROM public.companies WHERE subdomain_url = $1`,
//             [body.slug]
//         );

//         let companyId: number;
//         if (existingCompany.rows.length > 0) {
//             companyId = existingCompany.rows[0].id;
//         } else {
//             /* ---------------- Insert Company ---------------- */
//             const companyResult = await client.query(
//                 `INSERT INTO public.companies 
//                   (company_name, subdomain_url)
//                   VALUES ($1,$2)
//                   RETURNING id`,
//                 [
//                     body.businessName,
//                     body.slug
                    
//                 ]
//             );

//             companyId = companyResult.rows[0].id;
//             const schemaName = `tenant_${companyId}`;
//             console.log("Creating schema for company:", schemaName);
//             /* ---------------- Create Schema ---------------- */
//             // await client.query(`CREATE SCHEMA "${body.schema_name}"`);
//             const schemaResult = await client.query(
//             `Update public.companies SET schema_name = $1 WHERE id = $2`,
//             [schemaName, companyId]);
//              await createCompanySchema(client,schemaName);
//              console.log("Schema created:", schemaName);
//         }

//         /* ---------------- Check if email already exists for this company ---------------- */
//         const existingEmail = await client.query(
//             `SELECT id FROM public.users WHERE company_id = $1 AND email = $2`,
//             [companyId, body.ownerEmail]
//         );
//         if (existingEmail.rows.length > 0) {
//             throw new Error("Email already exists for this company");
//         }

//         /* ---------------- Check if phone already exists for this company ---------------- */
//         const existingPhone = await client.query(
//             `SELECT id FROM public.users WHERE company_id = $1 AND phone = $2`,
//             [companyId, body.ownerPhone]
//         );
//         if (existingPhone.rows.length > 0) {
//             throw new Error("Phone number already exists for this company");
//         }


        

//         /* ---------------- Hash Password ---------------- */
//         const hashed = await hashPassword(body.password);

//         /* ---------------- Insert User ---------------- */
//         await client.query(
//             `INSERT INTO public.users
//              (company_id, name,  email,phone, password_hash, role)
//              VALUES ($1,$2,$3,$4,$5,'ADMIN')`,
//             [
//                 companyId,
//                 body.ownerName,
//                 body.ownerEmail,
//                 body.ownerPhone,
//                 hashed
//             ]
//         );

//         await client.query("COMMIT");

//         return NextResponse.json({
//             message: "Company and Admin User created successfully",
//         });
//     } catch (err: any) {
//         await client.query("ROLLBACK");
//         if (err.code === "23505") {
//             return NextResponse.json(
//                 { message: "Duplicate entry detected (email/phone/username/subdomain)" },
//                 { status: 400 }
//             );
//         }
//         return NextResponse.json(
//             { message: err.message || "Something went wrong" },
//             { status: 400 }
//         );
//     } finally {
//         client.release();
//     }
// }

export async function POST(req: Request) {
  console.log("API HIT: /api/register-company");

  const body = await req.json();
  console.log("Request body:", body);

  const client = await pool.connect();

  try {
    console.log("DB connected");

    await client.query("BEGIN");
    console.log("Transaction started");

    /* ---------------- Check if company exists ---------------- */
    console.log("Checking company slug:", body.slug);

    const existingCompany = await client.query(
      `SELECT id, schema_name FROM public.companies WHERE subdomain_url = $1`,
      [body.slug]
    );

    console.log("Existing company result:", existingCompany.rows);

    let companyId: number;

    if (existingCompany.rows.length > 0) {
      console.log("Company already exists");
      companyId = existingCompany.rows[0].id;
    } else {
      console.log("Creating new company");

      const companyResult = await client.query(
        `INSERT INTO public.companies 
        (company_name, subdomain_url)
        VALUES ($1,$2)
        RETURNING id`,
        [body.businessName, body.slug]
      );

      console.log("Company inserted:", companyResult.rows);

      companyId = companyResult.rows[0].id;

      const schemaName = `tenant_${companyId}`;
      console.log("Generated schema name:", schemaName);

      console.log("Updating schema_name in companies table");

      await client.query(
        `UPDATE public.companies SET schema_name = $1 WHERE id = $2`,
        [schemaName, companyId]
      );

      console.log("Calling createCompanySchema");

      await createCompanySchema(client, schemaName);

      console.log("Schema created successfully:", schemaName);
    }

    /* ---------------- Email Check ---------------- */
    console.log("Checking existing email:", body.ownerEmail);

    const existingEmail = await client.query(
      `SELECT id FROM public.users WHERE company_id = $1 AND email = $2`,
      [companyId, body.ownerEmail]
    );

    if (existingEmail.rows.length > 0) {
      console.log("Email already exists");
      throw new Error("Email already exists for this company");
    }

    console.log("Email available");

    /* ---------------- Phone Check ---------------- */

    console.log("Checking existing phone:", body.ownerPhone);

    const existingPhone = await client.query(
      `SELECT id FROM public.users WHERE company_id = $1 AND phone = $2`,
      [companyId, body.ownerPhone]
    );

    if (existingPhone.rows.length > 0) {
      console.log("Phone already exists");
      throw new Error("Phone number already exists for this company");
    }

    console.log("Phone available");

    /* ---------------- Hash Password ---------------- */

    console.log("Hashing password");

    const hashed = await hashPassword(body.password);

    console.log("Password hashed");

    /* ---------------- Insert User ---------------- */

    console.log("Creating admin user");

    await client.query(
      `INSERT INTO public.users
       (company_id, name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,'ADMIN')`,
      [
        companyId,
        body.ownerName,
        body.ownerEmail,
        body.ownerPhone,
        hashed,
      ]
    );

    console.log("Admin user created");

    await client.query("COMMIT");
    console.log("Transaction committed");

    return NextResponse.json({
      message: "Company and Admin User created successfully",
    });

  } catch (err: any) {
    console.error("ERROR OCCURRED:", err);

    await client.query("ROLLBACK");
    console.log("Transaction rolled back");

    if (err.code === "23505") {
      console.log("Postgres duplicate constraint triggered");
      return NextResponse.json(
        { message: "Duplicate entry detected (email/phone/username/subdomain)" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: err.message || "Something went wrong" },
      { status: 400 }
    );
  } finally {
    client.release();
    console.log("DB connection released");
  }
}