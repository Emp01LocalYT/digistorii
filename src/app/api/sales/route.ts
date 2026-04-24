import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateSalesNo } from "@/lib/document-number-generator";
import { getTenantSchema } from "@/lib/tenant";
import { isFinalStatus } from "@/lib/stockLedger";
import { allocateSalesStockFIFO } from "@/lib/stockAllocation";
 
async function resolveVariantId(
  client: any,
  schema: string,
  idValue: any
): Promise<number> {
  const id = Number(idValue);
  if (!Number.isFinite(id)) throw new Error("Invalid variant id");
  const variantRes = await client.query(
    `SELECT id FROM "${schema}".product_variants WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (variantRes.rows.length) return Number(variantRes.rows[0].id);
  throw new Error("Variant not found");
}

const toPositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const getWarehouseFromCookie = (req: NextRequest) => {
  const userCookie = req.cookies.get("user")?.value;
  if (!userCookie) return null;

  try {
    const parsed = JSON.parse(userCookie);
    return toPositiveInt(parsed?.default_warehouse_id);
  } catch {
    return null;
  }
};

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

async function ensureSalesHeaderColumns(client: any, schema: string) {
  await client.query(
    `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS warehouse_id INT`
  );
  await client.query(
    `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS locator_id INT`
  );
  await client.query(
    `ALTER TABLE "${schema}".sales_header ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100)`
  );
}
 
 
// ---------------- GET: fetch all sales with details ----------------
export async function GET(req: NextRequest) {
  try {
 
    const { company, schema } = await getTenantSchema(req);
 
    const res = await pool.query(`
      SELECT
        h.*,
        s.name as customer_name,
        s.email as customer_email,
        s.phone as customer_phone,
        CONCAT_WS(', ',
          ca.address_line1,
          ca.address_line2,
          ca.city,
          ca.state,
          ca.pincode
        ) as customer_address
      FROM ${schema}.sales_header h
      LEFT JOIN ${schema}.customers s
      ON h.customer_id = s.id
      LEFT JOIN ${schema}.customer_addresses ca
      ON ca.customer_id = s.id 
      ORDER BY h.id DESC
    `);
 
    // console.log("Fetched Sales:", res.rows);
    return NextResponse.json({ success: true, data: res.rows });
 
  } catch (err: any) {
 
    console.error("Sales Fetch DB Error:", err);
 
    if (err.code === "42P01") {
      return NextResponse.json(
        { success: false, error: "Table sales_header or sales_detail does not exist" },
        { status: 500 }
      );
    }
 
    if (err.code === "28P01") {
      return NextResponse.json(
        { success: false, error: "Database authentication failed" },
        { status: 500 }
      );
    }
 
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Database query failed"
      },
      { status: 500 }
    );
  }
}
 
export async function POST(req: NextRequest) {
  console.log("STEP A - API HIT /api/sales");
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    console.log("STEP B - tenant:", company, schema);
    const userId = getUserIdFromCookie(req);
    console.log("STEP C - userId:", userId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const settingsRes = await client.query(
      `SELECT default_warehouse_id, default_locator_id, branch_name FROM "${schema}".user_settings WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const settings = settingsRes.rows[0] || {};
    const warehouseId = toPositiveInt(settings.default_warehouse_id) || null;
    const locatorId = toPositiveInt(settings.default_locator_id) || null;
    const branchName = settings.branch_name ? String(settings.branch_name).trim() : null;

    const body = await req.json();
    console.log("STEP D - body received", body);
    const { header, details } = body;

    if (!header || !details?.length) {
      return NextResponse.json(
        { success: false, error: "Header and at least one detail are required" },
        { status: 400 }
      );
    }
    console.log("STEP E - starting transaction");
    await client.query("BEGIN");
    // await ensureSalesHeaderColumns(client, schema);

    // Generate sales_no
    const salesNo = await generateSalesNo(schema);
    console.log("STEP F - generated sales no:", salesNo);
    // Insert header
    const headerQuery = `
      INSERT INTO ${schema}.sales_header
        (sales_no, customer_id, sales_date, currency, warehouse_id, locator_id, branch_name, status, subtotal, tax_amount, total_amount, created_by, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      RETURNING id
    `;
    const statusValue = header.status || "Entered";
    const headerValues = [
      salesNo,
      header.customer_id,
      header.sales_date,
      header.currency,
      warehouseId,
      locatorId,
      branchName,
      statusValue,
      header.subtotal,
      header.tax_amount,
      header.total_amount,
      userId,
    ];
    console.log("STEP G - inserting header");
    const headerRes = await client.query(headerQuery, headerValues);
    console.log("STEP H - header inserted", headerRes.rows);
    if (!headerRes.rows.length) throw new Error("Failed to save sales header");

    const salesId = headerRes.rows[0].id;
 
    const shouldAllocate = isFinalStatus(statusValue);
    let allocationWarehouseId: number | null = warehouseId;
    if (shouldAllocate) {
      if (!allocationWarehouseId) {
        throw new Error("Warehouse not set for this sale");
      }
    }

    // Insert details
    const detailQuery = `
      INSERT INTO ${schema}.sales_detail
        (sales_id, product_id, UOM, rate, qty, discount, tax_master_id, tax_amount, line_total, created_by, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      RETURNING id
    `;
    console.log("STEP I - inserting details:", details.length);
    for (const d of details) {
      const variantId = await resolveVariantId(client, schema, d.product_id);
      const taxMasterId = d.tax_id && d.tax_id > 0 ? d.tax_id : null;
      const detailRes = await client.query(detailQuery, [
        salesId,
        variantId,
        d.uom,
        d.rate,
        d.qty,
        d.discount,
        taxMasterId,
        d.tax_amount,
        d.line_total,
        userId
      ]);
      console.log("STEP J - inserting detail:", d.product_id);
      if (shouldAllocate) {
        console.log("STEP J - allocating stock for detail id:", detailRes.rows[0].id);
        const salesDetailId = Number(detailRes.rows[0]?.id);
        await allocateSalesStockFIFO(client, {
          schema,
          tenantId: company,
          salesId,
          salesDetailId,
          productId: variantId,
          qtyToSell: Number(d.qty || 0),
          warehouseId: allocationWarehouseId!,
          txnDate: header.sales_date
        });
      }
    }
    console.log("STEP K - committing transaction");
    await client.query("COMMIT");
    console.log(`Sales ${salesNo} saved with ID ${salesId}`);
 
    return NextResponse.json({
      success: true,
      message: "Sales saved successfully",
      sales_no: salesNo,
      id: salesId,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Sales Save Error:", err);
    let msg = "Internal server error";
    let statusCode = 500;
    if (err.code === "23505") msg = "Duplicate entry detected";
    else if (err.message) msg = err.message;
    if (msg === "Insufficient stock" || msg === "Warehouse not set for this sale") {
      statusCode = 400;
    }

    return NextResponse.json({ success: false, error: msg }, { status: statusCode });
  } finally {
    client.release();
  }
}
