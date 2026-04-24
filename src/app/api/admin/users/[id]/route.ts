import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { getTenantSchema } from "@/lib/tenant";
 
/* ---------------- GET USER BY ID ---------------- */
export async function GET( req: NextRequest,
  context: { params: Promise<{ id: string }> }) {
  const { company, schema } = await getTenantSchema(req);
  const { id } = await context.params;
  try {
    const companyRes = await pool.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (companyRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    }
    const companyId = companyRes.rows[0].id;
 
    const userRes = await pool.query(
      `SELECT
         u.id,
         u.name as full_name,
         u.username,
         u.email,
         u.phone,
         u.is_active,
         us.default_warehouse_id,
         us.default_locator_id,
         us.branch_name
       FROM public.users u
       LEFT JOIN "${schema}".user_settings us
         ON us.user_id = u.id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, companyId]
    );
 
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
 
    return NextResponse.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    console.error("GET USER ERROR:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
 
/* ---------------- UPDATE USER BY ID ---------------- */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { company, schema } = await getTenantSchema(req);
  const { id } = await context.params;;
 
  const body = await req.json();
  const user = body.users?.[0];
  const password = user?.password;
  const status = user?.status;
  const defaultWarehouseId = user?.default_warehouse_id
    ? Number(user.default_warehouse_id)
    : null;
  const defaultLocatorId = user?.default_locator_id
    ? Number(user.default_locator_id)
    : null;
  const branchName = user?.branch_name ? String(user.branch_name).trim() : null;
  const hasSettingsUpdate =
    user &&
    ("default_warehouse_id" in user ||
      "default_locator_id" in user ||
      "branch_name" in user);
  const client = await pool.connect();
 
  try {
    await client.query("BEGIN");
 
    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (companyRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    }
    const companyId = companyRes.rows[0].id;
 
    const userRes = await client.query(
      `SELECT id FROM public.users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
 
    let hashedPassword = null;
    if (password && password.length > 0) {
      hashedPassword = await hashPassword(password);
    }
 
    console.log("hashedPassword : ",hashedPassword," status : ",status);
 
    if (hashedPassword) {
      console.log("IF hashedPassword");
      await client.query(
        `UPDATE public.users
         SET password_hash = COALESCE($1, password_hash),
             is_active = $2,
         WHERE id = $3 AND company_id = $4`,
        [hashedPassword, status, id, companyId]
      );
    } else {
      await client.query(
        `UPDATE public.users
         SET is_active = $1,
         WHERE id = $2 AND company_id = $3`,
        [status, id, companyId]
      );
    }

    if (hasSettingsUpdate) {
      const existingSettings = await client.query(
        `SELECT id FROM "${schema}".user_settings WHERE user_id = $1`,
        [id]
      );
      if (existingSettings.rowCount) {
        await client.query(
          `UPDATE "${schema}".user_settings
           SET default_warehouse_id = $1,
               default_locator_id = $2,
               branch_name = $3,
               updated_at = NOW()
           WHERE user_id = $4`,
          [defaultWarehouseId, defaultLocatorId, branchName, id]
        );
      } else {
        await client.query(
          `INSERT INTO "${schema}".user_settings
            (user_id, default_warehouse_id, default_locator_id, branch_name, created_at, updated_at)
           VALUES ($1,$2,$3,$4,NOW(),NOW())`,
          [id, defaultWarehouseId, defaultLocatorId, branchName]
        );
      }
    }
 
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("PUT USER ERROR:", err);
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
