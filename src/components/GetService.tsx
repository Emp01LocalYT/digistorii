"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/lib/apiFetch";


export default function GetService() {
  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    businessName: "",
    slug: "",
    password: "",
  });
  const [slugStatus, setSlugStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();



    setIsSubmitting(true);
    setEmailStatus("");

    try {
      const company = formData.slug;

 const response = await apiFetch("/api/setup", company, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.message || "Unable to create business";
        if (String(message).toLowerCase().includes("email")) {
          setEmailStatus("taken");
        }
        alert(message);
        return;
      }

      setEmailStatus("available");
      alert("Business and owner user created successfully!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Launch Your Business Website Today
          </h2>
          <p className="text-lg text-gray-600">
            Fill in the details below and we&apos;ll set up your complete online store in 24 hours
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900">Business Details</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Choose Your Website URL*
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <span className="bg-gray-100 px-4 py-3 text-gray-600 text-sm">
                        getyourwebsite.com/
                      </span>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            slug: e.target.value.trim().toLowerCase(),
                          })
                        }
                        className="flex-1 px-4 py-3 focus:outline-none"
                        placeholder="pizzapalace"
                      />
                    </div>
                  
                  </div>
                  {slugStatus === "available" && (
                    <p className="mt-2 text-sm text-green-600">Slug is available</p>
                  )}
                  {slugStatus === "taken" && (
                    <p className="mt-2 text-sm text-red-600">Slug already taken</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900">Owner Account</h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Owner Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Owner Email*
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {emailStatus === "taken" && (
                    <p className="mt-2 text-sm text-red-600">Email already registered</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password for Admin Portal*
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {isSubmitting ? "Creating..." : "Create My Website"}
            </button>

            <p className="text-center text-sm text-gray-500">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
