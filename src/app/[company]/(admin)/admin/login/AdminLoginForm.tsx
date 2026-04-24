"use client";
 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeOff, HiMail } from "react-icons/hi";
import { useUser } from "@/context/CurrentUserContext";
 
interface Props {
  company: string;
}
 
export default function AdminLoginForm({ company }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const { setUser } = useUser();
 
  useEffect(() => {
    setMounted(true);
    setYear(new Date().getFullYear());
  }, []);
 
  if (!mounted) return null;
 
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
 
    if (!email || !password) {
      setError("All fields are required");
      return;
    }
 
    setLoading(true);
    console.log("Admin Login Tenant : ", company);
    try {
      const res = await fetch(`/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenant: company, }),
      });
 
 
      const data = await res.json();
 
      if (data.success) {
        console.log("success : ", data.success);
        setUser(data.user);
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
 
      {/* Soft Background Glow */}
      <div className="absolute w-[450px] h-[450px] bg-blue-300/20 rounded-full blur-3xl top-[-120px] left-[-100px]" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-300/20 rounded-full blur-3xl bottom-[-120px] right-[-100px]" />
 
      {/* Card */}
      <div className="w-full max-w-md bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-200 z-10">
 
        {/* Top Branding Strip */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full"></div>
 
        <div className="p-10 space-y-6">
 
          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
              ⚙️
            </div>
 
            <h2 className="text-xl font-semibold text-gray-800">
              Admin Portal
            </h2>
 
            <p className="text-sm text-gray-500 text-center">
              Secure access to {company} system
            </p>
          </div>
 
          {/* Error */}
          {error && (
            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
 
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
 
            {/* Email */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <label className="absolute left-4 top-2 text-gray-500 text-sm
    peer-placeholder-shown:top-3.5
    peer-placeholder-shown:text-base
    peer-focus:top-2
    peer-focus:text-sm transition-all">
                Admin Email
              </label>
              {/* Right Icon */}
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
                className="peer w-full px-4 pt-5 pb-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-12 bg-white"
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
              {loading ? "Authenticating..." : "Admin Sign In"}
            </button>
          </form>
 
          {/* Footer */}
          <div className="text-center text-gray-400 text-xs">
            © {year} {company} • Enterprise Admin Access
          </div>
 
        </div>
      </div>
 
      {/* Loader */}
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg animate-pulse">
            Authenticating...
          </div>
        </div>
      )}
    </div>
  );
}