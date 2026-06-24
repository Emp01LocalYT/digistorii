"use client";

import { useEffect, useMemo, useState } from "react";
import type { Warehouse } from "@/types/sales";
import { parseUserSessionCookie } from "@/components/sales/salesUtils";

type WarehouseContextValue = {
  warehouse_id?: number | string | null | undefined;
  location_id?: number | string | null | undefined;
  warehouse_name?: string | null | undefined;
  location_name?: string | null | undefined;
};

const toPositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const pickName = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
};

export function useResolvedWarehouseContext(
  userContext: WarehouseContextValue | null | undefined,
  headerContext: WarehouseContextValue | null | undefined,
  company: string | null | undefined
) {
  const [sessionWarehouseContext, setSessionWarehouseContext] = useState<{
    warehouse_id: number | null;
    location_id: number | null;
    warehouse_name: string;
    location_name: string;
  }>({
    warehouse_id: null,
    location_id: null,
    warehouse_name: "",
    location_name: "",
  });
  const [warehouseRecord, setWarehouseRecord] = useState<Warehouse | null>(null);

  useEffect(() => {
    setSessionWarehouseContext(parseUserSessionCookie());
  }, []);

  const warehouseIdSource = userContext?.warehouse_id != null
    ? "userContext"
    : sessionWarehouseContext.warehouse_id != null
      ? "sessionCookie"
      : headerContext?.warehouse_id != null
        ? "header"
        : "unresolved";
  const locationIdSource = userContext?.location_id != null
    ? "userContext"
    : sessionWarehouseContext.location_id != null
      ? "sessionCookie"
      : headerContext?.location_id != null
        ? "header"
        : "unresolved";

  const activeWarehouseId =
    userContext?.warehouse_id ??
    sessionWarehouseContext.warehouse_id ??
    headerContext?.warehouse_id ??
    "";
  const activeLocationId =
    userContext?.location_id ??
    sessionWarehouseContext.location_id ??
    headerContext?.location_id ??
    "";

  const normalizedWarehouseId = toPositiveInt(activeWarehouseId);
  const normalizedLocationId = toPositiveInt(activeLocationId);

  const contextualWarehouseName = pickName(
    userContext?.warehouse_name,
    sessionWarehouseContext.warehouse_name,
    headerContext?.warehouse_name
  );
  const contextualLocationName = pickName(
    userContext?.location_name,
    sessionWarehouseContext.location_name,
    headerContext?.location_name
  );

  useEffect(() => {
    if (!company || !normalizedWarehouseId) {
      setWarehouseRecord(null);
      return;
    }

    if (contextualWarehouseName && contextualLocationName) {
      setWarehouseRecord({
        id: normalizedWarehouseId,
        location_id: normalizedLocationId,
        name: contextualWarehouseName,
        location_name: contextualLocationName,
      });
      return;
    }

    if (
      warehouseRecord?.id === normalizedWarehouseId &&
      (warehouseRecord.name || warehouseRecord.location_name || warehouseRecord.location_id != null)
    ) {
      return;
    }

    let cancelled = false;

    const loadWarehouseRecord = async () => {
      try {
        const res = await fetch(`/api/warehouses/${normalizedWarehouseId}`, {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        if (!res.ok || !data?.success || cancelled) return;

        const warehouse = data.data || {};
        setWarehouseRecord({
          id: Number(warehouse.id || normalizedWarehouseId),
          location_id: toPositiveInt(warehouse.location_id) ?? normalizedLocationId,
          name: pickName(warehouse.name, contextualWarehouseName),
          location_name: pickName(warehouse.location_name, contextualLocationName),
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to resolve warehouse context", error);
        }
      }
    };

    loadWarehouseRecord();

    return () => {
      cancelled = true;
    };
  }, [
    company,
    contextualLocationName,
    contextualWarehouseName,
    normalizedLocationId,
    normalizedWarehouseId,
    warehouseRecord?.id,
    warehouseRecord?.location_name,
    warehouseRecord?.name,
  ]);

  const selectedWarehouse = useMemo(() => {
    if (!normalizedWarehouseId) return null;
    return {
      id: normalizedWarehouseId,
      location_id: warehouseRecord?.location_id ?? normalizedLocationId,
      name: pickName(warehouseRecord?.name, contextualWarehouseName),
      location_name: pickName(warehouseRecord?.location_name, contextualLocationName),
    } satisfies Warehouse;
  }, [
    contextualLocationName,
    contextualWarehouseName,
    normalizedLocationId,
    normalizedWarehouseId,
    warehouseRecord?.location_id,
    warehouseRecord?.location_name,
    warehouseRecord?.name,
  ]);

  const selectedWarehouseName = pickName(selectedWarehouse?.name, contextualWarehouseName);
  const selectedLocationName = pickName(selectedWarehouse?.location_name, contextualLocationName);
  const warehouseNameSource = warehouseRecord?.name
    ? contextualWarehouseName && warehouseRecord.name === contextualWarehouseName
      ? warehouseIdSource
      : "warehouseApi"
    : contextualWarehouseName
      ? warehouseIdSource
      : "unresolved";
  const locationNameSource = warehouseRecord?.location_name
    ? contextualLocationName && warehouseRecord.location_name === contextualLocationName
      ? locationIdSource
      : "warehouseApi"
    : contextualLocationName
      ? locationIdSource
      : "unresolved";

  useEffect(() => {
    console.log("[SalesHeader] warehouse_id source:", warehouseIdSource, "value:", selectedWarehouse?.id ?? null);
    console.log(
      "[SalesHeader] location_id source:",
      locationIdSource,
      "value:",
      selectedWarehouse?.location_id ?? normalizedLocationId
    );
    console.log("[SalesHeader] warehouse_name source:", warehouseNameSource, "value:", selectedWarehouseName);
    console.log("[SalesHeader] location_name source:", locationNameSource, "value:", selectedLocationName);
  }, [
    locationIdSource,
    locationNameSource,
    normalizedLocationId,
    selectedLocationName,
    selectedWarehouse?.id,
    selectedWarehouse?.location_id,
    selectedWarehouseName,
    warehouseIdSource,
    warehouseNameSource,
  ]);

  return {
    activeWarehouseId: selectedWarehouse?.id ?? activeWarehouseId,
    activeLocationId: selectedWarehouse?.location_id ?? normalizedLocationId ?? activeLocationId,
    selectedWarehouse,
    selectedWarehouseName,
    selectedLocationName,
  };
}
