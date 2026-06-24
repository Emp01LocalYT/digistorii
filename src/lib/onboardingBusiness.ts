import currencyCodes from "currency-codes";

export const GSTIN_MAX_LENGTH = 15;
export const PAN_MAX_LENGTH = 10;

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

// Derived from src/assests/gst-state-codes.xlsx.
const GST_STATE_CODE_BY_STATE: Record<string, string> = {
  "andaman and nicobar islands": "35",
  "andaman & nicobar islands": "35",
  "andhra pradesh": "37",
  "arunachal pradesh": "12",
  assam: "18",
  bihar: "10",
  chandigarh: "04",
  chhattisgarh: "22",
  "dadra and nagar haveli and daman and diu": "26",
  "dadra & nagar haveli and daman & diu": "26",
  delhi: "07",
  goa: "30",
  gujarat: "24",
  haryana: "06",
  "himachal pradesh": "02",
  "jammu and kashmir": "01",
  "jammu & kashmir": "01",
  jharkhand: "20",
  karnataka: "29",
  kerala: "32",
  ladakh: "38",
  lakshadweep: "31",
  "madhya pradesh": "23",
  maharashtra: "27",
  manipur: "14",
  meghalaya: "17",
  mizoram: "15",
  nagaland: "13",
  odisha: "21",
  puducherry: "34",
  punjab: "03",
  rajasthan: "08",
  sikkim: "11",
  "tamil nadu": "33",
  telangana: "36",
  tripura: "16",
  "uttar pradesh": "09",
  uttarakhand: "05",
  "west bengal": "19",
};

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  uae: "United Arab Emirates",
  usa: "United States",
};

function normalizeKey(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getGstStateCodeForState(state?: string | null) {
  const key = normalizeKey(state);
  return key ? GST_STATE_CODE_BY_STATE[key] || null : null;
}

export function normalizePan(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, PAN_MAX_LENGTH);
}

export function isValidPan(value?: string | null) {
  return PAN_REGEX.test(normalizePan(value));
}

export function extractPanFromGstin(value?: string | null) {
  const normalized = normalizeGstin(value);
  return normalized.length === GSTIN_MAX_LENGTH ? normalized.slice(2, 12) : "";
}

export function normalizeGstin(value?: string | null, stateCode?: string | null) {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (stateCode) {
    const suffix =
      cleaned.startsWith(stateCode) || /^\d{2}/.test(cleaned) ? cleaned.slice(2) : cleaned.slice(0);
    return `${stateCode}${suffix.slice(0, GSTIN_MAX_LENGTH - 2)}`;
  }

  return cleaned.slice(0, GSTIN_MAX_LENGTH);
}

export function isValidGstin(value?: string | null) {
  return GSTIN_REGEX.test(normalizeGstin(value));
}

export function getDefaultCurrencyCodeForCountry(country?: string | null) {
  const normalizedCountry = String(country || "").trim();
  if (!normalizedCountry) return null;

  const alias = COUNTRY_NAME_ALIASES[normalizeKey(normalizedCountry)];
  const matches = currencyCodes.country(alias || normalizedCountry);
  const preferred = matches.find((entry) => entry?.code);

  return preferred?.code || null;
}
