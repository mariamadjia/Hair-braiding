"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config/api";
import type { GalleryImage } from "@/lib/types/gallery";
import type { BookingCategory, CategoriesData, SubcategorySummary } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { slugify } from "../utils";
import { ChevronRight, FolderTree, FileText, Trash2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl, toProxyUrl } from "@/lib/utils/image";

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
    const [nameError, setNameError] = useState("");
    const [images, setImages] = useState<string[]>(() =>
        (cat.flippingImages ?? []).map(toProxyUrl)
    );
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [dirty, setDirty] = useState(false);
    const [addingSub, setAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingCategory, setLoadingCategory] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [subSummaries, setSubSummaries] = useState<SubcategorySummary[]>([]);

    useEffect(() => { 
        setName(cat.name); 
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
                const proxiedImages = (detail.flippingImages ?? []).map((url: string) => {
                    const proxied = toProxyUrl(url);
                    return proxied;
                });
                setImages(proxiedImages);
                setGalleryImages((detail.galleryImages ?? []) as GalleryImage[]);
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
                if (dirty && (name !== cat.name || images.length !== (cat.flippingImages ?? []).length)) {
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
        if (dirty && (name !== cat.name || images.length !== (cat.flippingImages ?? []).length)) {
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
            await mutate("PUT", `/${cat.slug}`, { name });

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

    const totalServices = (cat.subcategories ?? []).reduce((acc, sub) => acc + (sub.items?.length || 0), 0);
    const hasSubcategories = (cat.subcategories ?? []).length > 0;

    return (
        <div className="space-y-5">
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
            <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <button 
                    type="button" 
                    onClick={() => guardedSetSelection({ type: "root" })} 
                    className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    All Categories
                </button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-neutral-900 dark:text-white font-medium">{cat.name}</span>
            </nav>

            {/* Category Stats */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-sm p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        {hasSubcategories ? (
                            <FolderTree className="w-4 h-4 text-blue-500" />
                        ) : (
                            <FileText className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-neutral-600 dark:text-neutral-400">
                            {hasSubcategories ? 'Has Subcategories' : 'Direct Services'}
                        </span>
                    </div>
                    <span className="text-neutral-300 dark:text-neutral-600">•</span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                        {totalServices} total services
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {loadingCategory ? (
                    <div className="space-y-4">
                        <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded-sm animate-pulse"></div>
                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-4 bg-neutral-50 dark:bg-neutral-800">
                            <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-sm animate-pulse mb-3"></div>
                            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-sm animate-pulse"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <label className={lbl}>Category Name</label>
                            <input 
                                className={`${inp} ${nameError ? "border-red-400" : ""}`} 
                                value={name} 
                                onChange={(e) => handleNameChange(e.target.value)} 
                            />
                            {nameError && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {nameError}
                                </p>
                            )}
                            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                Choose a clear, descriptive name for your category (e.g., "Box Braids")
                            </p>
                        </div>
                
                {/* Gallery Photos Section */}
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-4 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Gallery Photos</h3>
                        <span className="text-[10px] font-medium uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-sm">Required 3–5</span>
                    </div>
                    
                    <MultiImageUploader
                        images={images}
                        token={token}
                        categoryId={cat.id}
                        onChange={(urls: string[]) => { setImages(urls); setDirty(true); setErrorMessage(null); }}
                    />
                    
                    {/* Status Indicator */}
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        {images.length >= 3 && images.length <= 5 ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
                                <span className="text-green-700 dark:text-green-300">{images.length} photo{images.length > 1 ? 's' : ''} uploaded</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden />
                                <span className="text-amber-700 dark:text-amber-400">
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

                <button
                    type="button"
                    onClick={save}
                    className={btnP}
                    disabled={images.length < 3 || images.length > 5 || saving || nameError !== ""}
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
                </>
                )}
            </div>

            <div className="border-t border-neutral-100 dark:border-neutral-700 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Subcategories</h3>
                    <button type="button" onClick={() => setAddingSub(true)} className={btnP}>+ Add</button>
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

                <div className="space-y-2">
                    {isLoadingSubcategorySummaries ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded-sm animate-pulse" />
                            ))}
                        </div>
                    ) : subSummaries.length === 0 ? (
                        <div className="p-3 text-sm text-neutral-500">No subcategories yet</div>
                    ) : (
                        subSummaries.map((sub) => (
                            <div 
                                key={sub.id || sub.slug} 
                                className="flex items-center gap-3 p-3 rounded-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <div className="flex-shrink-0">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        await onLoadSubcategoryDetail(sub.slug, token);
                                        setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug });
                                    }} 
                                    className="flex-1 text-left min-w-0"
                                >
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                        {sub.name}
                                    </div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        Click to edit
                                    </div>
                                </button>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button 
                                        type="button" 
                                        onClick={async () => {
                                            await onLoadSubcategoryDetail(sub.slug, token);
                                            setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug });
                                        }} 
                                        className={btnS}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => delSub(sub.slug, sub.name, sub.id)}
                                        className={btnD}
                                        title={`Delete ${sub.name}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
