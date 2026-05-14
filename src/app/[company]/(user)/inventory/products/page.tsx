//C:\Users\yanna\template_tailwind\src\app\[company]\masters\products\page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon,  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
ArchiveBoxArrowDownIcon  } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { usePagination } from "@/hooks/usePagination";
import ProductFilters from "./components/ProductFilters";
import { CategoryNode, flattenCategories } from "./components/category-utils";
type ProductRow = {
  id: number;
  product_code: string;
  name: string;
  type: "finished_good" | "raw_material" | "other";
  category: string | null;
  material: string | null;
  source: "own" | "vendor";
  variants_count: number;
  status: number;
};

type FlatCategory = {
  id: number;
  path: string;
};

type MaterialOption = {
  id: number;
  material_code: string;
  material_name: string;
};

export default function ProductsPage() {
  const { company } = useTenant();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  const [search, setSearch] = useState("");
  const [type, setItemType] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const productTypeLabel: Record<string, string> = {
  finished_good: "Finished Good",
  raw_material: "Raw Material",
  other: "Other",
  };
  const sourceLabel: Record<string, string> = {
    own: "Own",
    vendor: "Vendor",
  };
  const flatCategories = useMemo(() => flattenCategories(categoriesTree), [categoriesTree]);
  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    flatCategories.forEach((row) => map.set(String(row.id), row.path));
    return map;
  }, [flatCategories]);
  const materialLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((item) =>
      map.set(String(item.id), `${item.material_code} - ${item.material_name}`)
    );
    return map;
  }, [materials]);
  const categoryOptions = useMemo(
    () => flatCategories.map((row) => ({ value: String(row.id), label: row.path })),
    [flatCategories]
  );
  const fallbackCategories = useMemo(() => {
    const items = new Set<string>();
    products.forEach((item) => {
      if (item.category && !categoryLabelMap.has(item.category)) items.add(item.category);
    });
    return Array.from(items);
  }, [products, categoryLabelMap]);
  const categoryFilterOptions = useMemo(() => {
    const opts = [...categoryOptions];
    fallbackCategories.forEach((value) => opts.push({ value, label: value }));
    return opts;
  }, [categoryOptions, fallbackCategories]);

  useEffect(() => {
    async function loadCategories() {
      if (!company) return;
      try {
        const res = await apiFetch("/api/categories?format=tree", company);
        const data = await res.json();
        setCategoriesTree(data.success ? data.data || [] : []);
      } catch {
        setCategoriesTree([]);
      }
    }
    loadCategories();
  }, [company]);

  useEffect(() => {
    async function loadMaterials() {
      if (!company) return;
      try {
        const res = await apiFetch("/api/materials", company);
        const data = await res.json();
        setMaterials(data.success ? data.data || [] : []);
      } catch {
        setMaterials([]);
      }
    }
    loadMaterials();
  }, [company]);

  async function fetchProducts() {
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        search,
        category,
        source,
        status,
        type,
      });
      const res = await apiFetch(`/api/products?${query.toString()}`, company);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch products");
      setProducts(data.products || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }

  async function downloadTemplate() {
    if (!company) return;
    try {
      const res = await fetch("/api/products/template", {
        headers: { "x-tenant": company },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download template");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-import-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage(error.message || "Failed to download template");
    }
  }

  useEffect(() => {
    if (!company) return;
    fetchProducts();
  }, [company, search, category, source, status,type]);

  async function archiveProduct(productId: number) {
    const ok = window.confirm("Archive this product?");
    if (!ok) return;

    setMessage("");
    try {
      const res = await apiFetch(`/api/products/${productId}`, company, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to archive");
      setMessage("Product archived successfully");
      fetchProducts();
    } catch (error: any) {
      setMessage(error.message || "Failed to archive product");
    }
  }

  async function parseAndImport() {
    if (!importFile) return;
    setImportLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("confirm", "true");
      form.append("file", importFile);
      const res = await apiFetch("/api/products/import", company, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      console.log("Tried but failed in import")
      const warningCount = Array.isArray(data.warnings) ? data.warnings.length : 0;
      const warningText = warningCount ? ` (${warningCount} image warning${warningCount > 1 ? "s" : ""})` : "";
      setMessage(
        `Imported ${data.productCount} products and ${data.variantCount} variants.${warningText}`
      );
      setImportFile(null);
      setImportOpen(false);
      fetchProducts();
    } catch (error: any) {
      setMessage(error.message || "Import failed");
      console.log("Not attempted in try")
    } finally {
      setImportLoading(false);
    }
  }

  const filteredData = useMemo(() => products, [products]);
  const sortedData = useMemo(() => filteredData, [filteredData]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedData,
    initialItemsPerPage: 10,
    resetDeps: [search, type, category, source, status],
  });

  return (
    <div className="space-y-5">
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading products...</p>
            </div>
          </div>,
          document.body
        )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage products and variants for this tenant.</p>
        </div>
        <div className="flex items-center gap-2">
          
          <Link
            href={`/${company}/inventory/products/add-products`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Product 
          </Link>
          {/* <button
            onClick={() => setImportOpen(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Bulk Import Excel
          </button> */}
        </div>
      </div>

      <ProductFilters
        values={{ search, type, category, source, status }}
        onChange={(next) => {
          setSearch(next.search);
          setItemType(next.type);
          setCategory(next.category);
          setSource(next.source);
          setStatus(next.status || "");
        }}
        categoryOptions={categoryFilterOptions}
        showStatus
      />

      {message ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Variants Count</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && totalItems === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={9}>
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{item.product_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">
  {productTypeLabel[item.type] ?? item.type}
</td>
                    <td className="px-4 py-3">
                      {item.category ? categoryLabelMap.get(item.category) || item.category : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.material
                        ? materialLabelMap.get(item.material) || item.material
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{sourceLabel[item.source] ?? item.source}</td>
                    <td className="px-4 py-3">{item.variants_count || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.status === 1
                            ? "bg-green-200 text-black"
                            : "bg-gray-300 text-black"
                        }`}
                      >
                        {item.status === 1 ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${company}/inventory/products/add-products?id=${item.id}&mode=view`}
className="text-indigo-600" title="View Details"    >
 <EyeIcon className="w-5 h-5" />                        </Link>
                        <Link
                          href={
                            `/${company}/inventory/products/add-products?id=${item.id}&mode=edit`}
                          className="text-indigo-600" title="Edit Product"
                        >
                          <PencilSquareIcon className="w-5 h-5"/>
                        </Link>
                        <button
                          onClick={() => archiveProduct(item.id)}
                          className="text-indigo-600" title="Archive Product"
                        >
                          <ArchiveBoxArrowDownIcon className="h-5 w-5" />

                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{showingFrom}</span> to{" "}
              <span className="font-medium">{showingTo}</span> of{" "}
              <span className="font-medium">{totalItems}</span> results
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="products-rows-per-page" className="text-sm text-gray-600">
                Rows per page
              </label>
              <select
                id="products-rows-per-page"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
              <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>

                {pageNumbers.map((page, idx) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      type="button"
                      onClick={() => goToPage(page)}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
                        currentPage === page
                          ? "z-10 bg-indigo-600 text-white"
                          : "text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {importOpen ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <button
              onClick={() => {
                setImportOpen(false);
                setImportFile(null);
              }}
              className="absolute right-3 top-3 text-lg text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              x
            </button>
            <div className="space-y-4">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex text-xs text-gray-600 underline hover:text-gray-800"
              >
                Download Template
              </button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <div className="text-xs text-gray-600">
                Selected file: {importFile?.name || "No file selected"}
              </div>
              <button
                onClick={parseAndImport}
                disabled={!importFile || importLoading}
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
