"use client";

import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { getRuleValidationError } from "@/lib/formValidationRules";

type MaterialModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (id?: number) => void;
};

export default function MaterialModal({ open, onClose, onSaved }: MaterialModalProps) {
  const { company } = useTenant();
  const [materialFormCode, setMaterialFormCode] = useState("");
  const [materialFormName, setMaterialFormName] = useState("");
  const [materialFormError, setMaterialFormError] = useState("");
  const [materialSaving, setMaterialSaving] = useState(false);

  function resetForm() {
    setMaterialFormCode("");
    setMaterialFormName("");
    setMaterialFormError("");
  }

  async function saveMaterialFromModal() {
    if (!company) return;
    if (!materialFormCode.trim() || !materialFormName.trim()) {
      setMaterialFormError("Material code and name are required");
      return;
    }

    const codeError = getRuleValidationError("alphanumeric-spaces-hyphens", materialFormCode);
    if (codeError) {
      setMaterialFormError(codeError);
      return;
    }

    const nameError = getRuleValidationError("alphanumeric-spaces-hyphens", materialFormName);
    if (nameError) {
      setMaterialFormError(nameError);
      return;
    }
    setMaterialSaving(true);
    setMaterialFormError("");
    try {
      const payload = {
        material_code: materialFormCode.trim(),
        material_name: materialFormName.trim(),
      };
      const res = await apiFetch("/api/materials", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      onSaved(data.data?.id);
      resetForm();
    } catch (error: any) {
      setMaterialFormError(error.message || "Save failed");
    } finally {
      setMaterialSaving(false);
    }
  }

  return (
    <Modal
      title="Create Material"
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Material Code</label>
          <Input
            value={materialFormCode}
            onChange={(e) => setMaterialFormCode(e.target.value)}
            placeholder="Material code"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Material Name</label>
          <Input
            value={materialFormName}
            onChange={(e) => setMaterialFormName(e.target.value)}
            placeholder="Material name"
          />
        </div>
        {materialFormError ? <p className="text-sm text-red-500">{materialFormError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button type="primary" loading={materialSaving} onClick={saveMaterialFromModal}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
