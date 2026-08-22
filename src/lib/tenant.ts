//C:\Users\yanna\digistorii\src\lib\tenant.ts
import { pool } from "./db";
import { NextRequest } from "next/server";
export async function getTenantSchema(req: NextRequest) {
 
  const tenant = req.headers.get("x-tenant");
 
  if (!tenant) {
    throw new Error("Tenant header (x-tenant) is required");
  }
 
  const res = await pool.query(
    `SELECT schema_name
     FROM public.companies
     WHERE subdomain_url = $1`,
    [tenant]
  );
 
  if (res.rowCount === 0) {
    throw new Error(`Tenant not found for: ${tenant}`);
  }
 
  return {
    company : tenant,
    schema: res.rows[0].schema_name
  };
}

export async function getTenantSchemaByCompany(company: string) {
  if (!company) {
    throw new Error("Company name is required");
  }

  const res = await pool.query(
    `SELECT schema_name
     FROM public.companies
     WHERE subdomain_url = $1`,
    [company]
  );

  if (res.rowCount === 0) {
    throw new Error(`Tenant not found for: ${company}`);
  }

  return {
    company,
    schema: res.rows[0].schema_name
  };
}
export function normalizeSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildAutoSku(
  productCode: string,
  color: string,
  size: string
): string {
  const safeColor = normalizeSku(color || "NA");
  const safeSize = normalizeSku(size || "NA");
  return `${productCode}-${safeColor}-${safeSize}`;
}
