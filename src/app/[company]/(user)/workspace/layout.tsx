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
  useIdleLogout(tenant, "/workspace/login");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { user } = useUser();

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        if (
          pathname?.endsWith("/workspace/login") ||
          pathname?.endsWith("/workspace/reset-password")
        ) {
          setCheckingAuth(false);
          return;
        }

        if (!user) {
          router.replace(`/${tenant}/workspace/login`);
          return;
        }
        if (user.company_name !== tenant) {
          router.replace(`/${tenant}/workspace/login`);
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
        router.replace(`/${tenant}/workspace/login`); // force logout on error
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
  if (pathname?.endsWith("/workspace/login") || pathname?.endsWith("/workspace/reset-password")
  ) {
    return <div className={inter.className}>{children}</div>;
  }




  const isLiveBilling = pathname?.includes("/workspace/transactions/sales/add");

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
