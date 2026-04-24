import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "../../../../lib/pages/login";
 
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const company = url.searchParams.get("company");
    const { email, password } = await req.json();
    console.log("Login attempt for company:", company, "email:", email);
    if (!company)
      return NextResponse.json(
        { success: false, message: "Company required" },
        { status: 400 }
      );
 
    const result = await loginUser(company, email, password);
    console.log("Login successful for user:", email, "in company:", company);
    // return NextResponse.json({ success: true, ...result });
    //  const response = NextResponse.json({
    //   success: true,
    //   ...result,
    // });
    const response = NextResponse.json(result);
 
    //store user in cookie
    response.cookies.set("user", JSON.stringify(result.user), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
 
    // store tenant also
    response.cookies.set("tenant", company, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
 
    return response;
 
  } catch (err: any) {
    // return NextResponse.json(
    //   { success: false, error: err.message },
    //   { status: 401 }
    // );
    console.error("Route error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}