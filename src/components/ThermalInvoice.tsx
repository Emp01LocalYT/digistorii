"use client";
 
import React, { forwardRef } from "react";
import { useTenant } from "@/context/TenantContext";
 
type TaxComponent = {
    component_name: string;
    component_percentage: number;
};
 
type Detail = {
    product_name?: string;
    qty: number;
    rate: number;
    discount: number;
    tax_percent: number;
    tax_amount: number;
    line_total: number;
    tax_components?: TaxComponent[];
};
 
type Header = {
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
 
type Props = {
    header: Header;
    details: Detail[];
};
 
const currency = (n: number) => Number(n || 0).toFixed(2);
 
const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
 
    return `${day}-${month}-${year}`;
};
 
// perfect 32-char line for 80mm
const line = "--------------------------------";
 
const ThermalInvoice = forwardRef<HTMLDivElement, Props>(
    ({ header, details }, ref) => {
        const { company } = useTenant();
 
        const hasTax = Number(header.tax_amount) > 0;
 
        // Step 1: Calculate tax split per line item
        const getDetailTaxSplits = (details: Detail[]) => {
            const totalSplit: Record<string, number> = {};
 
            details.forEach(detail => {
                if (!detail.tax_components?.length || !detail.tax_amount) return;
 
                const totalPercent = detail.tax_components.reduce(
                    (sum, comp) => sum + comp.component_percentage,
                    0
                );
 
                detail.tax_components.forEach(comp => {
                    const name = comp.component_name;
                    const amount = (comp.component_percentage / totalPercent) * detail.tax_amount;
 
                    if (!totalSplit[name]) totalSplit[name] = 0;
                    totalSplit[name] += amount;
                });
            });
 
            return totalSplit;
        };
 
        const taxSplit = getDetailTaxSplits(details);
 
        return (
            <div
                ref={ref}
                style={{
                    width: "280px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    padding: "10px",
                    color: "#000",
                    lineHeight: "1.4",
                }}
            >
                {/* HEADER */}
                <div style={{ textAlign: "center", marginBottom: "6px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                        {company || "YOUR COMPANY"}
                    </div>
                    <div style={{ fontSize: "11px" }}>Chennai, Tamil Nadu</div>
                    <div style={{ fontSize: "11px" }}>GSTIN: 33XXXXXXXX</div>
                </div>
 
                <hr />
 
                {/* BILL INFO */}
                <div style={{ fontSize: "11px", margin: "4px 0" }}>
                    <div>Bill No : {header.sales_no}</div>
                    <div>Date    : {formatDate(header.sales_date)}</div>
                </div>
 
                <hr />
 
                {/* CUSTOMER */}
                <div style={{ fontSize: "11px", margin: "4px 0" }}>
                    <div style={{ fontWeight: "bold" }}>
                        {header.customer_name || "Walk-in Customer"}
                    </div>
                    <div>{header.customer_phone}</div>
                    {/* <div>{header.customer_email}</div>
                    <div>{header.customer_address}</div> */}
                </div>
 
                <hr />
 
                {/* TABLE HEADER */}
               {/* TABLE HEADER */}
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
    fontSize: "11px",
  }}
>
  <span>Item</span>
  <span>Total</span>
</div>

<hr />

{/* ITEMS */}
{details.map((item, i) => {
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);
  const discount = Number(item.discount || 0);

  // Final amount already includes discount & tax
  const lineTotal = Number(item.line_total || 0);

  return (
    <div key={i} style={{ marginBottom: "6px" }}>
      
      {/* MAIN LINE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
        }}
      >
        <span style={{ maxWidth: "140px", overflow: "hidden" }}>
          {item.product_name}
        </span>

        <span>
          {qty}x{currency(rate)}
        </span>

        <span>{currency(lineTotal)}</span>
      </div>

      {/* OPTIONAL DISCOUNT */}
      {discount > 0 && (
        <div
          style={{
            textAlign: "right",
            fontSize: "10px",
          }}
        >
          Disc: -{currency(discount)}
        </div>
      )}
    </div>
  );
})}

<hr />

{/* TOTAL SECTION */}
<div style={{ marginTop: "4px", fontSize: "11px" }}>
  
  {/* SUBTOTAL */}
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span>Subtotal</span>
    <span>{currency(header.subtotal)}</span>
  </div>

  {/* TAX SPLIT */}
  {hasTax &&
    Object.entries(taxSplit).map(([name, amount]) => (
      <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{name}</span>
        <span>{currency(amount)}</span>
      </div>
    ))}

  <hr />

  {/* FINAL TOTAL */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontWeight: "bold",
      fontSize: "14px",
    }}
  >
    <span>TOTAL</span>
    <span>{currency(header.total_amount)}</span>
  </div>
</div>

<hr />

{/* FOOTER */}
<div
  style={{
    textAlign: "center",
    marginTop: "6px",
    fontSize: "11px",
  }}
>
  <div>Items: {details.length}</div>
  <div>*** Thank You Visit Again ***</div>
</div>
            </div>
        );
    }
);
 
ThermalInvoice.displayName = "ThermalInvoice";
export default ThermalInvoice;
