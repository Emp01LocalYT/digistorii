import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { getTenantSchema } from "@/lib/tenant";

const STAFF_ROLES = new Set(["ADMIN", "MANAGER", "CASHIER", "WAREHOUSE_STAFF"]);

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/* ---------------- GET USER BY ID ---------------- */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { company, schema } = await getTenantSchema(req);
  const { id } = await context.params;
  const client = await pool.connect();

  try {
    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (!companyRes.rowCount) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }
    const companyId = Number(companyRes.rows[0].id);

    const userRes = await client.query(
      `SELECT
         u.id,
         u.name AS full_name,
         u.username,
         u.email,
         u.phone,
         u.is_active,
         COALESCE(cum.role, u.role, 'CASHIER') AS role,
         cum.location_id,
         cum.warehouse_id,
         l.name AS location_name,
         w.name AS warehouse_name
       FROM public.users u
       LEFT JOIN public.company_user_map cum
         ON cum.user_id = u.id
        AND cum.company_id = u.company_id
       LEFT JOIN "${schema}".locations l
         ON l.id = cum.location_id
       LEFT JOIN "${schema}".warehouses w
         ON w.id = cum.warehouse_id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, companyId]
    );

    if (!userRes.rowCount) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    console.error("GET USER ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/* ---------------- UPDATE USER BY ID ---------------- */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { company, schema } = await getTenantSchema(req);
  const { id } = await context.params;
  const body = await req.json();
  const user = body?.users?.[0] ?? {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (!companyRes.rowCount) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }
    const companyId = Number(companyRes.rows[0].id);

    const userRes = await client.query(
      `SELECT id, username FROM public.users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (!userRes.rowCount) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const role = String(user?.role || "").trim().toUpperCase();
    const locationId = parsePositiveInt(user?.location_id);
    const warehouseId = parsePositiveInt(user?.warehouse_id);
    if (!STAFF_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role selected", field: "role", index: 0 },
        { status: 400 }
      );
    }
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: "Location is required", field: "location_id", index: 0 },
        { status: 400 }
      );
    }
    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: "Warehouse is required", field: "warehouse_id", index: 0 },
        { status: 400 }
      );
    }

    const locationExists = await client.query(
      `SELECT id FROM "${schema}".locations WHERE id = $1`,
      [locationId]
    );
    if (!locationExists.rowCount) {
      return NextResponse.json(
        { success: false, message: "Selected location not found", field: "location_id", index: 0 },
        { status: 400 }
      );
    }

    const warehouseExists = await client.query(
      `SELECT id
       FROM "${schema}".warehouses
       WHERE id = $1 AND location_id = $2`,
      [warehouseId, locationId]
    );
    if (!warehouseExists.rowCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected warehouse does not belong to selected location",
          field: "warehouse_id",
          index: 0,
        },
        { status: 400 }
      );
    }

    const password = String(user?.password || "");
    const status = Boolean(user?.status);
    const username = String(userRes.rows[0].username || "").trim() || `user_${id}`;

    if (password) {
      const hashedPassword = await hashPassword(password);
      await client.query(
        `UPDATE public.users
         SET password_hash = $1,
             is_active = $2,
             role = $3
         WHERE id = $4 AND company_id = $5`,
        [hashedPassword, status, role, id, companyId]
      );
    } else {
      await client.query(
        `UPDATE public.users
         SET is_active = $1,
             role = $2
         WHERE id = $3 AND company_id = $4`,
        [status, role, id, companyId]
      );
    }

    await client.query(
      `INSERT INTO public.company_user_map
       (user_id, company_id, username, role, location_id, warehouse_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, company_id) DO UPDATE
       SET username = EXCLUDED.username,
           role = EXCLUDED.role,
           location_id = EXCLUDED.location_id,
           warehouse_id = EXCLUDED.warehouse_id,
           is_active = EXCLUDED.is_active`,
      [id, companyId, username, role, locationId, warehouseId, status]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (err) {
    console.error("PUT USER ERROR:", err);
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
