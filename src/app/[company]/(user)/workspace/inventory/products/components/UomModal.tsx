"use client";

import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { getRuleValidationError } from "@/lib/formValidationRules";

type UomModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (id?: number) => void;
};

export default function UomModal({ open, onClose, onSaved }: UomModalProps) {
  const { company } = useTenant();
  const [uomCode, setUomCode] = useState("");
  const [uomName, setUomName] = useState("");
  const [uomError, setUomError] = useState("");
  const [uomSaving, setUomSaving] = useState(false);

  function resetForm() {
    setUomCode("");
    setUomName("");
    setUomError("");
  }

  async function saveUomFromModal() {
    if (!company) return;
    if (!uomCode.trim() || !uomName.trim()) {
      setUomError("UOM code and name are required");
      return;
    }

    const codeError = getRuleValidationError("alphanumeric-spaces-hyphens", uomCode);
    if (codeError) {
      setUomError(codeError);
      return;
    }

    const nameError = getRuleValidationError("alphanumeric-spaces-hyphens", uomName);
    if (nameError) {
      setUomError(nameError);
      return;
    }
    setUomSaving(true);
    setUomError("");
    try {
      const payload = {
        uom_code: uomCode.trim(),
        uom_name: uomName.trim(),
      };
      const res = await apiFetch("/api/uom", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      onSaved(data.data?.id);
      resetForm();
    } catch (error: any) {
      setUomError(error.message || "Save failed");
    } finally {
      setUomSaving(false);
    }
  }

  return (
    <Modal
      title="Create UOM"
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
          <label className="mb-1 block text-sm font-medium text-gray-700">UOM Code</label>
          <Input
            value={uomCode}
            onChange={(e) => setUomCode(e.target.value)}
            placeholder="UOM code"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">UOM Name</label>
          <Input
            value={uomName}
            onChange={(e) => setUomName(e.target.value)}
            placeholder="UOM name"
          />
        </div>
        {uomError ? <p className="text-sm text-red-500">{uomError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button type="primary" loading={uomSaving} onClick={saveUomFromModal}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
