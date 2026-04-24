import { NextRequest, NextResponse } from "next/server";
 
export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // console.log("MIDDLEWARE HIT:", pathname);
    // console.log("ALL COOKIES:", req.cookies.getAll());
 
    // Skip Next.js internal files, static assets, and APIs
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }
 
   
    const user = req.cookies.get("user")?.value;
    const admin = req.cookies.get("admin_user")?.value;
 
    // console.log("ADMIN COOKIE:", req.cookies.get("admin_user"));
 
    const segments = pathname.split("/").filter(Boolean);
    const company = segments[0];
    if (!company) {
         return NextResponse.next();
    }
 
    // If no company in URL
    if (
   pathname.startsWith(`/${company}/login`) ||
  pathname.startsWith(`/${company}/admin/login`)
  ) {
    return NextResponse.next();
  }
    // if (!company) {
    //     return NextResponse.next();
    // }
 
    // Allow login page
    // if (pathname === `/${company}/login`) {
    //     return NextResponse.next();
    // }
    // ADMIN ROUTES
  if (pathname.startsWith(`/${company}/admin`)) {
    if (!admin) {
      return NextResponse.redirect(
        new URL(`/${company}/admin/login`, req.url)
      );
    }
    return NextResponse.next();
  }
 
  //  USER ROUTES
  if (!user) {
    return NextResponse.redirect(
      new URL(`/${company}/login`, req.url)
    );
  }
 
 
    // Not logged in → redirect to login
    // if (!user) {
    //     const loginUrl = new URL(`/${company}/login`, req.url);
    //     return NextResponse.redirect(loginUrl);
    // }
 
    return NextResponse.next();
}
 
// export const config = {
//     matcher: ["/:company/:path*"],
// };
export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};