import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { getTenantSchema } from "@/lib/tenant";
 
export async function GET(req: NextRequest) {
  try {
    // const tenant = req.headers.get("x-tenant");
 
 
    // if (!tenant) {
    //   return NextResponse.json(
    //     { success: false, message: "Tenant missing" },
    //     { status: 400 }
    //   );
    // }
 
  const { company, schema } = await getTenantSchema(req);
 
    const existingCompany = await pool.query(
      `SELECT id, schema_name FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    const companyId = existingCompany.rows[0].id;
 
    // Fetch only that company users
    const result = await pool.query(
      "SELECT * FROM public.users WHERE company_id = $1 and role=$2 ORDER BY id DESC",
      [companyId, "USER"]
    );
 
    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
 
export async function POST(req: NextRequest) {
 
  // const tenant = req.headers.get("x-tenant");
  const { company, schema } = await getTenantSchema(req);
  const { users } = await req.json();
  console.log("tenant user creation : ", company);
  const client = await pool.connect();
 
  try {
    await client.query("BEGIN");
    const existingCompany = await client.query(
      `SELECT id, schema_name FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (existingCompany.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }
    const companyId = existingCompany.rows[0].id;
 
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      /* ---------------- Check if email already exists for this company ---------------- */
      const existingEmail = await client.query(
        `SELECT id FROM public.users WHERE company_id = $1 AND email = $2`,
        [companyId, user.email]
      );
      if (existingEmail.rows.length > 0) {
        return NextResponse.json(
          { success: false,field: "email",index: i, message: "Email already exists for this company" },
          { status: 409 }
        );
 
      }
 
      /* ---------------- Check if phone already exists for this company ---------------- */
      const existingPhone = await client.query(
        `SELECT id FROM public.users WHERE company_id = $1 AND phone = $2`,
        [companyId, user.phone]
      );
      if (existingPhone.rows.length > 0) {
        return NextResponse.json(
          { success: false,field: "phone",index: i, message: "Phone number already exists for this company" },
          { status: 409 }
        );
      }
 
      /* ---------------- Check if username already exists for this company ---------------- */
      const existingUsername = await client.query(
        `SELECT id FROM public.users WHERE company_id = $1 AND username = $2`,
        [companyId, user.username]
      );
      if (existingUsername.rows.length > 0) {
        return NextResponse.json(
          { success: false,field: "username",index: i, message: "Username already exists for this company" },
          { status: 409 }
        );
      }
 
      const hashed = await hashPassword(user.password);
      const defaultWarehouseId = user.default_warehouse_id ? Number(user.default_warehouse_id) : null;
      const userInsert = await client.query(
        `INSERT INTO public.users (company_id, name, username, email, phone, password_hash,is_active, role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'USER')
         RETURNING id`,
        [
          companyId,
          user.full_name,
          user.username,
          user.email,
          user.phone,
          hashed,
          user.status
        ]
      );

      const newUserId = Number(userInsert.rows[0]?.id);
      if (Number.isFinite(newUserId)) {
        if (
          defaultWarehouseId ||
          user.default_locator_id ||
          user.branch_name
        ) {
          const existingSettings = await client.query(
            `SELECT id FROM "${schema}".user_settings WHERE user_id = $1`,
            [newUserId]
          );
          if (existingSettings.rowCount) {
            await client.query(
              `UPDATE "${schema}".user_settings
               SET default_warehouse_id = $1,
                   default_locator_id = $2,
                   branch_name = $3,
                   updated_at = NOW()
               WHERE user_id = $4`,
              [
                defaultWarehouseId,
                user.default_locator_id ? Number(user.default_locator_id) : null,
                user.branch_name || null,
                newUserId,
              ]
            );
          } else {
            await client.query(
              `INSERT INTO "${schema}".user_settings
                (user_id, default_warehouse_id, default_locator_id, branch_name, created_at, updated_at)
               VALUES ($1,$2,$3,$4,NOW(),NOW())`,
              [
                newUserId,
                defaultWarehouseId,
                user.default_locator_id ? Number(user.default_locator_id) : null,
                user.branch_name || null,
              ]
            );
          }
        }
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
    });
  } catch (err: any) {
    console.error(err);
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
 
