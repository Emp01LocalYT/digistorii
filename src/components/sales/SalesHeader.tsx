"use client";

import { memo, forwardRef, useImperativeHandle, useRef } from "react";
import type { ChangeEvent } from "react";
import Select from "react-select";
import type { InputActionMeta, SingleValue, SelectInstance } from "react-select";
import type { Customer, SalesHeader as SalesHeaderType } from "@/types/sales";

export type CustomerSelectOption = {
  value: string;
  label: string;
  customerName: string;
  phoneNumber: string;
  customer: Customer;
};

export type SalesHeaderRef = {
  focusCustomerSelect: () => void;
};

type SalesHeaderProps = {
  header: SalesHeaderType;
  salesNoError?: string;
  customerError?: string;
  salesDateError?: string;
  warehouseName?: string;
  locationName?: string;
  couponCode?: string;
  discountMode?: "percent" | "amount";
  selectedCustomerOption?: CustomerSelectOption | null;
  customerOptions?: CustomerSelectOption[];
  customerSearchInput?: string;
  onCustomerSelect?: (option: CustomerSelectOption | null) => void;
  onCustomerSearchInputChange?: (value: string, meta: InputActionMeta) => void;
  onOpenQuickCustomerPopup?: () => void;
  onOpenCustomerModal?: () => void;
  onSalesDateChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCouponChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onDiscountModeChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
};

const SalesHeader = memo(
  forwardRef<SalesHeaderRef, SalesHeaderProps>(function SalesHeader(
    {
      header,
      salesNoError,
      customerError,
      salesDateError,
      warehouseName = "",
      locationName = "",
      couponCode = "",
      discountMode = "percent",
      selectedCustomerOption = null,
      customerOptions = [],
      customerSearchInput = "",
      onCustomerSelect,
      onCustomerSearchInputChange,
      onOpenQuickCustomerPopup,
      onOpenCustomerModal,
      onSalesDateChange,
      onCouponChange,
      onDiscountModeChange,
    },
    ref
  ) {
    const customerSelectRef = useRef<SelectInstance<CustomerSelectOption> | null>(null);

    // Expose focus action to parent page
    useImperativeHandle(ref, () => ({
      focusCustomerSelect: () => {
        customerSelectRef.current?.focus();
      },
    }));

    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Bill No
            </label>
            <input
              value={header.sales_no}
              readOnly
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-slate-700"
            />
            {salesNoError ? <p className="mt-1 text-xs text-red-500">{salesNoError}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Bill Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={header.sales_date}
              min={new Date().toISOString().split("T")[0]}
              onChange={onSalesDateChange}
              className={`h-10 w-full rounded-lg border px-3 text-sm ${
                salesDateError ? "border-red-500" : "border-gray-200"
              }`}
            />
            {salesDateError ? <p className="mt-1 text-xs text-red-500">{salesDateError}</p> : null}
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Warehouse
            </label>
            <input
              value={warehouseName}
              readOnly
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-slate-700"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Location
            </label>
            <input
              value={locationName}
              readOnly
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  ref={customerSelectRef}
                  placeholder="Enter customer phone number"
                  value={selectedCustomerOption}
                  options={customerOptions}
                  inputValue={customerSearchInput}
                  isSearchable
                  maxMenuHeight={260}
                  menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                  filterOption={(candidate, rawInput) => {
                    const search = String(rawInput || "").trim().toLowerCase();
                    if (!search) return true;
                    const phone = String(
                      candidate.data.phoneNumber || candidate.data.customer?.phone || ""
                    ).toLowerCase();
                    const name = String(
                      candidate.data.customerName ||
                        candidate.data.customer?.cust_name ||
                        candidate.data.customer?.name ||
                        ""
                    ).toLowerCase();
                    return phone.includes(search) || name.includes(search);
                  }}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base, state) => ({
                      ...base,
                      minHeight: 40,
                      borderRadius: 10,
                      borderColor: customerError
                        ? "#ef4444"
                        : state.isFocused
                        ? "#2563eb"
                        : base.borderColor,
                      boxShadow: state.isFocused
                        ? `0 0 0 1px ${customerError ? "#ef4444" : "#2563eb"}`
                        : base.boxShadow,
                      "&:hover": {
                        borderColor: customerError ? "#ef4444" : "#2563eb",
                      },
                    }),
                  }}
                  onInputChange={onCustomerSearchInputChange}
                  onChange={(option: SingleValue<CustomerSelectOption>) => {
                    onCustomerSelect?.(option ?? null);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={onOpenQuickCustomerPopup || onOpenCustomerModal}
                className="h-10 w-10 rounded-lg bg-slate-500 text-lg leading-none text-white hover:bg-slate-800"
                aria-label="Add customer"
              >
                +
              </button>
            </div>
            {customerError ? <p className="mt-1 text-xs text-red-500">{customerError}</p> : null}
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Coupon Code
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={onCouponChange}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Coupon"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Discount Mode
            </label>
            <select
              value={discountMode}
              onChange={onDiscountModeChange}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="percent">Percentage</option>
              <option value="amount">Amount</option>
            </select>
          </div>
        </div>
      </div>
    );
  })
);

export default SalesHeader;