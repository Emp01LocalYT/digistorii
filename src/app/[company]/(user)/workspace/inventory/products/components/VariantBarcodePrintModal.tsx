"use client";

import { useMemo } from "react";
import Barcode from "react-barcode";

type VariantPrintItem = {
  id: number;
  barcode?: string;
  color?: string;
  size?: string;
};

type VariantBarcodePrintModalProps = {
  open: boolean;
  onClose: () => void;
  variants: VariantPrintItem[];
  productName?: string;
  title: string;
};

export default function VariantBarcodePrintModal({
  open,
  onClose,
  variants,
  productName,
  title,
}: VariantBarcodePrintModalProps) {
  const printableVariants = useMemo(
    () => variants.filter((variant) => Boolean(variant?.barcode)),
    [variants]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .barcode-print-area,
          .barcode-print-area * {
            visibility: visible;
          }
          .barcode-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
          }
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
        }
      `}</style>
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {printableVariants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No barcodes available to print.
            </div>
          ) : (
            <div
              className={`barcode-print-area barcode-grid grid gap-4 ${printableVariants.length > 1 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"
                }`}
            >
              {printableVariants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700"
                >
                  <div className="mb-2 text-sm font-semibold text-gray-900">{productName}</div>
                  <div className="mb-2 text-xs text-gray-500">
                    {variant.color || "-"} • {variant.size || "-"}
                  </div>
                  <div className="flex justify-center">
                    <Barcode
                      value={String(variant.barcode)}
                      format="CODE128"
                      width={2}
                      height={60}
                      displayValue={true}
                      fontSize={12}
                    />
                  </div>
                  {/* <div className="mt-2 text-center font-mono text-xs text-gray-600">
                    {variant.barcode}
                  </div> */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
