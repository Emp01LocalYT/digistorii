import { NextRequest, NextResponse } from "next/server";
import { canAccess, getFirstAccessiblePath, getRequiredPermissionForPath } from "./lib/accessControl";
 
export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // console.log("MIDDLEWARE HIT:", pathname);
    // console.log("ALL COOKIES:", req.cookies.getAll());
 
    // Skip Next.js internal files, static assets, and APIs
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/setup") ||
        pathname.startsWith("/get-service") ||
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
    try {
      const adminUser = JSON.parse(admin);
      const adminPath = pathname.slice(`/${company}`.length);
      const requiredPermission = getRequiredPermissionForPath(adminPath);
      if (requiredPermission && !canAccess(adminUser?.permissions, requiredPermission)) {
        const fallbackPath = getFirstAccessiblePath(adminUser?.permissions);
        return NextResponse.redirect(
          new URL(fallbackPath ? `/${company}${fallbackPath}` : `/${company}/admin/login`, req.url)
        );
      }
    } catch {
      return NextResponse.redirect(new URL(`/${company}/admin/login`, req.url));
    }
    return NextResponse.next();
  }

  //  USER ROUTES
  if (!user) {
    return NextResponse.redirect(
      new URL(`/${company}/login`, req.url)
    );
  }

  try {
    const currentUser = JSON.parse(user);
    const userPath = pathname.slice(`/${company}`.length);
    const requiredPermission = getRequiredPermissionForPath(userPath);
    if (requiredPermission && !canAccess(currentUser?.permissions, requiredPermission)) {
      const fallbackPath = getFirstAccessiblePath(currentUser?.permissions);
      return NextResponse.redirect(
        new URL(fallbackPath ? `/${company}${fallbackPath}` : `/${company}/login`, req.url)
      );
    }
  } catch {
    return NextResponse.redirect(new URL(`/${company}/login`, req.url));
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
