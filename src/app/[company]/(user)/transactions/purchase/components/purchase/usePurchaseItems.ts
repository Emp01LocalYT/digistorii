"use client";

import { useCallback, useMemo, useState, Dispatch, SetStateAction } from "react";
import type { ProductCatalogItem, PurchaseDetail } from "./types";
import { calculateLineItem } from "./utils/purchaseCalculations";

type UsePurchaseItemsParams = {
  initialItems?: PurchaseDetail[];
  productsList: ProductCatalogItem[];
  allTaxes: any[];
  setErrors: Dispatch<SetStateAction<any>>;
};

export function usePurchaseItems({
  initialItems = [],
  productsList,
  allTaxes,
  setErrors,
}: UsePurchaseItemsParams) {
  const [items, setItems] = useState<PurchaseDetail[]>(initialItems);

  const updateRow = useCallback(
    <K extends keyof PurchaseDetail>(index: number, field: K, value: PurchaseDetail[K]) => {
      setItems((prev) => {
        const updated = [...prev];

        if (!updated[index]) return prev;

        if (field === "product_code") {
          const code = String(value);
          const exists = updated.some((d, i) => i !== index && d.product_code === code);
          if (exists) {
            setErrors((prevErrors: any) => ({
              ...prevErrors,
              [`product_code_${index}`]: "Product already added",
            }));
            return prev;
          }

          updated[index].product_code = code;
          const selected = productsList.find(
            (p) => p.product_code?.toLowerCase() === code.toLowerCase()
          );

          if (selected) {
            updated[index].product_id = String(selected.id);
            updated[index].product_name = selected.name;
            updated[index].description = selected.description || "";
            updated[index].uom = selected.uom || "";
            updated[index].uom_code = selected.uom_code || "";
            updated[index].uom_name = selected.uom_name || "";
            updated[index].hsn_no = selected.hsn_code || "";
            updated[index].rate = 0;
            updated[index].tax_percent = 0;
          }
        } else if (field === "product_id") {
          const val = String(value);
          const exists = updated.some((d, i) => i !== index && String(d.product_id) === val);
          if (exists) {
            setErrors((prevErrors: any) => ({
              ...prevErrors,
              [`product_id_${index}`]: "Product already added",
            }));
            return prev;
          }

          updated[index].product_id = val;
          const selected = productsList.find((p) => p.id === Number(val) || p.product_code === val);

          if (selected) {
            updated[index].product_code = selected.product_code;
            updated[index].product_name = selected.name;
            updated[index].description = selected.description || "";
            updated[index].uom = selected.uom || "";
            updated[index].uom_code = selected.uom_code || "";
            updated[index].uom_name = selected.uom_name || "";
            updated[index].hsn_no = selected.hsn_code || "";
            updated[index].rate = 0;
            updated[index].tax_percent = 0;
          } else {
            updated[index].product_name = "";
            updated[index].description = "";
            updated[index].rate = "";
            updated[index].tax_percent = 0;
          }
        } else if (field === "rate" || field === "qty") {
          const numericField = field as "rate" | "qty";
          updated[index][numericField] = value === "" ? "" : Number(value);
        } else if (field === "tax_percent") {
          updated[index].tax_percent = Number(value);
        } else {
          updated[index][field] = value;
        }

        updated[index] = calculateLineItem(updated[index]);

        setErrors((prevErrors: any) => {
          const newErrors = { ...prevErrors };
          delete newErrors[`${String(field)}_${index}`];
          return newErrors;
        });

        return updated;
      });
    },
    [productsList, setErrors]
  );

  const handleTaxChange = useCallback(
    (index: number, taxId: number | "") => {
      setItems((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;

        const tax = allTaxes.find((t) => t.id === Number(taxId));
        if (tax) {
          updated[index].tax_id = tax.id;
          updated[index].tax_name = tax.tax_name;
          updated[index].tax_percent = Number(tax.total_percentage || 0);
        } else {
          updated[index].tax_id = 0;
          updated[index].tax_name = "";
          updated[index].tax_percent = 0;
        }

        updated[index] = calculateLineItem(updated[index]);
        return updated;
      });
    },
    [allTaxes]
  );

  const applyBulkUpdates = useCallback(
    (payload: { variantIds: string[]; rate?: number; qty?: number; taxId?: number | "" }) => {
      if (!payload.variantIds.length) return;
      setItems((prev) =>
        prev.map((row) => {
          const rowId = String(row.product_id);
          if (!payload.variantIds.includes(rowId)) return row;

          let next: PurchaseDetail = { ...row };

          if (payload.rate !== undefined) {
            next.rate = payload.rate;
          }
          if (payload.qty !== undefined) {
            next.qty = payload.qty;
          }
          if (payload.taxId !== undefined) {
            const tax = allTaxes.find((t) => t.id === Number(payload.taxId));
            if (tax) {
              next.tax_id = tax.id;
              next.tax_name = tax.tax_name;
              next.tax_percent = Number(tax.total_percentage || 0);
            } else if (payload.taxId === "") {
              next.tax_id = 0;
              next.tax_name = "";
              next.tax_percent = 0;
            }
          }

          return calculateLineItem(next);
        })
      );
    },
    [allTaxes]
  );

  const removeRow = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totals = useMemo(() => {
    const totalQty = items.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    const totalAmount = items.reduce((sum, row) => sum + Number(row.line_total || 0), 0);
    return { totalQty, totalAmount };
  }, [items]);

  return {
    items,
    setItems,
    updateRow,
    removeRow,
    handleTaxChange,
    applyBulkUpdates,
    totals,
  };
}
