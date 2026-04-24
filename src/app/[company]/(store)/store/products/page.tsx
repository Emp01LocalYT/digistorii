"use client";

import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { useCartStore, type CartState } from "../../../../../../store/cartStore";

type TenantApiResponse = {
  success?: boolean;
  message?: string;
};

type ProductRow = {
  id: string;
  products: {
    name: string;
  };
  product_pricing: {
    price: number;
  };
  product_images: string[];
};

type CardProps = {
  children: ReactNode;
  className?: string;
};

type InputProps = InputHTMLAttributes<HTMLInputElement>;

function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none ${
        props.className || ""
      }`}
    />
  );
}

const mockProducts: ProductRow[] = [
  {
    id: "p-001",
    products: { name: "Classic White Tee" },
    product_pricing: { price: 799 },
    product_images: ["https://placehold.co/600x400?text=Classic+White+Tee"],
  },
  {
    id: "p-002",
    products: { name: "Denim Jacket" },
    product_pricing: { price: 2499 },
    product_images: ["https://placehold.co/600x400?text=Denim+Jacket"],
  },
  {
    id: "p-003",
    products: { name: "Running Sneakers" },
    product_pricing: { price: 3199 },
    product_images: ["https://placehold.co/600x400?text=Running+Sneakers"],
  },
  {
    id: "p-004",
    products: { name: "Canvas Backpack" },
    product_pricing: { price: 1599 },
    product_images: ["https://placehold.co/600x400?text=Canvas+Backpack"],
  },
];

export default function StoreProductsPage() {
  const params = useParams<{ company?: string | string[] }>();
  const companyParam = params.company;
  const company =
    typeof companyParam === "string"
      ? companyParam
      : Array.isArray(companyParam)
      ? companyParam[0]
      : "";

  const [tenantStatus, setTenantStatus] = useState<string>("Checking tenant...");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const addItem = useCartStore((state: CartState) => state.addItem);

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
          data.message || (response.ok ? "Tenant loaded" : "Tenant data unavailable in products")
        );
      } catch {
        setTenantStatus("Tenant service unavailable");
      }
    };

    void loadTenant();
  }, [company]);

  const filteredProducts = useMemo(
    () =>
      mockProducts.filter((product) =>
        product.products.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Badge variant="light" color="primary">
          Product Listing
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Store Products</h1>
        <p className="text-sm text-gray-600">{tenantStatus}</p>
      </div>

      <Card>
        <label htmlFor="product-search" className="mb-2 block text-sm font-medium text-gray-700">
          Search Products
        </label>
        <Input
          id="product-search"
          placeholder="Search by product name..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="flex h-full flex-col">
            <img
              src={product.product_images[0]}
              alt={product.products.name}
              className="h-40 w-full rounded-lg object-cover"
            />
            <div className="mt-3 flex flex-1 flex-col">
              <h2 className="text-base font-semibold text-gray-900">{product.products.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Rs. {product.product_pricing.price.toLocaleString("en-IN")}
              </p>
              <div className="mt-4">
                <Button
                  className="w-full"
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.products.name,
                      price: product.product_pricing.price,
                      image: product.product_images[0],
                      quantity: 1,
                    })
                  }
                >
                  Add To Cart
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
