"use client";

import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type FittingModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (id?: number) => void;
};

export default function FittingModal({ open, onClose, onSaved }: FittingModalProps) {
  const { company } = useTenant();
  const [fittingFormName, setFittingFormName] = useState("");
  const [fittingFormError, setFittingFormError] = useState("");
  const [fittingSaving, setFittingSaving] = useState(false);

  function resetForm() {
    setFittingFormName("");
    setFittingFormError("");
  }

  async function saveFittingFromModal() {
    if (!company) return;
    if (!fittingFormName.trim()) {
      setFittingFormError("Fitting name is required");
      return;
    }
    setFittingSaving(true);
    setFittingFormError("");
    try {
      const payload = {
        fitting_name: fittingFormName.trim(),
      };
      const res = await apiFetch("/api/fittings", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      onSaved(data.data?.id);
      resetForm();
    } catch (error: any) {
      setFittingFormError(error.message || "Save failed");
    } finally {
      setFittingSaving(false);
    }
  }

  return (
    <Modal
      title="Create Fitting"
      open={open}
      centered
      onCancel={() => {
        onClose();
        resetForm();
      }}
      footer={null}
      destroyOnHidden
      zIndex={1000}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fitting Name</label>
          <Input
            value={fittingFormName}
            onChange={(e) => setFittingFormName(e.target.value)}
            placeholder="Fitting name"
          />
        </div>
        {fittingFormError ? <p className="text-sm text-red-500">{fittingFormError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button type="primary" loading={fittingSaving} onClick={saveFittingFromModal}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
