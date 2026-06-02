import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

function getUserIdFromCookie(req: NextRequest): number | null {
  const userCookie = req.cookies.get("user")?.value;
  if (!userCookie) return null;

  try {
    const parsed = JSON.parse(userCookie);
    const maybeUserId = Number(parsed?.user_id ?? parsed?.id);
    if (!Number.isInteger(maybeUserId) || maybeUserId <= 0) return null;
    return maybeUserId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const userId = getUserIdFromCookie(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { company, schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json(
        { success: false, error: "Invalid schema" },
        { status: 400 }
      );
    }

    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    const userRes = await client.query(
      `SELECT id FROM public.users WHERE id = $1 AND company_id = $2 AND is_active = TRUE`,
      [userId, companyId]
    );
    if (!userRes.rowCount) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch user's default warehouse
    const warehouseRes = await client.query(
      `
        SELECT
          w.id,
          w.code,
          w.name,
          w.location_id,
          w.type,
          w.description,
          l.name AS location_name
        FROM "${schema}".user_settings us
        LEFT JOIN "${schema}".warehouses w ON w.id = us.default_warehouse_id
        LEFT JOIN "${schema}".locations l ON w.location_id = l.id
        WHERE us.user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    const row = warehouseRes.rows[0];
    if (!row || !row.id) {
      return NextResponse.json(
        { success: false, error: "Warehouse not assigned for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        code: row.code,
        name: row.name,
        location_id: row.location_id,
        type: row.type,
        description: row.description,
        location_name: row.location_name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch user warehouse" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
