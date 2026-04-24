"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { usePagination } from "@/hooks/usePagination";
import { CategoryNode, flattenCategories } from "../products/components/category-utils";

type MaterialOption = {
  id: number;
  material_code: string;
  material_name: string;
};

type UomOption = {
  id: number;
  uom_code: string;
  uom_name: string;
};

type ImageRow = {
  id: number;
  filename: string;
  file_path: string;
  category_id: number | null;
  material_id: number | null;
  uom_id: number | null;
  source: "own" | "vendor" | null;
  category_label: string | null;
  material_label: string | null;
  uom_label: string | null;
  status: "linked" | "unlinked" | "untagged";
  linked_sku: string | null;
};

type Summary = {
  total: number;
  linked: number;
  unlinked: number;
  untagged: number;
  unlinked_tagged?: number;
  unlinked_untagged?: number;
};

type TagPatch = {
  category_id?: number | null;
  material_id?: number | null;
  uom_id?: number | null;
  source?: "own" | "vendor" | null;
};

function LazyThumbnail({
  src,
  alt,
  rootRef,
}: {
  src: string;
  alt: string;
  rootRef: { current: HTMLDivElement | null };
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: rootRef.current, rootMargin: "100px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootRef]);

  return (
    <div ref={ref} className="h-12 w-12 rounded-md border border-gray-200 bg-gray-50">
      {visible ? (
        <img src={src} alt={alt} loading="lazy" className="h-12 w-12 rounded-md object-cover" />
      ) : null}
    </div>
  );
}

export default function ImageMasterV2Page() {
  const { company } = useTenant();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    linked: 0,
    unlinked: 0,
    untagged: 0,
  });

  const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [uoms, setUoms] = useState<UomOption[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [templateReviewOpen, setTemplateReviewOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkMaterial, setBulkMaterial] = useState("");
  const [bulkUom, setBulkUom] = useState("");
  const [bulkSource, setBulkSource] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const flatCategories = useMemo(() => flattenCategories(categoriesTree), [categoriesTree]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = term
        ? row.filename.toLowerCase().includes(term) ||
          row.file_path.toLowerCase().includes(term)
        : true;

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "tagged") return row.status !== "untagged";
      if (statusFilter === "untagged") return row.status === "untagged";
      if (statusFilter === "linked") return row.status === "linked";
      if (statusFilter === "unlinked") return row.status === "unlinked";
      return true;
    });
  }, [rows, search, statusFilter]);

  const sortedRows = useMemo(() => filteredRows, [filteredRows]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paginatedRows,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedRows,
    initialItemsPerPage: 10,
    resetDeps: [search, statusFilter],
  });

  useEffect(() => {
    if (!company) return;
    let active = true;
    setLoading(true);
    setMessage("");

    const loadAll = async () => {
      try {
        const [categoriesRes, materialsRes, uomsRes, imageRes] = await Promise.all([
          apiFetch("/api/categories?format=tree", company),
          apiFetch("/api/materials", company),
          apiFetch("/api/uom", company),
          apiFetch("/api/image-master-v2", company),
        ]);

        const [categoriesData, materialsData, uomsData, imageData] = await Promise.all([
          categoriesRes.json(),
          materialsRes.json(),
          uomsRes.json(),
          imageRes.json(),
        ]);

        if (!active) return;

        if (categoriesData?.success) setCategoriesTree(categoriesData.data || []);
        if (materialsData?.success) setMaterials(materialsData.data || []);
        if (uomsData?.success) setUoms(uomsData.data || []);

        if (imageData?.success) {
          setRows(imageData.data || []);
          setSummary((prev) => imageData.summary || prev);
        }
      } catch (error: any) {
        if (!active) return;
        setMessage(error.message || "Failed to load Image Master data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [company]);

  async function refreshImageMaster() {
    if (!company) return;
    try {
      const res = await apiFetch("/api/image-master-v2", company);
      const data = await res.json();
      if (data?.success) {
        setRows(data.data || []);
        setSummary((prev) => data.summary || prev);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to refresh list.");
    }
  }

  function toggleSelection(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      if (!checked) return new Set();
      const next = new Set(prev);
      paginatedRows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function applyTagsToSelection() {
    if (!company) return;
    if (selectedIds.size === 0) {
      setMessage("Select at least one image to apply tags.");
      return;
    }

    const patch: TagPatch = {};
    if (bulkCategory) patch.category_id = Number(bulkCategory);
    if (bulkMaterial) patch.material_id = Number(bulkMaterial);
    if (bulkUom) patch.uom_id = Number(bulkUom);
    if (bulkSource) patch.source = bulkSource === "vendor" ? "vendor" : "own";

    if (!Object.keys(patch).length) {
      setMessage("Choose at least one tag value to apply.");
      return;
    }

    try {
      const res = await apiFetch("/api/image-master-v2/tags", company, {
        method: "PATCH",
        body: JSON.stringify({
          image_ids: Array.from(selectedIds),
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update tags");
      setTagModalOpen(false);
      setBulkCategory("");
      setBulkMaterial("");
      setBulkUom("");
      setBulkSource("");
      await refreshImageMaster();
      setMessage(`Updated ${data.updated || 0} image(s).`);
    } catch (error: any) {
      setMessage(error.message || "Failed to update tags.");
    }
  }

  async function updateInlineTag(id: number, patch: TagPatch) {
    if (!company) return;
    const previous = rows;
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
    try {
      const res = await apiFetch("/api/image-master-v2/tags", company, {
        method: "PATCH",
        body: JSON.stringify({
          image_ids: [id],
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update tag");
      await refreshImageMaster();
    } catch (error: any) {
      setRows(previous);
      setMessage(error.message || "Failed to update tag.");
    }
  }

  async function handleUpload() {
    if (!company || selectedFiles.length === 0) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      selectedFiles.forEach((file) => form.append("files", file));
      const res = await apiFetch("/api/image-master-v2/upload", company, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      const uploadedIds = Array.isArray(data?.data)
        ? data.data.map((row: { id: number }) => Number(row.id)).filter((id: number) => Number.isFinite(id))
        : [];
      setSelectedFiles([]);
      setUploadOpen(false);
      await refreshImageMaster();
      if (uploadedIds.length) {
        setSelectedIds(new Set(uploadedIds));
        setTagModalOpen(true);
        setMessage(`Uploaded ${uploadedIds.length} image(s). Select tags for this batch.`);
      } else {
        setMessage(`Uploaded ${data.data?.length || 0} image(s).`);
      }
    } catch (error: any) {
      setMessage(error.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadTemplate(scope: "all" | "tagged") {
    if (!company) return;
    setMessage("");
    try {
      const res = await apiFetch(`/api/image-master-v2/template?scope=${scope}`, company);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to download template");
      }
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "image-master-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      setMessage(error.message || "Failed to download template.");
    }
  }

  async function importTemplate() {
    if (!company || !importFile) return;
    setImportLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await apiFetch("/api/image-master-v2/import", company, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        const errorText = Array.isArray(data?.errors) ? data.errors.join(" ") : data.message;
        throw new Error(errorText || "Import failed");
      }

      const warningCount = Array.isArray(data?.warnings) ? data.warnings.length : 0;
      const warningText = warningCount ? ` (${warningCount} warning${warningCount > 1 ? "s" : ""})` : "";
      setMessage(
        `Imported ${data.inserted_products || 0} products and ${data.inserted_variants || 0} variants.${warningText}`
      );
      setImportOpen(false);
      setImportFile(null);
      await refreshImageMaster();
    } catch (error: any) {
      setMessage(error.message || "Import failed.");
    } finally {
      setImportLoading(false);
    }
  }

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.has(row.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Image Master</h1>
          <p className="text-sm text-gray-500">
            Stage images before linking them to products and bulk import via Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Upload Images
          </button>
          <button
            onClick={() => setTagModalOpen(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Manage Tags
          </button>
          <button
            onClick={() => setTemplateReviewOpen(true)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Get Template ({summary.unlinked || 0})
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase text-gray-500">Total Images</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{summary.total}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase text-gray-500">Unlinked Images</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{summary.unlinked}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase text-gray-500">Already Linked</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{summary.linked}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase text-gray-500">Untagged</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{summary.untagged}</div>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by image name..."
            className="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="tagged">Tagged</option>
            <option value="untagged">Untagged</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            Tagged {summary.unlinked_tagged ?? 0} / {summary.unlinked ?? 0}
          </div>
          <div className="text-xs text-gray-500">
            Showing {showingFrom} to {showingTo} of {totalItems}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear Selection
          </button>
          <button
            onClick={() => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredRows.forEach((row) => next.add(row.id));
                return next;
              });
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Select Filtered
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Import Excel
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div
          ref={listRef}
          className="max-h-[600px] overflow-y-auto"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Thumbnail</th>
                  <th className="px-4 py-3 font-medium">Filename</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">UOM</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Linked To (SKU)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-gray-500">
                      No images found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => toggleSelection(row.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <LazyThumbnail
                          src={`/uploads/${row.file_path}`}
                          alt={row.filename}
                          rootRef={listRef}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.filename}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.category_label || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.material_label || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.uom_label || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.source || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            row.status === "linked"
                              ? "bg-green-100 text-green-700"
                              : row.status === "untagged"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.linked_sku || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{showingFrom}</span> to{" "}
              <span className="font-medium">{showingTo}</span> of{" "}
              <span className="font-medium">{totalItems}</span> results
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="image-master-rows-per-page" className="text-sm text-gray-600">
                Rows per page
              </label>
              <select
                id="image-master-rows-per-page"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value={5}>5</option>
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

      {tagModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Tags</h3>
                <p className="text-sm text-gray-500">
                  Apply category, material, UOM, and source to selected images.
                </p>
              </div>
              <button
                onClick={() => setTagModalOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">No change</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.path}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Material </label>
                <select
                  value={bulkMaterial}
                  onChange={(e) => setBulkMaterial(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">No change</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.material_code} - {mat.material_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">UOM</label>
                <select
                  value={bulkUom}
                  onChange={(e) => setBulkUom(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">No change</option>
                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.uom_code} - {uom.uom_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Source</label>
                <select
                  value={bulkSource}
                  onChange={(e) => setBulkSource(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">No change</option>
                  <option value="own">Own</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between border-t px-6 py-4">
              <span className="text-sm text-gray-500">
                Selected: {selectedCount} image{selectedCount === 1 ? "" : "s"}
              </span>
              <button
                onClick={applyTagsToSelection}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Apply Tags
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload Images</h3>
                <p className="text-sm text-gray-500">
                  Select multiple images to stage. You can tag the batch after upload.
                </p>
              </div>
              <button
                onClick={() => setUploadOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm"
              />
              <div className="text-xs text-gray-500">
                Selected files: {selectedFiles.length || "None"}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {uploading ? "Uploading..." : "Upload Images"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Excel Template</h3>
                <p className="text-sm text-gray-500">
                  Upload a filled template to create products and link images.
                </p>
              </div>
              <button
                onClick={() => setImportOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <div className="text-xs text-gray-500">
                Selected file: {importFile?.name || "None"}
              </div>
              <button
                onClick={importTemplate}
                disabled={!importFile || importLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {importLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {templateReviewOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Template Review</h3>
                <p className="text-sm text-gray-500">
                  Review tagging status before generating the template.
                </p>
              </div>
              <button
                onClick={() => setTemplateReviewOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {summary.unlinked_tagged ?? 0} images tagged, {summary.unlinked_untagged ?? 0} untagged.
              </div>
              <div className="grid gap-3">
                <button
                  onClick={async () => {
                    await downloadTemplate("tagged");
                    setTemplateReviewOpen(false);
                  }}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Generate template with tagged images only
                </button>
                <button
                  onClick={async () => {
                    await downloadTemplate("all");
                    setTemplateReviewOpen(false);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Generate template with all images
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
