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
function CategoryTable({
  search,
  setSearch,
  paged,
  tableLoading,
  removeCategory,
  setForm,
  setShowForm,
  setErrors,
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
  return(
            <div className="ui-table-card">
              <div className="ui-search-section">
                <div className="ui-search-wrapper">
                  <MagnifyingGlassIcon className="ui-search-icon" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    className="ui-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            <div className="ui-table-scroll">
              <table className="ui-table">
                <thead className="ui-table-head">
                  <tr className="ui-table-row">
                    <th className="ui-table-th">Category Name</th>
                    <th className="ui-table-th">Parent Category</th>
                    <th className="ui-table-th">Level</th>
                    <th className="ui-table-th-center">Action</th>
                  </tr>
                </thead>
                <tbody >
                  {tableLoading ? (
                    <tr>
                      <td colSpan={4} className="ui-loading-row">
                        Loading data...
                      </td>
                    </tr>
                  ) : paged.length > 0 ? (
                    paged.map((row : any) => (
                      <tr key={row.id} className="ui-table-row">
                        <td className="ui-table-td" style={{ paddingLeft: `${(row.level - 1) * 20 + 16}px` }}>
                          {row.name}
                        </td>
                        <td className="ui-table-td">{row.parentName || "-"}</td>
                        <td className="ui-table-td">{row.level}</td>
                        <td className="ui-table-td-center">
                          <div className="ui-table-actions">
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
                      <td colSpan={4} className="ui-empty-row ui-table-td-center">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
                <div className="ui-pagination-wrapper">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="ui-pagination-info">
          Showing <span className="font-medium">{showingFrom}</span> to{" "}
          <span className="font-medium">{showingTo}</span> of{" "}
          <span className="font-medium">{totalItems}</span> results
        </p>
        <div className="ui-table-actions">
          <label htmlFor="category-rows-per-page" className="text-sm text-gray-600">
            Rows per page
          </label>
          <select
            id="category-rows-per-page"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="ui-pagination-select"
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
            className="ui-pagination-icon-btn rounded-md"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="ui-pagination-icon-btn rounded-md ml-3"
          >
            Next
          </button>
        </div>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
          <nav aria-label="Pagination" className="ui-pagination-nav">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="ui-pagination-icon-btn rounded-l-md"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {pageNumbers.map((page: number | "...", idx: number) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="ui-pagination-btn ui-pagination-btn-inactive"
                >
                  ...
                </span>
              ) : (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => goToPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                  className={`ui-pagination-btn ${
                    currentPage === page ? "ui-pagination-btn-active" : "ui-pagination-btn-inactive"
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
              className="ui-pagination-icon-btn rounded-r-md"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </nav>
        </div>
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

          <div className="ui-form-actions">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(initialForm());
                setErrors({});
              }}
              className="ui-btn ui-btn-secondary ui-btn-responsive"
            >
              Cancel
            </button>

            <div className="ui-btn-group">
              {!form.id && (
                <button
                  type="button"
                  onClick={() => void submit("add")}
                  className="ui-btn ui-btn-secondary ui-btn-responsive"
                >
                  Create & Add Another
                </button>
              )}

              <button className="ui-btn ui-btn-primary ui-btn-responsive">
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
        <CategoryTable
          search={search}
          setSearch={setSearch}
          paged={paged}
          tableLoading={tableLoading}
          removeCategory={removeCategory}
          setForm={setForm}
          setShowForm={setShowForm}
          setErrors={setErrors}
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






