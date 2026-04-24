import { apiFetch } from "@/lib/apiFetch";

export type ProductsQueryParams = {
  search?: string;
  category?: string;
  source?: string;
  status?: string;
  type?: string;
  module?: string;
  next_code?: string;
};

export function buildProductsUrl(params: ProductsQueryParams = {}) {
  const query = new URLSearchParams();
  (Object.entries(params) as Array<[keyof ProductsQueryParams, string | undefined]>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        query.set(key, String(value));
      }
    }
  );
  const suffix = query.toString();
  return suffix ? `/api/products?${suffix}` : "/api/products";
}

export async function fetchProducts(
  params: ProductsQueryParams,
  company: string,
  options: RequestInit = {}
) {
  return apiFetch(buildProductsUrl(params), company, options);
}
