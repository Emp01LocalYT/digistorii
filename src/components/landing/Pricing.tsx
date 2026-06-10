"use client";

import Link from "next/link";
import {
  BillingInterval,
  PAID_PLAN_CODES,
  PLAN_CONFIG,
  PLAN_PRICING,
  PlanCode,
} from "@/lib/onboarding";

type PricingProps = {
  mode?: "marketing" | "onboarding";
  selectedPlan?: PlanCode | null;
  selectedBillingInterval?: BillingInterval;
  onSelectPlan?: (plan: PlanCode) => void;
  onSelectBillingInterval?: (interval: BillingInterval) => void;
  onContinue?: (plan: PlanCode, billingInterval?: BillingInterval) => void;
  loading?: boolean;
};

const PLAN_ORDER = PAID_PLAN_CODES;

export function PlanCards({
  selectedPlan,
  selectedBillingInterval = "monthly",
  onSelectPlan,
  onSelectBillingInterval,
  onContinue,
  loading = false,
}: Omit<PricingProps, "mode">) {
  return (
    <div className="space-y-6">
      {onSelectBillingInterval && (
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => onSelectBillingInterval("monthly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedBillingInterval === "monthly"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onSelectBillingInterval("yearly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedBillingInterval === "yearly"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Yearly
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {PLAN_ORDER.map((planCode) => {
          const plan = PLAN_CONFIG[planCode];
          const isSelected = selectedPlan === planCode;
          const monthlyPrice = PLAN_PRICING[planCode].monthly;
          const yearlyPrice = PLAN_PRICING[planCode].yearly;
          const price = selectedBillingInterval === "yearly" ? yearlyPrice : monthlyPrice;

          return (
            <div
              key={planCode}
              className={`relative rounded-2xl border p-7 transition-all duration-300 cursor-pointer
              ${
                isSelected
                  ? "border-blue-500 bg-blue-50/60 shadow-lg scale-[1.02]"
                  : "border-gray-100 bg-white shadow-sm hover:border-blue-200 hover:shadow-md"
              }`}
            >
              <div
                className={`absolute top-0 left-0 h-1 w-full rounded-t-2xl ${
                  isSelected ? "bg-blue-500" : "bg-transparent"
                }`}
              />

              <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>

              <p className="mt-1 text-xs text-gray-500">
                {plan.ecommerce_access ? "Ecommerce enabled" : "Ecommerce disabled"}
              </p>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-3xl font-semibold text-gray-900">Rs.{price.toLocaleString("en-IN")}</span>
                <span className="text-xs text-gray-400 mb-1">
                  / {selectedBillingInterval === "yearly" ? "year" : "month"}
                </span>
              </div>
              {selectedBillingInterval === "yearly" && (
                <p className="mt-1 text-xs text-green-700">
                  {PLAN_PRICING[planCode].yearly_savings_label} (Rs.
                  {(monthlyPrice * 12).toLocaleString("en-IN")} yearly regular)
                </p>
              )}

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Users</span>
                  <span className="font-medium text-gray-900">{plan.max_users}</span>
                </div>

                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Locations</span>
                  <span className="font-medium text-gray-900">{plan.max_locations}</span>
                </div>

                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Warehouses</span>
                  <span className="font-medium text-gray-900">{plan.max_warehouses}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Ecommerce</span>
                  <span
                    className={`font-medium ${
                      plan.ecommerce_access ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    {plan.ecommerce_access ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {(onSelectPlan || onContinue) && (
                <div className="mt-7 flex gap-2">
                  {onSelectPlan && (
                    <button
                      type="button"
                      onClick={() => onSelectPlan(planCode)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all
                      ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  )}

                  {onContinue && isSelected && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onContinue(planCode, selectedBillingInterval)}
                      className="flex-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-70"
                    >
                      {loading ? "Saving..." : "Continue"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Pricing({
  mode = "marketing",
  selectedPlan = null,
  selectedBillingInterval = "monthly",
  onSelectPlan,
  onSelectBillingInterval,
  onContinue,
  loading = false,
}: PricingProps) {
  if (mode === "onboarding") {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Step 2: Select Plan</h2>
          <p className="mt-1 text-gray-600">
            Choose the plan that matches your business today. You can upgrade later.
          </p>
        </div>
        <PlanCards
          selectedPlan={selectedPlan}
          selectedBillingInterval={selectedBillingInterval}
          onSelectPlan={onSelectPlan}
          onSelectBillingInterval={onSelectBillingInterval}
          onContinue={onContinue}
          loading={loading}
        />
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Simple Plans</h2>
          <p className="text-lg text-gray-600">Start free, then scale when you are ready.</p>
        </div>

        <PlanCards selectedPlan={null} />

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create Your Account
          </Link>
        </div>
      </div>
    </section>
  );
}
