// src/app/[company]/(user)/inventory/products/add-products/page.tsx
"use client";

import React from "react";
import { ProductForm } from "./ProductForm"; 

export default function AddProductsPage() {
  return (
    <main className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">Add New Product</h1>
      <ProductForm saveMode="api" />
    </main>
  );
}