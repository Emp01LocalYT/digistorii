//C:\Users\yanna\digistorii\src\context\TenantContext.tsx
"use client";

import { createContext, useContext } from "react";

type TenantContextType = {
  company: string;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = TenantContext.Provider;

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
};