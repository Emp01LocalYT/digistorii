"use client";

import React, { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useUser } from "@/context/CurrentUserContext";

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useUser();

  const [formData, setFormData] = useState({
    firstName: user?.name || "",
    lastName: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    // API logic to update profile info
    closeModal();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPwError("All password fields are required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPwSuccess("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPwError(data.message || "Failed to update password");
      }
    } catch {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Name</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.name}</p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Email address</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.email}</p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.phone || "-"}</p>
            </div>
          </div>
        </div>

        <button
          onClick={openModal}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 lg:inline-flex lg:w-auto"
        >
          Edit Profile & Security
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Account Settings
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your personal information and password settings.
            </p>
          </div>

          <div className="custom-scrollbar max-h-[500px] overflow-y-auto px-2 space-y-8">
            {/* Personal Info Section */}
            <div>
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90">
                Personal Details
              </h5>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                <div>
                  <Label>First Name</Label>
                  <Input type="text" value={formData.firstName} onChange={handleProfileChange} name="firstName" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input type="text" value={formData.email} onChange={handleProfileChange} name="email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input type="text" value={formData.phone} onChange={handleProfileChange} name="phone" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={handleSaveProfile}>
                  Save Profile Info
                </Button>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Change Password Section */}
            <div>
              <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">
                Change Password
              </h5>
              <p className="mb-4 text-xs text-gray-500">
                Ensure your account is using a long, random password to stay secure.
              </p>

              {pwError && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{pwError}</div>}
              {pwSuccess && <div className="mb-4 text-sm text-green-600 bg-green-50 p-2 rounded">{pwSuccess}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" type="submit" disabled={loading}>
                    {loading ? "Updating Password..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-2 mt-6">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}