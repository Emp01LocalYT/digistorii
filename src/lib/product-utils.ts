import { PoolClient } from "pg";
const SCHEMA_NAME_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

export function assertSafeSchemaName(schema: string): string {
  const normalized = schema.trim().toLowerCase();
  if (!SCHEMA_NAME_REGEX.test(normalized)) {
    throw new Error("Invalid tenant schema");
  }
  return normalized;
}

export async function getTenantSchemaForCompany(
  client: PoolClient,
  company: string
): Promise<string> {
  if (!company?.trim()) {
    throw new Error("Company is required");
  }

  const result = await client.query(
    "SELECT schema_name FROM public.companies WHERE subdomain_url = $1",
    [company]
  );

  const schema = result.rows[0]?.schema_name as string | undefined;
  if (!schema) {
    throw new Error("Company not found");
  }

  return assertSafeSchemaName(schema);
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
