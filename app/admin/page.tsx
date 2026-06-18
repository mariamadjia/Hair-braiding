"use client";

import { useEffect, useState } from "react";
import type { CategoriesData } from "@/lib/booking-types";
import { EditorPanel } from "./components/EditorPanel";
import { PreviewServicesList, PreviewCategoryDetail, PreviewSubcategoryDetail } from "./components/PreviewComponents";
import { AdminSidebar } from "./components/AdminSidebar";
import { Dashboard } from "./components/Dashboard";
import { GalleryAdminNew } from "./components/GalleryAdminNew";
import { ProfileSection } from "./components/ProfileSection";
import { HomePageEditor } from "./components/HomePageEditor";
import { ThemeProvider } from "./context/ThemeContext";
import { authApi } from "@/lib/api/auth";
import AppointmentManagement from "@/components/AppointmentManagement";
import AvailabilitySettings from "@/components/AvailabilitySettings";
import CustomerTable from "@/components/CustomerTable";
import CustomerDetails from "@/components/CustomerDetails";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export default function AdminPage() {
    const [token, setToken] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [data, setData] = useState<CategoriesData | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selection, setSelection] = useState<Selection>({ type: "root" });
    const [currentSection, setCurrentSection] = useState("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

    const loadCategories = async (jwtToken: string) => {
        try {
            // Fetch categories from Spring Boot backend
            const json = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }).then(res => {
                if (!res.ok) {
                    if (res.status === 401) {
                        // Token expired or invalid, clear it and show login
                        localStorage.removeItem("auth_token");
                        sessionStorage.removeItem("auth_token");
                        setToken("");
                        setError("Session expired. Please log in again.");
                        throw new Error('Unauthorized');
                    }
                    throw new Error(`Failed to load categories: ${res.status}`);
                }
                return res.json();
            });
            
            setData(json);
            setError("");
        } catch (err: any) {
            if (err.message !== 'Unauthorized') {
                console.error("Failed to load categories:", err);
                setError("Failed to load categories from backend");
            }
        }
    };

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password.");
            return;
        }
        
        setIsLoading(true);
        setError("");
        
        try {
            const response = await authApi.login({ email, password });
            setToken(response.token);
            
            // authApi.login already stores in localStorage as 'auth_token'
            // Just store in sessionStorage if not remembering
            if (!rememberMe) {
                localStorage.removeItem("auth_token");
                sessionStorage.setItem("auth_token", response.token);
            }
            
            await loadCategories(response.token);
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const savedToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
        if (savedToken && authApi.isAuthenticated()) {
            setToken(savedToken);
            loadCategories(savedToken);
        }

        const params = new URLSearchParams(window.location.search);
        const section = params.get("section");
        const categorySlug = params.get("category");

        if (section) {
            setCurrentSection(section);
        }

        if (section === "categories" && categorySlug) {
            setSelection({ type: "category", catSlug: categorySlug });
        }
    }, []);

    const handleUpdate = (updated: CategoriesData) => {
        setData(updated);
    };

    const handleLogout = () => {
        authApi.logout();
        setToken("");
        // authApi.logout() already removes auth_token from both storages
    };

    const handleSectionChange = (section: string) => {
        setCurrentSection(section);
        // Reset selection when changing sections
        if (section === "categories") {
            setSelection({ type: "root" });
        }
    };

    const handleGalleryCategoryEdit = (item: { slug?: string; link?: string }) => {
        const categorySlug = item.slug || item.link?.replace(/^\/+/, "");
        if (!categorySlug) return;

        setCurrentSection("categories");
        setSelection({ type: "category", catSlug: categorySlug });
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 relative overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/Admin/welcome.jpg')",
                    }}
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                <div className="relative w-full max-w-md space-y-6 p-10 border border-white/20 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-neutral-900 flex items-center justify-center">
                                <span className="text-2xl text-white">✨</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-light tracking-tight text-neutral-900">Braiding Admin</h1>
                    </div>

                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-700">Email</label>
                            <input
                                type="email"
                                className="w-full border border-neutral-300 rounded-sm px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-700">Password</label>
                            <input
                                type="password"
                                className="w-full border border-neutral-300 rounded-sm px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                                placeholder="••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember" className="ml-2 text-sm text-neutral-700">
                                Remember me
                            </label>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleSignIn}
                            disabled={isLoading}
                            className="w-full py-3 text-sm font-medium bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="text-center">
                            <button 
                                type="button"
                                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                                onClick={() => setError("Please contact your administrator to reset your password.")}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !data.categories) return <div className="p-12 text-neutral-500">Loading…</div>;

    // Compute what to show in the preview
    const previewCat = selection.type !== "root" ? data.categories.find((c) => c.slug === selection.catSlug) : null;
    const previewSub = selection.type === "subcategory" && previewCat
        ? (previewCat.subcategories ?? []).find((s) => s.slug === selection.subSlug)
        : null;

    const adminUser = authApi.getCurrentUser();
    const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin";

    return (
        <ThemeProvider>
            <div className="h-screen flex bg-neutral-50 dark:bg-neutral-900 transition-colors">
                {/* Sidebar */}
                <AdminSidebar
                    currentSection={currentSection}
                    onSectionChange={handleSectionChange}
                    onLogout={handleLogout}
                    adminName={adminName}
                />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="h-16 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shrink-0 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-medium text-neutral-900 dark:text-white">
                            {currentSection === "categories" && "Categories"}
                            {currentSection === "subcategories" && "Subcategories"}
                            {currentSection === "items" && "Items"}
                            {currentSection === "dashboard" && "Dashboard"}
                            {currentSection === "homepage" && "Homepage"}
                            {currentSection === "bookings" && "Appointments"}
                            {currentSection === "availability" && "Availability Settings"}
                            {currentSection === "customers" && "Customers"}
                            {currentSection === "pricing" && "Pricing"}
                            {currentSection === "gallery" && "Gallery"}
                            {currentSection === "settings" && "Settings"}
                            {currentSection === "general" && "General Settings"}
                            {currentSection === "booking-config" && "Booking Configuration"}
                            {currentSection === "integrations" && "Integrations"}
                            {currentSection === "profile" && "Profile"}
                        </h1>
                        {currentSection === "categories" && (
                            <span className="text-sm text-neutral-400">{data.categories.length} categories</span>
                        )}
                    </div>
                </div>

                {/* Content based on section */}
                {currentSection === "dashboard" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Dashboard />
                    </div>
                )}

                {currentSection === "categories" && (
                    <div className="flex-1 overflow-y-auto bg-[#FFF5EE] dark:bg-neutral-900">
                        {/* Header Section - Matches Public Site */}
                        <section className="relative overflow-hidden bg-[#FFF5EE] dark:bg-neutral-900 pt-24 md:pt-32 pb-12 md:pb-16 text-neutral-900 dark:text-white">
                            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="text-center mb-10 md:mb-14">
                                    <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400 mb-4">Our Expertise</p>
                                    <h2 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900 dark:text-white">
                                        Signature <span className="font-serif italic">Services</span>
                                    </h2>
                                </div>
                            </div>
                        </section>

                        {/* Services List - Matches Public Site */}
                        <section className="bg-[#FFF5EE] dark:bg-neutral-900 pb-24 md:pb-32">
                            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                                <EditorPanel
                                    data={data}
                                    selection={selection}
                                    setSelection={setSelection}
                                    token={token}
                                    onUpdate={handleUpdate}
                                />
                            </div>
                        </section>
                    </div>
                )}

                {currentSection === "gallery" && (
                    <div className="flex-1 overflow-hidden">
                        <GalleryAdminNew />
                    </div>
                )}

                {currentSection === "homepage" && (
                    <div className="flex-1 overflow-hidden">
                        <HomePageEditor />
                    </div>
                )}

                {currentSection === "profile" && (
                    <ProfileSection 
                        adminName={adminName}
                        adminEmail={adminUser?.email}
                    />
                )}

                {currentSection === "bookings" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <AppointmentManagement />
                    </div>
                )}

                {currentSection === "availability" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <AvailabilitySettings />
                    </div>
                )}

                {currentSection === "customers" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        {selectedCustomerId ? (
                            <div className="p-8">
                                <CustomerDetails
                                    customerId={selectedCustomerId}
                                    onBack={() => setSelectedCustomerId(null)}
                                />
                            </div>
                        ) : (
                            <div className="p-8">
                                <CustomerTable onViewDetails={setSelectedCustomerId} />
                            </div>
                        )}
                    </div>
                )}

                {/* Placeholder for other sections */}
                {currentSection !== "categories" && currentSection !== "dashboard" && currentSection !== "gallery" && currentSection !== "profile" && currentSection !== "homepage" && currentSection !== "bookings" && currentSection !== "availability" && currentSection !== "customers" && (
                    <div className="flex-1 overflow-y-auto p-8 bg-neutral-50 dark:bg-neutral-900">
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-12 text-center">
                                <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">
                                    {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} Section
                                </h2>
                                <p className="text-neutral-500 dark:text-neutral-400">This section is coming soon.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </ThemeProvider>
    );
}
