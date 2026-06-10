"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";
import Pricing from "@/components/landing/Pricing";
import {
  BillingInterval,
  ONBOARDING_STEPS,
  PLAN_CONFIG,
  PlanCode,
  SetupStage,
  getNextStepNumber,
  normalizeBillingInterval,
} from "@/lib/onboarding";

type WizardProps = {
  company: string;
};

type StaffMember = {
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "WAREHOUSE_STAFF";
  location_id: string;
  warehouse_id: string;
};

type LocationOption = {
  id: number;
  name: string;
};

type WarehouseOption = {
  id: number;
  name: string;
  location_id: number;
};

type LocationSetupForm = {
  name: string;
  type: "global" | "local";
  inactive_date: string;
  same_as_ship_to: boolean;
  description: string;
  number: string;
  building: string;
  street: string;
  locality: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  landline: string;
  mobile: string;
  fax: string;
  email: string;
  contact_person: string;
  ship_to_location: string;
  ship_to_site: boolean;
  receiving_site: boolean;
  office_site: boolean;
  bill_to_site: boolean;
  internal_site: boolean;
  is_default: boolean;
};

type WarehouseSetupForm = {
  code: string;
  name: string;
  location_id: string;
  type: "global" | "local";
  address: string;
  effective_from: string;
  effective_to: string;
  description: string;
  landline: string;
  mobile_no: string;
  fax: string;
  email: string;
  contact_person_name: string;
  contact_person_mobile: string;
  contact_person_email: string;
  pan: string;
  gstin: string;
  is_default: boolean;
};

type StatusResponse = {
  success: boolean;
  company?: {
    id: number;
    name: string;
    slug: string;
    setup_stage: SetupStage;
    next_step: number;
  };
  subscription?: {
    plan_code: PlanCode;
    ecommerce_access: boolean;
    max_users: number;
    max_locations: number;
    max_warehouses: number;
    status: string;
    billing_interval?: BillingInterval;
    amount?: number;
  } | null;
  business_settings?: {
    gst_number?: string | null;
    pan_number?: string | null;
    business_address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    currency?: string | null;
    timezone?: string | null;
    invoice_prefix?: string | null;
  } | null;
  counts?: {
    locations: number;
    warehouses: number;
    payment_modes: number;
    users: number;
  };
  message?: string;
};

type SaveResponse = {
  success: boolean;
  setup_stage?: SetupStage;
  next_step?: number;
  subscription?: {
    plan_code: PlanCode;
    ecommerce_access: boolean;
    max_users: number;
    max_locations: number;
    max_warehouses: number;
    status: string;
    billing_interval?: BillingInterval;
    amount?: number;
  } | null;
  message?: string;
};

type CreateOrderResponse = {
  success: boolean;
  order?: {
    id: string;
    amount: number;
    currency: string;
  };
  payment?: {
    id: number;
  };
  billing_interval?: BillingInterval;
  amount_inr?: number;
  message?: string;
};

type RazorpayHandlerResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: { error?: { description?: string; reason?: string } }) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const defaultBusinessSettings = {
  gst_number: "",
  pan_number: "",
  business_address: "",
  city: "",
  state: "",
  country: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  invoice_prefix: "INV",
};

const defaultWarehouse = {
  code: "",
  name: "",
  location_id: "",
  type: "global" as const,
  address: "",
  effective_from: "",
  effective_to: "",
  description: "",
  landline: "",
  mobile_no: "",
  fax: "",
  email: "",
  contact_person_name: "",
  contact_person_mobile: "",
  contact_person_email: "",
  pan: "",
  gstin: "",
  is_default: true,
};

const defaultLocation: LocationSetupForm = {
  name: "",
  type: "global",
  inactive_date: "",
  same_as_ship_to: false,
  description: "",
  number: "",
  building: "",
  street: "",
  locality: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
  landline: "",
  mobile: "",
  fax: "",
  email: "",
  contact_person: "",
  ship_to_location: "",
  ship_to_site: false,
  receiving_site: false,
  office_site: false,
  bill_to_site: false,
  internal_site: false,
  is_default: true,
};

