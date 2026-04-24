"use client";
 
import React, { forwardRef } from "react";
import { useTenant } from "@/context/TenantContext";
 
type PurchaseDetail = {
    product_name?: string;
    product_code?: string;
    uom: string;
    uom_code: string;
    rate: number;
    qty: number;
    tax_id: number | null;
    tax_name: string;
    tax_percent: number;
    tax_amount: number;
    line_total: number;
};
 
type PurchaseHeader = {
    po_type?: string;
    purchase_no: string;
    purchase_date: string;
    req_date: string;
    supplier_code: string;
    supplier_name?: string;
    supplier_email?: string;
    supplier_phone?: string;
    supplier_address?: string;
    item_production_type?: string;
    bill_to_code?: string;
    bill_to_name?: string;
    bill_to_address?: string;
    ship_to_code?: string;
    ship_to_name?: string;
    ship_to_address?: string;
    despatch_terms_name?: string;
    payment_terms_name?: string;
    currency_code?: string;
    freight_charges?: number;
    freight_tax?: number;
    freight_tax_amount?: number;
    packaging_amount?: number;
    notes?: string;
    attachment_url?: string;
    currency: string;
    conversion_rate?: number | "";
    subtotal: number;
    tax_amount: number;
    total_amount: number;
};
 
type Props = {
    header: PurchaseHeader;
    details: PurchaseDetail[];
};
 
const currency = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
    });
 
const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
 
    return `${day}-${month}-${year}`;
};
 
 
const PrintPurchaseInvoice = forwardRef<HTMLDivElement, Props>(
    ({ header, details }, ref) => {
        const { company } = useTenant();
        const itemsSubtotal = Number(header.subtotal || 0);
        const productTax = Number(header.tax_amount || 0);
        const freightBase = Number(header.freight_charges || 0);
        const freightTaxAmount = Number(header.freight_tax_amount || 0);
        const packagingAmount = Number(header.packaging_amount || 0);
        const extraChargesTotal = freightBase + freightTaxAmount + packagingAmount;
        const grandTotal = Number(header.total_amount || 0);
        return (
            <div
                ref={ref}
                className="bg-white text-black p-12 text-sm"
                style={{ width: "800px", margin: "auto" }}
            >
                {/* COMPANY HEADER */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {company || "Your Company Name"}
                        </h1>
                        <p className="text-gray-600">
                            GSTIN : 33XXXXXXXX
                        </p>
                        <p className="text-gray-600">
                            Chennai, Tamil Nadu, India
                        </p>
                    </div>
 
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-gray-800">
                            PURCHASE INVOICE
                        </h2>
                        <p className="text-gray-600 mt-2">
                            PO No : <b>{header.purchase_no}</b>
                        </p>
                        <p className="text-gray-600">
                            PO Date : {formatDate(header.purchase_date)}
                        </p>
                        <p className="text-gray-600">
                            Req Date : {formatDate(header.req_date)}
                        </p>
                        <p className="text-gray-600">
                            Currency : {header.currency_code || header.currency}
                        </p>
                        <p className="text-gray-600">
                            PO Type : {header.po_type || "standard"}
                        </p>
                    </div>
                </div>

                {/* CUSTOMER */}
                <div className="bg-gray-50 border rounded-lg p-5 mb-8">
                    <p className="text-sm text-gray-500 mb-1">
                        BILL FROM (Supplier)
                    </p>
                    <p className="font-semibold text-gray-800">
                        {header.supplier_code}-{header.supplier_name}
                    </p>
                    <p className="text-gray-600">
                        {header.supplier_phone}
                    </p>
                    <p className="text-gray-600">
                        {header.supplier_email}
                    </p>
                    <p className="text-gray-600">
                        {header.supplier_address}
                    </p>
                </div>

                
 
                {/* TABLE */}
                <table className="w-full text-[12px] border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 border">S.No</th>
                            <th className="p-3 text-left border">
                                Product
                            </th>
                            <th className="p-3 border">
                                UOM
                            </th>
                            <th className="p-3 border">
                                Unit Price
                            </th>
                            <th className="p-3 border">
                                Qty
                            </th>
                            <th className="p-3 border">
                                Amount
                            </th>
                            <th className="p-3 border">
                                Tax Group
                            </th>
                            <th className="p-3 border">
                                Tax Amount
                            </th>
                            <th className="p-3 border text-right">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-3 text-center border">
                                    {i + 1}
                                </td>
                                <td className="p-3 border">
                                    <div className="font-medium">
                                        {row.product_name}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {row.product_code}
                                    </div>
                                </td>
                                <td className="p-3 text-right border">
                                    {row.uom_code}
                                </td>
                                <td className="p-3 text-right border">
                                    {row.rate}
                                </td>
                                <td className="p-3 text-center border">
                                    {Number(row.qty)}
                                </td>
                                <td className="p-3 text-center border">
                                    {currency(row.qty * row.rate)}
                                </td>
                                <td className="p-3 text-center border">
                                    {row.tax_name}
                                </td>
                                <td className="p-3 text-right border">
                                    {currency(row.tax_amount)}
                                </td>
                                <td className="p-3 text-right border font-semibold">
                                    {currency(row.line_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
 {/* ADDITIONAL DETAILS */}
                <div className="bg-gray-50 border rounded-lg p-5 mb-8">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                        <div className="col-span-2">
                            <span className="font-semibold">Notes:</span> {header.notes || "-"}
                        </div>
                        <div className="col-span-2">
                            <span className="font-semibold">Attachment:</span>{" "}
                            {header.attachment_url || "-"}
                        </div>
                    </div>
                </div>
                {/* TOTAL */}
                <div className="flex justify-end mt-8">
                    <div className="w-80">
                        <div className="flex justify-between py-2 text-gray-700">
                            <span>Items Total</span>
                            <span>{currency(itemsSubtotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-gray-700">
                            <span>Product Tax (GST)</span>
                            <span>{currency(productTax)}</span>
                        </div>
                        <div className="border-t pt-3 mt-2 space-y-2 text-gray-700">
                            <div className="flex justify-between">
                                <span>Freight</span>
                                <span>{currency(freightBase)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Freight Tax</span>
                                <span>{currency(freightTaxAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Packaging</span>
                                <span>{currency(packagingAmount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Extra Charges Total</span>
                                <span>{currency(extraChargesTotal)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between py-3 border-t text-lg font-bold">
                            <span>Grand Total</span>
                            <span>{currency(grandTotal)}</span>
                        </div>
                    </div>
                </div>
                {/* FOOTER */}
                <div className="mt-16 flex justify-between text-sm text-gray-500">
                    <div>
                        <p>Thank you for your business.</p>
                    </div>
                    <div className="text-right">
                        <p className="mb-6">Authorized Signature</p>
                        <p>________________________</p>
                    </div>
                </div>
            </div>
        );
    }
);
 
PrintPurchaseInvoice.displayName = "PrintPurchaseInvoice";
 
export default PrintPurchaseInvoice;
