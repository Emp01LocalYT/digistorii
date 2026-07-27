"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeOff, HiMail, HiArrowLeft } from "react-icons/hi";
import { useUser } from "@/context/CurrentUserContext";

interface Props {
  company: string;
}

export default function AdminLoginForm({ company }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const { setUser } = useUser();

  useEffect(() => {
    setMounted(true);
    setYear(new Date().getFullYear());
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isForgotPassword) {
      if (!email) {
        setError("Email is required");
        return;
      }
      setLoading(true);
      try {

        const res = await fetch(`/api/auth/forgot-password?company=${company}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (data.success) {
          setMessage(data.message);
        } else {
          setError(data.message);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenant: company }),
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
          // Fall back to regular route
        }
        router.push(`/${company}/admin`);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50 px-4 relative overflow-hidden">
      <div className="absolute w-[450px] h-[450px] bg-blue-300/20 rounded-full blur-3xl top-[-120px] left-[-100px]" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-300/20 rounded-full blur-3xl bottom-[-120px] right-[-100px]" />

      <div className="w-full max-w-md bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-200 z-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full"></div>

        <div className="p-10 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
              ⚙️
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isForgotPassword ? "Reset Admin Password" : "Admin Portal"}
            </h2>
            <p className="text-sm text-gray-500 text-center">
              {isForgotPassword
                ? "Enter your admin email to receive a reset link"
                : `Secure access to ${company} system`}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder=" "
              />
              <label className="absolute left-4 top-2 text-gray-500 text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm transition-all">
                Admin Email
              </label>
              <HiMail
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500"
              />
            </div>

            {/* Password Field - Hidden during Forgot Password */}
            {!isForgotPassword && (
              <>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-12 bg-white"
                    placeholder=" "
                  />
                  <label className="absolute left-4 top-2 text-gray-500 text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm transition-all">
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {loading
                ? isForgotPassword
                  ? "Sending..."
                  : "Authenticating..."
                : isForgotPassword
                  ? "Send Reset Link"
                  : "Admin Sign In"}
            </button>
          </form>

          {/* Toggle Back to Login */}
          {isForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError("");
                  setMessage("");
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition"
              >
                <HiArrowLeft size={14} /> Back to Admin Sign In
              </button>
            </div>
          )}

          <div className="text-center text-gray-400 text-xs">
            © {year} {company} • Enterprise Admin Access
          </div>
        </div>
      </div>
    </div>
  );
}