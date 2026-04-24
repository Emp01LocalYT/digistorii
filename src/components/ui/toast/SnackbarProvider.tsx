"use client";

import {
  createContext,
  useCallback,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { type AlertColor } from "@mui/material/Alert";

export type NotifyOptions = {
  severity?: AlertColor;
  duration?: number;
};

export type NotifyFn = (message: string, options?: NotifyOptions) => void;

export const NotifyContext = createContext<NotifyFn | undefined>(undefined);

type SnackbarState = {
  key: number;
  message: string;
  open: boolean;
  severity: AlertColor;
  duration: number;
};

type SnackbarProviderProps = {
  children: ReactNode;
};

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [snack, setSnack] = useState<SnackbarState>({
    key: 0,
    message: "",
    open: false,
    severity: "success",
    duration: 3000,
  });

  const notify = useCallback<NotifyFn>((message, options = {}) => {
    setSnack((prev) => ({
      key: prev.key + 1,
      message,
      open: true,
      severity: options.severity ?? "success",
      duration: options.duration ?? 3000,
    }));
  }, []);

  const handleClose = useCallback(
    (_event?: Event | SyntheticEvent, reason?: string) => {
      if (reason === "clickaway") return;
      setSnack((prev) => ({ ...prev, open: false }));
    },
    []
  );

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={snack.key}
        open={snack.open}
        autoHideDuration={snack.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
  sx={{ mt:  7}}
      >
        <Alert
          onClose={handleClose}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}
