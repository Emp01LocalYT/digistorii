"use client";

import { useState } from "react";
import { Button, Input, Modal, Select } from "antd";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type Option = { value: string; label: string };

type CategoryModalProps = {
  open: boolean;
  categoryOptions: Option[];
  onClose: () => void;
  onSaved: (id?: number) => void;
};

export default function CategoryModal({
  open,
  categoryOptions,
  onClose,
  onSaved,
}: CategoryModalProps) {
  const { company } = useTenant();
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormParent, setCategoryFormParent] = useState<string>("");
  const [categoryFormError, setCategoryFormError] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  function resetForm() {
    setCategoryFormName("");
    setCategoryFormParent("");
    setCategoryFormError("");
  }

  async function saveCategoryFromModal() {
    if (!company) return;
    if (!categoryFormName.trim()) {
      setCategoryFormError("Category name is required");
      return;
    }
    setCategorySaving(true);
    setCategoryFormError("");
    try {
      const payload = {
        category_name: categoryFormName.trim(),
        parent_id: categoryFormParent ? Number(categoryFormParent) : null,
      };
      const res = await apiFetch("/api/categories", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      onSaved(data.data?.id);
      resetForm();
    } catch (error: any) {
      setCategoryFormError(error.message || "Save failed");
    } finally {
      setCategorySaving(false);
    }
  }

  return (
    <Modal
      title="Create Category"
      open={open}
      centered
      onCancel={() => {
        onClose();
        resetForm();
      }}
      footer={null}
      destroyOnHidden
      zIndex={1500}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category Name</label>
          <Input
            value={categoryFormName}
            onChange={(e) => setCategoryFormName(e.target.value)}
            placeholder="Category name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Parent Category</label>
          <Select
            allowClear
            placeholder="Select parent category"
            value={categoryFormParent || undefined}
            onChange={(value) => setCategoryFormParent(value ? String(value) : "")}
            options={categoryOptions}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            className="font-sans"
          />
        </div>
        {categoryFormError ? <p className="text-sm text-red-500">{categoryFormError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button type="primary" loading={categorySaving} onClick={saveCategoryFromModal}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
