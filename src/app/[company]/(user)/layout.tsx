 
"use client";
 
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { usePathname, useParams, useRouter } from "next/navigation";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TenantProvider } from "@/context/TenantContext";
// import { CurrentUserProvider } from "@/context/CurrentUserContext";
import useIdleLogout from "@/hooks/useIdleLogout";
import { useUser } from "@/context/CurrentUserContext";
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
  const router = useRouter();
 
  const companyParam = params.company;
 
  // Ensure tenant is always a string
  const tenant =
    Array.isArray(companyParam)
      ? companyParam[0]
      : companyParam || "default-tenant"; // fallback if undefined
 
  // Idle logout after 20 minutes
  useIdleLogout(tenant);
 
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasError, setHasError] = useState(false);
 
  //  Auth check runs inside useEffect
  // useEffect(() => {
  //   try {
  //     if (pathname?.endsWith("/login")) {
  //       // On login page, skip auth check
  //       setCheckingAuth(false);
  //       return;
  //     }
 
  //     const user = localStorage.getItem("user");
 
  //     if (!user) {
  //       router.replace(`/${tenant}/login`);
  //     } else {
  //       setCheckingAuth(false);
  //     }
  //   } catch (err) {
  //     console.error("Auth check failed", err);
  //     setHasError(true);
  //     router.replace(`/${tenant}/login`); // force logout on error
  //   }
  // }, [pathname, tenant, router]);
 
  const { user } = useUser();
 
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        if (pathname?.endsWith("/login")) {
          setCheckingAuth(false);
          return;
        }

        if (!user) {
          router.replace(`/${tenant}/login`);
          return;
        }

        const onboardingRes = await fetch(
          `/api/onboarding?company=${encodeURIComponent(tenant)}`
        );
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();
          if (
            onboardingData?.success &&
            onboardingData?.company?.setup_stage &&
            onboardingData.company.setup_stage !== "LIVE"
          ) {
            router.replace(`/setup?company=${encodeURIComponent(tenant)}`);
            return;
          }
        }

        setCheckingAuth(false);
      } catch (err) {
        console.error("Auth check failed", err);
        setHasError(true);
        router.replace(`/${tenant}/login`); // force logout on error
      }
    };

    checkAuthAndOnboarding();
  }, [user, pathname, tenant, router]);
 
  // Prevent UI flash before auth check
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }
 
  // LOGIN PAGE ALLOWED
  if (pathname?.endsWith("/login")) {
    return <div className={inter.className}>{children}</div>;
  }

  const isLiveBilling = pathname?.includes("/transactions/sales/add");
 
  return (
    <TenantProvider value={{ company: tenant }}>
      {/* <CurrentUserProvider> */}
      <ThemeProvider>
        <SidebarProvider>
          <div
            className={`${inter.className} font-sans antialiased text-gray-800 dark:text-white/90`}
          >
            {isLiveBilling ? children : <AdminLayout>{children}</AdminLayout>}
          </div>
        </SidebarProvider>
        
      </ThemeProvider>
      {/* </CurrentUserProvider> */}
    </TenantProvider>
  );
}
