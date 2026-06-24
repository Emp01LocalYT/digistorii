import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import { ensureCompanyResponsibilities } from "@/lib/userResponsibilities";

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

    await ensureCompanyResponsibilities(client, Number(companyId));

    const result = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.responsibility_id,
         r.responsibility_name,
         u.is_active
       FROM public.users u
       LEFT JOIN public.user_responsibilities r
         ON r.id = u.responsibility_id
       WHERE u.company_id = $1
       ORDER BY u.name ASC`,
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
