"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/CurrentUserContext";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface Props {
    company: string;
}

export default function AdminHeader({ company }: Props) {
    const router = useRouter();
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: any) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Logout
    const handleSignOut = async () => {
        setLoading(true);
        try {
            await fetch("/api/auth/logout?type=admin", {
                method: "POST",
            });

            router.replace(`/${company}/admin/login`);
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setLoading(false);
        }
    };

    function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
    }
    function closeDropdown() {
        setIsOpen(false);
    }


    const initials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : "";

    return (
        <div className="flex items-center justify-between bg-white shadow px-6 py-3">

            {/* LEFT: COMPANY */}
            <h1 className="text-xl font-bold text-blue-600">
                {company}
            </h1>

            <div className="relative">
                <button
                    onClick={toggleDropdown}
                    className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
                >
                    <div className="flex items-center">
                        <div className="bg-blue-600 w-11 h-11 flex items-center justify-center text-white rounded-full font-bold mr-3">
                            {initials}
                        </div>
                        <span className="font-medium text-theme-sm">{user?.name}</span>
                    </div>

                    <svg
                        className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                            }`}
                        width="18"
                        height="20"
                        viewBox="0 0 18 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <Dropdown
                    isOpen={isOpen}
                    onClose={closeDropdown}
                    className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
                >
                    <div className="mb-3">
                        <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
                            {user?.name}
                        </span>
                        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                            {user?.email}
                        </span>
                    </div>
                    <DropdownItem onItemClick={closeDropdown} tag="button" onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 font-medium text-red-600 rounded-lg hover:bg-red-50">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 animate-spin text-red-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                                    ></path>
                                </svg>
                                <span>Signing out...</span>
                            </div>
                        ) : (
                            <>
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5A2.25 2.25 0 0015.75 18.75V15M18 12l3-3m0 0l-3-3m3 3H9"
                                    />
                                </svg>
                                <span>Sign out</span>
                            </>
                        )}
                    </DropdownItem>
                </Dropdown>
            </div>
        </div>
    );
}