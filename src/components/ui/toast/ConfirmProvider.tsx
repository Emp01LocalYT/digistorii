"use client";

import { createContext, useCallback, useRef, useState, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
export type ConfirmFn = (
    message: string,
    options?: { type?: "warning" | "error" | "info"; 
    title?: string }
) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

type ConfirmProviderProps = {
  children: ReactNode;
};

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Confirmation");
const [type, setType] = useState<"warning" | "error" | "info">("warning");
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  

  const handleClose = useCallback((result: boolean) => {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
    setMessage("");
  }, []);

//   const confirm = useCallback<ConfirmFn>((nextMessage: string) => {
//     if (resolverRef.current) {
//       resolverRef.current(false);
//       resolverRef.current = null;
//     }

//     setMessage(nextMessage);
//     setOpen(true);

//     return new Promise<boolean>((resolve) => {
//       resolverRef.current = resolve;
//     });
//   }, []);
const confirm = useCallback<ConfirmFn>(
  (nextMessage: string, options?: { type?: "warning" | "error" | "info"; title?: string }) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    setMessage(nextMessage);
    setTitle(options?.title ?? "Confirmation");
    setType(options?.type ?? "warning");

    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  },
  []
);
   const iconMap = {
  warning: <WarningAmberIcon color="warning" fontSize="large" />,
  error: <ErrorOutlineIcon color="error" fontSize="large" />,
  info: <InfoOutlinedIcon color="info" fontSize="large" />,
};

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog 
      open={open} 
      maxWidth="xs" 
      fullWidth 
      sx={{ zIndex: 1500 }}
     
      onClose={() => handleClose(false)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
           <Box display="flex" alignItems="center" gap={2}>
  {iconMap[type]}
  <DialogContentText>{message}</DialogContentText>
</Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button color="primary" variant="contained" onClick={() => handleClose(true)}>
            Confirm
          </Button>
          
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
