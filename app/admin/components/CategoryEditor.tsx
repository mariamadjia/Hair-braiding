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
    const [images, setImages] = useState<string[]>(() =>
        (cat.flippingImages ?? []).map(toProxyUrl)
    );
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [dirty, setDirty] = useState(false);
    const [addingSub, setAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState("");
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [subSummaries, setSubSummaries] = useState<SubcategorySummary[]>([]);

    useEffect(() => { 
        setName(cat.name); 
        setImages((cat.flippingImages ?? []).map(toProxyUrl));
        setDirty(false); 

        // Fetch the full category detail from the admin endpoint so we always
        // show the real backend flippingImages, not a stale or empty summary.
        const fetchCategoryDetail = async () => {
            if (!cat.slug) return;

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
                    console.error('[CategoryEditor] Failed to fetch category detail:', response.status);
                    return;
                }

                const detail = await response.json();
                console.log('[CategoryEditor] Fetched category detail flippingImages:', detail.flippingImages);

                setImages((detail.flippingImages ?? []).map(toProxyUrl));
                setGalleryImages((detail.galleryImages ?? []) as GalleryImage[]);
            } catch (error) {
                console.error('[CategoryEditor] Failed to fetch category detail:', error);
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

    const guardedSetSelection = (next: Selection) => {
        if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
        setSelection(next);
    };

    const save = async () => {
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

            setImages(backendUrls.map(toProxyUrl));
            setDirty(false);
            setSuccessMessage("Category saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save category:", error);
            setErrorMessage("Failed to save category. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const addSub = async () => {
        if (!newSubName.trim()) return;
        const created = await mutate("POST", `/${cat.slug}/subcategories`, { name: newSubName.trim(), categoryId: cat.id });
        setNewSubName(""); setAddingSub(false);
        if (created && (created.slug || created.name)) {
            const summary: SubcategorySummary = { id: created.id, name: created.name, slug: created.slug ?? slugify(newSubName), displayOrder: created.displayOrder };
            onSubcategoryCreated?.(cat.slug, summary);
            setSubSummaries(prev => [...prev, summary]);
        } else {
            const fresh = await onSubcategorySummariesRefresh?.(cat.slug);
            if (fresh) setSubSummaries(fresh);
        }
    };

    const delSub = async (subSlug: string, subName: string, subId?: number) => {
        if (!confirm(`Delete subcategory "${subName}"?`)) return;
        setSaving(true);
        try {
            await mutate("DELETE", `/${cat.slug}/subcategories/${subSlug}`, subId ? { subcategoryId: subId } : undefined);
            onSubcategoryDeleted?.(cat.slug, subSlug);
            setSubSummaries(prev => prev.filter(s => s.slug !== subSlug));
            setSuccessMessage(`Subcategory "${subName}" deleted successfully!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to delete subcategory:", error);
            setErrorMessage("Failed to delete subcategory. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const totalServices = (cat.subcategories ?? []).reduce((acc, sub) => acc + (sub.items?.length || 0), 0);
    const hasSubcategories = (cat.subcategories ?? []).length > 0;

    return (
        <div className="space-y-5">
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
                <div><label className={lbl}>Category Name</label><input className={inp} value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} /></div>
                
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
                        onChange={(urls: string[]) => { setImages(urls); setDirty(true); }}
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
                    disabled={!dirty || images.length < 3 || images.length > 5 || saving}
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
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
