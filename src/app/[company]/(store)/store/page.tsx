"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { useCartStore, type CartItem } from "../../../../../store/cartStore";

type TenantApiResponse = {
  success?: boolean;
  message?: string;
};

type CardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

function Card({ title, description, children }: CardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function StoreHomePage() {
  const params = useParams<{ company?: string | string[] }>();
  const companyParam = params.company;
  const company =
    typeof companyParam === "string"
      ? companyParam
      : Array.isArray(companyParam)
      ? companyParam[0]
      : "";

  const [tenantStatus, setTenantStatus] = useState<string>("Checking tenant...");
  const cartItems = useCartStore((state: { items: CartItem[] }) => state.items);

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
          data.message || (response.ok ? "Tenant loaded" : "Tenant data unavailable main page")
        );
        console.log("fails")
      } catch {
        setTenantStatus("Tenant service unavailable");
      }
    };

    void loadTenant();
  }, [company]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Badge variant="light" color="primary">
          Storefront
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome to {company || "your"} Store
        </h1>
        <p className="text-sm text-gray-600">{tenantStatus}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Browse Products"
          description="Explore available products and add items to your cart."
        >
          <Link href={`/${company}/store/products`} className="inline-block">
            <Button>View Products</Button>
          </Link>
        </Card>

        <Card
          title="Your Cart"
          description="Review selected items and continue to checkout."
        >
          <div className="mb-3 text-sm text-gray-700">
            Items in cart: <span className="font-semibold">{totalItems}</span>
          </div>
          <Link href={`/${company}/store/cart`} className="inline-block">
            <Button variant="outline">Open Cart</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
