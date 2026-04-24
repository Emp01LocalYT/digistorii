import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const { id } = await context.params;
    const settingsId = Number(id);
    if (!Number.isInteger(settingsId) || settingsId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const userId = Number(body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "User is required" }, { status: 400 });
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

    const existing = await client.query(
      `SELECT id FROM "${schema}".user_settings WHERE id = $1`,
      [settingsId]
    );
    if (!existing.rowCount) {
      return NextResponse.json({ success: false, error: "User settings not found" }, { status: 404 });
    }

    const result = await client.query(
      `
        UPDATE "${schema}".user_settings
        SET user_id = $1,
            default_warehouse_id = $2,
            default_locator_id = $3,
            branch_name = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `,
      [userId, defaultWarehouseId, defaultLocatorId, branchName, settingsId]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user settings" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
