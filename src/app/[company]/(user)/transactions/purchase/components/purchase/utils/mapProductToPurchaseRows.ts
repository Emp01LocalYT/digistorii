import type { ProductSavedPayload } from "../../../../inventory/products/add-products/page";

type PurchaseRow = {
  product_id: string;
  variant_id?: number | null;
  product_code?: string;
  product_name?: string;
  description: string;
  uom: string;
  uom_code?: string;
  uom_name?: string;
  hsn_no: string;
  rate: number;
  qty: number;
  amount: number;
  tax_id: number | null;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
};

export function mapProductToPurchaseRows(
  saved: ProductSavedPayload
): PurchaseRow[] {
  const variants = Array.isArray(saved?.variants) ? saved.variants : [];
  return variants.map((variant) => ({
    product_id: String(variant.variant_id ?? variant.product_id ?? saved.product_id),
    variant_id: Number(variant.variant_id ?? null),
    product_code: String(variant.product_code || saved.product_code || ""),
    product_name: String(variant.product_name || saved.product_name || ""),
    description: String(saved.description || ""),
    uom: String(saved.uom || ""),
    uom_code: String(saved.uom_code || ""),
    uom_name: String(saved.uom_name || ""),
    hsn_no: String(saved.hsn_code || ""),
    qty: 1,
    rate: 0,
    amount: 0,
    tax_id: null,
    tax_percent: 0,
    tax_amount: 0,
    line_total: 0,
  }));
}
