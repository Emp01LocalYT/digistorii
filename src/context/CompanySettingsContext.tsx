'use client';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useTenant } from "@/context/TenantContext";
 
 
type CompanySettings = {
    baseCurrency: string;
    dateFormat: string;
    financialYearStart: string;
    financialYearEnd: string;
    companyName: string;
    salesTarget: number;
};
 
type CompanySettingsContextType = {
    settings: CompanySettings | null;
    setSettings: (s: CompanySettings) => void;
    loading: boolean;
};
 
const CompanySettingsContext = createContext<CompanySettingsContextType>({
    settings: null,
    setSettings: () => {},
    loading: true,
});
 
export const useCompanySettings = () => useContext(CompanySettingsContext);
 
 
export const CompanySettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const { company } = useTenant();
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
 
    const hasFetched = useRef(false);
    useEffect(() => {
        const fetchSettings = async () => {
            if (!company || hasFetched.current) return;
            hasFetched.current = true;
            try {
                setLoading(true);
                const res = await fetch('/api/company-settings', {
                    headers: {
                        'Content-Type': 'application/json',
                        "x-tenant": company
                    },
                });
                const result = await res.json();
                if (result.success) {
                    console.log("CompanySettingsContext :", result.data);
                    const data = result.data;
                    setSettings({
                        companyName: data.companyname || company || "",
                        baseCurrency: data.base_currency || "",
                        dateFormat: data.date_format || "DD/MM/YYYY",
                        // timeZone: data.time_zone || "",
                        financialYearStart: data.financial_year_start || "",
                        financialYearEnd: data.financial_year_end || "",
                        salesTarget: Number(data.sales_target)
                    });
                }
            } catch (err) {
                console.error('Failed to load company settings', err);
            } finally {
                setLoading(false);
            }
        };
 
        fetchSettings();
    }, []);
 
    return (
        <CompanySettingsContext.Provider value={{ settings,setSettings, loading }}>
            {children}
        </CompanySettingsContext.Provider>
    );
};