"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Customer, SalesHeader as SalesHeaderType } from "@/types/sales";
import type { CustomerSelectOption } from "@/components/sales/SalesHeader";
import {
  buildCustomerOptions,
  filterCustomerOptions,
  mapCustomerToSelectOption,
  normalizeCustomer,
} from "@/components/sales/salesUtils";

type SetHeader = (
  updater: SalesHeaderType | ((prev: SalesHeaderType) => SalesHeaderType)
) => void;

type SetErrors = (
  updater:
    | Record<string, string>
    | ((prev: Record<string, string>) => Record<string, string>)
) => void;

type UpdateUiState = (patch: Record<string, any>) => void;

type UseSalesCustomerArgs = {
  company?: string | null;
  customerId: string | number | null | undefined;
  customerLookupInput: string;
  newCustomerName: string;
  newCustomerPhone: string;
  setHeader: SetHeader;
  setErrors: SetErrors;
  updateUiState: UpdateUiState;
  setUiState: React.Dispatch<React.SetStateAction<any>>;
  setMasterData: React.Dispatch<React.SetStateAction<any>>;
};

export function useSalesCustomer({
  company,
  customerId,
  customerLookupInput,
  newCustomerName,
  newCustomerPhone,
  setHeader,
  setErrors,
  updateUiState,
  setUiState,
  setMasterData,
}: UseSalesCustomerArgs) {
  const [customerOptions, setCustomerOptions] = useState<CustomerSelectOption[]>([]);
  const [selectedCustomerOption, setSelectedCustomerOption] =
    useState<CustomerSelectOption | null>(null);

  const filteredCustomerOptions = useMemo(
    () => filterCustomerOptions(customerOptions, customerLookupInput),
    [customerLookupInput, customerOptions]
  );

  const syncCustomers = useCallback(
    (rawCustomers: any[]) => {
      const normalizedCustomers = rawCustomers
        .map((customer) => normalizeCustomer(customer))
        .filter((customer: Customer | null): customer is Customer => Boolean(customer));
      setMasterData((prev: any) => ({
        ...prev,
        customers: normalizedCustomers,
      }));
      setCustomerOptions(buildCustomerOptions(normalizedCustomers));
      return normalizedCustomers;
    },
    [setMasterData]
  );

  const loadCustomers = useCallback(async () => {
    if (!company) return [] as Customer[];
    try {
      const res = await fetch("/api/customers", {
        headers: {
          "x-tenant": company,
        },
      });
      const data = await res.json();
      if (data?.success) {
        const fetchedCustomers = Array.isArray(data.data) ? data.data : [];
        return syncCustomers(fetchedCustomers);
      }
    } catch (err) {
      console.error("Failed to refresh customer list", err);
    }
    return [] as Customer[];
  }, [company, syncCustomers]);

  useEffect(() => {
    if (!customerId) {
      setSelectedCustomerOption(null);
      return;
    }
    const selected =
      customerOptions.find((option) => option.value === String(customerId)) ?? null;
    setSelectedCustomerOption(selected);
  }, [customerId, customerOptions]);

  const handleCustomerSelect = useCallback(
    (option: CustomerSelectOption | null) => {
      setSelectedCustomerOption(option);
      setHeader((prev) => ({
        ...prev,
        customer_id: option ? String(option.value) : "",
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.customer_id;
        return next;
      });
      updateUiState({
        customerLookupInput: "",
        customerQuickAddError: "",
      });
    },
    [setErrors, setHeader, updateUiState]
  );

  const handleCustomerSearchInputChange = useCallback(
    (value: string, meta: { action: string }) => {
      if (meta.action !== "input-change" && meta.action !== "set-value") return;
      updateUiState({ customerLookupInput: value });
    },
    [updateUiState]
  );

  const handleOpenQuickCustomerPopup = useCallback(() => {
    updateUiState({
      showQuickCustomerPopup: true,
      newCustomerName: "",
      newCustomerPhone: String(customerLookupInput || "").trim(),
      customerQuickAddError: "",
    });
  }, [customerLookupInput, updateUiState]);

  const closeQuickCustomerPopup = useCallback(() => {
    updateUiState({
      showQuickCustomerPopup: false,
      newCustomerName: "",
      newCustomerPhone: "",
      customerQuickAddLoading: false,
      customerQuickAddError: "",
    });
  }, [updateUiState]);

  const handleCreateCustomer = useCallback(async () => {
    const trimmedName = String(newCustomerName || "").trim();
    const trimmedPhone = String(newCustomerPhone || "").trim();

    if (!trimmedName) {
      setUiState((prev: any) => ({ ...prev, customerQuickAddError: "Customer name is required" }));
      return;
    }
    if (!company) {
      setUiState((prev: any) => ({ ...prev, customerQuickAddError: "Company context is missing" }));
      return;
    }

    setUiState((prev: any) => ({
      ...prev,
      customerQuickAddLoading: true,
      customerQuickAddError: "",
    }));
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to create customer");
      }

      const createdCustomer = normalizeCustomer(
        data?.customer || data?.data?.customer || data?.data
      );
      if (createdCustomer?.id) {
        const createdOption = mapCustomerToSelectOption(createdCustomer);
        setMasterData((prev: any) => ({
          ...prev,
          customers: [
            createdCustomer,
            ...prev.customers.filter(
              (customer: Customer) => String(customer.id) !== String(createdCustomer.id)
            ),
          ],
        }));
        setCustomerOptions((prev) => [
          createdOption,
          ...prev.filter((option) => option.value !== createdOption.value),
        ]);
        setSelectedCustomerOption(createdOption);
        setHeader((prev) => ({
          ...prev,
          customer_id: String(createdCustomer.id),
        }));
      } else {
        const refreshedCustomers = await loadCustomers();
        const found = refreshedCustomers.find(
          (customer) =>
            String(customer.name || customer.cust_name || "").trim().toLowerCase() ===
              trimmedName.toLowerCase() && String(customer.phone || "").trim() === trimmedPhone
        );
        if (found) {
          const foundOption = mapCustomerToSelectOption(found);
          setSelectedCustomerOption(foundOption);
          setHeader((prev) => ({
            ...prev,
            customer_id: String(found.id),
          }));
        }
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next.customer_id;
        return next;
      });
      updateUiState({ customerLookupInput: "" });
      closeQuickCustomerPopup();
    } catch (err: any) {
      setUiState((prev: any) => ({
        ...prev,
        customerQuickAddError: err?.message || "Unable to create customer",
      }));
    } finally {
      setUiState((prev: any) => ({ ...prev, customerQuickAddLoading: false }));
    }
  }, [
    closeQuickCustomerPopup,
    company,
    loadCustomers,
    newCustomerName,
    newCustomerPhone,
    setErrors,
    setHeader,
    setMasterData,
    setUiState,
    updateUiState,
  ]);

  const handleNewCustomerNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setUiState((prev: any) => ({ ...prev, newCustomerName: e.target.value }));
    },
    [setUiState]
  );

  const handleNewCustomerPhoneChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setUiState((prev: any) => ({ ...prev, newCustomerPhone: e.target.value }));
    },
    [setUiState]
  );

  return {
    customerOptions,
    filteredCustomerOptions,
    selectedCustomerOption,
    setCustomerOptions,
    setSelectedCustomerOption,
    syncCustomers,
    loadCustomers,
    handleCustomerSelect,
    handleCustomerSearchInputChange,
    handleOpenQuickCustomerPopup,
    closeQuickCustomerPopup,
    handleCreateCustomer,
    handleNewCustomerNameChange,
    handleNewCustomerPhoneChange,
  };
}
