"use client";

import { useContext } from "react";
import { ConfirmContext } from "@/components/ui/toast/ConfirmProvider";

export function useConfirm() {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }

  return confirm;
}
