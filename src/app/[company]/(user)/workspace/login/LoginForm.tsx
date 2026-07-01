"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeOff, HiMail } from "react-icons/hi";
import { useUser } from "@/context/CurrentUserContext";
import { ShoppingCartIcon, CubeIcon, DocumentTextIcon, CurrencyRupeeIcon } from "@heroicons/react/24/outline";
interface Props {
  company: string;
}

export default function LoginForm({ company }: Props) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { setUser } = useUser();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    setYear(new Date().getFullYear());
  }, []);

  // if (!mounted) return null;

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company) {
      setError("Company not found");
      return;
    }

    if (!email) {
      setError("Please enter your email");
      return;
    }
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth/login?company=${company}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        try {
          const onboardingRes = await fetch(
            `/api/onboarding?company=${encodeURIComponent(company)}`
          );
          const onboardingData = await onboardingRes.json();
          if (
            onboardingRes.ok &&
            onboardingData?.success &&
            onboardingData?.company?.setup_stage !== "LIVE"
          ) {
            router.push(`/setup?company=${encodeURIComponent(company)}`);
            return;
          }
        } catch {
          // Fall back to regular route if onboarding status check fails.
        }
        router.push(`/${company}/workspace`);
        // router.refresh();
      } else {
        console.log("Data Error : ", data.message);
        setError(data.message || "Login failed");
        setLoading(false);
      }
    } catch (error) {
      setError("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 relative overflow-hidden">

      {/* Animated Background Blobs */}
      <div className="absolute w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-3xl top-[-100px] left-[-100px] animate-pulse"></div>
      <div className="absolute w-[400px] h-[400px] bg-purple-400/30 rounded-full blur-3xl bottom-[-120px] right-[-100px] animate-pulse"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/30">

        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white p-12 relative overflow-hidden">

          {/* Soft light effects */}
          <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl top-[-80px] left-[-60px]" />
          <div className="absolute w-[300px] h-[300px] bg-purple-300/20 rounded-full blur-3xl bottom-[-100px] right-[-60px]" />

          <h1 className="text-4xl font-bold tracking-wide z-10 mb-4">
            {company}
          </h1>

          {/* Description */}
          <p className="text-blue-100 text-center max-w-sm z-10 mb-10 leading-relaxed">
            Manage customers, suppliers, inventory, purchases, GRN, sales and
            complete business operations in one unified platform.
          </p>

          {/* Professional Feature Icons (NO PEOPLE) */}
          <div className="flex flex-col items-center gap-6 z-10">

            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg text-lg">
                <ShoppingCartIcon className="h-7 w-7 text-blue-600" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-lg text-lg">
                <CubeIcon className="h-7 w-7 text-blue-600" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-lg text-lg">
                <DocumentTextIcon className="h-7 w-7 text-blue-600" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-lg text-lg">
                <CurrencyRupeeIcon className="h-7 w-7 text-blue-600" />
              </div>
            </div>

            {/* Text */}
            <span className="text-sm text-blue-100 tracking-wide text-center">
              Purchase • Inventory • Billing • Accounting
            </span>

            <p className="text-xs text-blue-200 text-center max-w-xs leading-relaxed">
              Built for modern businesses to streamline operations and manage finances efficiently
            </p>


          </div>

        </div>

        {/*  RIGHT SIDE (Login Form) */}
        <div className="p-10 space-y-6">

          {/* Logo */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-14 h-14 flex items-center justify-center rounded-xl text-xl font-bold shadow-lg">
              {company?.charAt(0).toUpperCase()}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800">
            Welcome Back
          </h2>

          <p className="text-center text-gray-500">
            Login to manage your business
          </p>

          {error && (
            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white/70"
              />
              <label className="absolute left-4 top-2 text-gray-500 text-sm
    peer-placeholder-shown:top-3.5
    peer-placeholder-shown:text-base
    peer-focus:top-2
    peer-focus:text-sm transition-all">
                Email
              </label>
              {/* Right Email Icon */}
              <HiMail
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white/70"
              />
              <label className="absolute left-4 top-2 text-gray-500 text-sm
    peer-placeholder-shown:top-3.5
    peer-placeholder-shown:text-base
    peer-focus:top-2
    peer-focus:text-sm transition-all">
                Password
              </label>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500"
              >
                {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
              </button>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>
          </form>

          <div className="text-center text-gray-500 text-sm">
            © {year} {company}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg animate-pulse">
            Logging in...
          </div>
        </div>
      )}
    </div>
  );
}
