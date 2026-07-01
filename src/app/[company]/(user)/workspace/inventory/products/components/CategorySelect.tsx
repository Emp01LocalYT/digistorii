"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { apiFetch } from "@/lib/apiFetch";
import { useTenant } from "@/context/TenantContext";

type CategoryRow = {
  id: number;
  path_string: string;
  level: number;
};

type CategorySelectProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  reloadKey?: number;
};

export default function CategorySelect({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Select Category",
  reloadKey = 0,
}: CategorySelectProps) {
  const { company } = useTenant();
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    if (!company) return;
    let isMounted = true;
    const load = async () => {
      try {
        const res = await apiFetch("/api/categories", company);
        const data = await res.json();
        if (!isMounted) return;
        setCategories(data.success ? data.data || [] : []);
      } catch {
        if (isMounted) setCategories([]);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [company, reloadKey]);

  const options = useMemo(
    () =>
      categories.map((row) => ({
        value: String(row.id),
        label: row.path_string,
        level: row.level,
      })),
    [categories]
  );

  return (
    <Select
      showSearch
      placeholder={placeholder}
      value={value || undefined}
      onChange={(val) => onChange(String(val))}
      options={options}
      disabled={disabled}
      optionFilterProp="label"
      optionRender={(option) => {
        const level = Number(option.data.level || 1);
        const prefix = level > 1 ? `${"-".repeat(level - 1)} ` : "";
        return (
          <span className={level === 1 ? "font-semibold" : "text-gray-700"}>
            {prefix}
            {option.data.label}
          </span>
        );
      }}
      className={className}
    />
  );
}
