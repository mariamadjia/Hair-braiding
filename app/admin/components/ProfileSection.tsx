"use client";

import { useState } from "react";
import { User, Mail, Lock, Camera, Save, X } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { AdminAlert, AdminButton, AdminCard, AdminPage, AdminPageHeader, adminUi } from "@/components/admin/AdminUI";

interface ProfileSectionProps {
    adminName: string;
    adminEmail?: string;
}

export function ProfileSection({ adminName, adminEmail = "admin@example.com" }: ProfileSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: adminName.split(" ")[0] || "",
        lastName: adminName.split(" ")[1] || "",
        email: adminEmail,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        // Validate passwords if changing
        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setMessage({ type: "error", text: "New passwords do not match" });
                setIsSaving(false);
                return;
            }
            if (formData.newPassword.length < 12) {
                setMessage({ type: "error", text: "Password must be at least 12 characters" });
                setIsSaving(false);
                return;
            }
            if (!formData.currentPassword) {
                setMessage({ type: "error", text: "Enter your current password" });
                setIsSaving(false);
                return;
            }
        }

        try {
            if (!formData.newPassword) {
                setMessage({ type: "error", text: "There are no password changes to save" });
                return;
            }
            const response = await authApi.changePassword({
                oldPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });
            setMessage({ type: "success", text: response.message });
            window.setTimeout(() => { window.location.href = "/admin"; }, 1200);
        } catch (error: any) {
            setMessage({ type: "error", text: error?.message || "Password could not be changed" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            firstName: adminName.split(" ")[0] || "",
            lastName: adminName.split(" ")[1] || "",
            email: adminEmail,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });
        setMessage(null);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
            <AdminPage className="max-w-4xl space-y-6">
                <AdminPageHeader title="Profile" description="Manage your administrator profile and account security." />
                {/* Profile Header */}
                <AdminCard className="p-5 sm:p-6">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="h-24 w-24 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                                <User className="h-12 w-12" />
                            </div>
                            <button className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-6 w-6 text-white" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-medium text-neutral-900 dark:text-white mb-1">
                                {formData.firstName} {formData.lastName}
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-4">{formData.email}</p>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 text-white">
                                    Administrator
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                </span>
                            </div>
                        </div>

                        {/* Edit Button */}
                        {!isEditing && (
                            <AdminButton
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </AdminButton>
                        )}
                    </div>
                </AdminCard>

                {/* Message */}
                {message && (
                    <AdminAlert tone={message.type}>{message.text}</AdminAlert>
                )}

                {/* Personal Information */}
                <AdminCard className="p-5 sm:p-6">
                    <h2 className="admin-card-title mb-6">Personal information</h2>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    disabled={!isEditing}
                                    className={adminUi.input}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    disabled={!isEditing}
                                    className={adminUi.input}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!isEditing}
                                    className={`${adminUi.input} pl-10`}
                                />
                            </div>
                        </div>
                    </div>
                </AdminCard>

                {/* Change Password */}
                {isEditing && (
                    <AdminCard className="p-5 sm:p-6">
                        <h2 className="admin-card-title mb-6">Change password</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <input
                                        type="password"
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        placeholder="Enter current password"
                                        className={`${adminUi.input} pl-10`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <input
                                        type="password"
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        placeholder="Enter new password (min. 12 characters)"
                                        className={`${adminUi.input} pl-10`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="Confirm new password"
                                        className={`${adminUi.input} pl-10`}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-neutral-500">
                                Leave password fields empty if you don't want to change your password.
                            </p>
                        </div>
                    </AdminCard>
                )}

                {/* Action Buttons */}
                {isEditing && (
                    <div className="flex items-center gap-3">
                        <AdminButton
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </AdminButton>
                        <AdminButton
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </AdminButton>
                    </div>
                )}

                {/* Account Stats */}
                <AdminCard className="p-5 sm:p-6">
                    <h2 className="admin-card-title mb-6">Account information</h2>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Member Since</p>
                            <p className="text-base font-medium text-neutral-900 dark:text-white">January 2024</p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Last Login</p>
                            <p className="text-base font-medium text-neutral-900 dark:text-white">Today at 2:48 AM</p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Role</p>
                            <p className="text-base font-medium text-neutral-900 dark:text-white">Administrator</p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Status</p>
                            <p className="text-base font-medium text-green-600 dark:text-green-400">Active</p>
                        </div>
                    </div>
                </AdminCard>
            </AdminPage>
        </div>
    );
}
