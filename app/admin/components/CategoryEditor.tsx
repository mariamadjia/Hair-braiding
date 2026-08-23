"use client";

import { useState, useEffect } from "react";
import type { BookingCategory, CategoriesData, SubcategorySummary } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { slugify } from "../utils";
import { ChevronRight, Trash2, AlertCircle, CheckCircle, AlertTriangle, EllipsisVertical, Pencil, Tag, PanelsTopLeft, Sparkles } from "lucide-react";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl, toProxyUrl } from "@/lib/utils/image";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function CategoryEditor({ cat, token, headers, mutate, setSelection, onLoadSubcategorySummaries, onLoadSubcategoryDetail, isLoadingSubcategorySummaries, onSubcategoryCreated, onSubcategoryDeleted, onSubcategorySummariesRefresh }: {
    cat: BookingCategory;
    token: string;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    setSelection: (s: Selection) => void;
    onLoadSubcategorySummaries: (categorySlug: string, token: string) => Promise<SubcategorySummary[]>;
    onLoadSubcategoryDetail: (slug: string, token: string) => Promise<any>;
    isLoadingSubcategorySummaries: boolean;
    onSubcategoryCreated?: (categorySlug: string, summary: SubcategorySummary) => void;
    onSubcategoryDeleted?: (categorySlug: string, subSlug: string) => void;
    onSubcategorySummariesRefresh?: (categorySlug: string) => Promise<any>;
}) {
    const [name, setName] = useState(cat.name);
    const [serviceTagline, setServiceTagline] = useState(cat.serviceTagline ?? "");
    const [serviceDescription, setServiceDescription] = useState(cat.serviceDescription ?? "");
    const [nameError, setNameError] = useState("");
    const [images, setImages] = useState<string[]>(() =>
        (cat.flippingImages ?? []).map(toProxyUrl)
    );
    const [dirty, setDirty] = useState(false);
    const [addingSub, setAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingCategory, setLoadingCategory] = useState(false);
    const [reorderingSubcategories, setReorderingSubcategories] = useState(false);
    const [openSubcategoryMenuSlug, setOpenSubcategoryMenuSlug] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [subSummaries, setSubSummaries] = useState<SubcategorySummary[]>([]);

    useEffect(() => { 
        setName(cat.name); 
        setServiceTagline(cat.serviceTagline ?? "");
        setServiceDescription(cat.serviceDescription ?? "");
        setNameError("");
        setImages((cat.flippingImages ?? []).map(toProxyUrl));
        setDirty(false); 

        // Fetch the full category detail from the admin endpoint so we always
        // show the real backend flippingImages, not a stale or empty summary.
        const fetchCategoryDetail = async () => {
            if (!cat.slug) return;

            setLoadingCategory(true);
            try {
                const response = await fetch(`/api/admin/categories/${cat.slug}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    cache: "no-store",
                    signal: AbortSignal.timeout(15000)
                });

                if (!response.ok) {
                    return;
                }

                const detail = await response.json();
                const persistedImages = Array.isArray(detail.flippingImages) && detail.flippingImages.length > 0
                    ? detail.flippingImages
                    : (detail.galleryImages ?? []).map((image: { imageUrl?: string }) => image.imageUrl).filter(Boolean);
                const proxiedImages = persistedImages.map((url: string) => {
                    const proxied = toProxyUrl(url);
                    return proxied;
                });
                setImages(proxiedImages);
                setServiceTagline(detail.serviceTagline ?? "");
                setServiceDescription(detail.serviceDescription ?? "");
            } catch (error) {
                console.error('[CategoryEditor] Failed to fetch category detail:', error);
            } finally {
                setLoadingCategory(false);
            }
        };

        fetchCategoryDetail();
    }, [cat.slug, cat.id, token]);

    // Load subcategory summaries when category is selected
    useEffect(() => {
        const loadSubs = async () => {
            if (cat.slug) {
                const summaries = await onLoadSubcategorySummaries(cat.slug, token);
                setSubSummaries(summaries);
            }
        };
        loadSubs();
    }, [cat.slug, token, onLoadSubcategorySummaries]);

    const validateName = (value: string) => {
        if (!value.trim()) {
            setNameError("Category name is required");
            return false;
        }
        if (value.trim().length < 2) {
            setNameError("Name must be at least 2 characters");
            return false;
        }
        setNameError("");
        return true;
    };

    const handleNameChange = (value: string) => {
        setName(value);
        setDirty(true);
        setErrorMessage(null);
        validateName(value);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (dirty) {
                    if (!confirm('You have unsaved changes. Leave without saving?')) return;
                }
                setSelection({ type: "root" });
            }
            if (e.key === 'Enter' && !e.shiftKey && !dirty) {
                e.preventDefault();
                save();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dirty, name, images, cat, setSelection]);

    const guardedSetSelection = (next: Selection) => {
        if (saving) {
            setErrorMessage("Please wait for the current operation to complete.");
            return;
        }
        if (dirty) {
            if (!confirm('You have unsaved changes. Leave without saving?')) return;
        }
        setSelection(next);
    };

    const save = async () => {
        if (saving) return; // Prevent concurrent mutations
        
        // Validate name
        if (!validateName(name)) {
            setErrorMessage("Please fix validation errors before saving.");
            return;
        }
        
        if (images.length < 3) {
            setErrorMessage("Please upload at least 3 photos for the gallery.");
            return;
        }
        if (images.length > 5) {
            setErrorMessage("Maximum 5 photos allowed.");
            return;
        }
        if (!cat.id) {
            setErrorMessage("Category ID is missing. Cannot save flipping images.");
            return;
        }

        setSaving(true);
        setErrorMessage(null);
        try {
            // Save category name separately
            await mutate("PUT", `/${cat.slug}`, {
                name,
                serviceTagline,
                serviceDescription,
            });

            // Save photos using the same dedicated endpoint as Gallery admin
            const backendUrls = images
                .map(fromProxyUrl)
                .filter((url): url is string => Boolean(url));

            console.log('[CategoryEditor] Saving flipping images for category', cat.id, backendUrls);
            await galleryApi.updateCategoryFlippingImages(cat.id, backendUrls);
            console.log('[CategoryEditor] Flipping images saved successfully');

            // Only update local state after server confirms
            setImages(backendUrls.map(toProxyUrl));
            setDirty(false);
            setSuccessMessage("Category saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save category:", error);
            let errorMessage = "Failed to save category. Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = "Authentication error. Please log in again.";
                } else if (error.message.includes('404')) {
                    errorMessage = "Category not found. It may have been deleted.";
                } else if (error.message.includes('409')) {
                    errorMessage = "A category with this name already exists.";
                } else if (error.message.includes('413')) {
                    errorMessage = "Files are too large. Please use smaller images.";
                }
            }
            
            setErrorMessage(errorMessage);
            // Re-fetch to ensure state is consistent
            const response = await fetch(`/api/admin/categories/${cat.slug}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                cache: "no-store",
            });
            if (response.ok) {
                const detail = await response.json();
                setName(detail.name);
                setServiceTagline(detail.serviceTagline ?? "");
                setServiceDescription(detail.serviceDescription ?? "");
                setImages((detail.flippingImages ?? []).map(toProxyUrl));
            }
        } finally {
            setSaving(false);
        }
    };

    const addSub = async () => {
        if (!newSubName.trim()) return;
        if (saving) return; // Prevent concurrent mutations
        setSaving(true);
        setErrorMessage(null);
        try {
            const created = await mutate("POST", `/${cat.slug}/subcategories`, { name: newSubName.trim(), categoryId: cat.id });
            setNewSubName("");
            setAddingSub(false);
            if (created && (created.slug || created.name)) {
                const summary: SubcategorySummary = { id: created.id, name: created.name, slug: created.slug ?? slugify(newSubName), displayOrder: created.displayOrder };
                onSubcategoryCreated?.(cat.slug, summary);
                setSubSummaries(prev => [...prev, summary]);
                setSuccessMessage(`Subcategory "${created.name}" added successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                const fresh = await onSubcategorySummariesRefresh?.(cat.slug);
                if (fresh) setSubSummaries(fresh);
            }
        } catch (error) {
            console.error("Failed to add subcategory:", error);
            let errorMessage = "Failed to add subcategory. Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = "Authentication error. Please log in again.";
                } else if (error.message.includes('409')) {
                    errorMessage = "A subcategory with this name already exists.";
                }
            }
            
            setErrorMessage(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const delSub = async (subSlug: string, subName: string, subId?: number) => {
        if (!confirm(`Delete subcategory "${subName}"?`)) return;
        if (saving) return; // Prevent concurrent mutations
        setSaving(true);
        setErrorMessage(null);
        try {
            await mutate("DELETE", `/${cat.slug}/subcategories/${subSlug}`, subId ? { subcategoryId: subId } : undefined);
            // Only update local state after server confirms deletion
            onSubcategoryDeleted?.(cat.slug, subSlug);
            setSubSummaries(prev => prev.filter(s => s.slug !== subSlug));
            setSuccessMessage(`Subcategory "${subName}" deleted successfully!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to delete subcategory:", error);
            let errorMessage = "Failed to delete subcategory. Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = "Authentication error. Please log in again.";
                } else if (error.message.includes('404')) {
                    errorMessage = "Subcategory not found. It may have been already deleted.";
                } else if (error.message.includes('conflict') || error.message.includes('409')) {
                    errorMessage = "Cannot delete: subcategory is in use by existing bookings.";
                }
            }
            
            setErrorMessage(errorMessage);
            // Refresh to ensure state is consistent
            const fresh = await onSubcategorySummariesRefresh?.(cat.slug);
            if (fresh) setSubSummaries(fresh);
        } finally {
            setSaving(false);
        }
    };

    const moveSubcategory = async (index: number, target: number) => {
        if (
            index === target ||
            target < 0 ||
            target >= subSummaries.length ||
            reorderingSubcategories
        ) {
            return;
        }

        const previous = [...subSummaries];
        const reordered = [...subSummaries];
        const [movedSubcategory] = reordered.splice(index, 1);
        reordered.splice(target, 0, movedSubcategory);

        const subcategoryIds = reordered
            .map((subcategory) => subcategory.id)
            .filter((id): id is number => id !== undefined);

        if (subcategoryIds.length !== reordered.length) {
            setErrorMessage("Subcategory order could not be saved because an item is missing its ID.");
            return;
        }

        setSubSummaries(
            reordered.map((subcategory, displayOrder) => ({
                ...subcategory,
                displayOrder,
            }))
        );
        setReorderingSubcategories(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/admin/subcategories/reorder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(subcategoryIds),
            });

            if (!response.ok) {
                throw new Error(`Unable to reorder subcategories: ${response.status}`);
            }

            const fresh = await onSubcategorySummariesRefresh?.(cat.slug);
            if (fresh) {
                setSubSummaries(fresh);
            }
            setSuccessMessage("Subcategory order updated across Services and Gallery.");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to reorder subcategories:", error);
            setSubSummaries(previous);
            setErrorMessage("Subcategory order could not be saved. The previous order was restored.");
        } finally {
            setReorderingSubcategories(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-5 sm:px-6 lg:py-8">
            {loadingCategory && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                </div>
            )}

            {/* Success Banner */}
            {successMessage && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm text-green-800 dark:text-green-200 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <span className="flex-1 font-medium">{successMessage}</span>
                </div>
            )}
            {/* Error Banner */}
            {errorMessage && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">×</button>
                </div>
            )}

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-3 text-base text-neutral-500 dark:text-neutral-400" aria-label="Breadcrumb">
                <button 
                    type="button" 
                    onClick={() => guardedSetSelection({ type: "root" })} 
                    className="font-medium transition-colors hover:text-neutral-950 dark:hover:text-white"
                >
                    All Categories
                </button>
                <ChevronRight className="h-5 w-5" />
                <span className="font-semibold text-neutral-950 dark:text-white">{cat.name}</span>
            </nav>

            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">Edit category</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Update the details and content shown for this service category.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => guardedSetSelection({ type: "root" })}
                        className={`${btnS} min-h-10 rounded-lg px-4 py-2 text-sm normal-case tracking-normal`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        className={`${btnP} min-h-10 rounded-lg px-5 py-2 text-sm normal-case tracking-normal`}
                        disabled={images.length < 3 || images.length > 5 || saving || nameError !== ""}
                    >
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </header>

            <section className="space-y-5">
                {loadingCategory ? (
                    <div className="space-y-5">
                        <div className="h-52 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-96 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
                            <div className="mb-6 flex items-start gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f6f0e8] text-[#6b4426] dark:bg-neutral-700 dark:text-amber-200">
                                    <Tag className="h-5 w-5" aria-hidden />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold text-neutral-950 dark:text-white">Category information</h3>
                                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">This information helps keep your services organized.</p>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="category-name" className="mb-2 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">Category name</label>
                                <input
                                    id="category-name"
                                    className={`${inp} min-h-11 rounded-lg ${nameError ? "border-red-500" : ""}`}
                                    value={name}
                                    maxLength={100}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    aria-invalid={Boolean(nameError)}
                                    aria-describedby={nameError ? "category-name-error" : "category-name-help"}
                                />
                                {nameError ? (
                                    <p id="category-name-error" className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                        <AlertCircle className="h-3 w-3" /> {nameError}
                                    </p>
                                ) : (
                                    <div id="category-name-help" className="mt-2 flex items-start justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>Choose a clear, descriptive name for your category (e.g., “Box Braids”).</span>
                                        <span className="shrink-0 tabular-nums">{name.length}/100</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
                            <div className="mb-6 flex items-start gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f6f0e8] text-[#6b4426] dark:bg-neutral-700 dark:text-amber-200">
                                    <PanelsTopLeft className="h-5 w-5" aria-hidden />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold text-neutral-950 dark:text-white">Services page content</h3>
                                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                    Shown on the public Signature Services page.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-neutral-800 dark:text-neutral-200" htmlFor="service-tagline">
                                        Tagline
                                    </label>
                                    <input
                                        id="service-tagline"
                                        className={`${inp} min-h-11 rounded-lg`}
                                        value={serviceTagline}
                                        maxLength={255}
                                        placeholder="TIMELESS. NEAT. VERSATILE."
                                        onChange={(event) => {
                                            setServiceTagline(event.target.value);
                                            setDirty(true);
                                            setErrorMessage(null);
                                        }}
                                    />
                                    <div className="mt-2 flex items-start justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>A short, punchy statement that represents this service.</span>
                                        <span className="shrink-0 tabular-nums">{serviceTagline.length}/255</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-neutral-800 dark:text-neutral-200" htmlFor="service-description">
                                        Description
                                    </label>
                                    <textarea
                                        id="service-description"
                                        className={`${inp} min-h-[4.25rem] resize-y rounded-lg py-2.5`}
                                        value={serviceDescription}
                                        maxLength={1000}
                                        placeholder="Classic box braids in a variety of lengths and sizes to match your look."
                                        onChange={(event) => {
                                            setServiceDescription(event.target.value);
                                            setDirty(true);
                                            setErrorMessage(null);
                                        }}
                                    />
                                    <div className="mt-2 flex items-start justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>Provide more detail to help clients understand what to expect.</span>
                                        <span className="shrink-0 tabular-nums">{serviceDescription.length}/1000</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-700">
                                <p className="mb-3 text-sm font-semibold text-[#6b4426] dark:text-amber-200">Preview</p>
                                <div className="rounded-lg border border-[#dfd2c2] bg-[#fcf9f5] p-5 dark:border-neutral-600 dark:bg-neutral-900/50">
                                    <p className="text-sm font-semibold tracking-wide text-[#5b3219] dark:text-amber-100">
                                        {serviceTagline.trim() || "Your service tagline"}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                                        {serviceDescription.trim() || "Your service description will appear here."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="flex items-center justify-center gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden />
                            These changes will be visible on your public Signature Services page.
                        </p>
                
                {/* Gallery Photos Section */}
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="mb-5 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">Gallery Photos</h3>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">Required 3–5</span>
                    </div>
                    
                    <MultiImageUploader
                        images={images}
                        token={token}
                        categoryId={cat.id}
                        large
                        onChange={(urls: string[]) => { setImages(urls); setDirty(true); setErrorMessage(null); }}
                    />
                    
                    {/* Status Indicator */}
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        {images.length >= 3 && images.length <= 5 ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-neutral-700 dark:text-neutral-300" aria-hidden />
                                <span className="text-neutral-700 dark:text-neutral-300">{images.length} photo{images.length > 1 ? 's' : ''} uploaded</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-neutral-700 dark:text-neutral-300" aria-hidden />
                                <span className="text-neutral-700 dark:text-neutral-300">
                                    {images.length === 0
                                        ? 'No photos yet — upload 3 to 5'
                                        : images.length < 3
                                        ? `${images.length} uploaded — add ${3 - images.length} more`
                                        : `${images.length} uploaded — remove ${images.length - 5} (max 5)`}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end border-t border-neutral-200 pt-5 dark:border-neutral-700">
                    <button
                        type="button"
                        onClick={save}
                        className={`${btnP} min-h-11 rounded-lg px-6 py-2.5 text-sm normal-case tracking-normal`}
                        disabled={images.length < 3 || images.length > 5 || saving || nameError !== ""}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
                </>
                )}
            </section>

            <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-neutral-950 dark:text-white">Subcategories</h3>
                    <button type="button" onClick={() => setAddingSub(true)} className={`${btnP} min-h-10 rounded-lg px-4 py-2 text-xs normal-case tracking-normal`}>+ Add subcategory</button>
                </div>

                {addingSub && (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-3 space-y-2 bg-neutral-50 dark:bg-neutral-800">
                        <div><label className={lbl}>Name *</label><input className={inp} value={newSubName} onChange={(e) => setNewSubName(e.target.value)} /></div>
                        <div className="flex gap-2">
                            <button type="button" onClick={addSub} className={btnP} disabled={!newSubName.trim()}>Add</button>
                            <button type="button" onClick={() => setAddingSub(false)} className={btnS}>Cancel</button>
                        </div>
                    </div>
                )}

                <div className="space-y-2.5">
                    {isLoadingSubcategorySummaries ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded-sm animate-pulse" />
                            ))}
                        </div>
                    ) : subSummaries.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">No subcategories yet</p>
                            <p className="mt-1 text-xs text-neutral-500">Add the first style offered in this category.</p>
                            <button type="button" onClick={() => setAddingSub(true)} className={`${btnP} mt-4 min-h-10 rounded-lg px-4 py-2 text-xs normal-case tracking-normal`}>+ Add subcategory</button>
                        </div>
                    ) : (
                        <SortableList items={subSummaries} getId={sub => sub.id ?? sub.slug} getLabel={sub => sub.name} onReorder={(_, meta) => void moveSubcategory(meta.fromIndex, meta.toIndex)} disabled={reorderingSubcategories} ariaLabel={`${cat.name} style order`} className="space-y-2.5" itemClassName="grid min-h-16 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2.5 transition-all hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/40 sm:gap-4 sm:px-5">
                            {(sub, index) => (<>
                            <div 
                                className="contents"
                            >
                                <SortableHandle className="flex h-10 w-8 items-center justify-center" />
                                <span className="w-7 text-sm tabular-nums text-neutral-500" aria-hidden="true">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        await onLoadSubcategoryDetail(sub.slug, token);
                                        setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug });
                                    }} 
                                    className="min-w-0 text-left"
                                >
                                    <div className="truncate text-[15px] font-semibold leading-5 text-neutral-950 dark:text-white">
                                        {sub.name}
                                    </div>
                                    <div className="mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                                        Click to edit
                                    </div>
                                </button>
                                <div className="flex flex-shrink-0 items-center gap-2">
                                    <button 
                                        type="button"
                                        draggable={false}
                                        data-no-drag="true"
                                        onClick={async () => {
                                            await onLoadSubcategoryDetail(sub.slug, token);
                                            setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug });
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-white dark:hover:bg-neutral-700"
                                        aria-label={`Edit ${sub.name}`}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            draggable={false}
                                            data-no-drag="true"
                                            onClick={() => setOpenSubcategoryMenuSlug((current) => current === sub.slug ? null : sub.slug)}
                                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-white dark:hover:bg-neutral-700"
                                            aria-label={`More actions for ${sub.name}`}
                                            aria-expanded={openSubcategoryMenuSlug === sub.slug}
                                        >
                                            <EllipsisVertical className="h-4 w-4" />
                                        </button>
                                        {openSubcategoryMenuSlug === sub.slug && (
                                            <div className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-600 dark:bg-neutral-800">
                                                <button
                                                    type="button"
                                                    draggable={false}
                                                    data-no-drag="true"
                                                    onClick={() => {
                                                        setOpenSubcategoryMenuSlug(null);
                                                        void delSub(sub.slug, sub.name, sub.id);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            </>)}
                        </SortableList>
                    )}
                </div>
            </section>
        </div>
    );
}
