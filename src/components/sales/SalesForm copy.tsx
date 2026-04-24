"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useReactToPrint } from "react-to-print";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";
import CustomerAnalyticsPanel from "@/components/sales/CustomerAnalyticsPanel";
import SalesHeader from "@/components/sales/SalesHeader";
import SalesTable from "@/components/sales/SalesTable";
import { useProductLookup } from "@/hooks/useProductLookup";
import ThermalInvoice from "@/components/ThermalInvoice";
import { apiFetch } from "@/lib/apiFetch";
import {
  applySalesRowCalculation,
  calculateSalesTotals,
} from "@/lib/pricing/salesCalculations";
import type {
  ActiveTodayDiscount,
  Customer,
  Locator,
  MonthlySpendRow,
  Product,
  ProductRow,
  PurchaseHistoryRow,
  SalesDetail,
  SalesHeader as SalesHeaderType,
  SalesIndexRow,
  Warehouse,
} from "@/types/sales";

const ProductLookupModal = dynamic(
  () => import("@/components/product/ProductLookupModal"),
  { ssr: false }
);
const PrintBillingInvoice = dynamic(
  () => import("@/components/PrintBillingInvoice"),
  { ssr: false }
);

const formatDateLabel = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeLabel = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const generateSalesNo = () => {
  const datePart = new Date().toISOString().split("T")[0].replaceAll("-", "");
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `SAL-${datePart}-${randomPart}`;
};

const getCustomerDisplayName = (customer?: Customer | null) => {
  if (!customer) return "";
  return String(customer.cust_name || customer.name || "");
};

