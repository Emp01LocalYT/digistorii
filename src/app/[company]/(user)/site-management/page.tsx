"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";

type SiteTab = "appearance" | "banners" | "pages";

type TenantApiResponse = {
  success?: boolean;
  message?: string;
};

type TabsProps = {
  children: ReactNode;
};

type TabsListProps = {
  children: ReactNode;
};

type TabsTriggerProps = {
  value: SiteTab;
  activeTab: SiteTab;
  label: string;
  onChange: (next: SiteTab) => void;
};

type TabsContentProps = {
  value: SiteTab;
  activeTab: SiteTab;
  children: ReactNode;
};

type CardProps = {
  title: string;
  description: string;
};

function Tabs({ children }: TabsProps) {
  return <div className="space-y-4">{children}</div>;
}

function TabsList({ children }: TabsListProps) {
  return <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">{children}</div>;
}

function TabsTrigger({ value, activeTab, label, onChange }: TabsTriggerProps) {
  const isActive = value === activeTab;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-brand-500 text-white"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function TabsContent({ value, activeTab, children }: TabsContentProps) {
  if (value !== activeTab) {
    return null;
  }

  return <div>{children}</div>;
}

function PlaceholderCard({ title, description }: CardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

export default function SiteManagementPage() {
  const params = useParams<{ company?: string | string[] }>();
  const companyParam = params.company;
  const company =
    typeof companyParam === "string"
      ? companyParam
      : Array.isArray(companyParam)
      ? companyParam[0]
      : "";

  const [activeTab, setActiveTab] = useState<SiteTab>("appearance");
  const [tenantStatus, setTenantStatus] = useState<string>("Checking tenant...");

  useEffect(() => {
    if (!company) {
      setTenantStatus("Tenant not available");
      return;
    }

    const loadTenant = async () => {
      try {
        const response = await fetch(`/api/tenant/${company}`);
        const data = (await response.json().catch(() => ({}))) as TenantApiResponse;
        setTenantStatus(
          data.message || (response.ok ? "Tenant loaded" : "Tenant data unavailable in site ")
        );
      } catch {
        setTenantStatus("Tenant service unavailable");
      }
    };

    void loadTenant();
  }, [company]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Badge variant="light" color="primary">
          Site Management
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Site Management</h1>
        <p className="text-sm text-gray-600">{tenantStatus}</p>
      </div>

      <Tabs>
        <TabsList>
          <TabsTrigger
            value="appearance"
            activeTab={activeTab}
            label="Appearance"
            onChange={setActiveTab}
          />
          <TabsTrigger value="banners" activeTab={activeTab} label="Banners" onChange={setActiveTab} />
          <TabsTrigger value="pages" activeTab={activeTab} label="Pages" onChange={setActiveTab} />
        </TabsList>

        <TabsContent value="appearance" activeTab={activeTab}>
          <PlaceholderCard
            title="Appearance"
            description="Site appearance settings will be configured here"
          />
        </TabsContent>

        <TabsContent value="banners" activeTab={activeTab}>
          <PlaceholderCard
            title="Banners"
            description="Banner configuration settings will be configured here"
          />
        </TabsContent>

        <TabsContent value="pages" activeTab={activeTab}>
          <PlaceholderCard
            title="Pages"
            description="Site page configuration settings will be configured here"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
