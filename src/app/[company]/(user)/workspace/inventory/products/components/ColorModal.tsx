"use client";

import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type ColorModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (id?: number) => void;
  initialColorName?: string;
};

export default function ColorModal({ open, onClose, onSaved, initialColorName = "" }: ColorModalProps) {
  const { company } = useTenant();
  const [colorFormName, setColorFormName] = useState(initialColorName);
  const [colorHex, setColorHex] = useState("#000000");
  const [colorFormError, setColorFormError] = useState("");
  const [colorSaving, setColorSaving] = useState(false);

  function resetForm() {
    setColorFormName(initialColorName);
    setColorHex("#000000");
    setColorFormError("");
  }

  async function saveColorFromModal() {
    if (!company) return;
    if (!colorFormName.trim()) {
      setColorFormError("Color name is required");
      return;
    }
    setColorSaving(true);
    setColorFormError("");
    try {
      const payload = {
        color_name: colorFormName.trim(),
        hex_code: colorHex,
      };
      const res = await apiFetch("/api/colors", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      onSaved(data.data?.id);
      resetForm();
    } catch (error: any) {
      setColorFormError(error.message || "Save failed");
    } finally {
      setColorSaving(false);
    }
  }

  return (
    <Modal
      title="Create Color"
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Color Name</label>
          <Input
            value={colorFormName}
            onChange={(e) => setColorFormName(e.target.value)}
            placeholder="Color name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Color Hex</label>
          <div className="flex items-center gap-4 mt-1">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
            />
            <span className="text-sm font-mono text-gray-600">{colorHex.toUpperCase()}</span>
          </div>
        </div>
        {colorFormError ? <p className="text-sm text-red-500">{colorFormError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button type="primary" loading={colorSaving} onClick={saveColorFromModal}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
