export type PurchaseDetail = {
  id?: number;
  product_id: string; // variant_id
  product_code?: string;
  product_name?: string;
  description: string;
  uom: string | "";
  uom_code?: string;
  uom_name?: string;
  hsn_no: string;
  rate: number | "";
  qty: number | "";
  amount: number;
  tax_id?: number | null;
  tax_name?: string;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  type?: "finished_good" | "raw_material" | "other"| null;
};

export type PurchaseHeader = {
  id?: number;
  po_type: "standard" | "manual";
  purchase_no: string;
  bill_to: string;
  ship_to: string;
  despatch_terms: string;
  payment_terms: string;
  freight_charges: number | "";
  freight_tax: number | "";
  freight_tax_amount: number | "";
  packaging_amount: number | "";
  notes: string;
  attachment_url: string;
  supplier_id: string;
  req_date: string;
  purchase_date: string;
  status: string;
  approval_status?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  conversion_rate?: number | "";
  user_name?: string;
};

export type ProductListRow = {
  id: number;
  product_code: string;
  name: string;
  type: "finished_good" | "raw_material" | "other";
  category: string | null;
  source: "own" | "vendor";
  status: number;
};

export type ProductLookupRow = {
  product_id?: number;
  id?: number;
  variant_id?: number | null;
  product_code: string;
  product_name: string;
  description: string;
  category: string | null;
  material: string | null;
  uom: string | null;
  hsn_code: string | null;
  uom_code?: string | null;
  uom_name?: string | null;
  sku?: string | null;
  barcode?: string | null;
  color: string | null;
  type?: "finished_good" | "raw_material" | "other" | null;
  source?: "own" | "vendor" | null;
  status?: number | null;
};

export type ProductCatalogItem = {
  id: number; // variant id
  product_id: number;
  product_code: string;
  name: string;
  type: "finished_good" | "raw_material" | "other";
  category: string | null;
  source: "own" | "vendor";
  status: number;
  description: string;
  uom: string;
  uom_code: string;
  uom_name: string;
  hsn_code: string;
  sku: string;
  color: string;
  barcode: string;
};

export type Supplier = {
  id: number;
  supplier_code: string;
  name: string;
  currency: string;
  dispatch_terms?: string | null;
  payment_terms?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type DespatchTerm = {
  id: number;
  code: string;
  despatch_name: string;
};

export type PaymentTerm = {
  id: number;
  name: string;
};

export type Currency = {
  id: number;
  currency_code: string;
  currency_name: string;
};

export type ProductFiltersState = {
  search: string;
  type: string;
  category: string;
  source: string;
};
