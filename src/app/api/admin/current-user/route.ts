import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Get admin cookie
  const adminCookie = req.cookies.get("admin_user")?.value;

  if (!adminCookie) {
    return NextResponse.json({ success: false, message: "Not logged in" });
  }

  try {
    const user = JSON.parse(adminCookie);
    const tenant = user.company_name;

    if (tenant) {
      // Allow admin users to log in even if expired, so we don't perform the isExpired block here.
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Invalid cookie" });
  }
}