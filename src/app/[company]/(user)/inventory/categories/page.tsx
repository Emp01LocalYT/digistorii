"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { useConfirm } from "@/hooks/useConfirm";
import { useNotify } from "@/hooks/useNotify";
import { usePagination } from "@/hooks/usePagination";
type CategoryNode = {
  id: number;
  name: string;
  parent_id?: number | null;
  level: number;
  children?: CategoryNode[];
};

type CategoryForm = {
  id?: number;
  category_name: string;
  parent_id: string;
};

type FlatCategory = {
  id: number;
  name: string;
  level: number;
  parentName: string;
  parentId: number | null;
  path: string;
};

function initialForm(): CategoryForm {
  return { category_name: "", parent_id: "" };
}

function flattenCategories(nodes: CategoryNode[], parentPath: string[] = [], parentName = ""): FlatCategory[] {
  const rows: FlatCategory[] = [];
  nodes.forEach((node) => {
    const pathParts = [...parentPath, node.name];
    rows.push({
      id: node.id,
      name: node.name,
      level: node.level,
      parentName,
      parentId: node.parent_id ?? null,
      path: pathParts.join(" > "),
    });
    if (node.children && node.children.length) {
      rows.push(...flattenCategories(node.children, pathParts, node.name));
    }
  });
  return rows;
}

