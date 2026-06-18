"use client";

import { useState } from "react";
import { User, Mail, Lock, Camera, Save, X } from "lucide-react";

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
            if (formData.newPassword.length < 8) {
                setMessage({ type: "error", text: "Password must be at least 8 characters" });
                setIsSaving(false);
                return;
            }
        }

        // Simulate API call
        setTimeout(() => {
            setMessage({ type: "success", text: "Profile updated successfully" });
            setIsSaving(false);
            setIsEditing(false);
            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
        }, 1000);
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
        <div className="flex-1 overflow-y-auto p-8 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Profile Header */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8">
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
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-lg border ${
                        message.type === "success" 
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300" 
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    }`}>
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                {/* Personal Information */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Personal Information</h3>
                    
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
                                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-sm text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white disabled:bg-neutral-50 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-500"
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
                                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-sm text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white disabled:bg-neutral-50 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-500"
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
                                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-sm text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white disabled:bg-neutral-50 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                {isEditing && (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Change Password</h3>
                        
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
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-sm text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
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
                                        placeholder="Enter new password (min. 8 characters)"
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-sm text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
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
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-sm text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-neutral-500">
                                Leave password fields empty if you don't want to change your password.
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {isEditing && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 dark:bg-neutral-700 text-white rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                    </div>
                )}

                {/* Account Stats */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Account Information</h3>
                    
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
                </div>
            </div>
        </div>
    );
}
