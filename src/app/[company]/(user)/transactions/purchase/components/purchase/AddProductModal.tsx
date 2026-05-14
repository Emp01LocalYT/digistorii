"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import type { ProductSavedPayload } from "../../../../inventory/products/add-products/page";

const ProductForm = dynamic(
  () =>
    import("../../../../inventory/products/add-products/page").then(
      (mod) => mod.ProductForm
    ),
  { ssr: false }
);

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  saveMode?: "api" | "local";
  onSaved?: (product: ProductSavedPayload, meta?: { action: "save" | "save_add_new" }) => void;
  onLocalSave?: (
    payload: { product: any; variants: any[] },
    meta?: { action: "save" | "save_add_new" }
  ) => void;
};

export default function AddProductModal({
  open,
  onClose,
  saveMode = "api",
  onSaved,
  onLocalSave,
}: AddProductModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[1100px] max-w-[95vw] h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">Add New Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
            x
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <ProductForm
            embedded
            saveMode={saveMode}
            onSaved={onSaved}
            onLocalSave={onLocalSave}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
