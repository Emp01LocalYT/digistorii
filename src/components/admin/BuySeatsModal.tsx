"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useNotify } from "@/hooks/useNotify";

interface BuySeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxUsers: number;
  onSuccess: (newMaxUsers: number) => void;
  tenant: string;
}

const loadRazorpayScript = () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    const timeout = setTimeout(() => resolve(false), 6000);
    script.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const BuySeatsModal: React.FC<BuySeatsModalProps> = ({
  isOpen,
  onClose,
  maxUsers,
  onSuccess,
  tenant,
}) => {
  const [additionalSeats, setAdditionalSeats] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const notify = useNotify();

  const handlePayAndContinue = async () => {
    if (additionalSeats < 1) {
      notify("Please select at least 1 seat to purchase.", { severity: "error" });
      return;
    }

    setLoading(true);

    try {
      const orderRes = await fetch("/api/admin/billing/buy-seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": tenant,
        },
        body: JSON.stringify({ seatCount: additionalSeats }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success || !orderData.order) {
        notify(orderData.message || "Failed to initiate payment. Please try again.", { severity: "error" });
        setLoading(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        notify("Unable to load payment gateway. Please try again.", { severity: "error" });
        setLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_Sp9Rqg7Reyo9Jw",
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Purchase Extra User Seats",
        description: `Adding ${additionalSeats} user seat(s) to your organization`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/admin/billing/verify-seats", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-tenant": tenant,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                seatCount: additionalSeats,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              const newLimit = verifyData.max_users || (maxUsers + additionalSeats);
              onSuccess(newLimit);
              notify(`Successfully added ${additionalSeats} seats! Your new limit is ${newLimit} users.`, { severity: "success" });
              onClose();
            } else {
              notify(verifyData.message || "Payment verification failed. Please contact support.", { severity: "error" });
            }
          } catch (err: any) {
            console.error("Verification failed", err);
            notify("An error occurred during payment verification.", { severity: "error" });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            notify("Payment was cancelled.", { severity: "warning" });
            setLoading(false);
          },
        },
        theme: { color: "#2563EB" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment flow failed", err);
      notify("Failed to process payment. Please try again.", { severity: "error" });
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl">
      <div className="flex flex-col gap-4 mt-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Buy Additional User Seats</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Need more capacity? Instantly purchase extra user seats for your organization.
          </p>
        </div>

        {/* Quantity selector stepper */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Number of Seats
          </label>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAdditionalSeats((prev) => Math.max(1, prev - 1))}
              disabled={loading || additionalSeats <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-xl font-bold cursor-pointer text-gray-900 dark:text-white"
            >
              -
            </button>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {additionalSeats}
            </span>
            <button
              onClick={() => setAdditionalSeats((prev) => prev + 1)}
              disabled={loading}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-xl font-bold cursor-pointer text-gray-900 dark:text-white"
            >
              +
            </button>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Price per seat</span>
            <span className="font-semibold text-gray-900 dark:text-white">₹100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Additional seats</span>
            <span className="font-semibold text-gray-900 dark:text-white">{additionalSeats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current capacity</span>
            <span className="font-semibold text-gray-900 dark:text-white">{maxUsers} seats</span>
          </div>
          <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
            <span>New capacity</span>
            <span className="font-bold">{maxUsers + additionalSeats} seats</span>
          </div>
          <div className="flex justify-between text-base border-t border-gray-100 dark:border-gray-800 pt-3 font-bold text-gray-900 dark:text-white">
            <span>Total payable amount</span>
            <span className="text-indigo-600 dark:text-indigo-400">₹{additionalSeats * 100}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePayAndContinue}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Processing..." : "Pay & Continue"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
