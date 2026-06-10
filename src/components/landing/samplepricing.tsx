"use client";
import { useState, useEffect } from "react";
import MessageModal from "@/components/ui/modal/MessageModal";
import toast from "react-hot-toast";

type Plan = {
  name: string;
  price: number;
  description: string;
  features: string[];
};
type Company = {
  id: number;
  company_name: string;
};
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    // script.src = "https://invalid-url.com" /** error check means to uncomment it*/
    script.async = true;

    const timeout = setTimeout(() => {
      resolve(false);
    }, 6000);

    script.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    // script.onload = () => resolve(true);
    // script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState("Growth");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);


  useEffect(() => {
    const fetchCompanies = async () => {
      const res = await fetch("/api/companies");
      const data = await res.json();

      if (data.success) {
        setCompanies(data.companies);
      }
    };

    fetchCompanies();
  }, []);

  // Modal state
  const [modal, setModal] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const isProcessing = loadingPlan !== null;

  const plans = [
    {
      name: "Starter",
      // price: "₹999",
      price: 999,
      description: "Perfect for small businesses & freelancers",
      features: [
        "1 Company Setup",
        "GST Billing & Invoices",
        "Customer & Supplier Management",
        "Basic Expense Tracking",
        "Standard Reports",
      ],
    },
    {
      name: "Growth",
      // price: "₹1999",
      price: 1999,
      description: "Best for growing SMEs",
      features: [
        "Everything in Starter",
        "Inventory Management",
        "Advanced Financial Reports",
        "Sales & Profit Dashboard",
        "Priority Email Support",
      ],
    },
    {
      name: "Pro",
      // price: "₹3999",
      price: 3999,
      description: "For scaling businesses & multi-branch companies",
      features: [
        "Everything in Growth",
        "Multi-User Access",
        "Multi-Company Management",
        "Advanced Analytics",
        "Dedicated Support",
      ],
    },
  ];

  const handlePayment = async (plan: Plan) => {
    try {
      // =========================
      // 1. VALIDATION
      // =========================
      if (!selectedCompany) {
        setModal({
          open: true,
          type: "error",
          title: "Select Company",
          message: "Please select a company before payment.",
        });
        return;
      }
      if (!plan?.name || !plan?.price) {
        setModal({
          open: true,
          type: "error",
          title: "Invalid Plan",
          message: "Please select a valid subscription plan."
        });
        return;
      }
      // if (loadingPlan) return;
      if (isProcessing) return;
      setLoadingPlan(plan.name);
      // =========================
      // 2. CREATE ORDER
      // =========================
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: plan.name,
          amount: plan.price,
          company_id: selectedCompany,
        }),
      });

      const data = await res.json();
      console.log("CREATE ORDER RESPONSE:", data);
      const razor = data.order;
      console.log("RAZORPAY ORDER:", razor);
      const meta = data.payment;
      console.log("PAYMENT META:", meta);


      if (!data?.success) {
        setLoadingPlan(null);

        setModal({
          open: true,
          type: "error",
          title: getCreateOrderTitle(data),
          message:
            getCreateOrderErrorMessage(data) ||
            data?.message ||
            "Unable to initiate payment. Please try again.",
        });

        return;
      }


      // =========================
      // 3. LOAD SDK
      // =========================
      const isLoaded = await loadRazorpayScript();
      if (isLoaded !== true) {
        setLoadingPlan(null);
        setModal({
          open: true,
          type: "error",
          title: "Payment Gateway Error",
          message: "Unable to load payment gateway. Check your internet connection.",
        });
        return;
      }

      // =========================
      // 4. OPEN RAZORPAY
      // =========================
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: razor.amount,
        currency: razor.currency,
        name: "Your Company Name",
        description: plan.name + " Plan",
        order_id: razor.id,

        handler: async (response: any) => {
          setLoadingPlan(null);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            const verifyData = await verifyRes.json();

            // if (!verifyRes.ok) {
            //   setModal({
            //     open: true,
            //     type: "error",
            //     title: "Payment Failed",
            //     message: verifyData?.message || "Verification failed",
            //   });
            //   return;
            // }
            if (!verifyRes.ok || !verifyData?.success) {
              const errorMessage =
                verifyData?.message ||
                verifyData?.error ||
                "Payment verification failed";

              setModal({
                open: true,
                type: "error",
                title: getVerifyPaymentTitle(verifyData),
                message: getErrorMessage(verifyData),
              });

              return;
            }


            setModal({
              open: true,
              type: "success",
              title: "Payment Successful",
              message: "Your payment was successful and your subscription is now active.",
            });
            console.log(verifyData);

          } catch (error) {
            console.error(error);
            setModal({
              open: true,
              type: "error",
              title: "Network Error",
              message: "Unable to verify payment. Please try again.",
            });
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
            setModal({
              open: true,
              type: "error",
              title: "Payment Cancelled",
              message: "You closed the payment window before completing the payment.",
            });
          },
        },

        theme: {
          color: "#2563eb",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", (response: any) => {
        console.error("Payment Failed:", response);
        setLoadingPlan(null);
        setModal({
          open: true,
          type: "error",
          title: "Payment Failed",
          message:
            response?.error?.description ||
            response?.error?.reason ||
            "Payment was not completed. Please try again.",
        });
      });

      paymentObject.open();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        type: "error",
        title: "Unexpected Error",
        message: "Something went wrong. Please refresh the page and try again.",
      });
      setLoadingPlan(null);
    }
  };

  const getCreateOrderTitle = (data: any) => {
    switch (data?.error) {
      case "ALREADY_SUBSCRIBED":
        return "Already Subscribed";

      case "INVALID_REQUEST":
        return "Invalid Request";

      case "ORDER_CREATION_FAILED":
        return "Payment Failed";

      default:
        return "Payment Error";
    }
  };

  const getCreateOrderErrorMessage = (data: any) => {
    switch (data?.error) {
      case "ALREADY_SUBSCRIBED":
        return "You already have an active subscription for this plan.";

      case "INVALID_REQUEST":
        return "Invalid payment request. Please refresh and try again.";

      case "ORDER_CREATION_FAILED":
        return "Unable to start payment. Please try again.";

      default:
        return data?.message;
    }
  };

  const getVerifyPaymentTitle = (data: any) => {
    switch (data?.error) {
      case "INVALID_SIGNATURE":
        return "Verification Failed";

      case "PAYMENT_NOT_FOUND":
        return "Payment Not Found";

      case "SERVER_ERROR":
        return "Server Error";

      default:
        return "Payment Failed";
    }
  };

  const getErrorMessage = (data: any) => {
    switch (data?.error) {
      case "INVALID_SIGNATURE":
        return "Payment security check failed. Please try again.";

      case "PAYMENT_NOT_FOUND":
        return "We couldn't find your payment record. Contact support.";

      case "SERVER_ERROR":
        return "Server issue occurred. Please try again later.";

      default:
        return data?.message || "Payment verification failed.";
    }
  };

  useEffect(() => {
    if (loadingPlan) {
      const timer = setTimeout(() => {
        setLoadingPlan(null);
      }, 45000); // 45 sec max

      return () => clearTimeout(timer);
    }
  }, [loadingPlan]);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      {/* FULL PAGE LOADER */}
      {isProcessing && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white px-6 py-5 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">
              Processing payment...
            </span>
          </div>
        </div>
      )}
      {/*  Modal  */}
      <MessageModal
        open={modal.open}
        setOpen={(val) => setModal({ ...modal, open: val })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />


      <div
        className={`max-w-7xl mx-auto px-6 ${isProcessing ? "pointer-events-none select-none" : ""
          }`}
      >

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transparent Pricing for Every Business Stage
          </h2>
          <p className="text-lg text-gray-600">
            Click a plan to select it.
          </p>
          <p className="text-gray-500">Select company & plan to continue</p>
        </div>


        {/* COMPANY SELECT CARD */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-5 rounded-xl shadow-sm border w-full max-w-md">

            <label className="text-sm font-medium text-gray-700">
              Select Company for Subscription
            </label>

            {/* LOADING STATE */}
            {companies.length === 0 && selectedCompany === null ? (
              <div className="mt-3 text-sm text-gray-500">
                Loading companies...
              </div>
            ) : companies.length === 0 ? (
              /* EMPTY STATE */
              <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 font-medium">
                  No companies found
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Please create a company first before making payment.
                </p>
              </div>
            ) : (
              /* DROPDOWN */
              <select
                className="w-full mt-3 border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedCompany ?? ""}
                onChange={(e) =>
                  setSelectedCompany(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              >
                <option value="">-- Choose Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const isSelected = selectedPlan === plan.name;
            const isLocked = selectedPlan !== null && selectedPlan !== plan.name;
            const isLoading = loadingPlan === plan.name;

            return (
              <div
                key={idx}
                // onClick={() => setSelectedPlan(plan.name)}
                onClick={() => {
                  if (isProcessing) return;

                  setSelectedPlan(plan.name);
                }}
                className={`cursor-pointer relative rounded-3xl p-10 transition-all duration-300 ${isSelected
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl scale-105"
                  : "bg-white border border-gray-200 shadow-md hover:shadow-xl"
                  }`}

              >
                {isSelected && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1 rounded-full shadow">
                    SELECTED
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-3">
                  {plan.name}
                </h3>

                <p className={`text-sm mb-6 ${isSelected ? "text-blue-100" : "text-gray-600"}`}>
                  {plan.description}
                </p>

                <div className="mb-8">
                  <span className="text-5xl font-bold">
                    {plan.price}
                  </span>
                  <span className="text-lg ml-2 opacity-80">
                    / month
                  </span>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`w-5 h-5 mt-1 rounded-full flex items-center justify-center text-xs ${isSelected
                          ? "bg-white text-blue-600"
                          : "bg-blue-600 text-white"
                          }`}
                      >
                        ✓
                      </span>
                      <span className="text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  // disabled={loadingPlan === plan.name}
                  disabled={isLocked || isProcessing}
                  // onClick={() => handlePayment(plan)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLocked || isProcessing) return;
                    handlePayment(plan);
                  }}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${isSelected
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                >
                  {/* {loadingPlan === plan.name ? "Processing..." : "Get Started"} */}
                  {isLoading ? "Processing..." : "Get Started"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}