"use client";
 
import React, { forwardRef } from "react";
import { useTenant } from "@/context/TenantContext";
 
type GrnHeader = {
    id?: number;
    grn_no: string;
    grn_date: string;
    purchase_no: string;
    purchase_id: string;
    supplier_id: string;
    supplier_code: string;
    supplier_name: string;
    supplier_email:string;
    supplier_phone:string;
    supplier_address:string;
    status: string;
    po_status: string;
    user_name?: string;
};
 
type GrnDetail = {
    id?: number;
    product_id: string;
    product_code?: string;
    product_name?: string;
    description:string;
    uom: string;
    uom_code:string;
    uom_name:string;
    hsn_no: string;
    order_qty: number | string;
    received_qty?: number | string;
    qty: number | string;
};
 
type Props = {
    header: GrnHeader;
    details: GrnDetail[];
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
 
 
const PrintGRN = forwardRef<HTMLDivElement, Props>(
    ({ header, details }, ref) => {
        const { company } = useTenant();
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
                            GRN
                        </h2>
                        <p className="text-gray-600 mt-2">
                            GRN No : <b>{header.grn_no}</b>
                        </p>
                        <p className="text-gray-600">
                            GRN Date : {formatDate(header.grn_date)}
                        </p>
                        <p className="text-gray-600">
                            PO NO : {header.purchase_no}
                        </p>
                        <p className="text-gray-600">
                            Status : {header.po_status}
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
                            <th className="p-3 text-left border">
                                Description
                            </th>
                            <th className="p-3 border">
                                UOM
                            </th>
                             <th className="p-3 border">
                                HSN No
                            </th>
                            <th className="p-3 border">
                                Ordered Qty
                            </th>
                            <th className="p-3 border">
                                Received Qty
                            </th>
                            <th className="p-3 border">
                                Qty
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
                                <td className="p-3 border">
                                    {row.description}
                                </td>
                                <td className="p-3 border">
                                    {row.uom_code}
                                </td>
                                <td className="p-3 border">
                                    {row.hsn_no}
                                </td>
                                <td className="p-3 text-center border">
                                    {Number(row.order_qty)}
                                </td>
                                <td className="p-3 text-center border">
                                    {Number(row.received_qty)}
                                </td>
                                <td className="p-3 text-center border">
                                    {Number(row.qty)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
 
PrintGRN.displayName = "PrintGRN";
 
export default PrintGRN;