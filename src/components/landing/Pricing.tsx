"use client";
import { useState } from "react";
 
export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState("Growth");
 
  const plans = [
    {
      name: "Starter",
      price: "₹999",
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
      price: "₹1999",
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
      price: "₹3999",
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
 
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
 
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transparent Pricing for Every Business Stage
          </h2>
          <p className="text-lg text-gray-600">
            Click a plan to select it.
          </p>
        </div>
 
        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const isSelected = selectedPlan === plan.name;
 
            return (
              <div
                key={idx}
                onClick={() => setSelectedPlan(plan.name)}
                className={`cursor-pointer relative rounded-3xl p-10 transition-all duration-300 ${
                  isSelected
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
                        className={`w-5 h-5 mt-1 rounded-full flex items-center justify-center text-xs ${
                          isSelected
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
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isSelected
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Get Started
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
 