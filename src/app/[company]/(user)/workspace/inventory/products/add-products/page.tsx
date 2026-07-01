// src/app/[company]/(user)/inventory/products/add-products/page.tsx
"use client";

import React, { Suspense } from "react";
import { ProductForm } from "./ProductForm"; 

export default function AddProductsPage() {
  return (
    <main className="container mx-auto py-8 px-4">

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading form layout...</p>
        </div>
      }>
        <ProductForm saveMode="api" />
      </Suspense>
    </main>
  );
}