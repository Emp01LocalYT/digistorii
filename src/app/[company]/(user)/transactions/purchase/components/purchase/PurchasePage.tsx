"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";
import type { ProductSavedPayload } from "../../../../inventory/products/add-products/page";
import AddProductModal from "./AddProductModal";
import PurchaseHeaderForm from "./PurchaseHeaderForm";
import PurchaseItemsTable from "./PurchaseItemsTable";
import TotalsSection from "./TotalsSection";
import ProductLookupModal from "@/components/product/ProductLookupModal";
import { usePurchaseItems } from "./usePurchaseItems";
import { mapProductToPurchaseRows } from "./utils/mapProductToPurchaseRows";
import { mapSavedProductToCatalogItems } from "./utils/catalog";
import { calculateLineItem, calculateTotals } from "./utils/purchaseCalculations";
import { useProductLookup } from "@/hooks/useProductLookup";
import type { ProductLookupItem } from "@/lib/product-lookup";
import type {
  Currency,
  DespatchTerm,
  PaymentTerm,
  ProductCatalogItem,
  PurchaseDetail,
  PurchaseHeader,
  Supplier,
} from "./types";

export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const purchaseId = searchParams.get("id");
  const isEdit = !!purchaseId;
  const { company } = useTenant();
  const { user } = useUser();
  const {
    items: lookupItems,
    loading: lookupLoading,
    filters: lookupFilters,
    setFilters: setLookupFilters,
    page: lookupPage,
    setPage: setLookupPage,
    totalPages: lookupTotalPages,
    itemsPerPage: lookupItemsPerPage,
    paginatedItems: lookupPaginatedItems,
    totalCount: lookupTotalCount,
    categoryOptions: lookupCategoryOptions,
    resetFilters: resetLookupFilters,
    refresh: refreshLookup,
  } = useProductLookup({ enabled: Boolean(company) });

  const initialHeader: PurchaseHeader = {
    po_type: "standard",
    purchase_no: "",
    bill_to: "",
    ship_to: "",
    despatch_terms: "",
    payment_terms: "",
    freight_charges: 0,
    freight_tax: 0,
    freight_tax_amount: 0,
    packaging_amount: 0,
    notes: "",
    attachment_url: "",
    supplier_id: "",
    purchase_date: new Date().toISOString().split("T")[0],
    req_date: "",
    status: "Awaiting for approval",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    currency: "",
    conversion_rate: "",
    user_name: "",
  };

  const [header, setHeader] = useState<PurchaseHeader>(initialHeader);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [allTaxes, setAllTaxes] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allDespatchTerms, setAllDespatchTerms] = useState<DespatchTerm[]>([]);
  const [allPaymentTerms, setAllPaymentTerms] = useState<PaymentTerm[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showProductPopup, setShowProductPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "additional">("items");
  const [productsList, setProductsList] = useState<ProductCatalogItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductLookupItem[]>([]);
  const [popupError, setPopupError] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeMessage, setBarcodeMessage] = useState("");

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeHandlerRef = useRef<(value: string) => void>(() => {});
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasLogged = useRef(false);
  const hasLoggedTenant = useRef(false);

  const isEditable = !header.approval_status || header.approval_status === "Awaiting for approval";

  const { items: details, setItems, updateRow, removeRow, handleTaxChange, applyBulkUpdates, totals } =
    usePurchaseItems({
      initialItems: [],
      productsList,
      allTaxes,
      setErrors,
    });

  useEffect(() => {
    if (!user?.name || hasLogged.current) return;
    hasLogged.current = true;
    setHeader((prev) => {
      if (prev.user_name === user.name) return prev;
      return { ...prev, user_name: user.name };
    });
  }, [user?.name]);

  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
    hasLoggedTenant.current = true;
    console.log("Company:", company);
  }, [company]);

  const toTenantKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const productTypeLabel: Record<string, string> = {
    finished_good: "Finished Good",
    raw_material: "Raw Material",
    other: "Other",
  };

  useEffect(() => {
    const mapped = lookupItems.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_code: item.product_code || item.code,
      name: item.name,
      type: (item.type || "finished_good") as ProductCatalogItem["type"],
      category: item.category_name || null,
      source: (item.source || "own") as ProductCatalogItem["source"],
      status: 1,
      description: item.description || "",
      uom: item.uom || "",
      uom_code: item.uom_code || "",
      uom_name: item.uom_name || "",
      hsn_code: item.hsn_code || "",
      sku: item.sku || "",
      color: item.color || "",
      barcode: item.barcode || "",
    }));
    setProductsList(mapped);
  }, [lookupItems]);


  const getSupplierAddress = (supplier?: Supplier | null) => {
    if (!supplier) return "";
    return [
      supplier.address_line1,
      supplier.address_line2,
      supplier.address_line3,
      supplier.city,
      supplier.state,
      supplier.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const getCurrencyCode = (currencyId: string) => {
    if (!currencyId) return "";
    const item = allCurrencies.find((c) => String(c.id) === String(currencyId));
    return item?.currency_code || "";
  };

  const toggleProduct = (product: ProductLookupItem) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, product];
    });
  };

  const addSelectedProducts = () => {
    if (selectedProducts.length === 0) {
      setPopupError("Please select at least one product to add.");
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      for (const p of selectedProducts) {
        const existingIndex = updated.findIndex((row) => String(row.product_id) === String(p.id));
        if (existingIndex >= 0) {
          const nextQty = Number(updated[existingIndex].qty || 0) + 1;
          updated[existingIndex] = calculateLineItem({
            ...updated[existingIndex],
            qty: nextQty,
          });
          continue;
        }

        const newRow: PurchaseDetail = {
          product_id: String(p.id),
          product_code: p.product_code || p.code,
          product_name: p.name,
          description: p.description || "",
          uom: p.uom || "",
          uom_code: p.uom_code || "",
          uom_name: p.uom_name || "",
          hsn_no: p.hsn_code || "",
          rate: 0,
          qty: 0,
          amount: 0,
          tax_percent: 0,
          tax_amount: 0,
          line_total: 0,
          tax_id: null,
          tax_name: "",
          type: p.type,
        };
        updated.push(calculateLineItem(newRow));
      }
      return updated;
    });

    setPopupError("");
    setErrors((prev: any) => ({
      ...prev,
      details: "",
    }));

    setShowProductPopup(false);
    setSelectedProducts([]);
    resetLookupFilters();
  };

  const addOrIncrementByBarcode = useCallback(
    (barcode: string) => {
      const normalized = String(barcode || "").trim();
      if (!normalized) return false;
      const match = productsList.find((p) => String(p.barcode || "") === normalized);
      if (!match) return false;

      setItems((prev) => {
        const updated = [...prev];
        const existingIndex = updated.findIndex((row) => String(row.product_id) === String(match.id));
        if (existingIndex >= 0) {
          const nextQty = Number(updated[existingIndex].qty || 0) + 1;
          updated[existingIndex] = calculateLineItem({
            ...updated[existingIndex],
            qty: nextQty,
          });
          return updated;
        }

        const newRow: PurchaseDetail = {
          product_id: String(match.id),
          product_code: match.product_code,
          product_name: match.name,
          description: match.description || "",
          uom: match.uom || "",
          uom_code: match.uom_code || "",
          uom_name: match.uom_name || "",
          hsn_no: match.hsn_code || "",
          rate: 0,
          qty: 1,
          amount: 0,
          tax_percent: 0,
          tax_amount: 0,
          line_total: 0,
          tax_id: null,
          tax_name: "",
          type: match.type,
        };
        return [...updated, calculateLineItem(newRow)];
      });

      setErrors((prev: any) => ({
        ...prev,
        details: "",
      }));

      return true;
    },
    [productsList, setItems, setErrors]
  );

  const handleBarcodeSubmit = useCallback(
    (value?: string) => {
      const input = String(value ?? barcodeValue).trim();
      if (!input) return;
      const found = addOrIncrementByBarcode(input);
      if (!found) {
        setBarcodeMessage(`Barcode "${input}" not found.`);
      } else {
        setBarcodeMessage("");
      }
      setBarcodeValue("");
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    },
    [addOrIncrementByBarcode, barcodeValue]
  );

  useEffect(() => {
    barcodeHandlerRef.current = (value: string) => {
      handleBarcodeSubmit(value);
    };
  }, [handleBarcodeSubmit]);

  const closePopup = () => {
    setShowProductPopup(false);
    resetLookupFilters();
    setSelectedProducts([]);
  };

  const appendProductsToCatalog = (items: ProductCatalogItem[]) => {
    setProductsList((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const freshItems = items.filter((item) => !existingIds.has(item.id));
      return [...freshItems, ...prev];
    });
  };

  const handleProductSaved = (saved: ProductSavedPayload, meta?: { action: "save" | "save_add_new" }) => {
    const newRows = mapProductToPurchaseRows(saved).map((row) => calculateLineItem(row as PurchaseDetail));
    if (newRows.length) {
      setItems((prev) => [...prev, ...newRows]);
    }
    const catalogItems = mapSavedProductToCatalogItems(saved);
    appendProductsToCatalog(catalogItems);
    refreshLookup();
    if (meta?.action !== "save_add_new") {
      setShowAddProductModal(false);
    }
  };


  useEffect(() => {
    if (!company) return;
    if (eventSourceRef.current) return;
    const source = new EventSource(`/api/barcode-scan?tenant=${encodeURIComponent(company)}`);
    eventSourceRef.current = source;
    source.onmessage = (event) => {
      const payload = String(event.data || "").trim();
      if (payload) barcodeHandlerRef.current(payload);
    };
    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [company]);

  useEffect(() => {
    if (!company) return;
    let active = true;

    const loadData = async () => {
      setPageLoading(true);
      try {
        const [
          suppliersRes,
          taxesRes,
          despatchRes,
          paymentRes,
          currencyRes,
          purchaseNoRes,
        ] = await Promise.all([
          fetch("/api/suppliers", { headers: { "x-tenant": company } }),
          fetch("/api/tax-master", { headers: { "x-tenant": company } }),
          fetch("/api/despatch-terms", { headers: { "x-tenant": company } }),
          fetch("/api/payment-terms", { headers: { "x-tenant": company } }),
          fetch("/api/currencies", { headers: { "x-tenant": company } }),
          !isEdit && header.po_type === "standard"
            ? fetch("/api/purchase/generateNo", { headers: { "x-tenant": company } })
            : Promise.resolve(null),
        ]);

        const suppliersData = await suppliersRes.json();
        const taxesData = await taxesRes.json();
        const despatchData = await despatchRes.json();
        const paymentData = await paymentRes.json();
        const currencyData = await currencyRes.json();
        const purchaseNoData = purchaseNoRes ? await purchaseNoRes.json() : null;

        if (!active) return;

        setAllSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData.data || []);
        setAllDespatchTerms(despatchData?.data || []);
        setAllPaymentTerms(paymentData?.data || []);
        setAllCurrencies(currencyData?.data || []);
        setAllTaxes(taxesData?.data || []);

        if (purchaseNoData?.purchase_no && header.po_type === "standard") {
          setHeader((prev) => ({ ...prev, purchase_no: purchaseNoData.purchase_no }));
        }
        console.log("Suppliers:", suppliersData);
        console.log("Despatch Terms:", despatchData);
        console.log("Payment Terms:", paymentData);
        console.log("Currencies:", currencyData);
        console.log("Taxes:", taxesData);
        console.log("Generated Purchase No:", purchaseNoData?.purchase_no);
      } catch (err) {
        console.error("Failed to load purchase data", err);
      } finally {
        if (active) setPageLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [company, isEdit, header.po_type]);

  useEffect(() => {
    if (!company || !purchaseId) return;
    let active = true;

    const loadPurchase = async () => {
      setPageLoading(true);
      try {
        const res = await fetch(`/api/purchase/${purchaseId}`, {
          headers: { "x-tenant": company },
        });
        const result = await res.json();
        if (!active) return;

        if (result?.success && result?.data?.header) {
          const headerData: PurchaseHeader = {
            ...initialHeader,
            ...result.data.header,
            purchase_date: result.data.header.purchase_date?.split("T")[0] || initialHeader.purchase_date,
            req_date: result.data.header.req_date?.split("T")[0] || "",
          };
          setHeader(headerData);
        }

        if (result?.success && Array.isArray(result?.data?.details)) {
          setItems(result.data.details.map((row: PurchaseDetail) => calculateLineItem(row)));
        }
      } catch (err) {
        console.error("Failed to load purchase", err);
      } finally {
        if (active) setPageLoading(false);
      }
    };

    loadPurchase();
    return () => {
      active = false;
    };
  }, [company, purchaseId]);

  const freightTaxAmount = useMemo(() => {
    const freightCharges = Number(header.freight_charges || 0);
    const freightTaxPercent = Number(header.freight_tax || 0);
    return Number(((freightCharges * freightTaxPercent) / 100).toFixed(2));
  }, [header.freight_charges, header.freight_tax]);

  const totalsData = useMemo(
    () => calculateTotals(details, { ...header, freight_tax_amount: freightTaxAmount }),
    [details, header, freightTaxAmount]
  );

  const computedHeader = useMemo(
    () => ({
      ...header,
      freight_tax_amount: freightTaxAmount,
      subtotal: totalsData.subtotal,
      tax_amount: totalsData.productTax,
      total_amount: totalsData.grandTotal,
    }),
    [header, freightTaxAmount, totalsData]
  );

  const validate = () => {
    const newErrors: any = {};
    if (header.po_type === "manual" && !header.purchase_no.trim()) {
      newErrors.purchase_no = "PO number is required for manual type";
    } else if (!header.purchase_no.trim()) {
      newErrors.purchase_no = "Purchase No required";
    }
    if (!header.purchase_date) newErrors.purchase_date = "Purchase date required";
    if (!header.req_date) newErrors.req_date = "Req Date required";
    if (header.purchase_date && header.req_date) {
      const poDate = new Date(header.purchase_date);
      const reqDate = new Date(header.req_date);

      if (reqDate <= poDate) {
        newErrors.req_date = "Req Date must be greater than PO Date";
      }
    }
    if (!header.supplier_id) newErrors.supplier_id = "Supplier required";
    if (!header.currency) {
      newErrors.currency = "Currency is required";
    }
    if (totalsData.grandTotal <= 0) newErrors.total_amount = "Total amount must be greater than 0";

    if (details.length === 0) {
      newErrors.details = "At least one product row is required";
    } else {
      details.forEach((d, index) => {
        if (!d.product_code) newErrors[`product_code_${index}`] = "Product Code required";
        if (!d.product_name) newErrors[`product_name_${index}`] = "Product Name required";
        if (!d.description) newErrors[`description_${index}`] = "Description required";

        if (Number(d.rate || 0) <= 0) newErrors[`rate_${index}`] = "Unit price must be > 0";
        if (Number(d.qty || 0) <= 0) newErrors[`qty_${index}`] = "Qty must be > 0";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) return;

    setLoading(true);
    try {
      let attachmentUrl = header.attachment_url;
      if (attachmentFile && company) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        const uploadRes = await fetch("/api/po-attachments", {
          method: "POST",
          headers: { "x-tenant": company },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.message || "Failed to upload attachment");
        }
        const filename = uploadData.file;
        if (filename) {
          const tenantKey = toTenantKey(company);
          attachmentUrl = `/uploads/${encodeURIComponent(tenantKey)}/po-attachments/${encodeURIComponent(
            filename
          )}`;
        }
      }

      const url = purchaseId ? `/api/purchase/${purchaseId}` : "/api/purchase";
      const method = purchaseId ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        body: JSON.stringify({
          header: { ...computedHeader, attachment_url: attachmentUrl, user_name: user?.name },
          details,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save purchase");
      router.push(`/${company}/transactions/purchase`);
    } catch (err: any) {
      console.error("Save Purchase Error:", err);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const billToSupplier = allSuppliers.find((s) => String(s.id) === String(computedHeader.bill_to));
  const shipToSupplier = allSuppliers.find((s) => String(s.id) === String(computedHeader.ship_to));
  const billToAddress = getSupplierAddress(billToSupplier);
  const shipToAddress = getSupplierAddress(shipToSupplier);
  const currencyCode = getCurrencyCode(computedHeader.currency);
  const formatMoney = (value: number) => Number(value || 0).toFixed(2);
  const itemsSubtotal = Number(computedHeader.subtotal || 0);
  const productTax = Number(computedHeader.tax_amount || 0);
  const freightBase = Number(computedHeader.freight_charges || 0);
  const freightTax = Number(computedHeader.freight_tax_amount || 0);
  const packagingAmount = Number(computedHeader.packaging_amount || 0);
  const extraChargesTotal = freightBase + freightTax + packagingAmount;
  const grandTotal = Number(computedHeader.total_amount || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {pageLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading Purchase...</p>
            </div>
          </div>,
          document.body
        )}

      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">
                {isEdit ? "Updating Purchase..." : "Saving Purchase..."}
              </p>
            </div>
          </div>,
          document.body
        )}

      {errorMessage && <div className="text-red-600 font-semibold">{errorMessage}</div>}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Purchase" : "Create Purchase"}</h1>

        {computedHeader.approval_status && (
          <span
            className={`px-3 py-1 text-xs rounded-full font-semibold
              ${computedHeader.approval_status === "Approved" ? "bg-blue-400 text-black" : ""}
              ${computedHeader.approval_status === "Awaiting for approval" ? "bg-yellow-400 text-black" : ""}
              ${computedHeader.approval_status === "Completed" ? "bg-gray-300 text-black" : ""}
              ${computedHeader.approval_status === "Partial" ? "bg-indigo-400 text-black" : ""}
              ${computedHeader.approval_status === "Rejected" ? "bg-red-400 text-black" : ""}
            `}
          >
            {computedHeader.approval_status}
          </span>
        )}

        {errors.details && (
          <span className="text-red-500 text-sm font-medium whitespace-nowrap">{errors.details}</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-6 ${!isEditable ? "opacity-70" : ""}`}>
        <PurchaseHeaderForm
          header={computedHeader}
          setHeader={setHeader}
          errors={errors}
          setErrors={setErrors}
          isEditable={isEditable}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          allSuppliers={allSuppliers}
          allDespatchTerms={allDespatchTerms}
          allPaymentTerms={allPaymentTerms}
          currencyCode={currencyCode}
          billToAddress={billToAddress}
          shipToAddress={shipToAddress}
          setAttachmentFile={setAttachmentFile}
        />

        <PurchaseItemsTable
          details={details}
          errors={errors}
          isEditable={isEditable}
          allTaxes={allTaxes}
          updateRow={updateRow}
          removeRow={removeRow}
          totalQty={totals.totalQty}
          totalAmount={totals.totalAmount}
          onAddItems={() => setShowProductPopup(true)}
          showAddItems={activeTab === "items"}
          onAddNewProduct={() => setShowAddProductModal(true)}
          barcodeValue={barcodeValue}
          onBarcodeChange={(value) => {
            setBarcodeValue(value);
            if (barcodeMessage) setBarcodeMessage("");
          }}
          onBarcodeSubmit={() => handleBarcodeSubmit()}
          barcodeMessage={barcodeMessage}
          barcodeInputRef={barcodeInputRef}
          onTaxChange={handleTaxChange}
          onBulkApply={applyBulkUpdates}
          productTypeLabel={productTypeLabel}
        />

        <TotalsSection
          formatMoney={formatMoney}
          itemsSubtotal={itemsSubtotal}
          productTax={productTax}
          freightBase={freightBase}
          freightTaxAmount={freightTax}
          packagingAmount={packagingAmount}
          extraChargesTotal={extraChargesTotal}
          grandTotal={grandTotal}
        />

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push(`/${company}/transactions/purchase`)}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Back
          </button>
          {isEditable && (
            <button className="bg-[var(--color-blue-600)] text-white px-6 py-2 rounded hover:opacity-90">
              {isEdit ? "Update Purchase" : "Create Purchase"}
            </button>
          )}
        </div>
      </form>

      <ProductLookupModal
        open={showProductPopup}
        onClose={closePopup}
        onAddNew={() => setShowAddProductModal(true)}
        onAddSelected={addSelectedProducts}
        isEditable={isEditable}
        errorMessage={popupError}
        items={lookupPaginatedItems}
        loading={lookupLoading || pageLoading}
        filters={lookupFilters}
        onFiltersChange={(next) => {
          setLookupFilters(next);
          setLookupPage(1);
        }}
        categoryOptions={lookupCategoryOptions}
        page={lookupPage}
        totalPages={lookupTotalPages}
        itemsPerPage={lookupItemsPerPage}
        totalCount={lookupTotalCount}
        onPageChange={setLookupPage}
        isSelected={(item) => selectedProducts.some((p) => p.id === item.id)}
        onToggle={toggleProduct}
        onToggleAll={(checked, pageItems) => {
          if (checked) {
            setSelectedProducts((prev) => {
              const map = new Map(prev.map((p) => [p.id, p]));
              pageItems.forEach((p) => map.set(p.id, p));
              return Array.from(map.values());
            });
          } else {
            setSelectedProducts((prev) =>
              prev.filter((p) => !pageItems.some((pg) => pg.id === p.id))
            );
          }
        }}
      />

      <AddProductModal
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSaved={handleProductSaved}
      />
    </div>
  );
}
