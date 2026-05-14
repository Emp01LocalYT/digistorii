//C:\Users\yanna\template_tailwind\src\lib\apiFetch.ts
export async function apiFetch(
  url: string,
  company: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});
  headers.set("x-tenant", company);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
}


  // useEffect(() => {
  //   if (!company) return;
  //   let active = true;
  //   const loadData = async () => {
  //     setPageLoading(true);
  //     try {
  //       const [
  //         suppliersRes,
  //         taxesRes,
  //         despatchRes,
  //         paymentRes,
  //         currencyRes,
  //         purchaseNoRes,
  //       ] = await Promise.all([
  //         fetch("/api/suppliers", { headers: { "x-tenant": company } }),
  //         fetch("/api/tax-master", { headers: { "x-tenant": company } }),
  //         fetch("/api/despatch-terms", { headers: { "x-tenant": company } }),
  //         fetch("/api/payment-terms", { headers: { "x-tenant": company } }),
  //         fetch("/api/currencies", { headers: { "x-tenant": company } }),
  //         !isEdit && header.po_type === "standard"
  //           ? fetch("/api/purchase/generateNo", { headers: { "x-tenant": company } })
  //           : Promise.resolve(null),
  //       ]);

  //       const suppliersData = await suppliersRes.json();
  //       const taxesData = await taxesRes.json();
  //       const despatchData = await despatchRes.json();
  //       const paymentData = await paymentRes.json();
  //       const currencyData = await currencyRes.json();
  //       const purchaseNoData = purchaseNoRes ? await purchaseNoRes.json() : null;

  //       if (!active) return;

  //       setAllSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData.data || []);
  //       setAllDespatchTerms(despatchData?.data || []);
  //       setAllPaymentTerms(paymentData?.data || []);
  //       setAllCurrencies(currencyData?.data || []);
  //       setAllTaxes(taxesData?.data || []);

  //       if (purchaseNoData?.purchase_no && header.po_type === "standard") {
  //         setHeader((prev) => ({ ...prev, purchase_no: purchaseNoData.purchase_no }));
  //       }
  //       console.log("Loaded initial data for purchase page 407:");
  //       console.log("Suppliers:", suppliersData);
  //       console.log("Despatch Terms:", despatchData);
  //       console.log("Payment Terms:", paymentData);
  //       console.log("Currencies:", currencyData);
  //       console.log("Taxes:", taxesData);
  //       console.log("Generated Purchase No:", purchaseNoData?.purchase_no);
  //     } catch (err) {
  //       console.error("Failed to load purchase data", err);
  //     } finally {
  //       if (active) setPageLoading(false);
  //     }
  //   };

  //   loadData();
  //   return () => {
  //     active = false;
  //   };
  // }, [company, isEdit, header.po_type]);