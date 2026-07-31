import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");

  if (!userCookie) {
    return NextResponse.json({
      success: false,
      message: "User not logged in"
    }, { status: 401 });
  }

  // Extract user ID from cookie
  const parsedCookie = JSON.parse(userCookie.value);
  const userId = Number(parsedCookie?.user_id ?? parsedCookie?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({
      success: false,
      message: "Invalid user ID"
    }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.id, u.username, u.name, u.email, u.phone, u.company_id,
              c.id as company_id, c.company_name AS real_company_name, c.subdomain_url as company_name
         FROM public.users u
         JOIN public.companies c ON u.company_id = c.id
        WHERE u.id = $1`,
      [userId]
    );

    if (!result.rowCount) {
      return NextResponse.json({
        success: false,
        message: "User not found"
      }, { status: 404 });
    }

    const user = result.rows[0];
    const tenant = user.company_name;

    const companyCheck = await client.query(
      `SELECT c.status AS company_status, cs.subscription_end, cs.status AS sub_status
       FROM public.companies c
       LEFT JOIN public.company_subscriptions cs ON cs.company_id = c.id
       WHERE c.subdomain_url = $1
       ORDER BY cs.updated_at DESC LIMIT 1`,
      [tenant]
    );

    const isExpired = companyCheck.rows[0]?.company_status === 'EXPIRED' || 
                      (companyCheck.rows[0]?.subscription_end && new Date() > new Date(companyCheck.rows[0].subscription_end));

    if (isExpired) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Subscription expired please contact administrator" 
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch user"
    }, { status: 500 });
  } finally {
    client.release();
  }
}