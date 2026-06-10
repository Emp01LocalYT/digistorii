const GS1_GTIN_13 = /^\d{13}$/;
const EAN_8 = /^\d{8}$/;
const UPC_A = /^\d{12}$/;
const INTERNAL_BARCODE = /^INT\d{10,}$/i;

export type BarcodeKind = "gs1" | "ean8" | "ean13" | "upca" | "internal";

export function normalizeBarcode(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

export function detectBarcodeKind(value: string): BarcodeKind | null {
  const barcode = normalizeBarcode(value);
  if (!barcode) return null;
  if (INTERNAL_BARCODE.test(barcode)) return "internal";
  if (EAN_8.test(barcode)) return "ean8";
  if (UPC_A.test(barcode)) return "upca";
  if (GS1_GTIN_13.test(barcode)) return "gs1";
  if (/^\d{13}$/.test(barcode)) return "ean13";
  return null;
}

export function isSupportedBarcode(value: unknown): boolean {
  return detectBarcodeKind(normalizeBarcode(value)) !== null;
}

export function buildInternalBarcode(variantId: number): string {
  return `INT${String(variantId).padStart(10, "0")}`;
}

export function validateBarcodeOrThrow(value: unknown, label = "Barcode") {
  const barcode = normalizeBarcode(value);
  if (!barcode) return;
  if (!isSupportedBarcode(barcode)) {
    throw new Error(
      `${label} must be GS1/EAN-13 (13 digits), EAN-8 (8 digits), UPC-A (12 digits), or an internal barcode.`
    );
  }
}
