import type { ProductSavedPayload } from "../../../../inventory/products/add-products/ProductForm";
import type {
  ProductCatalogItem,
  ProductFiltersState,
  ProductListRow,
  ProductLookupRow,
} from "../types";

export function buildProductCatalog(
  products: ProductListRow[],
  lookupRows: ProductLookupRow[]
): ProductCatalogItem[] {
  const productMap = new Map<number, ProductListRow>();
  products.forEach((p) => productMap.set(p.id, p));

  return lookupRows
    .map((row) => {
      const productId = Number(row.product_id ?? row.id);
      const variantId = Number(row.variant_id);
      if (!Number.isFinite(productId) || !Number.isFinite(variantId)) return null;
      const product = productMap.get(productId);
      return {
        id: variantId,
        product_id: productId,
        product_code: row.product_code || product?.product_code || "",
        name: row.product_name || product?.name || "",
        type:
          (product?.type ||
            row.type ||
            "finished_good") as ProductCatalogItem["type"],
        category: product?.category ?? row.category ?? null,
        source: (product?.source || row.source || "own") as ProductCatalogItem["source"],
        status: Number(product?.status ?? row.status ?? 1),
        description: row.description || "",
        uom: String(row.uom || ""),
        uom_code: String(row.uom_code || ""),
        uom_name: String(row.uom_name || ""),
        hsn_code: String(row.hsn_code || ""),
        sku: String(row.sku || ""),
        color: String(row.color || ""),
        barcode: String(row.barcode || ""),
      };
    })
    .filter((item): item is ProductCatalogItem => Boolean(item));
}

export function mapSavedProductToCatalogItems(saved: ProductSavedPayload): ProductCatalogItem[] {
  const variants = Array.isArray(saved.variants) ? saved.variants : [];
  return variants
    .map((variant) => ({
      id: Number(variant.variant_id),
      product_id: Number(variant.product_id ?? saved.product_id),
      product_code: String(variant.product_code || saved.product_code || ""),
      name: String(variant.product_name || saved.product_name || ""),
      type: saved.type || "finished_good",
      category: saved.category ?? null,
      source: saved.source || "own",
      status: Number(saved.status ?? 1),
      description: String(saved.description || ""),
      uom: String(saved.uom || ""),
      uom_code: String(saved.uom_code || ""),
      uom_name: String(saved.uom_name || ""),
      hsn_code: String(saved.hsn_code || ""),
      sku: String(variant.sku || ""),
      color: String(variant.color || ""),
      barcode: String((variant as any).barcode || ""),
    }))
    .filter((item) => Number.isFinite(item.id) && item.id > 0);
}

export function filterProductCatalog(items: ProductCatalogItem[], filters: ProductFiltersState) {
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    const matchSearch = search
      ? `${item.name} ${item.product_code} ${item.sku} ${item.barcode}`
          .toLowerCase()
          .includes(search)
      : true;
    const matchType = filters.type ? item.type === filters.type : true;
    const matchCategory = filters.category ? String(item.category) === filters.category : true;
    const matchSource = filters.source ? item.source === filters.source : true;
    return matchSearch && matchType && matchCategory && matchSource;
  });
}
