"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import {
  persistSelectedPlan,
  readPersistedSelectedPlan,
  type PlanOption,
} from "@/components/landing/Pricing";
import { HiEye, HiEyeOff, HiMail } from "react-icons/hi";

export default function GetService({ selectedPlan }: { selectedPlan?: PlanOption | null }) {
  const router = useRouter();
  const [storedPlan, setStoredPlan] = useState<PlanOption | null>(null);
  const [isPreviewOpen, setIsPreviewOpen]= useState(false);

  useEffect(() => {
    setStoredPlan(selectedPlan || readPersistedSelectedPlan());
  }, [selectedPlan]);

  const handleCancelPlan = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("digistorii:selected-plan");
    }
    setStoredPlan(null);
    router.push("/#pricing");
  };

  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    businessName: "",
    slug: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg border ${
      errors[field] ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-blue-500"
    } focus:outline-none`;

  const handleOpenPreview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setIsPreviewOpen(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};

  if (!formData.businessName.trim()) {
    next.businessName = "Business Name is required";
  }
  const slugValue = formData.slug.trim();

  if (!slugValue) {
    next.slug = "Website URL is required";
  } else if (/\s/.test(slugValue)) {
    next.slug = "Spaces are not allowed in the URL";
  } else if (/[^a-z]/.test(slugValue)) {
    next.slug = "Special characters and numbers are not allowed";
  }
  if(!formData.ownerName.trim()){
    next.ownerName="Owner Name is reqired";
  }
  
  if (!formData.ownerEmail.trim()) {
    next.ownerEmail = "Owner Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
    next.ownerEmail = "Invalid email";
  }


  if (!formData.ownerPhone.trim()) {
    next.ownerPhone = "Owner Phone is required";
  } else if (!/^\d+$/.test(formData.ownerPhone.trim())) {
    next.ownerPhone = "Owner Phone must contain only numbers";
  } else if (formData.ownerPhone.trim().length < 10) {
    next.ownerPhone = "Owner Phone number must be at least 10 digits";
  } else if (formData.ownerPhone.trim().length > 10) {
    next.ownerPhone ="Owner Phone number must not exceed 10 digits";
  }

  if(!formData.password.trim()) {
    next.password = "Password is required";
  } else if (formData.password.trim().length < 8) {
    next.password = "Password must be at least 8 characters long";
  }

  setErrors(next);
  setError("");
  return Object.keys(next).length === 0;
};
  const handleSubmit = async () => {
    if (!validate()) return;
    setIsPreviewOpen(false);
    setIsSubmitting(true);

    try {
      const company = formData.slug;
      if (storedPlan) {
        persistSelectedPlan(storedPlan);
      }
      const response = await apiFetch("/api/setup", company, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          selected_plan: storedPlan
            ? {
              plan_id: storedPlan.plan_id,
              plan_name: storedPlan.plan_name,
              amount: storedPlan.amount,
              billing_cycle: storedPlan.billing_cycle,
            }
            : null,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        setError(data?.message || "Unable to create business");
        return;
      }

      const baseOnboardingUrl =
        data?.onboardingUrl || `/setup?company=${encodeURIComponent(formData.slug)}`;
      const onboardingUrl = storedPlan
        ? `${baseOnboardingUrl}&plan_id=${encodeURIComponent(
          storedPlan.plan_id
        )}&billing_cycle=${encodeURIComponent(storedPlan.billing_cycle)}`
        : baseOnboardingUrl;
      router.push(onboardingUrl);
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-semibold text-blue-700">Onboarding Step 1 of 7</p>
          <p className="mt-1 text-sm text-blue-600">
            Create your account and company workspace.
          </p>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Create Your Company Account</h2>
          <p className="text-lg text-gray-600">
            We will create your tenant schema, admin account, and start onboarding.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <form onSubmit={handleOpenPreview} className="space-y-8">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {storedPlan && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center justify-between flex-wrap gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>
                    Selected Plan: <span className="font-semibold">{storedPlan.plan_name}</span>{" "}
                    Rs.{Number(storedPlan.amount || 0).toLocaleString("en-IN")} /{" "}
                    {storedPlan.billing_cycle === "yearly" ? "year" : "month"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPlan}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-semibold border border-red-200 transition-all text-xs flex items-center gap-1 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Cancel Plan
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900">Business Details</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className={inputClass("businessName")}
                  />
                  {errors.businessName && (
                    <p className="mt-2 text-sm text-red-600">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website URL<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <div
                    className={`flex items-center rounded-lg overflow-hidden ${
                      errors.slug ? "border border-red-500" : "border border-gray-300"
                    }`}
                  >
                    <span className="bg-gray-100 px-4 py-3 text-gray-600 text-sm">
                      digistorii/
                    </span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.trim().toLowerCase(),
                        })
                      }
                      className="flex-1 px-4 py-3 focus:outline-none"
                      placeholder="your-company"
                    />
                  </div>
                  {errors.slug && (
                    <p className="mt-2 text-sm text-red-600">{errors.slug}</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900">Owner Account</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Name<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className={inputClass("ownerName")}
                  />
                  {errors.ownerName && (
                    <p className="mt-2 text-sm text-red-600">{errors.ownerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Email<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className={inputClass("ownerEmail")}
                  />
                  {errors.ownerEmail && (
                    <p className="mt-2 text-sm text-red-600">{errors.ownerEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Phone<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className={inputClass("ownerPhone")}
                  />
                  {errors.ownerPhone && (
                    <p className="mt-2 text-sm text-red-600">{errors.ownerPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password for Admin Portal<span className="ml-1 text-red-600 text-base font-semibold">*</span>
                  </label>
                  <div
                    className={`flex items-center rounded-lg border ${
                      errors.password ? "border-red-500 focus-within:ring-red-400" : "border-gray-300 focus-within:ring-blue-500"
                    }`}
                  >
                    <input
                      type={showPassword ? "text" : "password"}
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-l-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="px-4 py-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              {/* Left Side: Small, low-contrast escape hatch */}
              <button
                type="button"
                onClick={handleCancelPlan}
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg font-semibold text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                {storedPlan ? "Cancel Plan & Return" : "Back to Pricing"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex-1 sm:flex-none text-center"
              >
                {isSubmitting ? "Creating..." : "Create Account & Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/* --- PREVIEW DIALOG MODAL --- */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
  Confirm Workspace Details
</h3>

<p className="text-sm text-gray-500 mb-6">
  Please review your workspace details before continuing. If you can't complete the setup now, you can sign in later using your workspace URL and continue from where you left off.
</p>

            <div className="space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-500 font-medium">Company Name:</span>
                <span className="col-span-2 text-gray-900 font-semibold break-words">{formData.businessName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-500 font-medium">Admin Console URL:</span>
                <span className="col-span-2 text-blue-600 font-semibold break-all">
                  digistorii/{formData.slug}/admin
                </span>
                <span className="text-gray-500 font-medium">Workspace URL:</span>
                <span className="col-span-2 text-blue-600 font-semibold break-all">
                  digistorii/{formData.slug}/workspace
                </span>
              </div>
              <hr className="border-gray-200" />
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-500 font-medium">Owner Name:</span>
                <span className="col-span-2 text-gray-900 font-semibold break-words">{formData.ownerName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-500 font-medium">Email Address:</span>
                <span className="col-span-2 text-gray-900 font-semibold break-all">{formData.ownerEmail}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-500 font-medium">Phone Number:</span>
                <span className="col-span-2 text-gray-900 font-semibold">{formData.ownerPhone || "—"}</span>
              </div>
            </div>

            {/* <p className="mt-6 text-xs text-gray-500 text-center">
              Are these details correct? You can go back to make changes if necessary.
            </p> */}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-full sm:flex-1 px-5 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full sm:flex-1 px-5 py-3 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-md text-center"
              >
                Confirm & Proceed to Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
