import  Decimal from "decimal.js";
import { PoolClient } from "pg";

export const PRICING_MAX_BULK_ROWS = 50;

export type PricingCalcInput = {
  baseCost: Decimal.Value;
  operationalCost: Decimal.Value;
  marginType: "percentage" | "amount";
  marginValue: Decimal.Value;
  taxPercent: Decimal.Value;
};

export type PricingCalcOutput = {
  landedPrice: number;
  marginAmount: number;
  unitPrice: number;
  taxAmount: number;
  sellingPrice: number;
  finalSellingPrice: number;
};

export type ParsedPricingRowInput = {
  variantId: string;
  baseCost: number;
  operationalCost: number;
  marginType: "percentage" | "amount";
  marginValue: number;
  taxPercent: number;
  effectiveDate: string;
  expiresAt: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDecimal(value: unknown, label: string): Decimal {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error(`${label} is required`);
  }
  try {
    const decimal = new Decimal(raw);
    if (!decimal.isFinite() || decimal.isNegative()) {
      throw new Error(`${label} must be a non-negative number`);
    }
    return decimal;
  } catch {
    throw new Error(`${label} must be a valid decimal number`);
  }
}

export function toNumberWithPrecision(value: Decimal, precision: number): number {
  return value.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
}

export function toMoneyNumber(value: Decimal): number {
  return toNumberWithPrecision(value, 2);
}

function ensurePositive(value: Decimal, label: string, allowZero: boolean): Decimal {
  if (allowZero) return value;
  if (value.lte(0)) {
    throw new Error(`${label} must be greater than zero`);
  }
  return value;
}

function parseDateUtc(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseNonNegativeNumber(
  value: unknown,
  label: string,
  allowZero = false,
  precision = 2
): number {
  const decimal = toDecimal(value, label);
  return toNumberWithPrecision(ensurePositive(decimal, label, allowZero), precision);
}

export function parsePercentageNumber(value: unknown, label: string): number {
  const decimal = toDecimal(value, label);
  return toMoneyNumber(ensurePositive(decimal, label, false));
}

export function parseDateOnly(value: unknown, label: string): string {
  const raw = String(value ?? "").trim();
  if (!DATE_PATTERN.test(raw)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`);
  }

  const utcDate = parseDateUtc(raw);
  const [yearText, monthText, dayText] = raw.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(`${label} is invalid`);
  }

  return raw;
}

export function calculatePricing(input: PricingCalcInput): PricingCalcOutput {
  const base = toDecimal(input.baseCost, "base_cost");
  const operational = toDecimal(input.operationalCost, "operational_cost");
  const marginValue = toDecimal(input.marginValue, "margin_value");
  const taxPercent = toDecimal(input.taxPercent, "tax_percent");

  const landed = base.plus(operational);
  const marginAmount =
    input.marginType === "percentage" ? landed.mul(marginValue.div(100)) : marginValue;
  const unitPrice = landed.plus(marginAmount);
  const taxAmount = unitPrice.mul(taxPercent.div(100));
  const selling = unitPrice.plus(taxAmount);

  if (landed.lte(0)) {
    throw new Error("Landed price must be greater than zero");
  }
  if (unitPrice.lte(0)) {
    throw new Error("Unit price must be greater than zero");
  }
  if (selling.lte(0)) {
    throw new Error("Selling price must be greater than zero");
  }

  const landedPrice = toMoneyNumber(landed);
  const marginAmountRounded = toMoneyNumber(marginAmount);
  const unitPriceRounded = toMoneyNumber(unitPrice);
  const taxAmountRounded = toMoneyNumber(taxAmount);
  const sellingPrice = toMoneyNumber(selling);

  return {
    landedPrice,
    marginAmount: marginAmountRounded,
    unitPrice: unitPriceRounded,
    taxAmount: taxAmountRounded,
    sellingPrice,
    finalSellingPrice: sellingPrice,
  };
}

export function parsePricingRowInput(
  row: {
    variant_id?: unknown;
    variantId?: unknown;
    base_cost?: unknown;
    operational_cost?: unknown;
    margin_type?: unknown;
    margin_value?: unknown;
    tax_percent?: unknown;
    effective_date?: unknown;
    active_from?: unknown;
    expires_at?: unknown;
  },
  labelPrefix: string
): ParsedPricingRowInput {
  const variantId = String(row.variant_id ?? row.variantId ?? "").trim();
  if (!variantId) {
    throw new Error(`${labelPrefix}: Variant ID is required`);
  }

  const effectiveInput =
    row.effective_date != null && row.effective_date !== ""
      ? row.effective_date
      : row.active_from;

  const effectiveDate = parseDateOnly(effectiveInput, `${labelPrefix}: Effective Date`);
  const todayText = new Date().toISOString().slice(0, 10);
  if (parseDateUtc(effectiveDate) < parseDateUtc(todayText)) {
    throw new Error(`${labelPrefix}: Effective Date cannot be in the past`);
  }

  let expiresAt: string | null = null;
  if (row.expires_at != null && String(row.expires_at).trim() !== "") {
    expiresAt = parseDateOnly(row.expires_at, `${labelPrefix}: Expires At`);
    if (parseDateUtc(expiresAt) < parseDateUtc(effectiveDate)) {
      throw new Error(`${labelPrefix}: Expires At cannot be before Effective Date`);
    }
  }

  const marginTypeRaw = String(row.margin_type ?? "percentage").trim().toLowerCase();
  const marginType =
    marginTypeRaw === "amount" || marginTypeRaw === "percentage" ? marginTypeRaw : "percentage";
  const marginValueInput =
    row.margin_value == null || String(row.margin_value).trim() === ""
      ? "0"
      : row.margin_value;
  const taxPercentInput =
    row.tax_percent == null || String(row.tax_percent).trim() === ""
      ? "0"
      : row.tax_percent;

  return {
    variantId,
    baseCost: parseNonNegativeNumber(row.base_cost, `${labelPrefix}: Base Cost`, true),
    operationalCost: parseNonNegativeNumber(
      row.operational_cost,
      `${labelPrefix}: Operational Cost`,
      true
    ),
    marginType,
    marginValue: parseNonNegativeNumber(marginValueInput, `${labelPrefix}: Margin Value`, true, 4),
    taxPercent: parseNonNegativeNumber(taxPercentInput, `${labelPrefix}: Tax %`, true),
    effectiveDate,
    expiresAt,
  };
}

export async function getLatestPurchasePrice(
  client: PoolClient,
  schema: string,
  sku: string
): Promise<number | null> {
  try {
    const tableCheck = await client.query(
      `SELECT to_regclass($1) AS table_ref`,
      [`"${schema}".purchase_batches`]
    );
    if (!tableCheck.rows[0]?.table_ref) {
      return null;
    }

    const result = await client.query(
      `
        SELECT last_purchase_price
        FROM "${schema}".purchase_batches
        WHERE sku = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [sku]
    );
    const value = result.rows[0]?.last_purchase_price;
    if (value == null) return null;
    return toMoneyNumber(new Decimal(String(value)));
  } catch {
    return null;
  }
}
