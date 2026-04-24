"use client";

import { memo } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import type {
  Locator,
  SalesHeader as SalesHeaderType,
  Warehouse,
} from "@/types/sales";

type SalesHeaderProps = {
  header: SalesHeaderType;
  couponCode: string;
  discountMode: "percent" | "amount";
  salesNoError?: string;
  customerError?: string;
  salesDateError?: string;
  barcodeValue: string;
  barcodeMessage: string;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  selectedCustomerName: string;
  onOpenCustomerModal: () => void;
  onDiscountModeChange: (mode: "percent" | "amount") => void;
  onSalesDateChange: (e: ChangeEvent<HTMLInputElement>) => void;
  // onBranchNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCouponChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBarcodeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBarcodeKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onOpenProductPopup: () => void;
};

const SalesHeader = memo(function SalesHeader({
  header,
  couponCode,
  salesNoError,
  customerError,
  salesDateError,
  barcodeValue,
  barcodeMessage,
  discountMode,
  barcodeInputRef,
  selectedCustomerName,
  onOpenCustomerModal,
  onDiscountModeChange,
  onSalesDateChange,
  // onBranchNameChange,
  onCouponChange,
  onBarcodeChange,
  onBarcodeKeyDown,
  onOpenProductPopup,
}: SalesHeaderProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      {/*row1*/}
      <div className="grid md:grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-semibold">
          Bill No<span className="text-red-500">*</span>
        </label>
        <input
          value={header.sales_no}
          readOnly
          className="border p-2 rounded w-full bg-gray-100 text-indigo-600 font-semibold"
        />
        {salesNoError && <p className="text-red-500 text-sm mt-1">{salesNoError}</p>}
      </div>
      <div>
        <label className="text-sm font-semibold mb-1 block">
          Bill Date<span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={header.sales_date}
          min={new Date().toISOString().split("T")[0]}
          onChange={onSalesDateChange}
          className={`border p-2 rounded w-full ${salesDateError ? "border-red-500" : ""}`}
        />
        {salesDateError && <p className="text-red-500 text-sm mt-1">{salesDateError}</p>}
      </div>

      <div>
        <label className="text-sm font-semibold mb-1 block">
          Customer <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedCustomerName}
            readOnly
            placeholder="Select Customer"
            className={`border p-2 rounded w-full bg-gray-50 ${
              customerError ? "border-red-500" : ""
            }`}
          />
          <button
            type="button"
            onClick={onOpenCustomerModal}
            className="bg-blue-600 text-white px-4 rounded"
          >
            Search
          </button>
        </div>
        {customerError && <p className="text-red-500 text-sm mt-1">{customerError}</p>}
      </div>
</div>

      {/*row2*/}
      {/* <div className="grid md:grid-cols-1 gap-4">
        <div>
          <label className="text-sm font-semibold mb-1 block">Branch Name</label>
          <input
            type="text"
            value={String(header.branch_name ?? "")}
            onChange={onBranchNameChange}
            className="border p-2 rounded w-full"
            placeholder="Enter branch name"
          />
        </div>
      </div> */}
{/*row2*/}
    <div className="flex gap-3 items-end">
      <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeValue}
            onChange={onBarcodeChange}
            onKeyDown={onBarcodeKeyDown}
            placeholder="Scan barcode"
            className="border p-2 rounded w-56"
          />
          {barcodeMessage ? (
            <span className="text-xs text-red-500 mt-1">{barcodeMessage}</span>
          ) : null}
        
        <button
          type="button"
          onClick={onOpenProductPopup}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-[42px] rounded font-medium flex items-center justify-center gap-1 whitespace-nowrap"
        >
          Select Items
        </button>
        </div>
      

{/*row3*/}
      <div className="grid md:grid-cols-2 gap-4">
  
  {/* Coupon */}
  <div>
    <label className="text-sm font-semibold block mb-1">
      Coupon Code
    </label>
    <input
      type="text"
      value={couponCode}
      onChange={onCouponChange}
      className="border p-2 rounded w-full"
      placeholder="Enter Coupon"
    />
  </div>

  {/* Discount Mode */}
  <div>
    <label className="text-sm font-semibold block mb-1">
      Discount Mode
    </label>
    <select
      value={discountMode}
      onChange={(e) =>
        onDiscountModeChange(e.target.value as "percent" | "amount")
      }
      className="border p-2 rounded w-full"
    >
      <option value="percent">%</option>
      <option value="amount">₹</option>
    </select>
  </div>

</div>
    </div>
  );
});

export default SalesHeader;
