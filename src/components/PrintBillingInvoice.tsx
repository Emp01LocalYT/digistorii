"use client";
 
import React, { forwardRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { any } from "zod";
 
type TaxComponent = {
    component_name: string;
    component_percentage: number;
};
 
type Detail = {
    id?: number;
    product_id: string;
    product_code?: string;
    product_name?: string;
    description: string;
    uom: string;
    uom_code: string;
    uom_name: string;
    hsn_no?: string;
    rate: number | string;
    qty: number | string;
    discount: number | string;
    tax_id?: number | null;
    tax_name: string;
    tax_percent: number;
    tax_amount: number;
    line_total: number;
    tax_components?: TaxComponent[];
};
 
type Header = {
    id?: number;
    sales_no: string;
    customer_id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_address?: string;
    sales_date: string;
    payment_status: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency_code: string;
    conversion_rate: number;
};
 
type Props = {
    header: Header;
    details: Detail[];
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
 
const PrintBillingInvoice = forwardRef<HTMLDivElement, Props>(
    ({ header, details }, ref) => {
        const { company } = useTenant();
        const isOverseas = header.currency_code !== "INR";
        const totalAmount = Number(header.total_amount || 0);
        const convert = (value: number) =>
            isOverseas
                ? value * Number(header.conversion_rate || 1)
                : value;
        /* ---------------- GST SUMMARY ---------------- */
 
        // const gstSummary = details.reduce((acc: any, item, index) => {
 
        //     const percent = item.tax_percent;
 
        //     if (!acc[percent]) {
        //         acc[percent] = {
        //             taxAmount: 0,
        //             serials: []
        //         };
        //     }
 
        //     acc[percent].taxAmount += item.tax_amount;
        //     acc[percent].serials.push(index + 1);
 
        //     return acc;
 
        // }, {});
 
        const gstSummary = details.reduce((acc: any, item, index) => {
 
            if (!item.tax_percent || item.tax_percent === 0 || item.tax_amount === 0) {
                return acc;
            }
 
            const percent = item.tax_percent;
 
            if (!acc[percent]) {
                acc[percent] = {
                    taxAmount: 0,
                    serials: [],
                    items: []
                };
            }
 
            acc[percent].taxAmount += item.tax_amount;
            acc[percent].serials.push(index + 1);
            acc[percent].items.push(item);
 
            return acc;
 
        }, {});
 
        const hasGST = Object.keys(gstSummary).length > 0;
 
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
                            SALES INVOICE
                        </h2>
 
                        <p className="text-gray-600 mt-2">
                            Bill No : <b>{header.sales_no}</b>
                        </p>
 
                        <p className="text-gray-600">
                            Bill Date : {formatDate(header.sales_date)}
                        </p>
 
                    </div>
 
                </div>
 
                {/* CUSTOMER */}
 
                <div className="bg-gray-50 border rounded-lg p-5 mb-8">
 
                    <p className="text-sm text-gray-500 mb-1">
                        BILL TO (Customer)
                    </p>
 
                    <p className="font-semibold text-gray-800">
                        {header.customer_name}
                    </p>
 
                    <p className="text-gray-600">
                        {header.customer_phone}
                    </p>
 
                    <p className="text-gray-600">
                        {header.customer_email}
                    </p>
                    <p className="text-gray-600">
                        {header.customer_address}
                    </p>
 
                </div>
 
                {/* TABLE */}
                <table className="w-full text-[12px] border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border w-[40px]">S.No</th>
                            <th className="p-2 text-left border w-[200px]">Service</th>
                            <th className="p-4 text-left">Description</th>
                            <th className="p-2 border w-[60px]">UOM</th>
                            <th className="p-4 text-left">HSN No</th>
                            <th className="p-2 text-right border w-[90px]">Unit Price</th>
                            <th className="p-2 border w-[50px]">Qty</th>
                            <th className="p-2 text-right border w-[90px]">Amount</th>
                            <th className="p-2 text-right border w-[80px]">Discount</th>
                            <th className="p-2 border w-[60px]">Tax %</th>
                            <th className="p-2 text-right border w-[90px]">Tax Amt</th>
                            <th className="p-2 text-right border w-[100px]">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-2 text-center border">{i + 1}</td>
                                <td className="p-2 border align-top">
                                    <div className="font-bold text-gray-900 leading-tight">
                                        {row.product_name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">
                                        {row.product_code}
                                    </div>
                                </td>
                                <td className="p-4">
                                    {row.description}
                                </td>
                                <td className="p-2 text-center border align-top">{row.uom}</td>
                                <td className="p-4">
                                    {row.hsn_no || ""}
                                </td>
                                <td className="p-2 text-right border align-top">{row.rate}</td>
                                <td className="p-2 text-center border align-top">{Number(row.qty)}</td>
                                {/* <td className="p-2 text-right border align-top">{currency(row.qty * row.rate)}</td> */}
                                <td className="p-2 text-right border align-top">{!isOverseas ? (
                                    <>{currency(Number(row.qty) * Number(row.rate))}</>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span>
                                            {currency(Number(row.qty) * Number(row.rate))}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {currency(convert(Number(row.qty) * Number(row.rate)))} {header.currency_code}
                                        </span>
                                    </div>
                                )}</td>
                                <td className="p-2 text-right border align-top">{row.discount}</td>
                                <td className="p-2 text-center border align-top"> {row.tax_name}</td>
                                {/* <td className="p-2 text-right border align-top">{currency(row.tax_amount)}</td>
                                 */}
                                <td className="p-2 text-right border align-top">
                                    {!isOverseas || Number(row.tax_amount) === 0 ? (
                                        <>
                                            {currency(row.tax_amount)}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span>
                                                {currency(row.tax_amount)}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {currency(convert(row.tax_amount))} {header.currency_code}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                {/* <td className="p-2 text-right border align-top font-bold">{currency(row.line_total)}</td> */}
                                <td className="p-2 text-right border align-top font-bold">
                                    {!isOverseas ? (
                                        <>{currency(row.line_total)}</>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span>
                                                {currency(row.line_total)}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {currency(convert(row.line_total))} {header.currency_code}
                                            </span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
 
                {/* TOTAL */}
 
                {/* <div className="flex justify-between mt-8"> */}
                <div className={`flex mt-8 ${hasGST ? "justify-between" : "justify-end"}`}>
 
                    {/* GST SUMMARY LEFT */}
                    {hasGST && (
                        <div className="w-64">
 
                            <p className="font-semibold mb-3">
                                GST Summary
                            </p>
 
                            {Object.entries(gstSummary).map(([percent, data]: any) => {
 
                                const gstPercent = Number(percent);
                                if (!gstPercent) return null;
 
                                const components = data.items?.[0]?.tax_components || [];
 
                                return (
 
                                    <div key={percent} className="mb-4 text-sm">
 
                                        {/* HEADER */}
                                        <div className="font-medium text-gray-700 mb-1">
                                            {gstPercent}% GST (S.No: {data.serials.join(", ")})
                                        </div>
 
                                        {/* COMPONENT LABEL ROW */}
                                        <div className="grid grid-cols-2 text-gray-600">
                                            {components.map((comp: any, idx: number) => (
                                                <span key={idx}>
                                                    {comp.component_name} {comp.component_percentage}%
                                                </span>
                                            ))}
                                        </div>
 
                                        {/* COMPONENT VALUE ROW */}
                                        <div className="grid grid-cols-2 font-medium">
 
                                            {components.map((comp: any, idx: number) => {
 
                                                const compAmount =
                                                    (data.taxAmount * comp.component_percentage) / gstPercent;
 
                                                return !isOverseas ? (
 
                                                    <span key={idx}>
                                                        {currency(compAmount)}
                                                    </span>
 
                                                ) : (
 
                                                    <div key={idx} className="flex flex-col">
                                                        <span>{currency(compAmount)}</span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {currency(convert(compAmount))} {header.currency_code}
                                                        </span>
                                                    </div>
 
                                                );
 
                                            })}
 
                                        </div>
 
                                    </div>
 
                                );
 
                            })}
 
                        </div>
                    )}
 
                    <div className="w-80">
 
                        <div className="flex justify-between py-2 text-gray-700">
                            <span>Subtotal</span>
                            {/* <span>{currency(header.subtotal)}</span> */}
                            {!isOverseas ? (
                                <>₹ {currency(header.subtotal)}</>
                            ) : (
                                <div className="flex flex-col text-right">
                                    <span>{currency(header.subtotal)} </span>
                                    <span className="text-sm text-gray-500">
                                        {currency(convert(header.subtotal))} {header.currency_code}
                                    </span>
                                </div>
                            )}
                        </div>
 
                        {hasGST && (
                            <div className="flex justify-between py-2 text-gray-700">
                                <span>Tax</span>
                                {/* <span>{currency(header.tax_amount)}</span> */}
                                {!isOverseas ? (
                                    <>{currency(header.tax_amount)}</>
                                ) : (
                                    <div className="flex flex-col text-right">
                                        <span>{currency(header.tax_amount)}</span>
                                        <span className="text-sm text-gray-500">
                                            {currency(convert(header.tax_amount))} {header.currency_code}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
 
                        <div className="flex justify-between py-3 border-t text-lg font-bold">
                            <span>Total</span>
                            {/* <span>{currency(header.total_amount)}</span> */}
                            {!isOverseas ? (
                                <>{currency(totalAmount)}</>
                            ) : (
                                <div className="flex flex-col text-right">
                                    <span>
                                        {currency(totalAmount)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {currency(convert(totalAmount))} {header.currency_code}
                                    </span>
                                </div>
                            )}
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
 
PrintBillingInvoice.displayName = "PrintBillingInvoice";
 
export default PrintBillingInvoice;