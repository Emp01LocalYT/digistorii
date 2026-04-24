import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company } = await getTenantSchema(req);
    const companyRes = await client.query(
      `SELECT id FROM public.companies WHERE subdomain_url = $1`,
      [company]
    );
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const result = await client.query(
      `SELECT id, name, email, phone, role, is_active
       FROM public.users
       WHERE company_id = $1
       ORDER BY name ASC`,
      [companyId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
