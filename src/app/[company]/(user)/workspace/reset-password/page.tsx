"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { HiEye, HiEyeOff, HiArrowLeft } from "react-icons/hi";
import { ShoppingCartIcon, CubeIcon, DocumentTextIcon, CurrencyRupeeIcon } from "@heroicons/react/24/outline";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const params = useParams();
    const company = params?.company as string;
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [year, setYear] = useState<number | null>(null);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [formError, setFormError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        setYear(new Date().getFullYear());
    }, []);

    const validatePassword = (pwd: string) => {
        if (!pwd) {
            return "Required";
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(pwd)) {
            return "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols.";
        }
        return "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSuccess("");
        setPasswordError("");
        setConfirmError("");

        if (!token) {
            setFormError("Reset token is missing or invalid. Please check your reset link.");
            return;
        }

        const pwdErr = validatePassword(newPassword);
        let hasError = false;

        if (pwdErr) {
            setPasswordError(pwdErr);
            hasError = true;
        }

        if (!confirmPassword) {
            setConfirmError("Confirm Password is required");
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            setConfirmError("Passwords do not match");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess("Password reset successful! Redirecting to login...");
                setTimeout(() => router.push(`/${company}/workspace/login`), 2000);
            } else {
                setFormError(data.message || "Failed to reset password.");
            }
        } catch {
            setFormError("Something went wrong. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 relative overflow-hidden p-4">
            <div className="absolute w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-3xl top-[-100px] left-[-100px] animate-pulse"></div>
            <div className="absolute w-[400px] h-[400px] bg-purple-400/30 rounded-full blur-3xl bottom-[-120px] right-[-100px] animate-pulse"></div>

            <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/30">
                {/* Left Side Branding */}
                <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white p-12 relative overflow-hidden">
                    <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl top-[-80px] left-[-60px]" />
                    <div className="absolute w-[300px] h-[300px] bg-purple-300/20 rounded-full blur-3xl bottom-[-100px] right-[-60px]" />

                    <h1 className="text-4xl font-bold tracking-wide z-10 mb-4">{company}</h1>

                    <p className="text-blue-100 text-center max-w-sm z-10 mb-10 leading-relaxed">
                        Reset your password securely to continue managing your business operations in one unified platform.
                    </p>

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

                        <span className="text-sm text-blue-100 tracking-wide text-center">
                            Purchase • Inventory • Billing • Accounting
                        </span>
                    </div>
                </div>

                {/* Right Side Form */}
                <div className="p-8 sm:p-10 space-y-6 flex flex-col justify-center">
                    <div className="flex justify-center">
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-14 h-14 flex items-center justify-center rounded-xl text-xl font-bold shadow-lg">
                            {company?.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-800">
                        Set New Password
                    </h2>

                    <p className="text-center text-gray-500">
                        Please enter your new password below
                    </p>

                    {formError && (
                        <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm text-center">
                            {formError}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password Input */}
                        <div>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (passwordError) setPasswordError(validatePassword(e.target.value));
                                    }}
                                    className={`peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 outline-none bg-white/70 ${passwordError ? "border-red-500 focus:ring-red-400" : "focus:ring-blue-500"
                                        }`}
                                    placeholder=" "
                                />
                                <label className="absolute left-4 top-2 text-gray-500 text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm transition-all">
                                    New Password
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 peer-focus:text-blue-500"
                                >
                                    {showNewPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-red-500 text-xs mt-1.5 px-1 leading-normal">
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (confirmError) {
                                            if (!e.target.value) setConfirmError("Confirm Password is required");
                                            else if (newPassword !== e.target.value) setConfirmError("Passwords do not match");
                                            else setConfirmError("");
                                        }
                                    }}
                                    className={`peer w-full px-4 pr-12 pt-5 pb-2 border rounded-xl focus:ring-2 outline-none bg-white/70 ${confirmError ? "border-red-500 focus:ring-red-400" : "focus:ring-blue-500"
                                        }`}
                                    placeholder=" "
                                />
                                <label className="absolute left-4 top-2 text-gray-500 text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm transition-all">
                                    Confirm Password
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 peer-focus:text-blue-500"
                                >
                                    {showConfirmPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                                </button>
                            </div>
                            {confirmError && (
                                <p className="text-red-500 text-xs mt-1.5 px-1 leading-normal">
                                    {confirmError}
                                </p>
                            )}
                        </div>

                        {/* Password rules indicator hint */}
                        <p className="text-xs text-gray-400 px-1">
                            Must be at least 8 characters long with uppercase, lowercase, number, and symbol.
                        </p>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? "Resetting..." : "Update Password"}
                        </button>
                    </form>

                    {/* Back to Login */}
                    {/* <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => router.push(`/${company}/workspace/login`)}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium transition"
                        >
                            <HiArrowLeft size={14} /> Back to Sign In
                        </button>
                    </div> */}

                    {mounted && (
                        <div className="text-center text-gray-500 text-sm pt-2">
                            © {year} {company}. All rights reserved.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
