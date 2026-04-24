"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { TrashIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";


type GrnHeader = {
    id?: number;
    grn_no: string;
    grn_date: string;
    purchase_no: string;
    purchase_id: string;
    supplier_id: string;
    supplier: string;
    status: string;
    po_status: string;
    user_name?: string;
};

type GrnDetail = {
    id?: number;
    product_id: string;
    product_code?: string;
    product_name?: string;
    uom: string,
    hsn_no: string;
    order_qty: number | string;
    received_qty?: number | string;
    qty: number | string;
    location_name: string;
};


export default function GRNForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const grnNo = searchParams.get("id"); // edit id
    const isEdit = Boolean(grnNo);
    const { company } = useTenant();
    console.log("Company:", company);
    const { user } = useUser();
    console.log("User Name : ", user?.name)

    const initialHeader: GrnHeader = {
        grn_no: "",
        grn_date: new Date().toISOString().split("T")[0],
        purchase_no: "",
        purchase_id: "",
        supplier_id: "",
        supplier: "",
        status: "Enterd",
        po_status: "Approved"
    };

    const initialDetail: GrnDetail = {
        product_id: "",
        product_code: "",
        product_name: "",
        uom: "",
        hsn_no: "",
        order_qty: "",
        received_qty: "",
        qty: "",
        location_name: ""
    };

    const [header, setHeader] = useState<GrnHeader>(initialHeader);
    const [details, setDetails] = useState<GrnDetail[]>([]);
    const [errors, setErrors] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [poList, setPoList] = useState<any[]>([]);
    const [poSearchTerm, setPoSearchTerm] = useState("");
    const [poCurrentPage, setPoCurrentPage] = useState(1);
    const poItemsPerPage = 8;

    const filteredPOs = poList.filter(po =>
        (po.purchase_no?.toLowerCase().includes(poSearchTerm.toLowerCase()) ?? false) ||
        (po.supplier_code?.toLowerCase().includes(poSearchTerm.toLowerCase()) ?? false) ||
        (po.supplier_name?.toLowerCase().includes(poSearchTerm.toLowerCase()) ?? false)
    );

    const indexOfLast = poCurrentPage * poItemsPerPage;
    const indexOfFirst = indexOfLast - poItemsPerPage;

    const paginatedPOs = filteredPOs.slice(indexOfFirst, indexOfLast);

    const totalPages = Math.ceil(filteredPOs.length / poItemsPerPage);

    // ------------------------------------------
    // Load GRN For Edit
    // ------------------------------------------
    useEffect(() => {
        const fetchGRN = async () => {
            if (!grnNo || !company) return;
            console.log("Fetching GRN with ID:", grnNo);
            try {
                const res = await fetch(`/api/grn/${grnNo}`, {
                    headers: {
                        "x-tenant": company,
                    },
                });

                const data = await res.json();

                if (data.success) {
                    setHeader((prev) => ({
                        ...prev,
                        ...data.data.header,
                    }));
                    const fetchedDetails = data.data.details.map((row: any) => ({
                        ...row,
                        order_qty: Number(row.order_qty),
                        qty: Number(row.qty)
                    }));
                    setDetails(fetchedDetails);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchGRN();

    }, [grnNo, company]);

    useEffect(() => {
        if (user?.name) {
            setHeader((prev) => ({
                ...prev,
                user_name: user.name,
            }));
        }
    }, [user]);

    useEffect(() => {
        const fetchGRNNo = async () => {
            try {
                const res = await fetch("/api/grn/generateNo", { headers: { "x-tenant": company } });
                const data = await res.json();
                if (data.success) setHeader(prev => ({ ...prev, grn_no: data.grn_no }));
            } catch (err) {
                console.error("Failed to fetch grn number", err);
            }
        };
        fetchGRNNo();
    }, []);

    useEffect(() => {
        const fetchPurchaseOrders = async () => {
            if (!company) return;
            try {
                setLoadingPurchaseOrders(true);
                const res = await fetch(`/api/product-lookup?type=polist`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "x-tenant": company
                    },
                });

                const data = await res.json();

                // Safety Guard: Ensure data is an array before setting state
                if (Array.isArray(data)) {
                    console.log("Fetched PO Lists:", data);
                    setPoList(data);
                } else {
                    console.error("API Error Response:", data);
                    setPoList([]);
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                setPoList([]);
            } finally {
                setLoadingPurchaseOrders(false);
            }
        };
        fetchPurchaseOrders();
    }, [company]);

    const handleSelectPo = async (po: any) => {
        try {
            console.log("handleSelectPo : ", po);
            console.log("handleSelectPo Po Status : ", po.po_status);
            if (po.po_status === "Completed") {
                setErrors((prev: any) => ({
                    ...prev,
                    po_modal: "PO already completed. GRN cannot be created."
                }));
                return;
            }
            // Update header fields
            setHeader((prev) => ({
                ...prev,
                purchase_no: po.purchase_no,
                purchase_id: po.purchase_id,
                supplier: `${po.supplier_code} - ${po.supplier_name}`,
                supplier_id: po.supplier_id, // save supplier ID
            }));

            // Fetch PO items
            const res = await fetch(`/api/product-lookup?type=poitems&po_id=${po.purchase_id}`, {
                headers: { "x-tenant": company }
            });
            const data = await res.json();
            console.log("data : ", data);
            if (data.success && Array.isArray(data.items)) {
                setDetails(
                    data.items.map((item: any) => ({
                        product_id: item.product_id,
                        product_code: item.product_code,
                        product_name: item.product_name,
                        uom: item.uom,
                        hsn_no: item.hsn_no,
                        order_qty: item.order_qty,
                        received_qty: item.received_qty,
                        qty: "",
                    }))
                );
            }

            setErrors((prev: any) => {
                const newErrors = { ...prev };

                // clear only fields fixed by PO selection
                delete newErrors.purchase_no;
                delete newErrors.supplier;
                delete newErrors.details;

                // clear product/order errors (because rows are reloaded)
                Object.keys(newErrors).forEach((key) => {
                    if (
                        key.startsWith("product_") ||
                        key.startsWith("order_qty_")
                    ) {
                        delete newErrors[key];
                    }
                });

                return newErrors;
            });

            setIsPoModalOpen(false);
        } catch (err) {
            console.error("Failed to fetch PO items", err);
        }
    };
const getStatusBadge = (status: string) => {
        switch (status) {
 
            case "Awaiting for approval":
                return "bg-orange-100 text-orange-700";
 
            case "Rejected":
                return "bg-red-100 text-red-700";
 
            case "Approved":
            case "Completed":
                return "bg-green-100 text-green-700";
 
            case "Partial":
                return "bg-blue-100 text-blue-700";
 
            default:
                return "bg-gray-100 text-gray-700";
        }
    }; 
    const removeRow = (index: number) => setDetails(details.filter((_, i) => i !== index));

    const validate = () => {
        const newErrors: any = {};
        if (!header.grn_no.trim()) newErrors.grn_no = "GRN No required";
        if (!header.grn_date) newErrors.grn_date = "GRN date required";
        if (!header.purchase_no) newErrors.purchase_no = "PO No required";
        if (!header.supplier) newErrors.supplier = "Supplier required";
        if (details.length === 0) {
            newErrors.details = "At least one product row is required";
        }

        // CHECK IF ANY QTY ENTERED
        const hasQty = details.some(d => Number(d.qty || 0) > 0);

        if (!hasQty) {
            newErrors.details = "Enter Qty for at least one product";
        }
        // ROW VALIDATION
        details.forEach((d, index) => {

            const orderQty = Number(d.order_qty || 0);
            const qty = Number(d.qty || 0);
            const receivedQty = Number(d.received_qty || 0);

            if (!d.product_id)
                newErrors[`product_${index}`] = "Product required";

            if (orderQty <= 0)
                newErrors[`order_qty_${index}`] = "Order Qty must be > 0";

            // VALIDATE ONLY IF USER ENTERED QTY
            if (qty > 0) {

                if ((receivedQty + qty) > orderQty) {

                    newErrors[`qty_${index}`] =
                        `Only ${orderQty - receivedQty} qty allowed`;

                }

            }

        });


        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setErrorMessage("");
        if (!validate()) return;

        setLoading(true);
        try {
            const url = grnNo
                ? `/api/grn/${grnNo}`
                : "/api/grn";

            const method = grnNo ? "PUT" : "POST";
            const res = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "x-tenant": company,
                },
                body: JSON.stringify({
                    header: { ...header, user_name: user?.name },
                    details
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to save grn");
            router.push(`/${company}/transactions/grn`);
        } catch (err: any) {
            console.error("Save GRN Error:", err);
            setErrorMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {loading &&
                createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-700 font-semibold text-lg">{isEdit ? "Updating GRN..." : "Saving GRN..."}</p>
                        </div>
                    </div>,
                    document.body
                )
            }
            {errorMessage && (
                <div className="text-red-600 font-semibold">{errorMessage}</div>
            )}

            <div className="flex items-center justify-between mb-4">

                {/* Left Side - Title */}
                <h1 className="text-2xl font-bold">
                    {isEdit ? "Edit GRN (Goods Receipt Node)" : "Create GRN (Goods Receipt Node)"}
                </h1>

                {/* Right Side - Validation */}
                {errors.details && (
                    <span className="text-red-500 text-sm font-medium whitespace-nowrap">
                        {errors.details}
                    </span>
                )}

            </div>


            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Header */}
                <div className="bg-white p-6 rounded-xl shadow grid md:grid-cols-5 gap-6">

                    <div>
                        <label className="text-sm font-semibold mb-1 block">GRN No <span className="text-red-500">*</span></label>
                        <input
                            value={header.grn_no}
                            onChange={(e) => {
                                const value = e.target.value;
                                setHeader({ ...header, grn_no: value });
                                if (value) {
                                    setErrors((prev: any) => ({
                                        ...prev,
                                        grn_no: "",
                                    }));
                                }
                            }}
                            className="border p-2 rounded w-full bg-gray-100 text-indigo-600 font-semibold"
                            readOnly
                        />
                        {errors.grn_no && (
                            <p className="text-red-500 text-sm mt-1">{errors.grn_no}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-1 block">GRN Date <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            value={header.grn_date}
                            min={new Date().toISOString().split("T")[0]}   // prevent past date
                            onChange={(e) => {
                                const value = e.target.value;
                                setHeader({ ...header, grn_date: value });
                                if (value) {
                                    setErrors((prev: any) => ({
                                        ...prev,
                                        grn_date: "",
                                    }));
                                }
                            }}
                            className={`border p-2 rounded w-full ${errors.grn_date ? "border-red-500" : ""}`}
                        />
                        {errors.grn_date && (
                            <p className="text-red-500 text-sm mt-1">{errors.grn_date}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold mb-1 block">PO No <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={header.purchase_no}
                                readOnly
                                placeholder="Select Purchase Order"
                                className="border p-2 rounded w-full bg-gray-50 font-medium text-gray-700"
                            />
                            <button
                                type="button"
                                onClick={() => { setIsPoModalOpen(true); setPoSearchTerm(""); setPoCurrentPage(1); }}
                                className="absolute right-2 p-1 text-gray-500 hover:text-indigo-600"
                            >
                                <MagnifyingGlassIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {errors.purchase_no && (
                            <p className="text-red-500 text-sm mt-1">{errors.purchase_no}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-1 block">Supplier <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={header.supplier || ""}
                            readOnly
                            className="border p-2 rounded w-full bg-gray-100"
                        />
                        {errors.supplier && (
                            <p className="text-red-500 text-sm mt-1">{errors.supplier}</p>
                        )}
                    </div>
                </div>

                {/* Details Table */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <div className="min-h-[420px] max-h-[420px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-50 text-gray-600 text-sm sticky top-0 z-10 shadow-sm">
                                <tr className="border-t hover:bg-blue-50 transition">
                                    <th className="p-3 text-sm text-left">Product Id</th>
                                    <th className="p-3 text-sm text-left">Product Name</th>
                                    <th className="p-3 text-sm text-left">UOM</th>
                                    <th className="p-3 text-sm text-left">HSN No</th>
                                    <th className="p-3 text-sm">Order Qty</th>
                                    <th className="p-3 text-sm">Received Qty</th>
                                    <th className="p-3 text-sm">Qty</th>
                                    <th className="p-3 text-sm text-left">Location Name</th>
                                    {/* <th className="p-3"></th> */}
                                </tr>
                            </thead>

                            <tbody>
                                {details.map((row, index) => (
                                    <tr key={index} className="border-t hover:bg-blue-50 transition">
                                        <td className="p-2">
                                            <div className="text-gray-700">{row.product_code}</div>
                                        </td>
                                        <td className="p-2">
                                            <div className="text-gray-700">{row.product_name}</div>
                                        </td>
                                        <td className="p-2">
                                            <div className="text-gray-700">{row.uom}</div>
                                        </td>
                                        <td className="p-2">
                                            <div className="text-gray-700">{row.hsn_no}</div>
                                        </td>
                                        <td className="text-center">
                                            <div className="text-gray-700">{Number(row.order_qty) % 1 === 0
                                                ? Number(row.order_qty)
                                                : Number(row.order_qty).toFixed(2)}</div>
                                        </td>
                                        <td className="text-center">
                                            <div className="text-gray-700">{Number(row.received_qty) % 1 === 0
                                                ? Number(row.received_qty)
                                                : Number(row.received_qty).toFixed(2)}</div>
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="number"
                                                value={row.qty === "" ? "" : row.qty}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const updated = [...details];
                                                    // Allow empty string for backspace
                                                    updated[index].qty = value === "" ? "" : Number(value);
                                                    setDetails(updated);

                                                    // clear validation errors for this row
                                                    setErrors((prev: any) => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[`qty_${index}`];
                                                        return newErrors;
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        const updated = [...details];
                                                        // If empty, populate with order_qty
                                                        if (!updated[index].qty) {
                                                            updated[index].qty = Number(updated[index].order_qty) || 0;
                                                            setDetails(updated);
                                                        }
                                                    }
                                                }}
                                                className={`border p-1 rounded w-20 ${errors[`qty_${index}`] ? "border-red-500" : ""}`}
                                            />
                                            {errors[`qty_${index}`] && (
                                                <p className="text-red-500 text-sm mt-1">{errors[`qty_${index}`]}</p>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <div className="text-gray-700">{row.location_name}</div>
                                        </td>
                                        {/* <td className="p-2 flex justify-center items-center">
                      <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-red-800">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => router.push(`/${company}/transactions/grn`)} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">Cancel</button>
                    <button className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded hover:opacity-90">{isEdit ? "Update GRN" : "Save GRN"}</button>
                </div>

            </form>

            {isPoModalOpen &&
                createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

                        <div className="w-[900px] h-[600px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-700">
                                    Select Purchase Order
                                </h2>

                                <div className="flex items-center gap-3">

                                    {errors.po_modal && (
                                        <span className="text-red-500 text-sm font-medium">
                                            {errors.po_modal}
                                        </span>
                                    )}

                                    <button
                                        onClick={() => {
                                            setIsPoModalOpen(false);
                                            setPoSearchTerm("");
                                            setPoCurrentPage(1);
                                            setErrors((prev: any) => ({ ...prev, po_modal: "" }))
                                        }}
                                        className="text-gray-500 hover:text-black text-xl"
                                    >
                                        ✕
                                    </button>

                                </div>
                            </div>

                            {/* Search */}
                            <div className="p-4 border-b bg-white">
                                <input
                                    type="text"
                                    placeholder="Search PO No / Supplier..."
                                    value={poSearchTerm}
                                    onChange={(e) => {
                                        setPoSearchTerm(e.target.value);
                                        setPoCurrentPage(1);
                                    }}
                                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto">

                                {loadingPurchaseOrders ? (
                                    <div className="flex justify-center items-center h-full text-gray-500">
                                        Loading Purchase Orders...
                                    </div>
                                ) : filteredPOs.length === 0 ? (

                                    <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-2">
                                        <p>No Purchase Orders found</p>
                                    </div>

                                ) : (

                                    <table className="w-full text-sm">

                                        <thead className="bg-indigo-50 text-gray-600 text-sm sticky top-0">
                                            <tr>
                                                <th className="p-3 text-left">PO No</th>
                                                <th className="p-3 text-left">Supplier Code</th>
                                                <th className="p-3 text-left">Supplier Name</th>
                                                 <th className="p-3 text-left">Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {paginatedPOs.map((po) => (
                                                <tr
                                                    key={po.purchase_id}
                                                    onClick={() => handleSelectPo(po)}
                                                    className="border-t hover:bg-blue-50 cursor-pointer transition"
                                                >

                                                    <td className="p-3 font-medium text-blue-600">
                                                        {po.purchase_no}
                                                    </td>

                                                    <td className="p-3 text-gray-600">
                                                        {po.supplier_code}
                                                    </td>

                                                    <td className="p-3 text-gray-600">
                                                        {po.supplier_name}
                                                    </td>
                                                   
                                                   <td>
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(po.po_status)}`}
                                                        >
                                                            {po.po_status}
                                                        </span>
                                                    </td>

                                                </tr>
                                            ))}

                                        </tbody>

                                    </table>

                                )}

                            </div>

                            {/* Pagination */}
                            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">

                                <p className="text-sm text-gray-500">
                                    Showing {filteredPOs.length} of {filteredPOs.length} items
                                </p>

                                <div className="flex items-center gap-1">

                                    <button
                                        disabled={poCurrentPage === 1}
                                        onClick={() => setPoCurrentPage(p => p - 1)}
                                        className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Prev
                                    </button>

                                    {/* {Array.from({ length: totalPages }, (_, i) => ( */}
                                    {Array.from({ length: Math.ceil(filteredPOs.length / poItemsPerPage) }, (_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setPoCurrentPage(i + 1)}
                                            className={`px-3 py-1 text-sm border rounded transition-colors ${poCurrentPage === i + 1
                                                ? "bg-[var(--color-blue-500)] text-white border-indigo-600"
                                                : "bg-white text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        disabled={poCurrentPage >= Math.ceil(filteredPOs.length / poItemsPerPage)}
                                        onClick={() => setPoCurrentPage(c => c + 1)}
                                        className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Next
                                    </button>

                                </div>

                            </div>

                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}