const loadRazorpayScript = () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

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

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="min-w-[900px] grid gap-3"
        style={{ gridTemplateColumns: `repeat(${ONBOARDING_STEPS.length}, minmax(0, 1fr))` }}
      >
        {ONBOARDING_STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? "bg-green-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isCurrent ? "text-blue-700" : isCompleted ? "text-green-700" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OnboardingWizard({ company }: WizardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<SetupStage>("ACCOUNT_CREATED");
  const [currentStep, setCurrentStep] = useState(2);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<BillingInterval>("monthly");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [subscription, setSubscription] = useState<StatusResponse["subscription"]>(null);
  const [businessSettings, setBusinessSettings] = useState(defaultBusinessSettings);
  const [location, setLocation] = useState(defaultLocation);
  const [warehouse, setWarehouse] = useState(defaultWarehouse);
  const [customModes, setCustomModes] = useState<string[]>([]);
  const [modeInput, setModeInput] = useState("");
  const [staffUsers, setStaffUsers] = useState<StaffMember[]>([]);
  const [companyName, setCompanyName] = useState(company);

  const planLimits = useMemo(() => {
    if (subscription) {
      return {
        maxUsers: subscription.max_users,
        maxLocations: subscription.max_locations,
        maxWarehouses: subscription.max_warehouses,
        ecommerceAccess: subscription.ecommerce_access,
      };
    }
    return {
      maxUsers: PLAN_CONFIG.BASIC.max_users,
      maxLocations: PLAN_CONFIG.BASIC.max_locations,
      maxWarehouses: PLAN_CONFIG.BASIC.max_warehouses,
      ecommerceAccess: PLAN_CONFIG.BASIC.ecommerce_access,
    };
  }, [subscription]);

  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const selectedBusinessCountry = useMemo(
    () => countryOptions.find((entry) => entry.name === businessSettings.country),
    [countryOptions, businessSettings.country]
  );
  const businessStateOptions = useMemo(
    () =>
      selectedBusinessCountry
        ? State.getStatesOfCountry(selectedBusinessCountry.isoCode)
        : [],
    [selectedBusinessCountry]
  );
  const selectedBusinessState = useMemo(
    () => businessStateOptions.find((entry) => entry.name === businessSettings.state),
    [businessStateOptions, businessSettings.state]
  );
  const businessCityOptions = useMemo(
    () =>
      selectedBusinessCountry && selectedBusinessState
        ? City.getCitiesOfState(selectedBusinessCountry.isoCode, selectedBusinessState.isoCode)
        : [],
    [selectedBusinessCountry, selectedBusinessState]
  );

  const selectedLocationCountry = useMemo(
    () => countryOptions.find((entry) => entry.name === location.country),
    [countryOptions, location.country]
  );
  const locationStateOptions = useMemo(
    () =>
      selectedLocationCountry
        ? State.getStatesOfCountry(selectedLocationCountry.isoCode)
        : [],
    [selectedLocationCountry]
  );
  const selectedLocationState = useMemo(
    () => locationStateOptions.find((entry) => entry.name === location.state),
    [locationStateOptions, location.state]
  );
  const locationCityOptions = useMemo(
    () =>
      selectedLocationCountry && selectedLocationState
        ? City.getCitiesOfState(selectedLocationCountry.isoCode, selectedLocationState.isoCode)
        : [],
    [selectedLocationCountry, selectedLocationState]
  );

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/onboarding?company=${encodeURIComponent(company)}`, {
        headers: { "x-tenant": company },
      });
      const data = (await res.json()) as StatusResponse;
      if (!res.ok || !data.success || !data.company) {
        setError(data?.message || "Unable to load onboarding status");
        return;
      }

      setCompanyName(data.company.name || company);
      setCompanyId(data.company.id);
      setStage(data.company.setup_stage);
      setCurrentStep(data.company.next_step || getNextStepNumber(data.company.setup_stage));
      setSubscription(data.subscription || null);
      if (data.subscription?.plan_code) {
        setSelectedPlan(data.subscription.plan_code);
      }
      if (data.subscription?.billing_interval) {
        setSelectedBillingInterval(normalizeBillingInterval(data.subscription.billing_interval));
      }
      if (data.business_settings) {
        setBusinessSettings({
          gst_number: data.business_settings.gst_number || "",
          pan_number: data.business_settings.pan_number || "",
          business_address: data.business_settings.business_address || "",
          city: data.business_settings.city || "",
          state: data.business_settings.state || "",
          country: data.business_settings.country || "",
          currency: data.business_settings.currency || "INR",
          timezone: data.business_settings.timezone || "Asia/Kolkata",
          invoice_prefix: data.business_settings.invoice_prefix || "INV",
        });
      }
    } catch {
      setError("Unable to load onboarding status.");
    } finally {
      setLoading(false);
    }
  };

  const loadLocationOptions = async () => {
    try {
      const res = await fetch("/api/locations", {
        headers: { "x-tenant": company },
      });
      const data = (await res.json()) as { success?: boolean; data?: Array<{ id: number; name: string }> };
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        return;
      }
      const options = data.data.map((entry) => ({
        id: Number(entry.id),
        name: String(entry.name || ""),
      }));
      setLocationOptions(options);
    } catch {
      return;
    }
  };

  const loadWarehouseOptions = async () => {
    try {
      const res = await fetch("/api/warehouses", {
        headers: { "x-tenant": company },
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: Array<{ id: number; name: string; location_id: number }>;
      };
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        return;
      }
      const options = data.data.map((entry) => ({
        id: Number(entry.id),
        name: String(entry.name || ""),
        location_id: Number(entry.location_id),
      }));
      setWarehouseOptions(options);
    } catch {
      return;
    }
  };

  useEffect(() => {
    loadStatus();
    loadLocationOptions();
    loadWarehouseOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => {
    if (!warehouse.location_id && locationOptions.length > 0) {
      setWarehouse((prev) => ({ ...prev, location_id: String(locationOptions[0].id) }));
    }
  }, [locationOptions, warehouse.location_id]);

  useEffect(() => {
    const defaultLocationId = locationOptions[0] ? String(locationOptions[0].id) : "";
    const defaultWarehouseId = warehouseOptions[0] ? String(warehouseOptions[0].id) : "";
    if (!defaultLocationId && !defaultWarehouseId) return;

    setStaffUsers((prev) =>
      prev.map((member) => {
        const locationId = member.location_id || defaultLocationId;
        const warehouseForLocation = warehouseOptions.find(
          (warehouseOption) => String(warehouseOption.location_id) === String(locationId)
        );
        return {
          ...member,
          location_id: locationId,
          warehouse_id:
            member.warehouse_id ||
            (warehouseForLocation ? String(warehouseForLocation.id) : defaultWarehouseId),
        };
      })
    );
  }, [locationOptions, warehouseOptions]);

  const saveStep = async (step: string, data: Record<string, unknown> = {}) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        body: JSON.stringify({
          company,
          step,
          data,
        }),
      });
      const result = (await res.json()) as SaveResponse;
      if (!res.ok || !result.success) {
        setError(result?.message || "Unable to save this step.");
        return false;
      }

      if (result.setup_stage) setStage(result.setup_stage);
      if (typeof result.next_step === "number") {
        setCurrentStep(result.next_step);
      }
      if (result.subscription) {
        setSubscription(result.subscription);
        setSelectedPlan(result.subscription.plan_code);
        if (result.subscription.billing_interval) {
          setSelectedBillingInterval(normalizeBillingInterval(result.subscription.billing_interval));
        }
      }
      return true;
    } catch {
      setError("Unable to save this step.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveStep("BUSINESS_SETUP", businessSettings);
  };

  const handleWarehouseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await saveStep("WAREHOUSE_SETUP", warehouse);
    if (success) {
      await loadWarehouseOptions();
    }
  };

  const handleLocationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await saveStep("LOCATION_SETUP", location);
    if (success) {
      setLocation(defaultLocation);
      await loadLocationOptions();
    }
  };

  const handlePaymentSubmit = async () => {
    await saveStep("PAYMENT_SETUP", { custom_modes: customModes });
  };

  const handleStaffSubmit = async () => {
    await saveStep("STAFF_SETUP", { users: staffUsers });
  };

  const handlePlanContinue = async (plan: PlanCode, billingInterval: BillingInterval = "monthly") => {
    if (saving) return;
    if (!companyId) {
      setError("Unable to initiate payment. Please refresh and try again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: plan,
          billing_interval: billingInterval,
          company_id: companyId,
        }),
      });

      const orderData = (await orderRes.json()) as CreateOrderResponse;
      if (!orderRes.ok || !orderData.success || !orderData.order) {
        setError(orderData?.message || "Unable to initiate payment. Please try again.");
        setSaving(false);
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        setError("Unable to load payment gateway. Please try again.");
        setSaving(false);
        return;
      }

      const options: RazorpayCheckoutOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SdIB9ZLZsIayDT",
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: companyName || company,
        description: `${plan} Plan (${billingInterval === "yearly" ? "Yearly" : "Monthly"})`,
        order_id: orderData.order.id,
        handler: async (response) => {
          const paymentId = response.razorpay_payment_id;
          if (!paymentId) {
            setError("Payment failed. Please try again.");
            setSaving(false);
            return;
          }
          await saveStep("PLAN_SELECTED", {
            plan,
            billing_interval: billingInterval,
            payment_status: "SUCCESS",
            payment_id: paymentId,
            razorpay_order_id: response.razorpay_order_id || orderData.order?.id || null,
            razorpay_signature: response.razorpay_signature || null,
          });
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. Please complete payment to continue.");
            setSaving(false);
          },
        },
        theme: {
          color: "#2563eb",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", (response) => {
        setError(
          response?.error?.description ||
            response?.error?.reason ||
            "Payment failed. Please try again."
        );
        setSaving(false);
      });
      paymentObject.open();
    } catch {
      setError("Unable to initiate payment. Please try again.");
      setSaving(false);
    }
  };

  const addCustomMode = () => {
    const value = modeInput.trim();
    if (!value) return;
    if (customModes.some((m) => m.toLowerCase() === value.toLowerCase())) return;
    setCustomModes((prev) => [...prev, value]);
    setModeInput("");
  };

  const addStaffRow = () => {
    const defaultLocationId = locationOptions[0] ? String(locationOptions[0].id) : "";
    const defaultWarehouse =
      warehouseOptions.find((option) => String(option.location_id) === defaultLocationId) ||
      warehouseOptions[0];
    const defaultWarehouseId = defaultWarehouse ? String(defaultWarehouse.id) : "";
    setStaffUsers((prev) => [
      ...prev,
      {
        name: "",
        email: "",
        phone: "",
        role: "CASHIER",
        location_id: defaultLocationId,
        warehouse_id: defaultWarehouseId,
      },
    ]);
  };

  const updateStaffRow = (index: number, patch: Partial<StaffMember>) => {
    setStaffUsers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, ...patch } : member))
    );
  };

  const removeStaffRow = (index: number) => {
    setStaffUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const formFieldClass =
    "w-full mt-2 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500";
  const formLabelClass = "text-sm font-semibold mb-1 block";
  const checkboxClass = "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500";

  if (loading) {
    return <div className="text-gray-600">Loading onboarding wizard...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">Company Onboarding</h1>
        <p className="text-sm text-gray-600">
          Company: <span className="font-semibold">{companyName}</span> ({company})
        </p>
        <Stepper currentStep={currentStep} />
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {currentStep === 2 && (
          <Pricing
            mode="onboarding"
            selectedPlan={selectedPlan}
            selectedBillingInterval={selectedBillingInterval}
            onSelectPlan={setSelectedPlan}
            onSelectBillingInterval={setSelectedBillingInterval}
            onContinue={handlePlanContinue}
            loading={saving}
          />
        )}

        {currentStep === 3 && (
          <form onSubmit={handleBusinessSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-gray-900">Step 3: Business Setup</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className={formLabelClass}>GST Number</label>
                <input
                  type="text"
                  value={businessSettings.gst_number}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, gst_number: e.target.value }))
                  }
                  placeholder="Optional"
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>PAN Number</label>
                <input
                  type="text"
                  value={businessSettings.pan_number}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, pan_number: e.target.value }))
                  }
                  placeholder="Optional"
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Country</label>
                <select
                  value={businessSettings.country}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({
                      ...prev,
                      country: e.target.value,
                      state: "",
                      city: "",
                    }))
                  }
                  className={formFieldClass}
                >
                  <option value="">Select Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className={formLabelClass}>Business Address</label>
                <textarea
                  value={businessSettings.business_address}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, business_address: e.target.value }))
                  }
                  rows={3}
                  placeholder="Optional"
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>State</label>
                <select
                  value={businessSettings.state}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, state: e.target.value, city: "" }))
                  }
                  className={formFieldClass}
                >
                  <option value="">Select State</option>
                  {businessStateOptions.map((state) => (
                    <option key={state.isoCode} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>City</label>
                <select
                  value={businessSettings.city}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className={formFieldClass}
                >
                  <option value="">Select City</option>
                  {businessCityOptions.map((city) => (
                    <option
                      key={`${city.name}-${city.latitude}-${city.longitude}`}
                      value={city.name}
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>Currency</label>
                <input
                  type="text"
                  value={businessSettings.currency}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, currency: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Timezone</label>
                <input
                  type="text"
                  value={businessSettings.timezone}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Invoice Prefix</label>
                <input
                  type="text"
                  value={businessSettings.invoice_prefix}
                  onChange={(e) =>
                    setBusinessSettings((prev) => ({ ...prev, invoice_prefix: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        )}

        {currentStep === 4 && (
          <form onSubmit={handleLocationSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-gray-900">Step 4: Location Setup</h2>
            <p className="text-sm text-gray-600">
              Plan limit: {planLimits.maxLocations} location(s)
            </p>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className={formLabelClass}>
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location.name}
                  onChange={(e) => setLocation((prev) => ({ ...prev, name: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Type</label>
                <select
                  value={location.type}
                  onChange={(e) =>
                    setLocation((prev) => ({
                      ...prev,
                      type: e.target.value as LocationSetupForm["type"],
                    }))
                  }
                  className={formFieldClass}
                >
                  <option value="global">Global</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label className={formLabelClass}>Inactive Date</label>
                <input
                  type="date"
                  value={location.inactive_date}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, inactive_date: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={formLabelClass}>Description</label>
                <textarea
                  value={location.description}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional"
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Address Number</label>
                <input
                  type="text"
                  value={location.number}
                  onChange={(e) => setLocation((prev) => ({ ...prev, number: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Building</label>
                <input
                  type="text"
                  value={location.building}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, building: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Street</label>
                <input
                  type="text"
                  value={location.street}
                  onChange={(e) => setLocation((prev) => ({ ...prev, street: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Locality</label>
                <input
                  type="text"
                  value={location.locality}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, locality: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Country</label>
                <select
                  value={location.country}
                  onChange={(e) =>
                    setLocation((prev) => ({
                      ...prev,
                      country: e.target.value,
                      state: "",
                      city: "",
                    }))
                  }
                  className={formFieldClass}
                >
                  <option value="">Select Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>State</label>
                <select
                  value={location.state}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, state: e.target.value, city: "" }))
                  }
                  className={formFieldClass}
                >
                  <option value="">Select State</option>
                  {locationStateOptions.map((state) => (
                    <option key={state.isoCode} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>City</label>
                <select
                  value={location.city}
                  onChange={(e) => setLocation((prev) => ({ ...prev, city: e.target.value }))}
                  className={formFieldClass}
                >
                  <option value="">Select City</option>
                  {locationCityOptions.map((city) => (
                    <option
                      key={`${city.name}-${city.latitude}-${city.longitude}`}
                      value={city.name}
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>Pincode</label>
                <input
                  type="text"
                  value={location.pincode}
                  onChange={(e) => setLocation((prev) => ({ ...prev, pincode: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Landline</label>
                <input
                  type="text"
                  value={location.landline}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, landline: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Mobile</label>
                <input
                  type="text"
                  value={location.mobile}
                  onChange={(e) => setLocation((prev) => ({ ...prev, mobile: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Fax</label>
                <input
                  type="text"
                  value={location.fax}
                  onChange={(e) => setLocation((prev) => ({ ...prev, fax: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Email</label>
                <input
                  type="email"
                  value={location.email}
                  onChange={(e) => setLocation((prev) => ({ ...prev, email: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Contact Person</label>
                <input
                  type="text"
                  value={location.contact_person}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, contact_person: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={formLabelClass}>Ship To Location</label>
                <input
                  type="text"
                  value={location.ship_to_location}
                  onChange={(e) =>
                    setLocation((prev) => ({ ...prev, ship_to_location: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div className="md:col-span-3 rounded-lg border border-gray-200 p-4">
                <p className={`${formLabelClass} mb-3`}>Location Flags</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.same_as_ship_to}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, same_as_ship_to: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Same as Ship To
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.is_default}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, is_default: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Mark as default location
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.ship_to_site}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, ship_to_site: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Ship To Site
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.receiving_site}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, receiving_site: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Receiving Site
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.office_site}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, office_site: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Office Site
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.bill_to_site}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, bill_to_site: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Bill To Site
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={location.internal_site}
                      onChange={(e) =>
                        setLocation((prev) => ({ ...prev, internal_site: e.target.checked }))
                      }
                      className={checkboxClass}
                    />
                    Internal Site
                  </label>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        )}

        {currentStep === 5 && (
          <form onSubmit={handleWarehouseSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-gray-900">Step 5: Warehouse Setup</h2>
            <p className="text-sm text-gray-600">
              Plan limit: {planLimits.maxWarehouses} warehouse(s)
            </p>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className={formLabelClass}>
                  Warehouse Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={warehouse.code}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, code: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>
                  Warehouse Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={warehouse.name}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, name: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>
                  Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={warehouse.location_id}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, location_id: e.target.value }))
                  }
                  className={formFieldClass}
                  required
                >
                  <option value="">Select Location</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>Type</label>
                <select
                  value={warehouse.type}
                  onChange={(e) =>
                    setWarehouse((prev) => ({
                      ...prev,
                      type: e.target.value as WarehouseSetupForm["type"],
                    }))
                  }
                  className={formFieldClass}
                >
                  <option value="global">Global</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={formLabelClass}>Address</label>
                <input
                  type="text"
                  value={warehouse.address}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, address: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Effective From</label>
                <input
                  type="date"
                  value={warehouse.effective_from}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, effective_from: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Effective To</label>
                <input
                  type="date"
                  value={warehouse.effective_to}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, effective_to: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Description</label>
                <input
                  type="text"
                  value={warehouse.description}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Landline</label>
                <input
                  type="text"
                  value={warehouse.landline}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, landline: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Mobile</label>
                <input
                  type="text"
                  value={warehouse.mobile_no}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, mobile_no: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Fax</label>
                <input
                  type="text"
                  value={warehouse.fax}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, fax: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Email</label>
                <input
                  type="email"
                  value={warehouse.email}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, email: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Contact Person Name</label>
                <input
                  type="text"
                  value={warehouse.contact_person_name}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, contact_person_name: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Contact Person Mobile</label>
                <input
                  type="text"
                  value={warehouse.contact_person_mobile}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, contact_person_mobile: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>Contact Person Email</label>
                <input
                  type="email"
                  value={warehouse.contact_person_email}
                  onChange={(e) =>
                    setWarehouse((prev) => ({ ...prev, contact_person_email: e.target.value }))
                  }
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>PAN</label>
                <input
                  type="text"
                  value={warehouse.pan}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, pan: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div>
                <label className={formLabelClass}>GSTIN</label>
                <input
                  type="text"
                  value={warehouse.gstin}
                  onChange={(e) => setWarehouse((prev) => ({ ...prev, gstin: e.target.value }))}
                  className={formFieldClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={warehouse.is_default}
                    onChange={(e) =>
                      setWarehouse((prev) => ({ ...prev, is_default: e.target.checked }))
                    }
                    className={checkboxClass}
                  />
                  Mark as default warehouse
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        )}

        {currentStep === 6 && (
          <div className="space-y-6 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-gray-900">Step 6: Payment Modes</h2>
            <p className="text-sm text-gray-600">
              Default methods: Cash, UPI, Card. Add custom modes below.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className={formLabelClass}>Custom Payment Mode</label>
                <input
                  value={modeInput}
                  onChange={(e) => setModeInput(e.target.value)}
                  placeholder="Enter mode name (optional)"
                  className={formFieldClass}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addCustomMode}
                  className="rounded-lg bg-gray-800 px-4 py-3 text-white text-sm font-semibold w-full"
                >
                  Add
                </button>
              </div>
            </div>
            {customModes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customModes.map((mode) => (
                  <span
                    key={mode}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs"
                  >
                    {mode}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomModes((prev) => prev.filter((entry) => entry !== mode))
                      }
                      className="text-gray-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handlePaymentSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-6 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-gray-900">Step 7: Staff Setup</h2>
            <p className="text-sm text-gray-600">Plan user limit: {planLimits.maxUsers}</p>
            <button
              type="button"
              onClick={addStaffRow}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Staff
            </button>
            <div className="space-y-3">
              {staffUsers.map((user, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className={formLabelClass}>
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={user.name}
                        onChange={(e) => updateStaffRow(index, { name: e.target.value })}
                        className={formFieldClass}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={user.email}
                        onChange={(e) => updateStaffRow(index, { email: e.target.value })}
                        className={formFieldClass}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={user.phone}
                        onChange={(e) => updateStaffRow(index, { phone: e.target.value })}
                        className={formFieldClass}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          updateStaffRow(index, {
                            role: e.target.value as StaffMember["role"],
                          })
                        }
                        className={formFieldClass}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="CASHIER">CASHIER</option>
                        <option value="WAREHOUSE_STAFF">WAREHOUSE_STAFF</option>
                      </select>
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Location <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={user.location_id}
                        onChange={(e) => {
                          const nextLocationId = e.target.value;
                          const selectedWarehouseMatchesLocation = warehouseOptions.some(
                            (wh) =>
                              String(wh.id) === user.warehouse_id &&
                              String(wh.location_id) === nextLocationId
                          );
                          updateStaffRow(index, {
                            location_id: nextLocationId,
                            warehouse_id: selectedWarehouseMatchesLocation ? user.warehouse_id : "",
                          });
                        }}
                        className={formFieldClass}
                        required
                      >
                        <option value="">Select Location</option>
                        {locationOptions.map((loc) => (
                          <option key={loc.id} value={String(loc.id)}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={user.warehouse_id}
                        onChange={(e) => updateStaffRow(index, { warehouse_id: e.target.value })}
                        className={formFieldClass}
                        required
                      >
                        <option value="">Select Warehouse</option>
                        {warehouseOptions
                          .filter(
                            (wh) =>
                              !user.location_id ||
                              String(wh.location_id) === String(user.location_id)
                          )
                          .map((wh) => (
                          <option key={wh.id} value={String(wh.id)}>
                            {wh.name}
                          </option>
                          ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeStaffRow(index)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-red-600 font-semibold w-full md:w-auto"
                      >
                        Remove Staff
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleStaffSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Step 8: Launch</h2>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm">
              <p>
                Admin URL:{" "}
                <span className="font-semibold">{`admin.getyourwebsite.com/${company}`}</span>
              </p>
              <p>
                Store URL:{" "}
                <span className="font-semibold">{`getyourwebsite.com/${company}`}</span>
              </p>
              <p>
                Ecommerce:{" "}
                <span className={planLimits.ecommerceAccess ? "text-green-600" : "text-gray-600"}>
                  {planLimits.ecommerceAccess ? "Enabled" : "Disabled"}
                </span>
              </p>
              <p>User limit: {planLimits.maxUsers}</p>
              <p>Location limit: {planLimits.maxLocations}</p>
              <p>Warehouse limit: {planLimits.maxWarehouses}</p>
            </div>
            {stage !== "LIVE" ? (
              <button
                type="button"
                onClick={async () => {
                  await saveStep("LIVE");
                }}
                disabled={saving}
                className="rounded-lg bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-70"
              >
                {saving ? "Launching..." : "Launch Company"}
              </button>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Onboarding completed. Your tenant is now LIVE.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