function LoadingOverlay({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-700 font-semibold text-lg">Saving Category...</p>
      </div>
    </div>,
    document.body
  );
} 
function PageHeader({ showForm, onAdd }: any) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">
        {showForm ? "Category Master" : "Category List"}
      </h1>

      {!showForm && (
        <button
          onClick={onAdd}
          className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
        >
          <PlusIcon className="w-4 h-4" />
          Add Category
        </button>
      )}
    </div>
  );
}
function MessageBox({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
      {message}
    </div>
  );
}
function CategorySearch({ search, setSearch }: any) {
  return (
    <div className="relative max-w-sm">
      <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

      <input
        type="text"
        placeholder="Search categories..."
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}
function CategoryTable({
  paged,
  tableLoading,
  removeCategory,
  setForm,
  setShowForm,
  setErrors,
}: any) {
  return(
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-gray-600 uppercase text-xs">
                  <tr className="border-t hover:bg-blue-50 transition">
                    <th className="p-4 text-left">Category Name</th>
                    <th className="p-4 text-left">Parent Category</th>
                    <th className="p-4 text-left">Level</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 animate-pulse">
                        Loading data...
                      </td>
                    </tr>
                  ) : paged.length > 0 ? (
                    paged.map((row : any) => (
                      <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                        <td className="p-4" style={{ paddingLeft: `${(row.level - 1) * 20 + 16}px` }}>
                          {row.name}
                        </td>
                        <td>{row.parentName || "-"}</td>
                        <td>{row.level}</td>
                        <td className="text-center">
                          <div className="flex justify-center items-center gap-3">
                            <button
                              onClick={() => {
                                setForm({
                                  id: row.id,
                                  category_name: row.name,
                                  parent_id: row.parentId ? String(row.parentId) : "",
                                });
                                setErrors({});
                                setShowForm(true);
                              }}
                              className="text-indigo-600"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => removeCategory(row.id)} className="text-red-600">
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
  );
}

function CategoryPagination({
  currentPage,
  totalItems,
  showingFrom,
  showingTo,
  totalPages,
  rowsPerPage,
  setRowsPerPage,
  pageNumbers,
  goToPage,
  goToPreviousPage,
  goToNextPage,
}: any) {
  return (
    <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{showingFrom}</span> to{" "}
          <span className="font-medium">{showingTo}</span> of{" "}
          <span className="font-medium">{totalItems}</span> results
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="category-rows-per-page" className="text-sm text-gray-600">
            Rows per page
          </label>
          <select
            id="category-rows-per-page"
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

            {pageNumbers.map((page: number | "...", idx: number) =>
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
                    currentPage === page ? "z-10 bg-indigo-600 text-white" : "text-gray-900 hover:bg-gray-50"
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
  );
}
function CategoryForm({
  form,
  setForm,
  errors,
  inputClass,
  categoryOptions,
  setShowForm,
  setErrors,
  submit,
}: any) {
  return(
    <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("close");
          }}
          className="bg-white p-6 rounded-xl shadow space-y-6"
        >
          <h2 className="text-lg font-semibold">{form.id ? "Update Category" : "Create Category"}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold mb-1 block">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.category_name}
                onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                className={inputClass("category_name")}
              />
              {errors.category_name && <p className="text-red-500 text-sm mt-1">{errors.category_name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Parent Category</label>
              <select
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className={inputClass("parent_id")}
              >
                <option value="">No Parent (Top Level)</option>
                {categoryOptions.map((opt :any ) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(initialForm());
                setErrors({});
              }}
              className="bg-gray-300 px-6 py-2 rounded-lg"
            >
              Cancel
            </button>

            <div className="flex gap-4">
              {!form.id && (
                <button
                  type="button"
                  onClick={() => void submit("add")}
                  className="bg-gray-300 px-6 py-2 rounded-lg"
                >
                  Create & Add Another
                </button>
              )}

              <button className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded-lg">
                {form.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
       ); }

export default function CategoryMasterPage() {
  const { company } = useTenant();
    const confirm = useConfirm();
    const notify = useNotify();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${
      errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"
    }`;

  async function loadCategories() {
    if (!company) return;
    try {
      setTableLoading(true);
        const res = await apiFetch("/api/categories?format=tree", company);
      const data = await res.json();
      setTree(data.success ? data.data || [] : []);
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, [company]);

  const flatCategories = useMemo(() => flattenCategories(tree), [tree]);
  const categoryOptions = useMemo(() => {
    return flatCategories
      .map((row) => ({ id: row.id, label: row.path }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [flatCategories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return flatCategories;
    return flatCategories.filter((row) => `${row.path}`.toLowerCase().includes(q));
  }, [flatCategories, search]);

  const sortedData = useMemo(() => filtered, [filtered]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paged,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedData,
    initialItemsPerPage: 10,
    resetDeps: [search],
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.category_name.trim()) next.category_name = "Category name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(mode: "close" | "add") {
    if (!company) return;
    if (!validate()) return;
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        category_name: form.category_name.trim(),
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      };

      const url = form.id ? `/api/categories/${form.id}` : "/api/categories";
      const method = form.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");

      await loadCategories();
      if (mode === "add" && !form.id) {
        setForm(initialForm());
        setErrors({});
        return;
      }
      setShowForm(false);
      setForm(initialForm());
      setErrors({});
    } catch (error: any) {
      setMessage(error.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeCategory(id?: number) {
    if (!company || !id) return;
    const ok = await confirm("Delete this category?", {type: "warning", title: "Delete Confirmation"});
    if (!ok) return;
    setMessage("");
    try {
      const res = await apiFetch(`/api/categories/${id}`, company, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
      await loadCategories();
      notify("Category deleted successfully");
    } catch (error: any) {
      notify("Failed to delete category" + (error.message ? `: ${error.message}` : ""), { severity: "error" });
    }
  }



  return (
  <div className="p-6 max-w-7xl mx-auto space-y-6">

    <LoadingOverlay loading={loading} />

    <PageHeader
      showForm={showForm}
      onAdd={() => {
        setForm(initialForm());
        setErrors({});
        setShowForm(true);
      }}
    />

    <MessageBox message={message} />

    {!showForm && (
      <>
        <CategorySearch search={search} setSearch={setSearch} />

        <CategoryTable
          paged={paged}
          tableLoading={tableLoading}
          removeCategory={removeCategory}
          setForm={setForm}
          setShowForm={setShowForm}
          setErrors={setErrors}
        />

        <CategoryPagination
          currentPage={currentPage}
          totalItems={totalItems}
          showingFrom={showingFrom}
          showingTo={showingTo}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          pageNumbers={pageNumbers}
          goToPage={goToPage}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
        />
      </>
    )}

    {showForm && (
      <CategoryForm
        form={form}
        setForm={setForm}
        errors={errors}
        inputClass={inputClass}
        categoryOptions={categoryOptions}
        setShowForm={setShowForm}
        setErrors={setErrors}
        submit={submit}
      />
    )}

  </div>
);
}
