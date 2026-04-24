import { cookies } from "next/headers";
import { NextResponse } from "next/server";
 
export async function GET() {
 
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
 
  if (!userCookie) {
    return NextResponse.json({
      success: false,
      message: "User not logged in"
    }, { status: 401 });
  }
 
  const user = JSON.parse(userCookie.value);
 
  return NextResponse.json({
    success: true,
    user
  });
}