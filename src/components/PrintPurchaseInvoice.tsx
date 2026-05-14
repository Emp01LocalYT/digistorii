"use client";
 
import React, { forwardRef } from "react";
import { useTenant } from "@/context/TenantContext";

type TaxComponent = {
    component_name: string;
    component_percentage: number;
};

type PurchaseDetail = {
    product_name?: string;
    product_code?: string;
    description: string;
    uom: string,
    uom_code:string;
    uom_name:string;
    rate: number;
    qty: number;
    tax_id: number | null;
    tax_name: string;
    tax_percent: number;
    tax_amount: number;
    line_total: number;

hsn_code?: string;
hsn_no?: string;
discount_amount?: number;
taxable_value?: number;
cgst_percent?: number;
cgst_amount?: number;
sgst_percent?: number;
sgst_amount?: number;
igst_percent?: number;
igst_amount?: number;
tax_components?: TaxComponent[];
};
 
type PurchaseHeader = {
    purchase_no: string;
    purchase_date: string;
    req_date: string;
    supplier_gstin?: string;
    supplier_code: string;
    supplier_name?: string;
    supplier_email?: string;
    supplier_phone?: string;
    supplier_address?: string;
    currency_code: string;
    conversion_rate?: number | "";
    subtotal: number;
    tax_amount: number;
    total_amount: number;
company_name?: string;
company_gstin?: string;
company_address?: string;
billing_address?: string;
shipping_address?: string;
place_of_supply?: string;
payment_terms?: string;despatch_terms?: string;
due_date?: string;
notes?: string;
terms_conditions?: string;
tax_breakdown?: {
    components: Array<{
        component_name: string;
        component_percentage: number;
        amount: number;
    }>;
    components_total: number;
    freight_tax_total: number;
    total_tax_including_freight: number;
};
};
 
type Props = {
    header: PurchaseHeader;
    details: PurchaseDetail[];
};
 
// const currency = (n: number) =>
//     Number(n || 0).toLocaleString("en-IN", {
//         minimumFractionDigits: 2,
//     });
 
// const formatDate = (date: string) => {
//     if (!date) return "";
//     const d = new Date(date);
//     const day = String(d.getDate()).padStart(2, "0");
//     const month = String(d.getMonth() + 1).padStart(2, "0");
//     const year = d.getFullYear();
 
//     return `${day}-${month}-${year}`;
// };

const currency = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  });

