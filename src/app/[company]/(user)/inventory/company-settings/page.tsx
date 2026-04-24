'use client';
 
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";
import { useCompanySettings } from "@/context/CompanySettingsContext";
 
// type CompanySettings = {
//     companyName: string;
//     baseCurrency: string;
//     dateFormat: string;
//     timeZone: string;
//     financialYearStart: string;
//     financialYearEnd: string;
//     salesTarget: number;
// };
 
type CurrencyOption = {
    code: string;
    name: string;
};
 
export default function CompanySettingsPage() {
    const { company } = useTenant();
    const { user } = useUser();
 
    // const [settings, setSettings] = useState<CompanySettings>({
    //     companyName: tenant || "",
    //     baseCurrency: "",
    //     dateFormat: "DD/MM/YYYY",
    //     timeZone: "",
    //     financialYearStart: "",
    //     financialYearEnd: "",
    //     salesTarget: ""
    // });
    const { settings, setSettings } = useCompanySettings();
 
    const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
 
    const hasFetched = useRef(false);
 
    // Load settings & currency options
    // const loadSettings = async () => {
    //     if (!tenant) return;
    //     try {
    //         setLoading(true);
 
    //         // const currencyRes = await fetch("/api/currencies", { method: "GET", headers: { "x-tenant": tenant } });
    //         // const currencyResult = await currencyRes.json();
    //         // if (currencyResult.success) setCurrencyOptions(currencyResult.data);
 
    //         const settingsRes = await fetch("/api/company-settings", { method: "GET", headers: { "x-tenant": tenant } });
    //         const settingsResult = await settingsRes.json();
    //         console.log("settingsResult : ", settingsResult);
    //         if (settingsResult.success && settingsResult.data) {
 
    //             const data = settingsResult.data;
    //             setSettings({
    //                 companyName: data.companyname || tenant || "",
    //                 baseCurrency: data.base_currency || "",
    //                 dateFormat: data.date_format || "DD/MM/YYYY",
    //                 timeZone: data.time_zone || "",
    //                 financialYearStart: data.financial_year_start || "",
    //                 financialYearEnd: data.financial_year_end || "",
    //             });
    //         }
 
 
    //     } catch (err) {
    //         console.error("Load Error:", err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };
 
    // useEffect(() => {
    //      if (!tenant || hasFetched.current) return;
    // hasFetched.current = true;
 
    //     loadSettings();
    // }, [tenant]);
    if (!settings) return <div>Loading...</div>;
 
    const handleSave = async () => {
        setError("");
        setSuccess("");
        if (!settings.baseCurrency) {
            setError("Base Currency is required");
            return;
        }
        // const { financialYearStart, financialYearEnd } = settings;
        const startDate = settings.financialYearStart || null;
        const endDate = settings.financialYearEnd || null;
 
        if (startDate && !endDate) {
            setError("Please provide Financial Year End date");
            return;
        }
 
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
 
            if (end <= start) {
                setError("Financial Year End date must be after Start date");
                return;
            }
        }
 
        try {
            setSaving(true);
            const res = await fetch("/api/company-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-tenant": company },
                body: JSON.stringify({ ...settings,financialYearStart: startDate,
        financialYearEnd: endDate, userName: user?.name || "" }),
            });
            const result = await res.json();
            if (result.success) {
                // await loadSettings();
                setSettings({ ...settings });
                setSuccess("Settings saved successfully");
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(""), 3000);
            }
            else {
                setError(result.error || "Save failed");
                setTimeout(() => setError(""), 3000);
            }
        } catch (err) {
            setError("Something went wrong");
            setTimeout(() => setError(""), 3000);
        } finally {
            setSaving(false);
        }
    };
 
    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Loading/Saving Overlay */}
            {(loading || saving) &&
                createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
 
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
 
                            {/* Dynamic message */}
                            <p className="text-gray-700 font-semibold text-lg">
                                {saving
                                    ? "Saving Settings..."
                                    : "Loading Settings..."}
                            </p>
 
                        </div>
                    </div>,
                    document.body
                )
            }
 
            <h1 className="text-2xl font-bold">Company Settings</h1>
 
            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>}
            {success && <div className="bg-green-50 text-green-600 px-3 py-2 rounded-lg">{success}</div>}
 
            {/* Company Name - Read Only */}
            <div className="flex flex-col">
                <label className="font-medium mb-1">Company Name</label>
                <input
                    type="text"
                    className="border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                    value={settings.companyName}
                    readOnly
                />
            </div>
 
            {/* Base Currency */}
            <div className="flex flex-col">
                <label className="font-medium mb-1">Base Currency</label>
                {/* <select
                    className="border rounded px-3 py-2"
                    value={settings.baseCurrency}
                    onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value })}
                >
                    <option value="">Select Currency</option>
                    {currencyOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                </select> */}
                <input
                    type="text"
                    className="border rounded px-3 py-2"
                    value={settings.baseCurrency}
                    onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value.toUpperCase() })}
                    placeholder="Enter Base Currency (e.g., USD, INR)"
                />
            </div>
            <div className="flex flex-col">
  <label className="font-medium mb-1">Sales Target</label>
  <input
    type="number"
    className="border rounded px-3 py-2"
    value={settings.salesTarget || ""}
    onChange={(e) =>
      setSettings({
        ...settings,
        salesTarget: Number(e.target.value || 0),
      })
    }
    placeholder="Enter Sales Target (e.g., 100000)"
  />
</div>
 
            {/* Date Format */}
            <div className="flex flex-col">
                <label className="font-medium mb-1">Date Format</label>
                <select
                    className="border rounded px-3 py-2"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                >
                    {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
 
            {/* Time Zone */}
            {/* <div className="flex flex-col">
                <label className="font-medium mb-1">Time Zone</label>
                <select
                    className="border rounded px-3 py-2"
                    value={settings.timeZone}
                    onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                >
                    {["IST", "UTC", "GMT", "PST"].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
            </div> */}
 
            {/* Financial Year */}
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col">
                    <label className="font-medium mb-1">Financial Year Start</label>
                    <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={settings.financialYearStart}
                        onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })}
                    />
                </div>
                <div className="flex-1 flex flex-col">
                    <label className="font-medium mb-1">Financial Year End</label>
                    <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={settings.financialYearEnd}
                        onChange={(e) => setSettings({ ...settings, financialYearEnd: e.target.value })}
                    />
                </div>
            </div>
 
            <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                disabled={saving}
            >
                {saving ? "Saving..." : "Save Settings"}
            </button>
 
        </div>
    );
}