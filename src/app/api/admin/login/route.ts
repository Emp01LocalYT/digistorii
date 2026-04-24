import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword } from "@/lib/hash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const tenant = body.tenant; // pass company from login form
    console.log("Admin Login Backend Tenant : ", tenant);
    if (!tenant) return NextResponse.json({ success: false, message: "Company required" }, { status: 400 });

    // get company
    const companyResult = await pool.query(
      "SELECT id FROM public.companies WHERE subdomain_url = $1",
      [tenant]
    );
    if (!companyResult.rows.length) return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });

    const companyId = companyResult.rows[0].id;
    console.log("Admin Login Backend Tenant Id : ", companyId);
    // check admin user
    const userResult = await pool.query(
      `SELECT * FROM public.users WHERE email = $1 AND company_id = $2 AND role='ADMIN' AND is_active=true`,
      [email, companyId]
    );

    if (!userResult.rows.length)
      return NextResponse.json(
        { success: false, message: "Incorrect email or password" },
        { status: 401 }
      );

    const user = userResult.rows[0];
    console.log("Admin User found:", user);
    console.log("Admin Verifying password for user:", email);
    const validPassword = await verifyPassword(password, user.password_hash);
    console.log("Admin Password valid:", validPassword);
    if (!validPassword)
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );

    // set cookies
    const res = NextResponse.json({
      success: true, user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone,
        role: user.role
      }
    });

    res.cookies.set("admin_user", JSON.stringify({ id: user.id, name: user.name }), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });


    res.cookies.set("tenant", tenant, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong during login.Please try again later." },
      { status: 500 }
    );

  }
}