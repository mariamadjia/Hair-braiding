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
    }, [sub.slug]);

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
            if (freshSub?.image) {
                setImage(freshSub.image);
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image. Please try again.');
        }
    };

    const deleteGalleryImage = async (imageId: number) => {
        if (!confirm('Delete this image? It will be removed from the gallery and all pages.')) {
            return;
        }
        
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
            
            // Remove from local state immediately
            setGalleryImages(prev => prev.filter(img => img.id !== imageId));

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
            if (freshSub?.image !== undefined) {
                setImage(freshSub.image ?? "");
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
            setSaveError('Failed to delete image. Please try again.');
        }
    };

    const guardedSetSelection = (next: Selection) => {
        if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
        setSelection(next);
    };

    const save = async () => {
        setSaving(true);
        try {
            await mutate("PUT", base, { name, image, displayOrder: sub.displayOrder?.toString(), subcategoryId: sub.id });
            await onSubcategoryUpdate?.(sub.slug);
            setDirty(false);
            setSaveSuccess("Subcategory saved successfully!");
            setSaveError(null);
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            setSaveError("Failed to save subcategory. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const saveItem = async (item: BookingItem, idx: number | null) => {
        try {
            if (idx !== null) {
                setItems(prev => prev.map((existing, i) => i === idx ? item : existing));
                setEditingIdx(null);
                setSaveSuccess("Size saved successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                await mutate("PUT", `${base}/items`, { itemIndex: idx, item, itemId: items[idx]?.id, subcategoryId: sub.id });
                void onSubcategoryUpdate?.(sub.slug);
            } else {
                const createdItem = await mutate("POST", `${base}/items`, { ...item, subcategoryId: sub.id });
                setItems(prev => [...prev, createdItem ?? item]);
                setAddingItem(false);
                setSaveSuccess("Size added successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                await onSubcategoryUpdate?.(sub.slug);
            }
        } catch (error) {
            console.error("Failed to save item:", error);
            alert("Failed to save size. Please check the console for details.");
        }
    };

    const deleteItem = async (idx: number, itemId?: number) => {
        console.log('[SubcategoryEditor] deleteItem called with idx:', idx, 'itemId:', itemId);
        
        // Always use itemId if available, never rely on array index
        if (!itemId) {
            console.error('[SubcategoryEditor] No itemId provided, cannot delete safely');
            alert("Cannot delete: item ID is missing. Please refresh and try again.");
            return;
        }
        
        const itemName = items?.[idx]?.name ?? "this size";
        if (!confirm(`Delete "${itemName}"?`)) return;
        
        setItems(prev => prev.filter((_, i) => i !== idx));
        setEditingIdx(null);
        setExpandedItems((prev) => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
        });
        setSaveSuccess("Size deleted successfully!");
        setTimeout(() => setSaveSuccess(null), 3000);

        try {
            await mutate("DELETE", `${base}/items/${itemId}`, undefined);
            void onSubcategoryUpdate?.(sub.slug);
        } catch (error) {
            console.error("Failed to delete item:", error);
            setSaveError("Delete failed. Please refresh the page.");
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

    return (
        <div className="space-y-5">
            {/* Success Banner */}
            {saveSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm text-green-800 dark:text-green-200 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <span className="flex-1 font-medium">{saveSuccess}</span>
                </div>
            )}
            {/* Error Banner */}
            {saveError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{saveError}</span>
                    <button type="button" onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">×</button>
                </div>
            )}

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <button 
                    type="button" 
                    onClick={() => guardedSetSelection({ type: "root" })} 
                    className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    All Categories
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <button 
                    type="button" 
                    onClick={() => guardedSetSelection({ type: "category", catSlug: cat.slug })} 
                    className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    {cat.name}
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-neutral-900 dark:text-white font-medium">{sub.name}</span>
            </nav>

            {/* Stats Bar */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-sm p-3 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 text-sm">
                    <Package className="w-4 h-4 text-neutral-500" />
                    <span className="text-neutral-600 dark:text-neutral-400">
                        {items.length} {items.length === 1 ? 'size' : 'sizes'}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Details</h3>
                </div>
                <div className="p-5">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">Name</label>
                            <input 
                                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-sm px-3 py-2 text-sm text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400" 
                                value={name} 
                                onChange={(e) => { setName(e.target.value); setDirty(true); }}
                                placeholder="e.g., Knotless, Goddess Braids"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">
                                Gallery Photos
                            </label>
                            {loadingGallery ? (
                                <p className="text-xs text-neutral-500">Loading gallery images...</p>
                            ) : (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {galleryImages.map((img) => (
                                        <div key={img.id} className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 group">
                                            <img
                                                src={toProxyUrl(img.imageUrl)}
                                                alt={img.title || "Gallery image"}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => deleteGalleryImage(img.id)}
                                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer">
                                        <Plus className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Add</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    uploadGalleryImage(file);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <button 
                            type="button" 
                            onClick={save} 
                            disabled={!dirty || saving}
                            className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest bg-neutral-900 text-white rounded-sm hover:bg-neutral-700 disabled:opacity-40 whitespace-nowrap"
                        >
                            {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Sizes</h3>
                        <button 
                            type="button" 
                            onClick={() => { setAddingItem(true); setEditingIdx(null); }} 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest bg-neutral-900 text-white rounded-sm hover:bg-neutral-700 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            Add Size
                        </button>
                    </div>
                </div>
                <div className="p-5">

                    {addingItem && (
                        <div className="mb-4">
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

                    <div className="space-y-2">
                    {sortItemsBySize(items).map(({ item, originalIdx }) => (
                        <div key={originalIdx}>
                            {editingIdx === originalIdx ? (
                                <ItemForm
                                    initial={item}
                                    token={token}
                                    categoryId={cat.id}
                                    subcategoryId={sub.id}
                                    onSave={(updated) => saveItem(updated, originalIdx)}
                                    onCancel={() => setEditingIdx(null)}
                                />
                            ) : (
                                <div className="rounded-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                                    <div className="group flex items-center gap-3 p-4">
                                        {item.image && (
                                            <div className="flex-shrink-0">
                                                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 shadow-sm" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(originalIdx)}
                                            className="flex-1 min-w-0 text-left"
                                        >
                                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                                                {item.name}
                                            </div>
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5">
                                                {item.lengthOptions?.length ? (
                                                    <>
                                                        <span className="font-semibold">{item.lengthOptions.length} {item.lengthOptions.length === 1 ? 'option' : 'options'}</span>
                                                        {item.lengthOptions.length > 0 && (
                                                            <span className="ml-2 text-neutral-700 dark:text-neutral-300 font-bold">
                                                                • {formatPrice(item.lengthOptions[0].price)}
                                                                {item.lengthOptions.length > 1 && ` - ${formatPrice(item.lengthOptions[item.lengthOptions.length - 1].price)}`}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-neutral-400">No options set</span>
                                                )}
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(originalIdx)}
                                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-sm transition-colors"
                                                title={expandedItems.has(originalIdx) ? "Collapse" : "Expand"}
                                            >
                                                {expandedItems.has(originalIdx) ? (
                                                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                                                )}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => { setEditingIdx(originalIdx); setAddingItem(false); }} 
                                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-sm transition-colors opacity-0 group-hover:opacity-100"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => deleteItem(originalIdx, item.id)} 
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {expandedItems.has(originalIdx) && item.lengthOptions && item.lengthOptions.length > 0 && (
                                        <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-3">
                                            <h4 className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Length Options</h4>
                                            <div className="space-y-1">
                                                {item.lengthOptions.map((option, optIdx) => (
                                                    <div key={optIdx} className="flex items-center justify-between text-sm py-2 px-3 rounded-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                                                        <span className="text-neutral-700 dark:text-neutral-300">{option.name}</span>
                                                        <span className="font-medium text-neutral-900 dark:text-white">{formatPrice(option.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                        {items.length === 0 && !addingItem && (
                            <div className="text-center py-10 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-sm">
                                <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No sizes yet — click Add Size to create one</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
