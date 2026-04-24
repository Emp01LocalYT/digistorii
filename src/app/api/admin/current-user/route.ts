import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Get admin cookie
  const adminCookie = req.cookies.get("admin_user")?.value;

  if (!adminCookie) {
    return NextResponse.json({ success: false, message: "Not logged in" });
  }

  try {
    const user = JSON.parse(adminCookie);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Invalid cookie" });
  }
}