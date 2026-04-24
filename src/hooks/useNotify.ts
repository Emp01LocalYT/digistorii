"use client";

import { useContext } from "react";
import { NotifyContext } from "@/components/ui/toast/SnackbarProvider";

export function useNotify() {
  const notify = useContext(NotifyContext);

  if (!notify) {
    throw new Error("useNotify must be used within SnackbarProvider");
  }

  return notify;
}
