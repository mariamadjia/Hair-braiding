"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import type { CategoriesData, CategorySummary, SubcategorySummary, BookingCategory } from "@/lib/booking-types";
import { EditorPanel } from "./components/EditorPanel";
import { PreviewServicesList, PreviewCategoryDetail, PreviewSubcategoryDetail } from "./components/PreviewComponents";
import { AdminSidebar } from "./components/AdminSidebar";
import { ThemeProvider } from "./context/ThemeContext";
import { authApi } from "@/lib/api/auth";

// Lazy load heavy components
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const GalleryAdminNew = lazy(() => import("./components/GalleryAdminNew").then(m => ({ default: m.GalleryAdminNew })));
const ProfileSection = lazy(() => import("./components/ProfileSection").then(m => ({ default: m.ProfileSection })));
const HomePageEditor = lazy(() => import("./components/HomePageEditor").then(m => ({ default: m.HomePageEditor })));
const AppointmentManagement = lazy(() => import("@/components/AppointmentManagement").then(m => ({ default: m.default })));
const AvailabilitySettings = lazy(() => import("@/components/AvailabilitySettings").then(m => ({ default: m.default })));
const CustomerTable = lazy(() => import("@/components/CustomerTable").then(m => ({ default: m.default })));
const CustomerDetails = lazy(() => import("@/components/CustomerDetails").then(m => ({ default: m.default })));

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
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [selection, setSelection] = useState<Selection>({ type: "root" });
    const [currentSection, setCurrentSection] = useState("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    
    // New state for lazy loading
    const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
    const [categoryDetailsCache, setCategoryDetailsCache] = useState<Map<string, BookingCategory>>(new Map());
    const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
    const [isLoadingCategoryDetail, setIsLoadingCategoryDetail] = useState(false);
    const [loadingCategorySlug, setLoadingCategorySlug] = useState<string | null>(null);
    
    // New state for subcategory lazy loading
    const [subcategorySummariesCache, setSubcategorySummariesCache] = useState<Map<string, SubcategorySummary[]>>(new Map());
    const [subcategoryDetailsCache, setSubcategoryDetailsCache] = useState<Map<string, any>>(new Map());
    const [isLoadingSubcategorySummaries, setIsLoadingSubcategorySummaries] = useState(false);
    const [isLoadingSubcategoryDetail, setIsLoadingSubcategoryDetail] = useState(false);
    const [loadingSubcategorySlug, setLoadingSubcategorySlug] = useState<string | null>(null);

    const loadCategories = async (jwtToken: string) => {
        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return;
            }

            const res = await fetch("/api/admin/categories", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setToken("");
                    setError("Session expired. Please log in again.");
                    throw new Error("Unauthorized");
                }
                throw new Error(`Failed to load categories: ${res.status}`);
            }

            const json = await res.json();
            setData(json);
            setError("");
        } catch (err: any) {
            if (err.message !== "Unauthorized") {
                console.error("Failed to load categories:", err);
                setError("Failed to load categories from backend. Please try again.");
            }
        }
    };

    // Warm up the backend on page load (prevents cold start delay)
    const pingBackend = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";
        fetch(`${apiUrl}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(60000) })
            .catch(() => {});
    };

    // New optimized loading functions
    const loadCategorySummaries = async (jwtToken: string) => {
        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return;
            }

            setIsLoadingSummaries(true);
            console.log('[ADMIN PAGE] Loading category summaries with token:', jwtToken.substring(0, 20) + '...');
            
            const res = await fetch("/api/admin/categories/summaries", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(10000)
            });

            console.log('[ADMIN PAGE] Summaries response status:', res.status);

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    console.error('[ADMIN PAGE] Unauthorized access to summaries');
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setToken("");
                    setError("Session expired. Please log in again.");
                    throw new Error("Unauthorized");
                }
                throw new Error(`Failed to load category summaries: ${res.status}`);
            }

            const summaries: CategorySummary[] = await res.json();
            console.log('[ADMIN PAGE] Loaded summaries:', summaries.length);
            setCategorySummaries(summaries);
            setError("");
        } catch (err: any) {
            if (err.message !== "Unauthorized") {
                console.error("Failed to load category summaries:", err);
                setError("Failed to load category summaries from backend. Please try again.");
            }
        } finally {
            setIsLoadingSummaries(false);
        }
    };

    const loadCategoryDetail = async (slug: string, jwtToken: string): Promise<BookingCategory | null> => {
        // Check cache first
        if (categoryDetailsCache.has(slug)) {
            return categoryDetailsCache.get(slug) ?? null;
        }

        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return null;
            }

            setIsLoadingCategoryDetail(true);
            setLoadingCategorySlug(slug);
            const res = await fetch(`/api/admin/categories/${slug}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(15000)
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setToken("");
                    setError("Session expired. Please log in again.");
                    throw new Error("Unauthorized");
                }
                throw new Error(`Failed to load category detail: ${res.status}`);
            }

            const categoryDetail: BookingCategory = await res.json();
            
            // Cache the result
            setCategoryDetailsCache(prev => new Map(prev).set(slug, categoryDetail));
            
            setError("");
            return categoryDetail;
        } catch (err: any) {
            if (err.message !== "Unauthorized") {
                console.error("Failed to load category detail:", err);
                setError("Failed to load category detail from backend. Please try again.");
            }
            return null;
        } finally {
            setIsLoadingCategoryDetail(false);
            setLoadingCategorySlug(null);
        }
    };

    // New subcategory loading functions
    const loadSubcategorySummaries = async (categorySlug: string, jwtToken: string) => {
        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return [];
            }

            // Check cache first
            if (subcategorySummariesCache.has(categorySlug)) {
                return subcategorySummariesCache.get(categorySlug)!;
            }

            setIsLoadingSubcategorySummaries(true);
            console.log('[ADMIN PAGE] Loading subcategory summaries for category:', categorySlug);
            
            const res = await fetch(`/api/admin/categories/${categorySlug}/subcategories`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(10000)
            });

            console.log('[ADMIN PAGE] Subcategory summaries response status:', res.status);

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setToken("");
                    setError("Session expired. Please log in again.");
                    throw new Error("Unauthorized");
                }
                throw new Error(`Failed to load subcategory summaries: ${res.status}`);
            }

            const summaries: SubcategorySummary[] = await res.json();
            console.log('[ADMIN PAGE] Loaded subcategory summaries:', summaries.length);
            
            // Cache the result
            setSubcategorySummariesCache(prev => new Map(prev).set(categorySlug, summaries));
            
            setError("");
            return summaries;
        } catch (err: any) {
            if (err.message !== "Unauthorized") {
                console.error("Failed to load subcategory summaries:", err);
                setError("Failed to load subcategory summaries from backend. Please try again.");
            }
            return [];
        } finally {
            setIsLoadingSubcategorySummaries(false);
        }
    };

    const loadSubcategoryDetail = async (slug: string, jwtToken: string) => {
        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return null;
            }

            // Check cache first
            if (subcategoryDetailsCache.has(slug)) {
                return subcategoryDetailsCache.get(slug)!;
            }

            setIsLoadingSubcategoryDetail(true);
            setLoadingSubcategorySlug(slug);
            console.log('[ADMIN PAGE] Loading subcategory detail:', slug);
            
            const res = await fetch(`/api/admin/subcategories/${slug}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(15000)
            });

            console.log('[ADMIN PAGE] Subcategory detail response status:', res.status);

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setToken("");
                    setError("Session expired. Please log in again.");
                    throw new Error("Unauthorized");
                }
                throw new Error(`Failed to load subcategory detail: ${res.status}`);
            }

            const subcategoryDetail: any = await res.json();
            console.log('[ADMIN PAGE] Loaded subcategory detail:', slug);
            
            // Cache the result
            setSubcategoryDetailsCache(prev => new Map(prev).set(slug, subcategoryDetail));
            
            setError("");
            return subcategoryDetail;
        } catch (err: any) {
            if (err.message !== "Unauthorized") {
                console.error("Failed to load subcategory detail:", err);
                setError("Failed to load subcategory detail from backend. Please try again.");
            }
            return null;
        } finally {
            setIsLoadingSubcategoryDetail(false);
            setLoadingSubcategorySlug(null);
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
            setIsAuthChecking(false);
            
            // authApi.login already stores in localStorage as 'auth_token'
            // Just store in sessionStorage if not remembering
            if (!rememberMe) {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("admin_user");

                sessionStorage.setItem("auth_token", response.token);
                sessionStorage.setItem("admin_user", JSON.stringify(response.admin));
            }
            
            // Load category summaries in background, do not block login
            void loadCategorySummaries(response.token);
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Fire a warm-up ping immediately on page load so the backend isn't cold when we need it
        pingBackend();

        const checkAuthAndLoad = async () => {
            const savedToken =
                sessionStorage.getItem("auth_token") ||
                localStorage.getItem("auth_token");
            
            if (savedToken) {
                setIsAuthChecking(true);
                setToken(savedToken);
                try {
                    await loadCategorySummaries(savedToken);
                } catch (err) {
                    console.error("Auth check failed:", err);
                } finally {
                    setIsAuthChecking(false);
                }
            } else {
                setIsAuthChecking(false);
            }

            const params = new URLSearchParams(window.location.search);
            const section = params.get("section");
            const categorySlug = params.get("category");

            if (section) {
                setCurrentSection(section);
            }

            // Note: do NOT auto-select a category from URL params; let the user click it.
            // Doing so before summaries load shows a broken loading state.
        };

        checkAuthAndLoad();
    }, []);

    const handleUpdate = (updated: CategoriesData) => {
        setData(updated);
    };

    const handleSelectionChange = async (newSelection: Selection) => {
        setSelection(newSelection);
        // Category detail loading is now handled by CategoryEditor itself
        // (it loads subcategory summaries when mounted)
        // Do NOT call loadCategoryDetail here — that loads the full tree
    };

    const handleLoadCategoryDetail = async (slug: string) => {
        return loadCategoryDetail(slug, token);
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

    if (!token && !isAuthChecking) {
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

    if (isAuthChecking) return <div className="p-12 text-neutral-500">Loading…</div>;

    const categories = categorySummaries;

    // Compute what to show in the preview
    const previewCat = selection.type !== "root" ? (data?.categories ?? []).find((c) => c.slug === selection.catSlug) : null;
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
                            <span className="text-sm text-neutral-400">{categories.length} categories</span>
                        )}
                    </div>
                </div>

                {/* Content based on section */}
                {currentSection === "dashboard" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading dashboard…</div>}>
                            <Dashboard />
                        </Suspense>
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
                                {isLoadingSummaries ? (
                                    <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                                        <p className="text-neutral-500 mb-4">Loading services...</p>
                                    </div>
                                ) : categorySummaries.length === 0 ? (
                                    <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                                        <p className="text-neutral-500 mb-4">No services found</p>
                                        {error && (
                                            <p className="text-sm text-red-600 mb-4">{error}</p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => loadCategorySummaries(token)}
                                            className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <EditorPanel
                                        data={data!}
                                        selection={selection}
                                        setSelection={handleSelectionChange}
                                        token={token}
                                        onUpdate={handleUpdate}
                                        categorySummaries={categorySummaries}
                                        categoryDetailsCache={categoryDetailsCache}
                                        onLoadCategoryDetail={handleLoadCategoryDetail}
                                        isLoadingCategoryDetail={isLoadingCategoryDetail}
                                        loadingCategorySlug={loadingCategorySlug}
                                        subcategorySummariesCache={subcategorySummariesCache}
                                        subcategoryDetailsCache={subcategoryDetailsCache}
                                        onLoadSubcategorySummaries={loadSubcategorySummaries}
                                        onLoadSubcategoryDetail={loadSubcategoryDetail}
                                        isLoadingSubcategorySummaries={isLoadingSubcategorySummaries}
                                        isLoadingSubcategoryDetail={isLoadingSubcategoryDetail}
                                        loadingSubcategorySlug={loadingSubcategorySlug}
                                    />
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {currentSection === "gallery" && (
                    <div className="flex-1 overflow-hidden">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading gallery…</div>}>
                            <GalleryAdminNew />
                        </Suspense>
                    </div>
                )}

                {currentSection === "homepage" && (
                    <div className="flex-1 overflow-hidden">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading homepage editor…</div>}>
                            <HomePageEditor />
                        </Suspense>
                    </div>
                )}

                {currentSection === "profile" && (
                    <Suspense fallback={<div className="p-12 text-neutral-500">Loading profile…</div>}>
                        <ProfileSection 
                            adminName={adminName}
                            adminEmail={adminUser?.email}
                        />
                    </Suspense>
                )}

                {currentSection === "bookings" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading appointments…</div>}>
                            <AppointmentManagement />
                        </Suspense>
                    </div>
                )}

                {currentSection === "availability" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading availability settings…</div>}>
                            <AvailabilitySettings />
                        </Suspense>
                    </div>
                )}

                {currentSection === "customers" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading customers…</div>}>
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
                        </Suspense>
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
