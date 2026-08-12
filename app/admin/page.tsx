"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import type { CategoriesData, CategorySummary, SubcategorySummary } from "@/lib/booking-types";
import { EditorPanel } from "./components/EditorPanel";
import { PreviewCategoryDetail, PreviewSubcategoryDetail } from "./components/PreviewComponents";
import { AdminSidebar } from "./components/AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeProvider } from "./context/ThemeContext";
import { authApi } from "@/lib/api/auth";
import type { CustomerListState } from "@/components/CustomerTable";
import { AdminSignIn } from "./components/AdminSignIn";

// Lazy load heavy components
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const GalleryAdminNew = lazy(() => import("./components/GalleryAdminNew").then(m => ({ default: m.GalleryAdminNew })));
const ProfileSection = lazy(() => import("./components/ProfileSection").then(m => ({ default: m.ProfileSection })));
const HomePageEditor = lazy(() => import("./components/HomePageEditor").then(m => ({ default: m.HomePageEditor })));
const AppointmentManagement = lazy(() => import("@/components/AppointmentManagement").then(m => ({ default: m.default })));
const AvailabilitySettings = lazy(() => import("@/components/AvailabilitySettings").then(m => ({ default: m.default })));
const CustomerTable = lazy(() => import("@/components/CustomerTable").then(m => ({ default: m.default })));
const CustomerDetails = lazy(() => import("@/components/CustomerDetails").then(m => ({ default: m.default })));
const PricingManagement = lazy(() => import("./components/PricingManagement").then(m => ({ default: m.PricingManagement })));

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
    const [customerListState, setCustomerListState] = useState<CustomerListState>({
        query: "", segment: "ALL", sort: "NAME_ASC", page: 0
    });
    
    // New state for lazy loading
    const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
    const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
    
    // New state for subcategory lazy loading
    const [subcategorySummariesCache, setSubcategorySummariesCache] = useState<Map<string, SubcategorySummary[]>>(new Map());
    const [subcategoryDetailsCache, setSubcategoryDetailsCache] = useState<Map<string, any>>(new Map());
    const [categoryDetailsCache, setCategoryDetailsCache] = useState<Map<string, any>>(new Map());
    const [isLoadingSubcategorySummaries, setIsLoadingSubcategorySummaries] = useState(false);
    const [isLoadingSubcategoryDetail, setIsLoadingSubcategoryDetail] = useState(false);
    const [loadingSubcategorySlug, setLoadingSubcategorySlug] = useState<string | null>(null);
    const [cacheVersion, setCacheVersion] = useState(0); // For cache invalidation

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

    // Consolidated cache invalidation
    const invalidateCaches = (scope?: 'all' | 'category' | 'subcategory', slug?: string) => {
        if (scope === 'all' || !scope) {
            setCategorySummaries([]);
            setSubcategorySummariesCache(new Map());
            setSubcategoryDetailsCache(new Map());
            setCategoryDetailsCache(new Map());
            setCacheVersion(prev => prev + 1);
        } else if (scope === 'category' && slug) {
            setCategorySummaries(prev => prev.filter(cat => cat.slug !== slug));
            setCategoryDetailsCache(prev => {
                const next = new Map(prev);
                next.delete(slug);
                return next;
            });
            setSubcategorySummariesCache(prev => {
                const next = new Map(prev);
                next.delete(slug);
                return next;
            });
            setCacheVersion(prev => prev + 1);
        } else if (scope === 'subcategory' && slug) {
            setSubcategoryDetailsCache(prev => {
                const next = new Map(prev);
                next.delete(slug);
                return next;
            });
            setCacheVersion(prev => prev + 1);
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

    // New subcategory loading functions
    const loadSubcategorySummaries = async (
        categorySlug: string,
        jwtToken: string,
        forceRefresh = false
    ) => {
        try {
            if (!jwtToken) {
                setToken("");
                setError("Session expired. Please log in again.");
                return [];
            }

            // Check cache first
            if (!forceRefresh && subcategorySummariesCache.has(categorySlug)) {
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
            const response = await authApi.login({ email, password, rememberDevice: rememberMe });
            setToken("cookie-session");
            setIsAuthChecking(false);
            // Only load category summaries initially, full data loaded on-demand
            void loadCategorySummaries("cookie-session");
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async (credential: string) => {
        setIsLoading(true);
        setError("");
        try {
            await authApi.loginWithGoogle(credential, rememberMe);
            setToken("cookie-session");
            setIsAuthChecking(false);
            void loadCategorySummaries("cookie-session");
        } catch (err: any) {
            setError(err.message || "This Google account is not approved for admin access.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            try {
                await authApi.session();
                setIsAuthChecking(true);
                setToken("cookie-session");
                await Promise.all([pingBackend(), loadCategorySummaries("cookie-session")]);
            } catch {
                setToken("");
                pingBackend();
            } finally {
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

    const handleUpdate = (updated: CategoriesData | any) => {
        // Some optimized mutation routes return { success: true } or a single saved item.
        // Only replace the old full data state when a real category tree is returned.
        if (updated && Array.isArray(updated.categories)) {
            setData(updated as CategoriesData);
        }
    };

    const upsertCategorySummary = (summary: CategorySummary) => {
        setCategorySummaries((prev) => {
            const existingIndex = prev.findIndex((cat) => cat.slug === summary.slug || (summary.id && cat.id === summary.id));
            if (existingIndex === -1) {
                return [...prev, summary].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
            }

            const next = [...prev];
            next[existingIndex] = { ...next[existingIndex], ...summary };
            return next.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        });
    };

    const removeCategorySummary = (slug: string) => {
        setCategorySummaries((prev) => prev.filter((cat) => cat.slug !== slug));
        setCategoryDetailsCache((prev) => {
            const next = new Map(prev);
            next.delete(slug);
            return next;
        });
        setSubcategorySummariesCache((prev) => {
            const next = new Map(prev);
            next.delete(slug);
            return next;
        });
        if (selection.type !== "root" && selection.catSlug === slug) {
            setSelection({ type: "root" });
        }
    };

    const upsertSubcategorySummary = (categorySlug: string, summary: SubcategorySummary) => {
        setSubcategorySummariesCache((prev) => {
            const next = new Map(prev);
            const current = next.get(categorySlug) ?? [];
            const existingIndex = current.findIndex((sub) => sub.slug === summary.slug || (summary.id && sub.id === summary.id));

            if (existingIndex === -1) {
                next.set(categorySlug, [...current, summary].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)));
            } else {
                const updated = [...current];
                updated[existingIndex] = { ...updated[existingIndex], ...summary };
                next.set(categorySlug, updated.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)));
            }

            return next;
        });

        setCategoryDetailsCache((prev) => {
            const cat = prev.get(categorySlug);
            if (!cat) return prev;

            const currentSubs = cat.subcategories ?? [];
            const existingIndex = currentSubs.findIndex((sub: any) => sub.slug === summary.slug || (summary.id && sub.id === summary.id));
            const nextSubs = [...currentSubs];

            if (existingIndex === -1) {
                nextSubs.push({ ...summary, items: [] } as any);
            } else {
                nextSubs[existingIndex] = { ...nextSubs[existingIndex], ...summary };
            }

            const next = new Map(prev);
            next.set(categorySlug, { ...cat, subcategories: nextSubs });
            return next;
        });
    };

    const removeSubcategorySummary = (categorySlug: string, subSlug: string) => {
        setSubcategorySummariesCache((prev) => {
            const next = new Map(prev);
            next.set(categorySlug, (next.get(categorySlug) ?? []).filter((sub) => sub.slug !== subSlug));
            return next;
        });

        setSubcategoryDetailsCache((prev) => {
            const next = new Map(prev);
            next.delete(subSlug);
            return next;
        });

        setCategoryDetailsCache((prev) => {
            const cat = prev.get(categorySlug);
            if (!cat) return prev;

            const next = new Map(prev);
            next.set(categorySlug, {
                ...cat,
                subcategories: (cat.subcategories ?? []).filter((sub: any) => sub.slug !== subSlug),
            });
            return next;
        });

        if (selection.type === "subcategory" && selection.catSlug === categorySlug && selection.subSlug === subSlug) {
            setSelection({ type: "category", catSlug: categorySlug });
        }
    };

    const refreshSubcategorySummaries = async (categorySlug: string) => {
        setSubcategorySummariesCache((prev) => {
            const next = new Map(prev);
            next.delete(categorySlug);
            return next;
        });
        setCategoryDetailsCache((prev) => {
            const next = new Map(prev);
            next.delete(categorySlug);
            return next;
        });
        return loadSubcategorySummaries(categorySlug, token, true);
    };

    const refreshCategorySummaries = async () => {
        invalidateCaches('all');
        return loadCategorySummaries(token);
    };

    const refreshSubcategoryDetail = async (slug: string) => {
        invalidateCaches('subcategory', slug);
        try {
            const res = await fetch(`/api/admin/subcategories/${slug}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const fresh = await res.json();
                setSubcategoryDetailsCache(prev => new Map(prev).set(slug, fresh));
                return fresh;
            }
        } catch (err) {
            console.error("Failed to refresh subcategory detail:", err);
        }
        return null;
    };

    const handleSelectionChange = async (newSelection: Selection) => {
        setSelection(newSelection);
    };

    const handleLogout = async () => {
        await authApi.logout();
        setToken("");
    };

    const handleSectionChange = (section: string) => {
        if (section !== currentSection
            && document.documentElement.dataset.pricingDirty === "true"
            && !window.confirm("Discard your unsaved pricing changes and leave Pricing?")) {
            return;
        }
        setCurrentSection(section);
        const url = new URL(window.location.href);
        url.searchParams.set("section", section);
        if (section !== "pricing") url.searchParams.delete("pricingTab");
        window.history.pushState({}, "", url);
        if (section !== "customers") setSelectedCustomerId(null);
        // Reset selection when changing sections
        if (section === "categories") {
            setSelection({ type: "root" });
            // Gallery and Services share category/subcategory displayOrder.
            // Refresh instead of reusing a cache that may predate a Gallery edit.
            void refreshCategorySummaries();
        }
    };

    const handleGalleryCategoryEdit = (item: { slug?: string; link?: string }) => {
        const categorySlug = item.slug || item.link?.replace(/^\/+/, "");
        if (!categorySlug) return;

        setCurrentSection("categories");
        setSelection({ type: "category", catSlug: categorySlug });
    };

    if (!token && !isAuthChecking) {
        return <AdminSignIn email={email} password={password} rememberDevice={rememberMe} error={error} loading={isLoading} onEmailChange={setEmail} onPasswordChange={setPassword} onRememberChange={setRememberMe} onPasswordSignIn={handleSignIn} onGoogleSignIn={handleGoogleSignIn} onForgotPassword={() => setError("Please contact support to securely reset your password.")} />;
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
            <div className={`${currentSection === "categories" ? "min-h-dvh" : "h-dvh"} flex bg-neutral-50 transition-colors dark:bg-neutral-900`}>
                {/* Sidebar */}
                <AdminSidebar
                    currentSection={currentSection}
                    onSectionChange={handleSectionChange}
                    onLogout={handleLogout}
                    adminName={adminName}
                />

            {/* Main content area */}
            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${currentSection === "categories" ? "min-h-dvh" : "overflow-hidden"}`}>
                {/* Top bar */}
                <div className="h-16 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shrink-0 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-medium text-neutral-900 dark:text-white">
                            {({
                                dashboard: "Dashboard",
                                categories: "Services",
                                homepage: "Homepage",
                                bookings: "Appointments",
                                availability: "Availability Settings",
                                customers: "Customers",
                                pricing: "Pricing",
                                gallery: "Gallery",
                                settings: "Settings",
                                general: "General Settings",
                                "booking-config": "Booking Configuration",
                                integrations: "Integrations",
                                profile: "Profile",
                            } as Record<string, string>)[currentSection] ?? currentSection}
                        </h1>
                        {currentSection === "categories" && (
                            <span className="text-sm text-neutral-400">{categories.length} categories</span>
                        )}
                    </div>
                    <NotificationBell token={token} onNavigate={handleSectionChange} />
                </div>

                {/* Content based on section */}
                {currentSection === "dashboard" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading dashboard…</div>}>
                            <Dashboard
                                token={token}
                                categorySummaries={categorySummaries}
                                onNavigate={handleSectionChange}
                            />
                        </Suspense>
                    </div>
                )}

                {currentSection === "categories" && (
                    <div className="flex flex-1 bg-[#f7f5f2] dark:bg-neutral-900">
                        {isLoadingSummaries ? (
                            <div className="flex-1 px-8 py-6 space-y-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded-sm animate-pulse" />
                                ))}
                            </div>
                        ) : categorySummaries.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
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
                            </div>
                        ) : (
                            <EditorPanel
                                data={data ?? { defaultBookingUrl: "", categories: [] }}
                                selection={selection}
                                setSelection={handleSelectionChange}
                                token={token}
                                onUpdate={handleUpdate}
                                categorySummaries={categorySummaries}
                                subcategoryDetailsCache={subcategoryDetailsCache}
                                onLoadSubcategorySummaries={loadSubcategorySummaries}
                                onLoadSubcategoryDetail={loadSubcategoryDetail}
                                isLoadingSubcategorySummaries={isLoadingSubcategorySummaries}
                                isLoadingSubcategoryDetail={isLoadingSubcategoryDetail}
                                loadingSubcategorySlug={loadingSubcategorySlug}
                                onCategoryCreated={upsertCategorySummary}
                                onCategoryDeleted={removeCategorySummary}
                                onCategoryUpdated={upsertCategorySummary}
                                onCategorySummariesRefresh={refreshCategorySummaries}
                                onSubcategoryCreated={upsertSubcategorySummary}
                                onSubcategoryDeleted={removeSubcategorySummary}
                                onSubcategoryUpdated={upsertSubcategorySummary}
                                onSubcategorySummariesRefresh={refreshSubcategorySummaries}
                                onSubcategoryUpdate={refreshSubcategoryDetail}
                            />
                        )}
                    </div>
                )}

                {currentSection === "gallery" && (
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading gallery…</div>}>
                            <GalleryAdminNew />
                        </Suspense>
                    </div>
                )}

                {currentSection === "homepage" && (
                    <div className="min-h-0 flex-1 overflow-hidden">
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
                                <div className="p-4 sm:p-8">
                                    <CustomerDetails
                                        customerId={selectedCustomerId}
                                        onBack={() => setSelectedCustomerId(null)}
                                    />
                                </div>
                            ) : (
                                <div className="p-4 sm:p-8">
                                    <CustomerTable
                                        onViewDetails={setSelectedCustomerId}
                                        state={customerListState}
                                        onStateChange={setCustomerListState}
                                    />
                                </div>
                            )}
                        </Suspense>
                    </div>
                )}

                {currentSection === "pricing" && (
                    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
                        <Suspense fallback={<div className="p-12 text-neutral-500">Loading pricing…</div>}>
                            <PricingManagement token={token} />
                        </Suspense>
                    </div>
                )}

                {/* Placeholder for other sections */}
                {currentSection !== "categories" && currentSection !== "dashboard" && currentSection !== "gallery" && currentSection !== "profile" && currentSection !== "homepage" && currentSection !== "bookings" && currentSection !== "availability" && currentSection !== "customers" && currentSection !== "pricing" && (
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
