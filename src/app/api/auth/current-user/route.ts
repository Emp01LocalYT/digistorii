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
              c.id as company_id, c.company_name, c.subdomain_url
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