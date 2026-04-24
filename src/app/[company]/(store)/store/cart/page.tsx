"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  useCartStore,
  type CartItem,
  type CartState,
} from "../../../../../../store/cartStore";

type TenantApiResponse = {
  success?: boolean;
  message?: string;
};

type CardProps = {
  children: ReactNode;
  className?: string;
};

function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function CartPage() {
  const params = useParams<{ company?: string | string[] }>();
  const companyParam = params.company;
  const company =
    typeof companyParam === "string"
      ? companyParam
      : Array.isArray(companyParam)
      ? companyParam[0]
      : "";

  const [tenantStatus, setTenantStatus] = useState<string>("Checking tenant...");
  const items = useCartStore((state: CartState) => state.items);
  const updateQuantity = useCartStore((state: CartState) => state.updateQuantity);
  const removeItem = useCartStore((state: CartState) => state.removeItem);
  const clearCart = useCartStore((state: CartState) => state.clearCart);

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
          data.message || (response.ok ? "Tenant loaded" : "Tenant data unavailable cart page")
        );
      } catch {
        setTenantStatus("Tenant service unavailable");
      }
    };

    void loadTenant();
  }, [company]);

  const subtotal = useMemo(
    () => items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
    [items]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Badge variant="light" color="primary">
          Shopping Cart
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Cart</h1>
        <p className="text-sm text-gray-600">{tenantStatus}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-600">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Rs. {item.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    -
                  </Button>
                  <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    +
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card className="h-fit space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cart Summary</h2>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Items</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Subtotal</span>
            <span className="font-semibold">Rs. {subtotal.toLocaleString("en-IN")}</span>
          </div>
          <Button className="w-full" disabled={items.length === 0}>
            Checkout
          </Button>
          <Button className="w-full" variant="outline" onClick={clearCart} disabled={items.length === 0}>
            Clear Cart
          </Button>
        </Card>
      </div>
    </div>
  );
}
