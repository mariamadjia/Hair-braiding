"use client";

import { useState } from "react";

interface SetupFormData {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface PasswordRequirement {
    label: string;
    met: boolean;
}

export function AdminSetup({ onComplete }: { onComplete: (token: string) => void }) {
    const [formData, setFormData] = useState<SetupFormData>({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const updateField = (field: keyof SetupFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError("");
    };

    const passwordRequirements: PasswordRequirement[] = [
        { label: "At least 8 characters", met: formData.password.length >= 8 },
        { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
        { label: "One number", met: /[0-9]/.test(formData.password) },
    ];

    const allRequirementsMet = passwordRequirements.every((req) => req.met);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

    const handleSubmit = async () => {
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim() || !formData.email.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        if (!allRequirementsMet) {
            setError("Password does not meet all requirements.");
            return;
        }

        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/admin/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || "Failed to create admin account.");
                setLoading(false);
                return;
            }

            onComplete(data.token);
        } catch (err) {
            setError("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 relative overflow-hidden">
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/Admin/welcome.jpg')",
                }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            
            <div className="relative w-full max-w-lg space-y-6 p-10 border border-white/20 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl">
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-4">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 flex items-center justify-center">
                            <span className="text-3xl">👋</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-light tracking-tight text-neutral-900">Welcome to Braiding Admin</h1>
                    <p className="text-sm text-neutral-600">Let's set up your admin account</p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-medium">1</div>
                        <span className="text-sm font-medium text-neutral-700">Step 1 of 1: Create Account</span>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-700">First Name</label>
                            <input
                                type="text"
                                className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                placeholder="Jane"
                                value={formData.firstName}
                                onChange={(e) => updateField("firstName", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-700">Last Name</label>
                            <input
                                type="text"
                                className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                placeholder="Doe"
                                value={formData.lastName}
                                onChange={(e) => updateField("lastName", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-700">Username</label>
                        <input
                            type="text"
                            className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            placeholder="janedoe"
                            value={formData.username}
                            onChange={(e) => updateField("username", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-700">Email</label>
                        <input
                            type="email"
                            className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            placeholder="admin@braiding.com"
                            value={formData.email}
                            onChange={(e) => updateField("email", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-700">Password</label>
                        <input
                            type="password"
                            className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            placeholder="••••••••••"
                            value={formData.password}
                            onChange={(e) => updateField("password", e.target.value)}
                        />
                        <div className="space-y-1 mt-2">
                            {passwordRequirements.map((req, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <span className={req.met ? "text-green-600" : "text-neutral-400"}>
                                        {req.met ? "✓" : "○"}
                                    </span>
                                    <span className={req.met ? "text-green-600" : "text-neutral-500"}>
                                        {req.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-700">Confirm Password</label>
                        <input
                            type="password"
                            className="w-full border border-neutral-300 rounded-sm px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                            placeholder="••••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => updateField("confirmPassword", e.target.value)}
                        />
                        {formData.confirmPassword && (
                            <p className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                                {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !allRequirementsMet || !passwordsMatch}
                        className="w-full py-3 text-sm font-medium bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Create Admin Account"}
                    </button>
                </div>
            </div>
        </div>
    );
}
