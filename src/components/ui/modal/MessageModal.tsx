"use client";

import { Dialog } from "@headlessui/react";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  type: "success" | "error";
  title: string;
  message: string;
};

export default function MessageModal({ open, setOpen, type, title, message }: Props) {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white rounded-2xl p-6 w-[350px] shadow-xl text-center">

          <div
            className={`w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full ${
              type === "success"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {type === "success" ? "✓" : "!"}
          </div>

          <Dialog.Title className="text-xl font-semibold mb-2">
            {/* {type === "success" ? "Payment Successful" : "Something went wrong"} */}
             {title}
          </Dialog.Title>

          <p className="text-gray-600 mb-5">{message}</p>

          <button
            onClick={() => setOpen(false)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            OK
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}