
// "use client";

// import React from "react";
// import dynamic from "next/dynamic";
// import { Inter } from "next/font/google";
// import { usePathname } from "next/navigation";
// import { SidebarProvider } from "@/context/SidebarContext";
// import { ThemeProvider } from "@/context/ThemeContext";

// // Disable SSR for AdminLayout
// const AdminLayout = dynamic(() => import("@/layout/AdminLayout"), {
//   ssr: false,
// });

// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
// });

// export default function CompanyLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const pathname = usePathname();

//   if (pathname?.endsWith("/login")) {
//     return <div className={inter.className}>{children}</div>;
//   }

//   return (
//     <ThemeProvider>
//       <SidebarProvider>
//         <div className={`${inter.className} font-sans antialiased text-gray-800 dark:text-white/90`}>
//           <AdminLayout>{children}</AdminLayout>
//         </div>
//       </SidebarProvider>
//     </ThemeProvider>
//   );
// }
"use client";
 
import React from "react";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { usePathname, useParams } from "next/navigation";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TenantProvider } from "@/context/TenantContext";
 
const AdminLayout = dynamic(() => import("@/layout/AdminLayout"), {
  ssr: false,
});
 
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});
 
export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const companyParam = params.company;
 
  const company =
    Array.isArray(companyParam)
      ? companyParam[0]
      : companyParam || "default-tenant"; // fallback if undefined
 
  if (pathname?.endsWith("/login")) {
    return <div className={inter.className}>{children}</div>;
  }
 
  return (
    <TenantProvider value={{ company }}>
      <ThemeProvider>
        <SidebarProvider>
          <div
            className={`${inter.className} font-sans antialiased text-gray-800 dark:text-white/90`}
          >
            <AdminLayout>{children}</AdminLayout>
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </TenantProvider>
  );
}