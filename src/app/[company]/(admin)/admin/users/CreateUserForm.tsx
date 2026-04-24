"use client";
 
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
 
const FloatingInput = ({
  label,
  name,
  type = "text",
  value,
  error,
  required = false,
  onChange,
  readOnly = false,
}: any) => {
  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value ?? ""}
          placeholder=" "
          onChange={readOnly ? undefined : onChange}
          readOnly={readOnly}
          className={`floating-input peer ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : ""
          } ${
            readOnly
              ? "bg-gray-100 cursor-not-allowed pointer-events-none"
              : ""
          }`}
        />
        <label
          className="
            floating-label
            peer-placeholder-shown:top-4
            peer-placeholder-shown:text-sm
            peer-placeholder-shown:text-gray-400
            peer-focus:top-2
            peer-focus:text-xs
            peer-focus:text-blue-600
          "
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
 
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
 
type User = {
  id?: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  status: boolean,
  default_warehouse_id?: string;
};

type WarehouseOption = {
  id: number;
  name: string;
};
 
interface Props {
  company?: string | string[];
  userId?: string;
}
 
export default function CreateUserForm({ company, userId }: Props) {
  const router = useRouter();
  // const params = useParams();
  // const params = pageParams || useParams();
  // const tenant = Array.isArray(params.company) ? params.company[0]: params.company;
  const tenant = Array.isArray(company) ? company[0] : company;
  const [errors, setErrors]: any = useState([]);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  // const userId = params.id;
  const hasFetched = useRef(false);
  const [users, setUsers] = useState([
    {
      id: "",
      full_name: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      status: true,
      default_warehouse_id: "",
    },
  ]);
  /* ---------------- Add Row ---------------- */
  const addRow = () => {
    setUsers([
      ...users,
      {
        id: "",
        full_name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        status: true,
        default_warehouse_id: "",
      },
    ]);
    setErrors([]);
  };
  const removeRow = (index: number) => {
    // Don't allow removing last row
    if (users.length === 1) return;
 
    const updated = users.filter((_, i) => i !== index);
    setUsers(updated);
  };
 
  // Fetch user data for edit
  useEffect(() => {
    if (!tenant || !userId || hasFetched.current) return;
    hasFetched.current = true;
 
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          headers: { "x-tenant": tenant },
        });
 
        const data = await res.json();
        if (res.ok && data.success) {
          setUsers([
            {
              id: data.user.id,
              full_name: data.user.full_name,
              username: data.user.username,
              email: data.user.email,
              phone: data.user.phone,
              password: "",
              status: !!data.user.is_active,
              default_warehouse_id: data.user.default_warehouse_id
                ? String(data.user.default_warehouse_id)
                : "",
            },
          ]);
        } else {
          setApiError(data.message || "Failed to fetch user");
        }
      } catch (err) {
        console.error(err);
        setApiError("Server error. Please try again.");
      }
    };
 
    fetchUser();
  }, [tenant, userId]);

  useEffect(() => {
    if (!tenant) return;
    const loadWarehouses = async () => {
      try {
        const res = await fetch("/api/warehouses", {
          headers: { "x-tenant": tenant },
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          setWarehouses(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load warehouses", err);
      }
    };
    loadWarehouses();
  }, [tenant]);
 
  /* ---------------- Handle Change ---------------- */
  const handleChange = (
    index: number,
    field: Exclude<keyof User, "status">,
    value: string
  ) => {
    const updated = [...users];
    updated[index][field] = value;
    setUsers(updated);
 
    const updatedErrors = [...errors];
    if (updatedErrors[index]) {
      updatedErrors[index][field] = "";
    }
    setErrors(updatedErrors);
  };
 
  const handleStatusChange = (index: number, checked: boolean) => {
    const updated = [...users];
    updated[index].status = checked;
    setUsers(updated);
  };
 
  /* ---------------- Validation ---------------- */
  const validate = () => {
    let newErrors = users.map(() => ({}));
    const emailCount: any = {};
    const usernameCount: any = {};
    const phoneCount: any = {};
    const nameCount: any = {};
 
    users.forEach((user) => {
      if (user.full_name)
        nameCount[user.full_name] = (nameCount[user.full_name] || 0) + 1;
 
      if (user.username)
        usernameCount[user.username] =
          (usernameCount[user.username] || 0) + 1;
 
      if (user.email)
        emailCount[user.email] = (emailCount[user.email] || 0) + 1;
 
      if (user.phone)
        phoneCount[user.phone] = (phoneCount[user.phone] || 0) + 1;
    });
 
    users.forEach((user, index) => {
      let err: any = {};
 
      if (!user.full_name) {
        err.full_name = "Full name Required";
      } else if (nameCount[user.full_name] > 1) {
        err.full_name = "Duplicate full name";
      }
      if (!user.username) {
        err.username = "User name Required";
      } else if (usernameCount[user.username] > 1) {
        err.username = "Duplicate username";
      }
 
 
      if (!user.email) {
        err.email = "Email is Required";
      }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        err.email = "Invalid email format";
      } else if (emailCount[user.email] > 1) {
        err.email = "Duplicate email";
      }
 
      if (!user.phone) {
        err.phone = "Phone number is required";
      } else if (!/^[0-9]{10}$/.test(user.phone)) {
        err.phone = "Phone must be 10 digits";
      }
      else if (phoneCount[user.phone] > 1) {
        err.phone = "Duplicate phone";
      }
 
      if (!userId) {
        if (!user.password) { err.password = "Password is required"; }
        else if (user.password.length < 6) { err.password = "Password must be at least 6 characters"; }
      } else {
        // EDIT
        if (user.password && user.password.length < 6) {
          err.password = "Password must be at least 6 characters";
        }
      }
 
      newErrors[index] = err;
    });
 
    return newErrors;
  };
 
  const handleSubmit = async () => {
    if (!tenant) {
      setErrors("Tenant/company is required");
      return;
    }
 
    const validationErrors = validate();
    setErrors(validationErrors);
    setApiError("");
    setSuccess("");
 
    const hasError = validationErrors.some(
      (e) => Object.keys(e).length > 0
    );
 
    if (hasError) return;
 
    try {
      setLoading(true);
      const url = users[0].id
        ? `/api/admin/users/${users[0].id}`   // edit
        : "/api/admin/users";                 // create
 
      const method = users[0].id ? "PUT" : "POST";
 
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant": tenant,
        },
        body: JSON.stringify({ users }),
      });
 
      const data = await res.json();
 
      if (!res.ok) {
        console.log("data.message : ", data.message);
        if (data.index !== undefined && data.field) {
          const newErrors = [...validationErrors];
 
          newErrors[data.index] = {
            ...newErrors[data.index],
            [data.field]: data.message,
          };
 
          setErrors(newErrors);
        } else {
          setApiError(data.message);
        }
        return;
      } else {
        setSuccess("Users created successfully!");
        setUsers([
          {
            id: "",
            full_name: "",
            username: "",
            email: "",
            phone: "",
            password: "",
            status: true
          },
        ]);
        router.push(`/${tenant}/admin`);
      }
    } catch (err) {
      console.error(err);
      setApiError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
 
  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {/* 👥 Create Users ({tenant}) */}
        {userId ? `✏️ Edit User (${tenant})` : `👥 Create Users (${tenant})`}
      </h2>
 
      {apiError && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
          {apiError}
        </div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">
          {success}
        </div>
      )}
 
      {users.map((user, index) => (
        <div key={index} className="relative mb-6 border p-4 rounded bg-white shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-600">
              {/* User {index + 1} */}
              {userId ? "User Details" : `User ${index + 1}`}
            </h3>
 
            {!userId && users.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-red-500 text-xs hover:underline"
              >
                Remove
              </button>
            )}
          </div>
 
          <div className="grid grid-cols-2 gap-4">
            <FloatingInput
              label="Full Name"
              value={user.full_name}
              readOnly={!!userId}
              error={errors[index]?.full_name}
              onChange={(e: any) =>
                handleChange(index, "full_name", e.target.value)
              }
            />
 
            <FloatingInput
              label="Username"
              value={user.username}
              readOnly={!!userId}
              error={errors[index]?.username}
              onChange={(e: any) =>
                handleChange(index, "username", e.target.value)
              }
            />
 
            <FloatingInput
              label="Email"
              value={user.email}
              readOnly={!!userId}
              error={errors[index]?.email}
              onChange={(e: any) =>
                handleChange(index, "email", e.target.value)
              }
            />
 
            <FloatingInput
              label="Phone"
              value={user.phone}
              readOnly={!!userId}
              error={errors[index]?.phone}
              onChange={(e: any) =>
                handleChange(index, "phone", e.target.value)
              }
            />

            {/* <div className="w-full">
              <label className="text-sm font-semibold mb-1 block">
                Default Warehouse
              </label>
              <select
                value={user.default_warehouse_id ?? ""}
                onChange={(e) =>
                  handleChange(index, "default_warehouse_id", e.target.value)
                }
                className="floating-input"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div> */}

            <FloatingInput
              label="Password"
              type="password"
              value={user.password}
              error={errors[index]?.password}
              onChange={(e: any) =>
                handleChange(index, "password", e.target.value)
              }
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id={`status-${index}`}
                checked={user.status}
                onChange={(e) => handleStatusChange(index, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`status-${index}`} className="text-gray-700">
                Active
              </label>
            </div>
          </div>
        </div>
      ))}
 
      {/* BUTTONS */}
      <div className="flex gap-4">
        <button type="button" onClick={() => router.push(`/${tenant}/admin`)} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">Back</button>
        {!userId && (
          <button
            onClick={addRow}
            className="bg-[var(--color-blue-600)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4" /> Add Another User
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[var(--color-blue-600)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
        >
          {/* {loading ? "Creating Users..." : "Create Users"} */}
          {loading ? (userId ? "Updating..." : "Creating...") : userId ? "Update User" : "Create Users"}
        </button>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-white text-lg font-semibold animate-pulse">
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}
