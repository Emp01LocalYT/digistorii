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

    const settingsRes = await client.query(
      `
        SELECT
          default_warehouse_id,
          default_locator_id,
          branch_name,
          user_id
        FROM "${schema}".user_settings
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    const row = settingsRes.rows[0] || {};
    console.log("user-settings GET - fetched settings:", row);
    return NextResponse.json({
      success: true,
      data: {
        default_warehouse_id: row.default_warehouse_id ?? null,
        default_locator_id: row.default_locator_id ?? null,
        branch_name: row.branch_name ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch user settings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
