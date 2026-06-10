import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { getTenantSchema } from "@/lib/tenant";

const STAFF_ROLES = new Set(["ADMIN", "MANAGER", "CASHIER", "WAREHOUSE_STAFF"]);

type ApiError = {
  status: number;
  message: string;
  field?: string;
  index?: number;
};

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function asApiError(error: unknown): ApiError | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Partial<ApiError>;
  if (!candidate.status || !candidate.message) return null;
  return {
    status: candidate.status,
    message: candidate.message,
    field: candidate.field,
    index: candidate.index,
  };
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const existingCompany = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (!existingCompany.rowCount) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }
    const companyId = Number(existingCompany.rows[0].id);

    const result = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.is_active,
         u.created_at,
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
       WHERE u.company_id = $1
         AND COALESCE(cum.role, u.role, 'CASHIER') <> 'OWNER'
       ORDER BY u.id DESC`,
      [companyId]
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
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const { company, schema } = await getTenantSchema(req);
  const body = await req.json();
  const users = Array.isArray(body?.users) ? body.users : [];
  const client = await pool.connect();

  if (!users.length) {
    return NextResponse.json(
      { success: false, message: "At least one user is required" },
      { status: 400 }
    );
  }

  try {
    await client.query("BEGIN");
    const existingCompany = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    if (!existingCompany.rowCount) {
      throw { status: 404, message: "Company not found" } as ApiError;
    }
    const companyId = Number(existingCompany.rows[0].id);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const role = String(user?.role || "").trim().toUpperCase();
      const locationId = parsePositiveInt(user?.location_id);
      const warehouseId = parsePositiveInt(user?.warehouse_id);

      if (!STAFF_ROLES.has(role)) {
        throw {
          status: 400,
          field: "role",
          index: i,
          message: "Invalid role selected",
        } as ApiError;
      }
      if (!locationId) {
        throw {
          status: 400,
          field: "location_id",
          index: i,
          message: "Location is required",
        } as ApiError;
      }
      if (!warehouseId) {
        throw {
          status: 400,
          field: "warehouse_id",
          index: i,
          message: "Warehouse is required",
        } as ApiError;
      }

      const locationExists = await client.query(
        `SELECT id FROM "${schema}".locations WHERE id = $1`,
        [locationId]
      );
      if (!locationExists.rowCount) {
        throw {
          status: 400,
          field: "location_id",
          index: i,
          message: "Selected location not found",
        } as ApiError;
      }

      const warehouseExists = await client.query(
        `SELECT id
         FROM "${schema}".warehouses
         WHERE id = $1 AND location_id = $2`,
        [warehouseId, locationId]
      );
      if (!warehouseExists.rowCount) {
        throw {
          status: 400,
          field: "warehouse_id",
          index: i,
          message: "Selected warehouse does not belong to selected location",
        } as ApiError;
      }

      const email = String(user?.email || "").trim().toLowerCase();
      const phone = String(user?.phone || "").trim();
      const username = String(user?.username || "").trim();

      const existingEmail = await client.query(
        `SELECT id FROM public.users WHERE company_id = $1 AND email = $2`,
        [companyId, email]
      );
      if (existingEmail.rowCount) {
        throw {
          status: 409,
          field: "email",
          index: i,
          message: "Email already exists for this company",
        } as ApiError;
      }

      const existingPhone = await client.query(
        `SELECT id FROM public.users WHERE phone = $1`,
        [phone]
      );
      if (existingPhone.rowCount) {
        throw {
          status: 409,
          field: "phone",
          index: i,
          message: "Phone number already exists for this company",
        } as ApiError;
      }

      const existingUsername = await client.query(
        `SELECT id FROM public.users WHERE company_id = $1 AND username = $2`,
        [companyId, username]
      );
      if (existingUsername.rowCount) {
        throw {
          status: 409,
          field: "username",
          index: i,
          message: "Username already exists for this company",
        } as ApiError;
      }

      const hashed = await hashPassword(String(user?.password || ""));
      const userInsert = await client.query(
        `INSERT INTO public.users (company_id, name, username, email, phone, password_hash, is_active, role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [
          companyId,
          String(user?.full_name || "").trim(),
          username,
          email,
          phone,
          hashed,
          Boolean(user?.status),
          role,
        ]
      );

      const newUserId = Number(userInsert.rows[0]?.id);
      await client.query(
        `INSERT INTO public.company_user_map
         (user_id, company_id, username, role, location_id, warehouse_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (user_id, company_id) DO UPDATE
         SET username = EXCLUDED.username,
             role = EXCLUDED.role,
             location_id = EXCLUDED.location_id,
             warehouse_id = EXCLUDED.warehouse_id,
             is_active = TRUE`,
        [newUserId, companyId, username, role, locationId, warehouseId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Users created successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const knownError = asApiError(error);
    if (knownError) {
      return NextResponse.json(
        {
          success: false,
          message: knownError.message,
          field: knownError.field,
          index: knownError.index,
        },
        { status: knownError.status }
      );
    }
    console.error("POST USERS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
