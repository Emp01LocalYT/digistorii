"use client";

import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";


type UserType = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string | null;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
};

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();

  const [user, setUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<UserType | null>(null);

  const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.charAt(0).toUpperCase() || "";
  const last = lastName?.charAt(0).toUpperCase() || "";
  return first + last;
};

  
  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (stored) {
      const parsed = JSON.parse(stored);

      const formatted: UserType = {
        id: parsed.id,
        firstName: parsed.name || "",
        lastName: parsed.username || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        bio: parsed.bio || "Team Member",
        avatar: parsed.avatar || null,
        facebook: parsed.facebook || "",
        twitter: parsed.twitter || "",
        linkedin: parsed.linkedin || "",
        instagram: parsed.instagram || "",
      };

      setUser(formatted);
      setFormData(formatted);
    } 
    // else {
    //   // If no localStorage, set dummy user
    //   const dummyUser: UserType = {
    //     firstName: "Arun",
    //     lastName: "Kumar",
    //     email: "arun@email.com",
    //     phone: "9876543210",
    //     bio: "Software Developer",
    //     avatar: null,
    //   };

    //   setUser(dummyUser);
    //   setFormData(dummyUser);
    // }
  }, []);

  const handleChange = (e: any) => {
    setFormData({ ...formData!, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    const updated = {
      id: formData?.id,
      name: formData?.firstName,
      username: formData?.lastName,
      email: formData?.email,
      phone: formData?.phone,
      bio: formData?.bio,
      avatar: formData?.avatar || null,
    };

    localStorage.setItem("user", JSON.stringify(updated));
    setUser(formData);
    closeModal();
  };

  if (!user) return null;

  return (
    <>
      {/* PROFILE CARD */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            
           <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {getInitials(user.firstName, user.lastName)}
            </div>

            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {user.firstName} {user.lastName}
              </h4>

              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.bio}
                </p>

                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>

                {/*Dummy Address */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chennai, India
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            Edit
          </button>
        </div>
      </div>

      {/* MODAL */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="w-full overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h4 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input
                name="firstName"
                value={formData?.firstName || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Last Name</Label>
              <Input
                name="lastName"
                value={formData?.lastName || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                name="email"
                value={formData?.email || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                name="phone"
                value={formData?.phone || ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-2">
              <Label>Bio</Label>
              <Input
                name="bio"
                value={formData?.bio || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Dummy Address Section */}
          <div className="mt-8 border-t pt-5">
            <h5 className="mb-3 text-lg font-medium text-gray-800 dark:text-white/90">
              Address (Dummy Data)
            </h5>
            <p className="text-sm text-gray-500">123 Anna Salai</p>
            <p className="text-sm text-gray-500">Chennai, Tamil Nadu</p>
            <p className="text-sm text-gray-500">India - 600001</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Close
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}