const formatDate = (date: string) => {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

  const gstStateMap : Record<string, string> = { "01": "Jammu & Kashmir","02": "Himachal Pradesh","03": "Punjab","04": "Chandigarh","05": "Uttarakhand",
    "06": "Haryana","07": "Delhi","08": "Rajasthan","09": "Uttar Pradesh","10": "Bihar","11": "Sikkim","12": "Arunachal Pradesh",
    "13": "Nagaland","14": "Manipur","15": "Mizoram","16": "Tripura","17": "Meghalaya","18": "Assam","19": "West Bengal",
    "20": "Jharkhand","21": "Odisha","22": "Chhattisgarh","23": "Madhya Pradesh","24": "Gujarat","25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli","27": "Maharashtra","28": "Andhra Pradesh (Old)","29": "Karnataka","30": "Goa","31": "Lakshadweep",
    "32": "Kerala","33": "Tamil Nadu","34": "Puducherry","35": "Andaman and Nicobar Islands","36": "Telangana","37": "Andhra Pradesh",
    "97": "Other Territory" };
    
const getPlaceOfSupply = (gstin?: string) => {
  if (!gstin || gstin.length < 2) return null;

  const code = gstin.substring(0, 2);
  const state = gstStateMap[code];

  return state
    ? { code, state, label: `${code} - ${state}` }
    : null;
};


const PrintPurchaseInvoice = forwardRef<any, any>(
  ({ header, details }, ref) => {
    const { company } = useTenant();
    const taxBreakdown = header.tax_breakdown;
    const pos = getPlaceOfSupply(header.supplier_gstin);
    return (
      <div
        ref={ref}
        className="bg-white text-black p-10 text-sm"
        style={{ width: "800px", margin: "auto", fontFamily: "Arial" }}
      >
        {/* HEADER */}
        <div className="flex justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">
              {header.company_name || company}
            </h1>
            <p className="text-gray-500 text-xs">{header.company_gstin}</p>
            <p className="text-gray-500 text-xs">
              {header.company_address}
            </p>
          </div>

          <div className="text-right text-xs">
            <h2 className="text-2xl font-bold mb-2">PURCHASE</h2>
            <p>PO No: <b>{header.purchase_no}</b></p>
            <p>PO Date: {formatDate(header.purchase_date)}</p>
            <p>Req Date: {formatDate(header.req_date)}</p>
            <p>Currency: {header.currency_code}</p>
            <p>Payment: {header.payment_terms}</p>
            <p>Despatch: {header.despatch_terms}</p>
          </div>
        </div>

        {/* ADDRESS */}
        <div className="grid grid-cols-2 gap-6 border p-4 rounded mb-6 bg-gray-50 text-xs">
          <div>
            <p className="text-gray-400 mb-1">BILL FROM</p>
            <p className="font-semibold">
              {header.supplier_code}-{header.supplier_name}
            </p>
            <p>{header.supplier_address}</p>
          </div>

          <div>
            <p className="text-gray-400 mb-1">BILL TO</p>
            <p className="font-semibold">
              {header.company_name || company}
            </p>
            <p>{header.company_address}</p>
          </div>
        </div>

        <div className="mb-4 text-sm">
  <span className="text-gray-600">Place of Supply: </span>
  <span className="font-medium">{pos?.label || "-"}</span>
</div>

        {/* TABLE */}
        <table className="w-full table-fixed border text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-[5%] border p-2">#</th>
              <th className="w-[20%] border p-2 text-left">Product</th>
              <th className="w-[20%] border p-2 text-left">Description</th>
              <th className="w-[7%] border p-2">UOM</th>
              <th className="w-[8%] border p-2">HSN</th>
              <th className="w-[10%] border p-2">Price</th>
              <th className="w-[7%] border p-2">Qty</th>
              <th className="w-[10%] border p-2">Amount</th>
              <th className="w-[8%] border p-2">Tax</th>
              <th className="w-[10%] border p-2">Total</th>
            </tr>
          </thead>

          <tbody>
            {details.map((row: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="border p-2 text-center">{i + 1}</td>

                <td className="border p-2">
                  {row.product_code}:{row.product_name}
                </td>

                <td className="border p-2 line-clamp-2">
                  {row.description}
                </td>

                <td className="border p-2 text-center">
                  {row.uom_code}
                </td>

                <td className="border p-2 text-center">
                  {row.hsn_code || "-"}
                </td>

                <td className="border p-2 text-right">
                  {currency(row.rate)}
                </td>

                <td className="border p-2 text-center">
                  {row.qty}
                </td>

                <td className="border p-2 text-right">
                  {currency(row.taxable_value)}
                </td>

                <td className="border p-2 text-center">
                  {row.tax_name}
                </td>

                <td className="border p-2 text-right font-medium">
                  {currency(row.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="flex justify-end mt-6">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1">
              <span>Subtotal</span>
              <span>{currency(header.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Tax</span>
              <span>{currency(header.tax_amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-t font-bold">
              <span>Total</span>
              <span>{currency(header.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* GST BREAKDOWN */}
        {taxBreakdown?.components?.length > 0 && (
          <div className="mt-6 border rounded p-4 text-sm">
            <p className="font-semibold mb-2">GST Breakdown</p>

            <div className="space-y-1">
              {taxBreakdown.components.map((comp: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {comp.component_name} - {comp.component_percentage}%
                  </span>
                  <span>{currency(comp.amount)}</span>
                </div>
              ))}
            </div>

            <div className="border-t mt-2 pt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Components Total</span>
                <span>{currency(taxBreakdown.components_total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Freight Tax</span>
                <span>{currency(taxBreakdown.freight_tax_total)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Tax</span>
                <span>
                  {currency(taxBreakdown.total_tax_including_freight)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 flex justify-between text-xs text-gray-500">
          <p>Thank you for your business.</p>
          <div className="text-right">
            <p className="mb-6">Authorized Signature</p>
            <p>______________________</p>
          </div>
        </div>
      </div>
    );
  }
);

export default PrintPurchaseInvoice;
 
PrintPurchaseInvoice.displayName = "PrintPurchaseInvoice";
 

