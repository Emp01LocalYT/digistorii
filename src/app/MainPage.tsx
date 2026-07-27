"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AboutService from "../components/landing/AboutService";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("tab") === "get" || searchParams.get("plan_id")) {
      const paramsStr = searchParams.toString();
      router.replace(`/get-service${paramsStr ? `?${paramsStr}` : ""}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header/Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Logo Section */}
          <a href="/#home" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">D</span>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                DigiStorii
              </h1>
              <p className="text-sm text-gray-500">
                Smart E-Commerce SaaS
              </p>
            </div>
          </a>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/#home" className="text-sm font-medium text-gray-700 hover:text-gray-900">Home</a>
            <a href="#features" className="text-sm font-medium text-gray-700 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-700 hover:text-gray-900">Pricing</a>
            <a href="#about" className="text-sm font-medium text-gray-700 hover:text-gray-900">About</a>
            <a href="#contact" className="text-sm font-medium text-gray-700 hover:text-gray-900">Contact</a>
          </div>

          {/* Mobile / small screens: keep logo only (spacing preserved) */}
        </div>
      </nav>

      {/* Tab Content */}
      <main>
        <AboutService />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">© 2025 GetYourWebsite. Built for businesses ready to go online.</p>
        </div>
      </footer>
    </div>
  );
}


