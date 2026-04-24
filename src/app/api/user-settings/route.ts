import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const result = await client.query(
      `
        SELECT
          us.id,
          us.user_id,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          us.default_warehouse_id,
          w.name as warehouse_name,
          us.default_locator_id,
          l.locator_name,
          us.branch_name,
          us.created_at,
          us.updated_at
        FROM "${schema}".user_settings us
        JOIN public.users u ON u.id = us.user_id
        LEFT JOIN "${schema}".warehouses w ON w.id = us.default_warehouse_id
        LEFT JOIN "${schema}".locators l ON l.id = us.default_locator_id
        WHERE u.company_id = $1
        ORDER BY us.id DESC
      `,
      [companyId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch user settings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const body = await req.json();
    const userId = Number(body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "User is required" }, { status: 400 });
    }

    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const userRes = await client.query(
      `SELECT id FROM public.users WHERE id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    if (!userRes.rowCount) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const defaultWarehouseId = body.default_warehouse_id ? Number(body.default_warehouse_id) : null;
    const defaultLocatorId = body.default_locator_id ? Number(body.default_locator_id) : null;
    const branchName = body.branch_name ? String(body.branch_name).trim() : null;

    if (defaultWarehouseId) {
      const warehouseRes = await client.query(
        `SELECT id FROM "${schema}".warehouses WHERE id = $1`,
        [defaultWarehouseId]
      );
      if (!warehouseRes.rowCount) {
        return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 400 });
      }
    }

    if (defaultLocatorId) {
      const locatorRes = await client.query(
        `SELECT id FROM "${schema}".locators WHERE id = $1`,
        [defaultLocatorId]
      );
      if (!locatorRes.rowCount) {
        return NextResponse.json({ success: false, error: "Locator not found" }, { status: 400 });
      }
    }

    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT id FROM "${schema}".user_settings WHERE user_id = $1`,
      [userId]
    );
    let result;
    if (existing.rowCount) {
      result = await client.query(
        `
          UPDATE "${schema}".user_settings
          SET default_warehouse_id = $1,
              default_locator_id = $2,
              branch_name = $3,
              updated_at = NOW()
          WHERE user_id = $4
          RETURNING *
        `,
        [defaultWarehouseId, defaultLocatorId, branchName, userId]
      );
    } else {
      result = await client.query(
        `
          INSERT INTO "${schema}".user_settings
            (user_id, default_warehouse_id, default_locator_id, branch_name, created_at, updated_at)
          VALUES ($1,$2,$3,$4,NOW(),NOW())
          RETURNING *
        `,
        [userId, defaultWarehouseId, defaultLocatorId, branchName]
      );
    }
    await client.query("COMMIT");

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save user settings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
