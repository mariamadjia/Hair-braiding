"use client";

import { useState, useEffect } from "react";
import type { BookingCategory, BookingSubcategory, CategoriesData, BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { emptyItem } from "../utils";
import { formatPrice } from "@/lib/utils/price";
import { API_BASE_URL } from "@/lib/config/api";
import type { GalleryImage } from "@/lib/types/gallery";
import type { GalleryImageItem } from "@/lib/booking-types";
import { toProxyUrl } from "@/lib/utils/image";
import { ItemForm } from "./ItemForm";
import { ChevronRight, Package, Plus, Edit3, Trash2, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";

const SIZE_ORDER = ['XSmall', 'Small', 'Medium', 'Smedium', 'Large', 'Jumbo'];

function sortItemsBySize(items: BookingItem[]): { item: BookingItem; originalIdx: number }[] {
    return items.map((item, idx) => ({ item, originalIdx: idx })).sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a.item.name.trim());
        const indexB = SIZE_ORDER.indexOf(b.item.name.trim());
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.originalIdx - b.originalIdx;
    });
}

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function SubcategoryEditor({ cat, sub, token, headers, mutate, setSelection, onUpdate, data, onSubcategoryUpdate }: {
    cat: BookingCategory;
    sub: BookingSubcategory;
    token: string;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    setSelection: (s: Selection) => void;
    onUpdate: (data: CategoriesData) => void;
    data: CategoriesData;
    onSubcategoryUpdate?: (slug: string) => Promise<any>;
}) {
    if (!sub) {
        return <div className="text-sm text-neutral-500">Subcategory not found</div>;
    }

    const [items, setItems] = useState<BookingItem[]>(Array.isArray(sub.items) ? sub.items : []);

    const [name, setName] = useState(sub.name);
    const [image, setImage] = useState(sub.image ?? "");
    const [images, setImages] = useState(sub.images ?? []);
    const [dirty, setDirty] = useState(false);
    const [addingItem, setAddingItem] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(
        (sub.galleryImages ?? []) as GalleryImage[]
    );
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const base = `/${cat.slug}/subcategories/${sub.slug}`;

    useEffect(() => {
        setName(sub.name);
        setImage(sub.image ?? "");
        setDirty(false);
        setItems(Array.isArray(sub.items) ? sub.items : []);
        // Seed gallery images from the already-loaded subcategory detail (no extra fetch)
        const preloaded = (sub.galleryImages ?? []) as GalleryImage[];
        setGalleryImages(preloaded);
        if (preloaded.length > 0) {
            setImages(preloaded.map(img => img.imageUrl));
        } else {
            setImages(sub.images ?? []);
        }
    }, [sub.slug, sub.galleryImages, sub.items]);

    // When cache refreshes after a POST, sync real backend IDs into local items state
    useEffect(() => {
        if (Array.isArray(sub.items) && sub.items.length > 0) {
            setItems(prev => {
                const localMissingIds = prev.some(item => !item.id);
                const backendHasIds = sub.items.every(item => item.id);
                if (localMissingIds && backendHasIds) return sub.items;
                return prev;
            });
        }
    }, [sub.items]);

    const syncFromGallery = () => {
        if (galleryImages.length > 0) {
            const galleryUrls = galleryImages.map(img => img.imageUrl);
            setImages(galleryUrls);
            setDirty(true);
        }
    };

    const uploadGalleryImage = async (file: File) => {
        if (saving) {
            setSaveError("Please wait for the current operation to complete.");
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            if (!cat.id || !sub.id) {
                throw new Error('Category or subcategory ID is missing');
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('categoryId', cat.id.toString());
            formData.append('subcategoryId', sub.id.toString());
            formData.append('title', `${sub.name} - ${file.name}`);
            
            const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload image');
            }
            
            // Re-fetch gallery images for this subcategory only
            const galleryResponse = await fetch(`${API_BASE_URL}/api/gallery/subcategory/${sub.id}`);
            if (galleryResponse.ok) {
                const freshGallery = await galleryResponse.json();
                setGalleryImages(freshGallery);
                const galleryUrls = freshGallery.map((img: GalleryImage) => img.imageUrl);
                setImages(galleryUrls);
            }

            // Refresh parent subcategory detail so image/subcategory state stays in sync
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub) {
                setImage(freshSub.image ?? "");
                setItems(Array.isArray(freshSub.items) ? freshSub.items : []);
                const freshGalleryImages = (freshSub.galleryImages ?? []) as GalleryImage[];
                setGalleryImages(freshGalleryImages);
                setImages(freshGalleryImages.length > 0 ? freshGalleryImages.map((img) => img.imageUrl) : (freshSub.images ?? []));
            }
            setSaveSuccess("Image uploaded successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error('Failed to upload image:', error);
            setSaveError('Failed to upload image. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const deleteGalleryImage = async (imageId: number) => {
        if (!confirm('Delete this image? It will be removed from the gallery and all pages.')) {
            return;
        }
        if (saving) {
            setSaveError("Please wait for the current operation to complete.");
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/gallery/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete image');
            }
            
            // Re-fetch gallery images for this subcategory only
            const galleryResponse = await fetch(`${API_BASE_URL}/api/gallery/subcategory/${sub.id}`);
            if (galleryResponse.ok) {
                const freshGallery = await galleryResponse.json();
                setGalleryImages(freshGallery);
                const galleryUrls = freshGallery.map((img: GalleryImage) => img.imageUrl);
                setImages(galleryUrls);
            }

            // Refresh parent subcategory detail so image/subcategory state stays in sync
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub) {
                setImage(freshSub.image ?? "");
                setItems(Array.isArray(freshSub.items) ? freshSub.items : []);
                const freshGalleryImages = (freshSub.galleryImages ?? []) as GalleryImage[];
                setGalleryImages(freshGalleryImages);
                setImages(freshGalleryImages.length > 0 ? freshGalleryImages.map((img) => img.imageUrl) : (freshSub.images ?? []));
            }
            setSaveSuccess("Image deleted successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error('Failed to delete image:', error);
            setSaveError('Failed to delete image. Please try again.');
            // Re-fetch to ensure state is consistent
            const galleryResponse = await fetch(`${API_BASE_URL}/api/gallery/subcategory/${sub.id}`);
            if (galleryResponse.ok) {
                const freshGallery = await galleryResponse.json();
                setGalleryImages(freshGallery);
                const galleryUrls = freshGallery.map((img: GalleryImage) => img.imageUrl);
                setImages(galleryUrls);
            }
        } finally {
            setSaving(false);
        }
    };

    const guardedSetSelection = (next: Selection) => {
        if (saving) {
            setSaveError("Please wait for the current operation to complete.");
            return;
        }
        if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
        setSelection(next);
    };

    const save = async () => {
        if (saving) return; // Prevent concurrent mutations
        if (!name.trim()) {
            setSaveError("Subcategory name is required.");
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            await mutate("PUT", base, { name, image, displayOrder: sub.displayOrder?.toString(), subcategoryId: sub.id });
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) setItems(freshSub.items);
            // Only update local state after server confirms
            setDirty(false);
            setSaveSuccess("Subcategory saved successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            setSaveError("Failed to save subcategory. Please try again.");
            // Re-fetch to ensure state is consistent
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub) {
                setName(freshSub.name);
                setImage(freshSub.image ?? "");
            }
        } finally {
            setSaving(false);
        }
    };

    const saveItem = async (item: BookingItem, idx: number | null) => {
        if (saving) return; // Prevent concurrent mutations
        if (!item.name?.trim()) {
            setSaveError("Size name is required.");
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            if (idx !== null) {
                await mutate("PUT", `${base}/items`, { itemIndex: idx, item, itemId: items[idx]?.id, subcategoryId: sub.id });
                // Only update local state after server confirms
                setItems(prev => prev.map((existing, i) => i === idx ? item : existing));
                setEditingIdx(null);
                setSaveSuccess("Size saved successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                const freshSub = await onSubcategoryUpdate?.(sub.slug);
                if (freshSub?.items) setItems(freshSub.items);
            } else {
                const createdItem = await mutate("POST", `${base}/items`, { ...item, subcategoryId: sub.id });
                // Only update local state after server confirms
                setItems(prev => [...prev, createdItem ?? item]);
                setAddingItem(false);
                setSaveSuccess("Size added successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                const freshSub = await onSubcategoryUpdate?.(sub.slug);
                if (freshSub?.items) setItems(freshSub.items);
            }
        } catch (error) {
            console.error("Failed to save item:", error);
            setSaveError("Failed to save size. Please try again.");
            // Re-fetch to ensure state is consistent
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) {
                setItems(freshSub.items);
            }
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (idx: number, itemId?: number) => {
        console.log('[SubcategoryEditor] deleteItem called with idx:', idx, 'itemId:', itemId);
        
        // Always use itemId if available, never rely on array index
        if (!itemId) {
            console.error('[SubcategoryEditor] No itemId provided, cannot delete safely');
            setSaveError("Cannot delete: item ID is missing. Please refresh and try again.");
            return;
        }
        
        if (saving) return; // Prevent concurrent mutations
        
        const itemName = items?.[idx]?.name ?? "this size";
        if (!confirm(`Delete "${itemName}"?`)) return;
        
        setSaving(true);
        setSaveError(null);
        try {
            await mutate("DELETE", `${base}/items/${itemId}`, undefined);
            // Only update local state after server confirms deletion
            setItems(prev => prev.filter((_, i) => i !== idx));
            setEditingIdx(null);
            setExpandedItems((prev) => {
                const next = new Set(prev);
                next.delete(idx);
                return next;
            });
            setSaveSuccess("Size deleted successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) setItems(freshSub.items);
        } catch (error) {
            console.error("Failed to delete item:", error);
            setSaveError("Delete failed. Please refresh the page.");
            // Re-fetch to ensure state is consistent
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) {
                setItems(freshSub.items);
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (idx: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    const coverPhoto = galleryImages[0] ? toProxyUrl(galleryImages[0].imageUrl) : null;
    const totalLengths = items.reduce((acc, i) => acc + (i.lengthOptions?.length ?? 0), 0);

    return (
        <div className="space-y-4">
            {/* Banners */}
            {saveSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
                    <span className="flex-1 font-medium">{saveSuccess}</span>
                </div>
            )}
            {saveError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{saveError}</span>
                    <button type="button" onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
            )}

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <button type="button" onClick={() => guardedSetSelection({ type: "root" })} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">All Categories</button>
                <ChevronRight className="w-3.5 h-3.5" />
                <button type="button" onClick={() => guardedSetSelection({ type: "category", catSlug: cat.slug })} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{cat.name}</button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-neutral-900 dark:text-white font-semibold">{sub.name}</span>
            </nav>

            {/* Hero header card */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="flex items-stretch gap-0">
                    {/* Cover photo */}
                    <div className="w-32 flex-shrink-0 relative bg-neutral-100 dark:bg-neutral-800">
                        {coverPhoto ? (
                            <img src={coverPhoto} alt={sub.name} className="w-full h-full object-cover" style={{ minHeight: 96 }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 96 }}>
                                <Package className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                            </div>
                        )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 px-5 py-4 flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-widest text-violet-500 mb-0.5">{cat.name}</p>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{sub.name}</h2>
                        </div>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium border border-violet-100 dark:border-violet-800">
                                <Package className="w-3 h-3" />
                                {items.length} {items.length === 1 ? 'size' : 'sizes'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                                {totalLengths} {totalLengths === 1 ? 'length option' : 'length options'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                                {galleryImages.length} {galleryImages.length === 1 ? 'photo' : 'photos'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details card */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-violet-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">Details</h3>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1.5">Subcategory Name</label>
                        <input
                            className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setDirty(true); }}
                            placeholder="e.g., Knotless, Goddess Braids"
                        />
                    </div>

                    {/* Gallery photos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Gallery Photos
                                {galleryImages.length > 0 && (
                                    <span className="ml-2 normal-case text-violet-600 dark:text-violet-400 font-semibold">{galleryImages.length}</span>
                                )}
                            </label>
                        </div>
                        {loadingGallery ? (
                            <div className="flex gap-2">
                                {[1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {galleryImages.map((img, i) => (
                                    <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                                        {i === 0 && (
                                            <span className="absolute top-1 left-1 z-10 text-[9px] font-bold uppercase bg-violet-600 text-white px-1.5 py-0.5 rounded-sm">Cover</span>
                                        )}
                                        <img src={toProxyUrl(img.imageUrl)} alt={img.title || `Photo ${i+1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => deleteGalleryImage(img.id)}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                            title="Remove"
                                        >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <label className="w-20 h-20 border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-lg flex flex-col items-center justify-center text-violet-400 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all cursor-pointer">
                                    <Plus className="w-5 h-5 mb-0.5" />
                                    <span className="text-[10px] font-medium">Add</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadGalleryImage(f); e.target.value = ''; } }} />
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={save}
                            disabled={!dirty || saving}
                            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sizes card */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-violet-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">Sizes</h3>
                        {items.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">{items.length}</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => { setAddingItem(true); setEditingIdx(null); }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Size
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    {addingItem && (
                        <div className="rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4">
                            <ItemForm
                                initial={emptyItem()}
                                token={token}
                                categoryId={cat.id}
                                subcategoryId={sub.id}
                                onSave={(item) => saveItem(item, null)}
                                onCancel={() => setAddingItem(false)}
                            />
                        </div>
                    )}

                    {items.length === 0 && !addingItem ? (
                        <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-3">
                                <Package className="w-6 h-6 text-violet-400" />
                            </div>
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No sizes yet</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Click <strong>Add Size</strong> above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortItemsBySize(items).map(({ item, originalIdx }) => (
                                <div key={originalIdx}>
                                    {editingIdx === originalIdx ? (
                                        <div className="rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4">
                                            <ItemForm
                                                initial={item}
                                                token={token}
                                                categoryId={cat.id}
                                                subcategoryId={sub.id}
                                                onSave={(updated) => saveItem(updated, originalIdx)}
                                                onCancel={() => setEditingIdx(null)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm transition-all">
                                            <div className="group flex items-center gap-3 px-4 py-3">
                                                {item.image && (
                                                    <img src={item.image} alt={item.name} className="w-14 h-14 flex-shrink-0 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm" />
                                                )}
                                                <button type="button" onClick={() => toggleExpand(originalIdx)} className="flex-1 min-w-0 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.name}</span>
                                                        {item.lengthOptions?.length ? (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                                                                {item.lengthOptions.length} {item.lengthOptions.length === 1 ? 'length' : 'lengths'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">No lengths</span>
                                                        )}
                                                    </div>
                                                    {item.lengthOptions?.length ? (
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                            {formatPrice(item.lengthOptions[0].price)}
                                                            {item.lengthOptions.length > 1 && ` – ${formatPrice(item.lengthOptions[item.lengthOptions.length - 1].price)}`}
                                                        </p>
                                                    ) : null}
                                                </button>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button type="button" onClick={() => toggleExpand(originalIdx)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors" title={expandedItems.has(originalIdx) ? "Collapse" : "Expand"}>
                                                        {expandedItems.has(originalIdx) ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                                    </button>
                                                    <button type="button" onClick={() => { setEditingIdx(originalIdx); setAddingItem(false); }} className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                                                        <Edit3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                                    </button>
                                                    <button type="button" onClick={() => deleteItem(originalIdx, item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedItems.has(originalIdx) && item.lengthOptions && item.lengthOptions.length > 0 && (
                                                <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Length Options</p>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {item.lengthOptions.map((option, optIdx) => (
                                                            <div key={optIdx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {option.imageUrl && (
                                                                        <img src={toProxyUrl(option.imageUrl)} alt={option.name} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-neutral-200" />
                                                                    )}
                                                                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{option.name}</span>
                                                                    {option.duration && (
                                                                        <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded flex-shrink-0">{option.duration}</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex-shrink-0 ml-3">{formatPrice(option.price)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