const getCustomerAddress = (customer?: Customer | null) => {
  if (!customer) return "";
  const parts = [
    customer.address_line1,
    customer.address_line2,
    customer.address_line3,
    customer.city,
    customer.state,
    customer.pincode,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(", ");
};

type ThermalPrintHeader = {
  sales_no: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  sales_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

type ThermalPrintDetail = {
  product_name?: string;
  qty: number;
  rate: number;
  discount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  tax_components?: Array<{ component_name: string; component_percentage: number }>;
};

type UserSettingsMe = {
  default_warehouse_id: string;
  default_locator_id: string;
  branch_name: string;
};

export default function SalesForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesId = searchParams.get("id");
  const isEdit = Boolean(salesId);
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
  } = useProductLookup({ enabled: Boolean(company), module: "sales" });

  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");

  const initialHeader: SalesHeaderType = {
    sales_no: "",
    customer_id: "",
    warehouse_id: "",
    locator_id: "",
    branch_name: "",
    invoice_date: "",
    sales_date: new Date().toISOString().split("T")[0],
    status: "Entered",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    user_name: "",
    currency: "",
  };

  const [formState, setFormState] = useState(() => ({
    header: initialHeader,
    details: [] as SalesDetail[],
    couponCode: "",
    barcodeValue: "",
    barcodeMessage: "",
  }));
  const [masterData, setMasterData] = useState(() => ({
    products: [] as Product[],
    taxes: [] as any[],
    customers: [] as Customer[],
    uoms: [] as any[],
    warehouses: [] as Warehouse[],
    locators: [] as Locator[],
    activeDiscountsForToday: [] as ActiveTodayDiscount[],
  }));
  const [userSettingsDefaults, setUserSettingsDefaults] = useState<UserSettingsMe>({
    default_warehouse_id: "",
    default_locator_id: "",
    branch_name: "",
  });
  const [uiState, setUiState] = useState(() => ({
    errors: {} as Record<string, string>,
    loading: false,
    pageLoading: false,
    errorMessage: "",
    showProductPopup: false,
    selectedProducts: [] as number[],
    popupError: "",
    savedProductIds: [] as string[],
    showBillsPanel: false,
    billsList: [] as SalesIndexRow[],
    billsLoading: false,
    billsError: "",
    showCustomerModal: false,
    customerSearchName: "",
    customerSearchPhone: "",
    newCustomerName: "",
    newCustomerPhone: "",
    customerModalLoading: false,
    customerModalError: "",
    purchaseHistory: [] as PurchaseHistoryRow[],
    purchaseMonthly: [] as MonthlySpendRow[],
    printSnapshot: null as { header: any; details: SalesDetail[] } | null,
  }));
  const [printData, setPrintData] = useState<{
    header: ThermalPrintHeader;
    details: ThermalPrintDetail[];
  } | null>(null);


  const { header, details, couponCode, barcodeValue, barcodeMessage } = formState;
  const {
    products: allProducts,
    taxes: allTaxes,
    customers: allCustomers,
    uoms: allUoms,
    warehouses: allWarehouses,
    locators: allLocators,
    activeDiscountsForToday,
  } = masterData;
  const {
    errors,
    loading,
    pageLoading,
    errorMessage,
    showProductPopup,
    selectedProducts,
    popupError,
    showBillsPanel,
    billsList,
    billsLoading,
    billsError,
    showCustomerModal,
    customerSearchName,
    customerSearchPhone,
    newCustomerName,
    newCustomerPhone,
    customerModalLoading,
    customerModalError,
    purchaseHistory,
    purchaseMonthly,
    printSnapshot,
  } = uiState;

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeHandlerRef = useRef<(value: string) => void>(() => {});
  const printRef = useRef<HTMLDivElement>(null);
  const thermalRef = useRef<HTMLDivElement>(null);
  const salesIndexRef = useRef<SalesIndexRow[] | null>(null);
  const salesIndexLoadingRef = useRef<Promise<SalesIndexRow[]> | null>(null);
  const billsLoadedRef = useRef(false);
  const discountCacheLoadedRef = useRef(false);
  const hasLoadedMasterRef = useRef(false);
  const hasLoadedUserSettingsRef = useRef(false);
  const pricingCacheRef = useRef<Map<number, any>>(new Map());
  const customerAnalyticsCache = useRef<
    Map<string, { history: PurchaseHistoryRow[]; monthly: MonthlySpendRow[] }>
  >(new Map());
  const salesDetailCountCache = useRef<Map<number, number>>(new Map());

  const updateMasterData = useCallback(
    (patch: Partial<typeof masterData>) => {
      setMasterData((prev) => ({ ...prev, ...patch }));
    },
    []
  );
  const updateUiState = useCallback(
    (patch: Partial<typeof uiState>) => {
      setUiState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const setHeader = useCallback(
    (updater: SalesHeaderType | ((prev: SalesHeaderType) => SalesHeaderType)) => {
      setFormState((prev) => ({
        ...prev,
        header: typeof updater === "function" ? (updater as any)(prev.header) : updater,
      }));
    },
    []
  );
  const setDetails = useCallback(
    (updater: SalesDetail[] | ((prev: SalesDetail[]) => SalesDetail[])) => {
      setFormState((prev) => ({
        ...prev,
        details: typeof updater === "function" ? (updater as any)(prev.details) : updater,
      }));
    },
    []
  );

  const selectedCustomer = useMemo(
    () =>
      allCustomers.find((c) => String(c.id) === String(header.customer_id)),
    [allCustomers, header.customer_id]
  );

  const selectedCustomerName = selectedCustomer
    ? (() => {
        const code = selectedCustomer.customer_code || selectedCustomer.cust_code;
        const name = selectedCustomer.name || selectedCustomer.cust_name || "";
        return code ? `${code} - ${name}` : name;
      })()
    : "";

  const filteredCustomers = useMemo(() => {
    const searchName = String(customerSearchName || "").trim().toLowerCase();
    const searchPhone = String(customerSearchPhone || "").trim().toLowerCase();
    return allCustomers.filter((c) => {
      const nameValue = String(c.name || c.cust_name || "").toLowerCase();
      const codeValue = String(c.customer_code || c.cust_code || "").toLowerCase();
      const phoneValue = String(c.phone || "").toLowerCase();
      const matchesName = !searchName || nameValue.includes(searchName) || codeValue.includes(searchName);
      const matchesPhone = !searchPhone || phoneValue.includes(searchPhone);
      return matchesName && matchesPhone;
    });
  }, [allCustomers, customerSearchName, customerSearchPhone]);

  const filteredLocators = useMemo(() => {
    const selectedWarehouseId = String(header.warehouse_id || "").trim();
    if (!selectedWarehouseId) return allLocators;
    return allLocators.filter(
      (locator) => String(locator.warehouse_id || "") === selectedWarehouseId
    );
  }, [allLocators, header.warehouse_id]);

  const setErrors = useCallback(
    (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
      setUiState((prev) => ({
        ...prev,
        errors: typeof updater === "function" ? (updater as any)(prev.errors) : updater,
      }));
    },
    []
  );


  const setSelectedProducts = useCallback(
    (updater: number[] | ((prev: number[]) => number[])) => {
      setUiState((prev) => ({
        ...prev,
        selectedProducts: typeof updater === "function" ? (updater as any)(prev.selectedProducts) : updater,
      }));
    },
    []
  );

  const setSavedProductIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setUiState((prev) => ({
        ...prev,
        savedProductIds: typeof updater === "function" ? (updater as any)(prev.savedProductIds) : updater,
      }));
    },
    []
  );


  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    allProducts.forEach((product) => {
      if (Number.isFinite(product.id)) {
        map.set(Number(product.id), product);
      }
    });
    return map;
  }, [allProducts]);

  const productByBarcode = useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach((product) => {
      const key = String(product.barcode || "").trim();
      if (key) map.set(key, product);
    });
    return map;
  }, [allProducts]);

  const uomById = useMemo(() => {
    const map = new Map<string, any>();
    allUoms.forEach((uom) => {
      map.set(String(uom.id), uom);
    });
    return map;
  }, [allUoms]);

  const taxById = useMemo(() => {
    const map = new Map<number, any>();
    allTaxes.forEach((tax) => {
      if (tax?.id !== undefined && tax?.id !== null) {
        map.set(Number(tax.id), tax);
      }
    });
    return map;
  }, [allTaxes]);

  const discountMap = useMemo(() => {
    const map = new Map<number, ActiveTodayDiscount>();
    activeDiscountsForToday.forEach((discount) => {
      const variantId = Number(discount.variant_id);
      if (!Number.isFinite(variantId)) return;
      const priority = Number.isFinite(discount.priority)
        ? Number(discount.priority)
        : Number.MAX_SAFE_INTEGER;
      const existing = map.get(variantId);
      if (!existing || priority < Number(existing.priority)) {
        map.set(variantId, {
          ...discount,
          variant_id: variantId,
          priority,
          value: Number(discount.value || 0),
        });
      }
    });
    return map;
  }, [activeDiscountsForToday]);

  useEffect(() => {
    const mapped = lookupItems.map((item) => ({
      id: item.id,
      variant_id: item.variant_id,
      product_id: item.product_id,
      product_code: item.product_code || item.code,
      product_name: item.name,
      description: item.description || "",
      sku: item.sku,
      barcode: item.barcode || "",
      base_price: 0,
      selling_price: Number(item.selling_price || 0),
      tax_rate: 0,
      uom: item.uom || "",
      hsn_code: item.hsn_code || "",
      uom_code: item.uom_code || "",
      uom_name: item.uom_name || "",
      category: item.category_name,
      color: item.color,
      type: item.type,
      source: item.source,
    }));
    updateMasterData({ products: mapped });
  }, [lookupItems, updateMasterData]);

  const getCurrencyCode = useCallback(() => {
    const raw = String(header.currency || "");
    if (!raw) return "INR";
    return raw.split("-")[0]?.trim() || "INR";
  }, [header.currency]);

  const getSalesIndex = useCallback(async (): Promise<SalesIndexRow[]> => {
    if (!company) return [];
    if (salesIndexRef.current) return salesIndexRef.current;
    if (salesIndexLoadingRef.current) return salesIndexLoadingRef.current;

    const load = (async () => {
      const res = await fetch("/api/sales", {
        headers: { "x-tenant": company },
      });
      const data = await res.json();
      const rows: SalesIndexRow[] = Array.isArray(data?.data) ? data.data : [];
      salesIndexRef.current = rows;
      return rows;
    })();

    salesIndexLoadingRef.current = load;
    const result = await load;
    salesIndexLoadingRef.current = null;
    return result;
  }, [company]);

  const buildPrintHeader = useCallback(
    (baseHeader: SalesHeaderType) => {
      const customer = allCustomers.find(
        (c) => String(c.id) === String(baseHeader.customer_id)
      );
      return {
        ...baseHeader,
        customer_name: getCustomerDisplayName(customer),
        customer_email: customer?.email || "",
        customer_phone: customer?.phone || "",
        customer_address: getCustomerAddress(customer),
        payment_status: "",
        currency_code: getCurrencyCode(),
        conversion_rate: 1,
      };
    },
    [allCustomers, getCurrencyCode]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => updateUiState({ printSnapshot: null }),
  });

  const openBillsPanel = useCallback(async () => {
    updateUiState({ showBillsPanel: true });
    if (billsLoadedRef.current || !company) return;

    updateUiState({ billsLoading: true, billsError: "" });
    try {
      const rows = await getSalesIndex();
      updateUiState({ billsList: rows });
      billsLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load bills list", err);
      updateUiState({ billsError: "Failed to load bills." });
    } finally {
      updateUiState({ billsLoading: false });
    }
  }, [company, getSalesIndex]);

  const sortedBills = useMemo(() => {
    return [...billsList].sort((a, b) => {
      const ad = new Date(a.created_at || a.sales_date || 0).getTime();
      const bd = new Date(b.created_at || b.sales_date || 0).getTime();
      return bd - ad;
    });
  }, [billsList]);

  const billingTotals = useMemo(() => calculateSalesTotals(details), [details]);

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const applyBillingCalculation = useCallback(
    (row: SalesDetail) => {
      const normalizedRow = {
        ...row,
        discount_type: row.discount_type === "percent" || row.discount_type === "percentage"
          ? "percentage"
          : row.discount_type === "amount" || row.discount_type === "fixed"
            ? "fixed"
            : row.discount_type,
      };
      return applySalesRowCalculation(normalizedRow, discountMode) as SalesDetail;
    },
    [discountMode]
  );

  useEffect(() => {
    setDetails((prev) => prev.map((row) => applyBillingCalculation(row)) as SalesDetail[]);
  }, [applyBillingCalculation, setDetails]);

  const fetchPricingByVariantIds = useCallback(
    async (variantIds: number[]) => {
      if (!company || !variantIds.length) return {};

      const uniqueIds = Array.from(
        new Set(variantIds.filter((id) => Number.isFinite(id)))
      );
      const cache = pricingCacheRef.current;
      const missing = uniqueIds.filter((id) => !cache.has(id));
      let fetched: Record<string, any> = {};

      if (missing.length) {
        try {
          const res = await fetch("/api/pricing/active", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-tenant": company,
            },
            body: JSON.stringify({ variant_ids: missing }),
          });
          const data = await res.json();
          if (res.ok && data?.success) {
            fetched = data.data || {};
          }
        } catch (err) {
          console.error("Failed to fetch pricing", err);
        }
      }

      Object.entries(fetched).forEach(([id, value]) => {
        const numericId = Number(id);
        if (Number.isFinite(numericId)) {
          cache.set(numericId, value);
        }
      });

      const result: Record<string, any> = {};
      uniqueIds.forEach((id) => {
        const cached = cache.get(id);
        if (cached) result[String(id)] = cached;
      });

      return result;
    },
    [company]
  );



  const fetchActiveDiscountsForToday = useCallback(
    async (force = false) => {
      if (!company) return;
      if (discountCacheLoadedRef.current && !force) return;
      try {
        const res = await fetch("/api/discounts/active-today", {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data?.data || [];
        updateMasterData({ activeDiscountsForToday: rows });
        discountCacheLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load active discounts", err);
      }
    },
    [company, updateMasterData]
  );

  const addSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      updateUiState({ popupError: "Please select at least one product to add." });
      return;
    }

    const ids = selectedProducts.filter((id) => Number.isFinite(id));
    const pricingByVariant = await fetchPricingByVariantIds(ids);
    setDetails((prev) => {
      const updated = [...prev];
      for (const id of ids) {
        const p = productById.get(id);
        if (!p) continue;
        const existingIndex = updated.findIndex(
          (row) => String(row.product_id) === String(p.id)
        );
        if (existingIndex >= 0) {
          const nextQty = Number(updated[existingIndex].qty || 0) + 1;
          const rowToUpdate = {
            ...updated[existingIndex],
            qty: nextQty,
          };
          updated[existingIndex] = applyBillingCalculation(rowToUpdate) as SalesDetail;
          continue;
        }
        const uomObj = uomById.get(String(p.uom));
        const pricing = pricingByVariant[String(p.id)] || {};
        const newRow: ProductRow = {
          product_id: String(p.id),
          product_code: p.product_code,
          product_name: p.product_name,
          description: p.description,
          uom: String(p.uom || ""),
          uom_code: uomObj?.uom_code || "",
          uom_name: uomObj?.uom_name || "",
          hsn_no: p.hsn_code,
          rate: Number(pricing.unit_price || 0),
          qty: 1,
          amount: 0,
          discount: 0,
          discount_value: 0,
          discount_auto: true,
          tax_percent: Number(pricing.tax_percent || 0),
          tax_amount: 0,
          line_total: 0,
          tax_id: pricing.tax_id ?? null,
          tax_name: pricing.tax_name || "",
        };
        const discount = discountMap.get(Number(p.id));
        const applied = discount
          ? {
              ...newRow,
              discount_type: discount.discount_type,
              discount_value: Number(discount.value || 0),
              discount_auto: true,
            }
          : newRow;
        updated.push({
          ...applied,
          ...applyBillingCalculation(applied),
        } as SalesDetail);
      }
      return updated;
    });

    updateUiState({ popupError: "" });

    setErrors((prev) => ({
      ...prev,
      details: "",
    }));

    updateUiState({ showProductPopup: false });
    setSelectedProducts([]);
    resetLookupFilters();
  };

  const addOrIncrementByBarcode = useCallback(
    async (barcode: string) => {
      const normalized = String(barcode || "").trim();
      if (!normalized) return false;
      const match = productByBarcode.get(normalized);
      if (!match) return false;

      let pricingForVariant: any = {};

      if (!details.find((row) => String(row.product_id) === String(match.id))) {
        pricingForVariant = await fetchPricingByVariantIds([Number(match.id)]);
      }

      setDetails((prev) => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(
          (row) => String(row.product_id) === String(match.id)
        );
        if (existingIndex >= 0) {
          const nextQty = Number(updated[existingIndex].qty || 0) + 1;
          const rowToUpdate = {
            ...updated[existingIndex],
            qty: nextQty,
          };
          updated[existingIndex] = applyBillingCalculation(rowToUpdate) as SalesDetail;
          return updated;
        }

        const uomObj = uomById.get(String(match.uom));
          const pricing = pricingForVariant[String(match.id)] || {};
          const newRow: ProductRow = {
            product_id: String(match.id),
            product_code: match.product_code,
            product_name: match.product_name,
            description: match.description,
            uom: String(match.uom || ""),
            uom_code: uomObj?.uom_code || "",
            uom_name: uomObj?.uom_name || "",
            hsn_no: match.hsn_code,
            rate: Number(pricing.unit_price || 0),
            qty: 1,
            amount: 0,
            discount: 0,
            discount_value: 0,
            discount_auto: true,
            tax_percent: Number(pricing.tax_percent || 0),
            tax_amount: 0,
            line_total: 0,
            tax_id: pricing.tax_id ?? null,
            tax_name: pricing.tax_name || "",
          };
          const discountForVariant = discountMap.get(Number(match.id));
          const applied = discountForVariant
            ? {
                ...newRow,
                discount_type: discountForVariant.discount_type,
                discount_value: Number(discountForVariant.value || 0),
                discount_auto: true,
              }
            : newRow;
          return [...updated, {
            ...applied,
            ...applyBillingCalculation(applied),
          } as SalesDetail];
      });

      setErrors((prev) => ({
        ...prev,
        details: "",
      }));

      return true;
    },
    [
      details,
      discountMap,
      fetchPricingByVariantIds,
      productByBarcode,
      applyBillingCalculation,
      setDetails,
      setErrors,
      uomById,
    ]
  );

  const handleBarcodeSubmit = useCallback(
    async (value?: string) => {
      const input = String(value ?? barcodeValue).trim();
      if (!input) return;
      const found = await addOrIncrementByBarcode(input);
      setFormState((prev) => ({
        ...prev,
        barcodeMessage: found ? "" : `Barcode "${input}" not found.`,
        barcodeValue: "",
      }));
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
    updateUiState({ showProductPopup: false });
    resetLookupFilters();
    setSelectedProducts([]);
  };

  const lastFetchedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const fetchSales = async () => {
      if (!salesId || !company) return;
      if (lastFetchedIdRef.current === salesId) return;
      lastFetchedIdRef.current = salesId;
      console.log("Fetching sales with ID:", salesId);
      try {
        updateUiState({ pageLoading: true });
        const res = await fetch(`/api/sales/${salesId}`, {
          headers: {
            "x-tenant": company,
          },
        });
        const data = await res.json();
        if (data.success) {
          const fetchedHeader = data.data?.header || {};
          setHeader((prev) => ({
            ...prev,
            ...fetchedHeader,
            customer_id:
              fetchedHeader.customer_id != null
                ? String(fetchedHeader.customer_id)
                : prev.customer_id,
            warehouse_id:
              fetchedHeader.warehouse_id != null
                ? String(fetchedHeader.warehouse_id)
                : prev.warehouse_id,
            locator_id:
              fetchedHeader.locator_id != null
                ? String(fetchedHeader.locator_id)
                : prev.locator_id,
            branch_name:
              fetchedHeader.branch_name != null
                ? String(fetchedHeader.branch_name)
                : prev.branch_name,
          }));
          const rawDetails = Array.isArray(data.data.details) ? data.data.details : [];
          const detectedType = rawDetails.find((row: any) => row?.discount_type);
          const nextMode =
            detectedType?.discount_type === "percent" ||
            detectedType?.discount_type === "percentage"
              ? "percent"
              : detectedType?.discount_type === "amount" ||
                detectedType?.discount_type === "fixed"
                ? "amount"
                : rawDetails.some((row: any) => Number(row.discount || 0) > 0)
                  ? "amount"
                  : discountMode;
          setDiscountMode(nextMode);
          const fetchedDetails = rawDetails.map((row: any) => {
            const discountValue =
              row.discount_value !== undefined && row.discount_value !== null
                ? Number(row.discount_value)
                : Number(row.discount || 0);
            const baseRow: SalesDetail = {
              ...row,
              qty: Number(row.qty),
              rate: Number(row.rate),
              discount: Number(row.discount || 0),
              discount_value: Number.isFinite(discountValue) ? discountValue : 0,
              discount_type: row.discount_type,
              tax_percent: Number(row.tax_percent),
              tax_amount: Number(row.tax_amount),
              line_total: Number(row.line_total),
              discount_auto: false,
            };
            return applyBillingCalculation(baseRow);
          });
          setDetails(fetchedDetails);
          setSavedProductIds(fetchedDetails.map((d: any) => String(d.product_id)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        updateUiState({ pageLoading: false });
      }
    };
    if (!salesId) {
      lastFetchedIdRef.current = null;
      return;
    }
    fetchSales();
  }, [
    salesId,
    company,
    applyBillingCalculation,
    discountMode,
    setDetails,
    setHeader,
    setSavedProductIds,
    setDiscountMode,
  ]);

  const hasLogged = useRef(false);
  useEffect(() => {
    if (!user?.name || hasLogged.current) return;
    hasLogged.current = true;
    console.log("User Name : ", user?.name);
    setHeader((prev) => {
      if (prev.user_name === user.name) return prev;
      return {
        ...prev,
        user_name: user.name,
      };
    });
  }, [user?.name, setHeader]);

  const hasLoggedTenant = useRef(false);
  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
    hasLoggedTenant.current = true;
    console.log("Company:", company);
  }, [company]);

  useEffect(() => {
    salesIndexRef.current = null;
    salesIndexLoadingRef.current = null;
    billsLoadedRef.current = false;
    customerAnalyticsCache.current.clear();
    salesDetailCountCache.current.clear();
    discountCacheLoadedRef.current = false;
    pricingCacheRef.current.clear();
    hasLoadedMasterRef.current = false;
    hasLoadedUserSettingsRef.current = false;
    setUserSettingsDefaults({
      default_warehouse_id: "",
      default_locator_id: "",
      branch_name: "",
    });
    updateMasterData({
      activeDiscountsForToday: [],
      customers: [],
      uoms: [],
      taxes: [],
      warehouses: [],
      locators: [],
    });
    updateUiState({
      billsList: [],
      purchaseHistory: [],
      purchaseMonthly: [],
    });
  }, [company, updateMasterData, updateUiState]);

  useEffect(() => {
    if (!company || hasLoadedMasterRef.current) return;
    hasLoadedMasterRef.current = true;

    const loadMasterData = async () => {
      try {
        updateUiState({ pageLoading: true });
        const res = await fetch("/api/sales/master-data", {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        if (data?.success) {
          const payload = data.data || {};
          const normalizedTaxes = (payload.taxes ?? masterData.taxes).map((tax: any) => ({
            ...tax,
            tax_name:
              tax.tax_name ||
              tax.name ||
              tax.taxName ||
              tax.gst_name ||
              "",
          }));
          updateMasterData({
            customers: payload.customers ?? masterData.customers,
            uoms: payload.uoms ?? masterData.uoms,
            taxes: normalizedTaxes,
            warehouses: payload.warehouses ?? masterData.warehouses,
            locators: payload.locators ?? masterData.locators,
          });
          if (payload.sales_no) {
            setHeader((prev) => ({ ...prev, sales_no: payload.sales_no }));
          }
        }
      } catch (err) {
        console.error("Master data load failed:", err);
      } finally {
        updateUiState({ pageLoading: false });
      }
    };

    loadMasterData();
  }, [company, updateMasterData]);

  useEffect(() => {
    if (!company || isEdit || hasLoadedUserSettingsRef.current) return;
    hasLoadedUserSettingsRef.current = true;

    let cancelled = false;
    const loadUserSettings = async () => {
      try {
        const res = await apiFetch("/api/user-settings/me", company);
        const data = await res.json();
        if (!res.ok || !data?.success) return;

        const payload = data.data || {};
        const defaults: UserSettingsMe = {
          default_warehouse_id:
            payload.default_warehouse_id != null
              ? String(payload.default_warehouse_id)
              : "",
          default_locator_id:
            payload.default_locator_id != null
              ? String(payload.default_locator_id)
              : "",
          branch_name: payload.branch_name != null ? String(payload.branch_name) : "",
        };

        if (cancelled) return;
        setUserSettingsDefaults(defaults);
        setHeader((prev) => ({
          ...prev,
          warehouse_id:
            String(prev.warehouse_id || "").trim() || defaults.default_warehouse_id,
          locator_id:
            String(prev.locator_id || "").trim() || defaults.default_locator_id,
          branch_name:
            String(prev.branch_name || "").trim() || defaults.branch_name,
        }));
      } catch (err) {
        console.error("Failed to load user settings", err);
      }
    };

    void loadUserSettings();
    return () => {
      cancelled = true;
    };
  }, [company, isEdit, setHeader]);

  useEffect(() => {
    if (isEdit || header.sales_no) return;

    let cancelled = false;
    const ensureSalesNo = async () => {
      if (company) {
        try {
          const res = await fetch("/api/sales/generateNo", {
            headers: { "x-tenant": company },
          });
          const data = await res.json();
          if (!cancelled && data?.success && data.sales_no) {
            setHeader((prev) => ({ ...prev, sales_no: data.sales_no }));
            return;
          }
        } catch (err) {
          console.error("Failed to generate sales number", err);
        }
      }

      if (!cancelled) {
        setHeader((prev) =>
          prev.sales_no ? prev : { ...prev, sales_no: generateSalesNo() }
        );
      }
    };

    ensureSalesNo();
    return () => {
      cancelled = true;
    };
  }, [company, header.sales_no, isEdit, setHeader]);

  useEffect(() => {
    const customerId = header.customer_id;
    if (!customerId || !company) {
      updateUiState({ purchaseHistory: [], purchaseMonthly: [] });
      return;
    }

    const cached = customerAnalyticsCache.current.get(customerId);
    if (cached) {
      updateUiState({
        purchaseHistory: cached.history,
        purchaseMonthly: cached.monthly,
      });
      return;
    }

    let cancelled = false;

    const loadCustomerAnalytics = async () => {
      try {
        const rows = await getSalesIndex();
        const customerRows = rows.filter(
          (row: SalesIndexRow) => String(row.customer_id) === String(customerId)
        );

        const sorted = [...customerRows].sort((a, b) => {
          const ad = new Date(a.sales_date || a.created_at || 0).getTime();
          const bd = new Date(b.sales_date || b.created_at || 0).getTime();
          return bd - ad;
        });

        const recent = sorted.slice(0, 10);
        const history = await Promise.all(
          recent.map(async (row) => {
            let count = salesDetailCountCache.current.get(row.id);
            const rowCount =
              typeof row.items_count === "number" ? Number(row.items_count) : undefined;

            if (rowCount !== undefined && !Number.isNaN(rowCount)) {
              count = rowCount;
              salesDetailCountCache.current.set(row.id, rowCount);
            }

            if (count === undefined) {
              try {
                const detailRes = await fetch(`/api/sales/${row.id}`, {
                  headers: { "x-tenant": company },
                });
                const detailData = await detailRes.json();
                const countValue = Array.isArray(detailData?.data?.details)
                  ? detailData.data.details.length
                  : 0;
                count = countValue;
                salesDetailCountCache.current.set(row.id, countValue);
              } catch {
                count = 0;
              }
            }

            return {
              id: row.id,
              sales_no: row.sales_no,
              dateLabel: formatDateLabel(row.sales_date || row.created_at),
              items_count: count || 0,
              amount: Number(row.total_amount || 0),
            };
          })
        );

        const monthlyMap = new Map<string, number>();
        customerRows.forEach((row: SalesIndexRow) => {
          const rawDate = row.sales_date || row.created_at;
          if (!rawDate) return;
          const d = new Date(rawDate);
          if (Number.isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(row.total_amount || 0));
        });

        const monthly = Array.from(monthlyMap.entries())
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([key, total]) => {
            const [y, m] = key.split("-");
            const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
              "en-IN",
              {
                month: "short",
                year: "2-digit",
              }
            );
            return { month: label, total };
          });

        if (cancelled) return;
        updateUiState({
          purchaseHistory: history,
          purchaseMonthly: monthly,
        });
        customerAnalyticsCache.current.set(customerId, { history, monthly });
      } catch (err) {
        console.error("Failed to load customer analytics", err);
      }
    };

    loadCustomerAnalytics();

    return () => {
      cancelled = true;
    };
  }, [company, getSalesIndex, header.customer_id]);

  useEffect(() => {
    fetchActiveDiscountsForToday();
  }, [fetchActiveDiscountsForToday]);

  useEffect(() => {
    if (!company) return;
    const source = new EventSource(
      `/api/barcode-scan?tenant=${encodeURIComponent(company)}`
    );
    source.onmessage = (event) => {
      const payload = String(event.data || "").trim();
      if (payload) barcodeHandlerRef.current(payload);
    };
    return () => {
      source.close();
    };
  }, [company]);


  useEffect(() => {
    setHeader((prev) => ({
      ...prev,
      subtotal: Number(billingTotals.taxable.toFixed(2)),
      tax_amount: Number(billingTotals.tax.toFixed(2)),
      total_amount: Number(billingTotals.total.toFixed(2)),
    }));
  }, [billingTotals, setHeader]);

  const updateRow = useCallback(
    (index: number, field: string, value: any) => {
      setDetails((prev) => {
        const updated = [...prev];
        const nextRow: SalesDetail = {
          ...updated[index],
          [field]: value,
        };
        if (field === "discount_value") {
          nextRow.discount_auto = false;
          nextRow.discount_type = undefined;
          nextRow.discount_name = undefined;
        }
        updated[index] = applyBillingCalculation(nextRow) as SalesDetail;
        return updated;
      });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${String(field)}_${index}`];
        return newErrors;
      });
    },
    [applyBillingCalculation, setDetails, setErrors]
  );

  const handleRateChange = (index: number, value: number | "") => updateRow(index, "rate", value);

  const handleQtyChange = (index: number, value: number | "") => updateRow(index, "qty", value);

  const handleDiscountChange = (index: number, value: number | "") =>
    updateRow(index, "discount_value", value);

  const handleTaxChange = useCallback(
    (index: number, taxId: number | null) => {
      setDetails((prev) => {
        const updated = [...prev];
        const tax = taxId ? taxById.get(Number(taxId)) : undefined;
        if (tax) {
          updated[index] = {
            ...updated[index],
            tax_id: tax.id,
            tax_name: tax.tax_name || tax.name || tax.taxName || tax.gst_name || "",
            tax_percent: Number(tax.total_percentage || 0),
          };
        } else {
          updated[index] = {
            ...updated[index],
            tax_id: 0,
            tax_name: "",
            tax_percent: 0,
          };
        }
        updated[index] = {
          ...updated[index],
          ...applyBillingCalculation(updated[index]),
        } as SalesDetail;
        return updated;
      });
    },
    [applyBillingCalculation, setDetails, taxById]
  );

  const removeRow = (index: number) =>
    setDetails((prev) => prev.filter((_, i) => i !== index));

  const handleSelectBill = (bill: SalesIndexRow) => {
    updateUiState({ showBillsPanel: false });
    if (!bill?.id) return;
    router.push(`/${company}/transactions/sales/add?id=${bill.id}`);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!header.sales_no.trim()) newErrors.sales_no = "Bill No required";
    if (!header.customer_id) newErrors.customer_id = "Customer required";
    if (!header.sales_date) newErrors.sales_date = "Bill date required";
    if (header.total_amount <= 0)
      newErrors.total_amount = "Total amount must be greater than 0";

    if (details.length === 0) {
      newErrors.details = "At least one service row is required";
    } else {
      details.forEach((d, index) => {
        if (!d.product_id) newErrors[`product_${index}`] = "Service Id required";
        if (Number(d.rate || 0) <= 0) newErrors[`rate_${index}`] = "Unit Price must be > 0";
        if (Number(d.qty || 0) <= 0) newErrors[`qty_${index}`] = "Qty must be > 0";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetFormAfterSave = async () => {
    setDiscountMode("percent");
    setPrintData(null);
    setFormState((prev) => ({
      ...prev,
      header: {
        ...initialHeader,
        sales_date: new Date().toISOString().split("T")[0],
        user_name: user?.name || prev.header.user_name || "",
        warehouse_id: userSettingsDefaults.default_warehouse_id,
        locator_id: userSettingsDefaults.default_locator_id,
        branch_name: userSettingsDefaults.branch_name,
      },
      details: [],
      couponCode: "",
      barcodeValue: "",
      barcodeMessage: "",
    }));
    setUiState((prev) => ({
      ...prev,
      errors: {},
      errorMessage: "",
      savedProductIds: [],
      selectedProducts: [],
    }));
    resetLookupFilters();
    setLookupPage(1);

    if (company) {
      try {
        const res = await fetch("/api/sales/generateNo", {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        if (data?.success && data.sales_no) {
          setHeader((prev) => ({ ...prev, sales_no: data.sales_no }));
        } else {
          setHeader((prev) => ({ ...prev, sales_no: generateSalesNo() }));
        }
      } catch (err) {
        console.error("Failed to refresh sales number", err);
        setHeader((prev) => ({ ...prev, sales_no: generateSalesNo() }));
      }
    } else {
      setHeader((prev) => ({ ...prev, sales_no: generateSalesNo() }));
    }

    lastFetchedIdRef.current = null;
    billsLoadedRef.current = false;
    salesIndexRef.current = null;
    salesIndexLoadingRef.current = null;
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  type SaveOptions = {
    redirect?: boolean;
    reset?: boolean;
  };
  const printBill = useCallback(
    async (billId: number) => {
      if (!billId) return;
      try {
        const res = await fetch(`/api/bills/${billId}`, {
          headers: { "x-tenant": company },
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load bill for printing");
        }

        const bill = payload?.data ?? payload;
        const header = bill?.header ?? bill ?? {};
        const details = Array.isArray(bill?.details) ? bill.details : [];

        setPrintData({
          header: {
            sales_no: header.sales_no,
            customer_name: header.customer_name,
            customer_email: header.customer_email,
            customer_phone: header.customer_phone,
            customer_address: header.customer_address,
            sales_date: header.sales_date,
            subtotal: Number(header.subtotal || 0),
            tax_amount: Number(header.tax_amount || 0),
            total_amount: Number(header.total_amount || 0),
          },
          details: details.map((d: any) => ({
            product_name: d.product_name,
            qty: Number(d.qty || 0),
            rate: Number(d.rate || 0),
            discount: Number(d.discount_amount ?? d.discount ?? 0),
            tax_percent: Number(d.tax_percent || 0),
            tax_amount: Number(d.tax_amount || 0),
            line_total: Number(d.line_total || 0),
            tax_components: d.tax_components ?? [],
          })),
        });

        await new Promise((r) => setTimeout(r, 150));
        window.print();
      } catch (err: any) {
        console.error("Print bill failed:", err);
        updateUiState({ errorMessage: err?.message || "Failed to print bill" });
      }
    },
    [company, updateUiState]
  );
  const saveSales = async (printAfterSave = false) => {
  console.log("STEP 1 - Save started");

  updateUiState({ errorMessage: "" });

  if (!validate()) {
    console.log("STEP 2 - validation failed");
    return;
  }

  console.log("STEP 3 - validation passed");

  updateUiState({ loading: true });

  try {

    console.log("step 4,5,6-removed");
    console.log("STEP 7 - preparing save payload");

    const payloadDetails = details.map((row) => ({
      ...row,
      discount_value: Number(row.discount_value || 0),
      discount_type: discountMode,
      discount_amount: Number(row.discount || 0),
    }));

    console.log("STEP 8 - calling SALES API");

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant": company,
      },
      body: JSON.stringify({
        header,
        details: payloadDetails,
      }),
    });

    console.log("STEP 9 - sales response received");

    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    console.log("STEP 4 - sales saved");

    if (printAfterSave) {
      await printBill(data.id);
    }

    await resetFormAfterSave();

    router.replace(`/${company}/transactions/sales/add`);

    console.log("STEP 10 - sales parsed", data);
  } catch (err: any) {
    console.error("Save Sales Error:", err);
    updateUiState({ errorMessage: err.message });
  } finally {
    console.log("STEP 11 - save process completed");
    updateUiState({ loading: false });
  }
};

  // const saveSales = async (printAfterSave: boolean, options: SaveOptions = {}) => {
  //   const { redirect = true, reset = true } = options;
  //   updateUiState({ errorMessage: "" });
  //   if (!validate()) return null;

  //   const activeWarehouseId = String(header.warehouse_id || "").trim();
  //   if (!activeWarehouseId) {
  //     updateUiState({ errorMessage: "Please select a warehouse before saving." });
  //     return null;
  //   }

  //   updateUiState({ loading: true });
  //   try {
  //     // Batch stock check before saving
  //     const stockCheckRes = await fetch("/api/pricing", {
  //       method: "PATCH",
  //       headers: { 
  //         "Content-Type": "application/json", 
  //         "x-tenant": company,
  //         "x-warehouse-id": activeWarehouseId,
  //       },
  //       body: JSON.stringify({
  //         items: details.map((d) => ({
  //           product_id: d.product_id,
  //           qty: Number(d.qty),
  //         })),
  //       }),
  //     });
  //     const stockCheckData = await stockCheckRes.json();

  //     if (!stockCheckData.success) {
  //       // stockCheckData.errors is an array of { product_id, requested, available, product_name }
  //       const stockErrors: Record<string, string> = {};
  //       (stockCheckData.errors ?? []).forEach((e: any) => {
  //         const idx = details.findIndex((d) => String(d.product_id) === String(e.product_id));
  //         if (idx >= 0) {
  //           stockErrors[`qty_${idx}`] = `Only ${e.available} available (requested ${e.requested})`;
  //         }
  //       });
  //       setErrors((prev) => ({ ...prev, ...stockErrors }));
  //       updateUiState({
  //         errorMessage: "Insufficient stock for one or more items. See highlighted rows.",
  //         loading: false,
  //       });
  //       return;
  //     }

  //     const url = salesId ? `/api/sales/${salesId}` : "/api/sales";
  //     const method = salesId ? "PUT" : "POST";
  //     const payloadDetails = details.map((row) => ({
  //       ...row,
  //       discount_value: Number(row.discount_value || 0),
  //       discount_type: discountMode,
  //       discount_amount: Number(row.discount || 0),
  //     }));

  //     const res = await fetch(url, {
  //       method: method,
  //       headers: {
  //         "Content-Type": "application/json",
  //         "x-tenant": company,
  //       },
  //       body: JSON.stringify({
  //         header: { ...header, user_name: user?.name },
  //         details: payloadDetails,
  //       }),
  //     });
  //     const data = await res.json();
  //     if (!data.success) throw new Error(data.error || "Failed to save sales");

  //     const mergedHeader: SalesHeaderType = {
  //       ...header,
  //       sales_no: data.sales_no || header.sales_no,
  //       user_name: user?.name || header.user_name,
  //     };

  //     if (printAfterSave) {
  //       updateUiState({
  //         printSnapshot: {
  //           header: buildPrintHeader(mergedHeader),
  //           details,
  //         },
  //       });
  //       setTimeout(() => handlePrint(), 0);
  //     }
  //     const savedBill = {
  //       id: data.id ?? data.sales_id ?? (salesId ? Number(salesId) : null),
  //       sales_no: data.sales_no || mergedHeader.sales_no,
  //     };

  //     if (redirect && company) {
  //       router.replace(`/${company}/transactions/sales/add`);
  //     }

  //     if (reset) {
  //       await resetFormAfterSave();
  //     }
  //     return savedBill;
  //   } catch (err: any) {
  //     console.error("Save Sales Error:", err);
  //     updateUiState({ errorMessage: err.message });
  //     return null;
  //   } finally {
  //     updateUiState({ loading: false });
  //   }
  // };

  // const handleSave = async (options: SaveOptions = {}) => saveSales(false, options);



  // const handleSaveAndPrint = async () => {
  //   const savedBill = await handleSave({ redirect: false, reset: false });
  //   if (savedBill?.id) {
  //     await printBill(savedBill.id);
  //     if (company) {
  //       router.replace(`/${company}/transactions/sales/add`);
  //     }
  //     await resetFormAfterSave();
  //   }
  // };
  const loadCustomers = useCallback(async () => {
    if (!company) return;
    try {
      const res = await fetch("/api/customers", {
        headers: {
          "x-tenant": company,
        },
      });
      const data = await res.json();
      if (data?.success) {
        updateMasterData({ customers: data.data || [] });
      }
    } catch (err) {
      console.error("Failed to refresh customer list", err);
    }
  }, [company, updateMasterData]);
  const handleOpenCustomerModal = useCallback(() => {
    updateUiState({
      showCustomerModal: true,
      customerSearchName: "",
      customerSearchPhone: "",
      newCustomerName: "",
      newCustomerPhone: "",
      customerModalError: "",
    });
  }, [updateUiState]);

  useEffect(() => {
    if (!showCustomerModal) return;
    loadCustomers();
  }, [loadCustomers, showCustomerModal]);

  const closeCustomerModal = useCallback(() => {
    updateUiState({
      showCustomerModal: false,
      customerSearchName: "",
      customerSearchPhone: "",
      newCustomerName: "",
      newCustomerPhone: "",
      customerModalLoading: false,
      customerModalError: "",
    });
  }, [updateUiState]);



  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomerName.trim()) {
      setUiState((prev) => ({ ...prev, customerModalError: "Customer name is required" }));
      return;
    }

    setUiState((prev) => ({ ...prev, customerModalLoading: true, customerModalError: "" }));
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create customer");
      }

      const createdCustomer = data.customer;
      if (createdCustomer?.id) {
        updateMasterData({ customers: [createdCustomer, ...allCustomers] });
        setHeader((prev) => ({
          ...prev,
          customer_id: String(createdCustomer.id),
        }));
      } else {
        await loadCustomers();
        const found = allCustomers.find(
          (c) => c.name === newCustomerName.trim() && String(c.phone || "") === String(newCustomerPhone.trim())
        );
        if (found) {
          setHeader((prev) => ({
            ...prev,
            customer_id: String(found.id),
          }));
        }
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.customer_id;
        return newErrors;
      });
      closeCustomerModal();
    } catch (err: any) {
      console.error("Create customer failed", err);
      setUiState((prev) => ({
        ...prev,
        customerModalError: err?.message || "Unable to create customer",
      }));
    } finally {
      setUiState((prev) => ({ ...prev, customerModalLoading: false }));
    }
  }, [allCustomers, company, closeCustomerModal, loadCustomers, newCustomerName, newCustomerPhone, setErrors, setHeader, updateMasterData, setUiState]);

  const handleCustomerSearchNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUiState((prev) => ({ ...prev, customerSearchName: e.target.value }));
  };

  const handleCustomerSearchPhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUiState((prev) => ({ ...prev, customerSearchPhone: e.target.value }));
  };

  const handleNewCustomerNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUiState((prev) => ({ ...prev, newCustomerName: e.target.value }));
  };

  const handleNewCustomerPhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUiState((prev) => ({ ...prev, newCustomerPhone: e.target.value }));
  };

  const handleSalesDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setHeader((prev) => ({
      ...prev,
      sales_date: e.target.value,
    }));
  };

  const handleWarehouseChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextWarehouseId = e.target.value;
    setHeader((prev) => {
      const currentLocator = String(prev.locator_id || "");
      const locatorBelongsToWarehouse = allLocators.some(
        (locator) =>
          String(locator.id) === currentLocator &&
          String(locator.warehouse_id || "") === nextWarehouseId
      );
      return {
        ...prev,
        warehouse_id: nextWarehouseId,
        locator_id: locatorBelongsToWarehouse ? prev.locator_id : "",
      };
    });
    setErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors.warehouse_id;
      return nextErrors;
    });
  };

  const handleLocatorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setHeader((prev) => ({
      ...prev,
      locator_id: e.target.value,
    }));
  };

  const handleBranchNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setHeader((prev) => ({
      ...prev,
      branch_name: e.target.value,
    }));
  };

  const handleCouponChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, couponCode: e.target.value }));
  };

  const handleBarcodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setFormState((prev) => ({
      ...prev,
      barcodeValue: nextValue,
      barcodeMessage: prev.barcodeMessage ? "" : prev.barcodeMessage,
    }));
  };

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeSubmit();
    }
  };

  const handleOpenProductPopup = () => {
    updateUiState({ showProductPopup: true });
  };

  const handleQuickPrint = useCallback(() => {
    updateUiState({
      printSnapshot: {
        header: buildPrintHeader({
          ...header,
          user_name: user?.name || header.user_name,
        }),
        details,
      },
    });
    setTimeout(() => handlePrint(), 0);
  }, [buildPrintHeader, details, handlePrint, header, user?.name]);

  return (
    <div className="w-full px-6 py-8">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #thermal-print-root { display: block !important; }
        }
      `}</style>
      {pageLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading Billing...</p>
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
                {isEdit ? "Updating Billing..." : "Saving Billing..."}
              </p>
            </div>
          </div>,
          document.body
        )}
      {errorMessage && <div className="text-red-600 font-semibold">{errorMessage}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{isEdit ? "Edit Billing" : "Create Billing"}</h1>
          {errors.details && (
            <span className="text-red-500 text-sm font-medium whitespace-nowrap">
              {errors.details}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => saveSales(false)}
            className="bg-[var(--color-blue-600)] text-white px-5 py-2 rounded hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => saveSales(true)}
            className="border border-gray-300 px-5 py-2 rounded hover:bg-gray-50"
          >
            Save & Print
          </button>
          <button
            type="button"
            onClick={handleQuickPrint}
            className="border border-gray-300 px-5 py-2 rounded hover:bg-gray-50"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${company}`)}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={openBillsPanel}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:opacity-90"
          >
            View Bills
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
           saveSales(false);
        }}
        className="space-y-6"
      >
        <div className="grid xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <SalesHeader
              header={header}
              selectedCustomerName={selectedCustomerName}
              barcodeValue={barcodeValue}
              barcodeMessage={barcodeMessage}
              barcodeInputRef={barcodeInputRef}
              salesNoError={errors.sales_no}
              customerError={errors.customer_id}
              salesDateError={errors.sales_date}
              discountMode={discountMode}
              onDiscountModeChange={(value) => setDiscountMode(value)}
              onOpenCustomerModal={handleOpenCustomerModal}
              onSalesDateChange={handleSalesDateChange}
              onBranchNameChange={handleBranchNameChange}
              onCouponChange={handleCouponChange}
              onBarcodeChange={handleBarcodeChange}
              onBarcodeKeyDown={handleBarcodeKeyDown}
              onOpenProductPopup={handleOpenProductPopup}
              couponCode={couponCode}
            />

            <SalesTable
              details={details}
              errors={errors}
              taxes={allTaxes}
              onRateChange={handleRateChange}
              onQtyChange={handleQtyChange}
              onDiscountChange={handleDiscountChange}
              onTaxChange={handleTaxChange}
              onRemove={removeRow}
            />
          </div>

          <aside className="space-y-4 sticky top-4">
            <div className="bg-white p-4 rounded-xl shadow">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Final Receipt Summary
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{billingTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discount</span>
                  <span>-{billingTotals.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Amt</span>
                  <span>{billingTotals.taxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{billingTotals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span>{billingTotals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {header.customer_id && (
              <CustomerAnalyticsPanel history={purchaseHistory} monthly={purchaseMonthly} />
            )}
          </aside>
        </div>
      </form>

      <ProductLookupModal
        open={showProductPopup}
        onClose={closePopup}
        onAddSelected={addSelectedProducts}
        errorMessage={popupError}
        items={lookupPaginatedItems}
        loading={lookupLoading}
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
        isSelected={(item) => selectedProducts.includes(item.id)}
        onToggle={(item) => toggleProduct(item.id)}
        onToggleAll={(checked, pageItems) => {
          if (checked) {
            setSelectedProducts(pageItems.map((p) => p.id));
          } else {
            setSelectedProducts([]);
          }
        }}
      />

      {showCustomerModal &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            <div className="absolute inset-0 bg-black/40" onClick={closeCustomerModal} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-6xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <div>
                    <h2 className="text-lg font-semibold">Search Customer</h2>
                    <p className="text-sm text-gray-500">
                      Filter by name or phone, or add a new customer to select it immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCustomerModal}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    Close
                  </button>
                </div>
                <div className="grid md:grid-cols-[1.6fr_1fr] gap-4 px-6 py-5 flex-1 overflow-hidden">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Name</label>
                        <input
                          type="text"
                          value={customerSearchName}
                          onChange={handleCustomerSearchNameChange}
                          className="border p-2 rounded w-full"
                          placeholder="Search by name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Phone</label>
                        <input
                          type="text"
                          value={customerSearchPhone}
                          onChange={handleCustomerSearchPhoneChange}
                          className="border p-2 rounded w-full"
                          placeholder="Search by phone"
                        />
                      </div>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto border rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                          <tr>
                            <th className="p-3 text-left font-semibold">Code</th>
                            <th className="p-3 text-left font-semibold">Customer</th>
                            <th className="p-3 text-left font-semibold">Phone</th>
                            <th className="p-3 text-left font-semibold">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.length === 0 ? (
                            <tr>
                              <td className="p-5 text-sm text-gray-500" colSpan={4}>
                                No matching customers found.
                              </td>
                            </tr>
                          ) : (
                            filteredCustomers.map((customer) => (
                              <tr
                                key={customer.id}
                                onClick={() => {
                                  setHeader((prev) => ({
                                    ...prev,
                                    customer_id: String(customer.id),
                                  }));
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.customer_id;
                                    return newErrors;
                                  });
                                  closeCustomerModal();
                                }}
                                className="border-t hover:bg-blue-50 cursor-pointer transition"
                              >
                                <td className="p-3 text-gray-600">
                                  {customer.customer_code || customer.cust_code || "-"}
                                </td>
                                <td className="p-3 font-medium text-gray-900">
                                  {customer.name || customer.cust_name || "-"}
                                </td>
                                <td className="p-3 text-gray-600">{customer.phone || "-"}</td>
                                <td className="p-3 text-gray-500">{customer.email || "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4 border-l border-gray-200 pl-4 md:pl-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Create New Customer</h3>
                      <p className="text-sm text-gray-500">
                        Only name is required. Phone is optional but recommended.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Customer Name</label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={handleNewCustomerNameChange}
                        className="border p-2 rounded w-full"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Phone</label>
                      <input
                        type="text"
                        value={newCustomerPhone}
                        onChange={handleNewCustomerPhoneChange}
                        className="border p-2 rounded w-full"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      disabled={customerModalLoading}
                      className="w-full bg-blue-600 text-white rounded-xl py-3 disabled:opacity-50"
                    >
                      {customerModalLoading ? "Creating..." : "Create and Select Customer"}
                    </button>
                    {customerModalError && (
                      <p className="text-red-500 text-sm">{customerModalError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showBillsPanel &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => updateUiState({ showBillsPanel: false })}
            />
            <div className="absolute right-0 top-0 h-full w-[540px] bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="text-lg font-semibold">Previous Bills</div>
                <button
                  type="button"
                  onClick={() => updateUiState({ showBillsPanel: false })}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {billsLoading && (
                  <div className="p-5 text-sm text-gray-500">Loading bills...</div>
                )}
                {billsError && <div className="p-5 text-sm text-red-500">{billsError}</div>}
                {!billsLoading && !billsError && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">Bill No</th>
                        <th className="p-3 text-left">Customer</th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Time</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBills.length === 0 && (
                        <tr>
                          <td className="p-4 text-sm text-gray-400" colSpan={5}>
                            No bills available.
                          </td>
                        </tr>
                      )}
                      {sortedBills.map((bill) => (
                        <tr
                          key={bill.id}
                          onClick={() => handleSelectBill(bill)}
                          className="border-t hover:bg-blue-50 cursor-pointer transition"
                        >
                          <td className="p-3 font-medium text-gray-700">{bill.sales_no}</td>
                          <td className="p-3 text-gray-600">
                            {bill.customer_name || bill.customer_id}
                          </td>
                          <td className="p-3 text-gray-600">
                            {formatDateLabel(bill.sales_date || bill.created_at)}
                          </td>
                          <td className="p-3 text-gray-600">
                            {formatTimeLabel(bill.created_at)}
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-700">
                            {Number(bill.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="absolute left-[-10000px] top-0">
        <div ref={printRef}>
          {printSnapshot && (
            <PrintBillingInvoice
              header={printSnapshot.header}
              details={printSnapshot.details as any}
            />
          )}
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <div id="thermal-print-root" style={{ display: "none" }}>
            {printData && (
              <ThermalInvoice
                ref={thermalRef}
                header={printData.header}
                details={printData.details}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
