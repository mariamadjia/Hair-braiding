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
import { ChevronRight, Package, Plus, Edit3, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
    mutate: (method: string, path: string, body?: object) => Promise<CategoriesData>;
    setSelection: (s: Selection) => void;
    onUpdate: (data: CategoriesData) => void;
    data: CategoriesData;
    onSubcategoryUpdate?: (slug: string) => Promise<void>;
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
                setGalleryImages(await galleryResponse.json());
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
                setGalleryImages(await galleryResponse.json());
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
            alert('Failed to delete image. Please try again.');
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await mutate("PUT", base, { name, image, displayOrder: sub.displayOrder?.toString() });
            setDirty(false);
            setSaveSuccess("Subcategory saved successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            alert("Failed to save subcategory. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const saveItem = async (item: BookingItem, idx: number | null) => {
        try {
            if (idx !== null) {
                // Optimistic: update local items immediately
                setItems(prev => prev.map((existing, i) => i === idx ? item : existing));
                setEditingIdx(null);
                setSaveSuccess("Size saved successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                // Sync backend in background
                await mutate("PUT", `${base}/items`, { itemIndex: idx, item });
                void onSubcategoryUpdate?.(sub.slug);
            } else {
                // Optimistic: append new item immediately
                setItems(prev => [...prev, item]);
                setAddingItem(false);
                setSaveSuccess("Size added successfully!");
                setTimeout(() => setSaveSuccess(null), 3000);
                // Sync backend in background
                await mutate("POST", `${base}/items`, item);
                void onSubcategoryUpdate?.(sub.slug);
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
        
        // Optimistic: remove item from local state immediately
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
            await mutate("DELETE", `${base}/items/${itemId}`);
            void onSubcategoryUpdate?.(sub.slug);
        } catch (error) {
            console.error("Failed to delete item:", error);
            alert("Delete failed. Please refresh the page.");
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
        <div className="space-y-6">
            {/* Success Message Banner */}
            {saveSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-sm flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span className="text-sm font-medium">{saveSuccess}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wide mb-2">Subcategory Editor</h2>
                <nav className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <button 
                        type="button" 
                        onClick={() => setSelection({ type: "root" })} 
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                    >
                        All Categories
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <button 
                        type="button" 
                        onClick={() => setSelection({ type: "category", catSlug: cat.slug })} 
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                    >
                        {cat.name}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-neutral-900 dark:text-white font-semibold">{sub.name}</span>
                </nav>
                <div className="h-px bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 mt-4"></div>
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">Subcategory</span>
                    </div>
                    <span className="text-neutral-400 dark:text-neutral-500">•</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {items.length} {items.length === 1 ? 'size' : 'sizes'}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 px-6 py-4 border-b-2 border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-widest">Details</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Name</label>
                            <input 
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
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
                        {dirty && (
                            <button 
                                type="button" 
                                onClick={save} 
                                disabled={saving}
                                className="w-full px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : '✓ Save Changes'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 px-6 py-4 border-b-2 border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-widest">Sizes</h3>
                        <button 
                            type="button" 
                            onClick={() => { setAddingItem(true); setEditingIdx(null); }} 
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md hover:shadow-lg uppercase tracking-wide"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Size
                        </button>
                    </div>
                </div>
                <div className="p-6">

                    {saveSuccess && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            {saveSuccess}
                        </div>
                    )}

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

                    <div className="space-y-3">
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
                                <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800 overflow-hidden shadow-md hover:shadow-xl transition-all">
                                    <div className="group flex items-center gap-4 p-5 hover:bg-white dark:hover:bg-neutral-900 transition-colors">
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
                                            <div className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(originalIdx)}
                                                className="p-2.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-all"
                                                title={expandedItems.has(originalIdx) ? "Collapse" : "Expand"}
                                            >
                                                {expandedItems.has(originalIdx) ? (
                                                    <ChevronUp className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                                )}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => { setEditingIdx(originalIdx); setAddingItem(false); }} 
                                                className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => deleteItem(originalIdx, item.id)} 
                                                className="p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {expandedItems.has(originalIdx) && item.lengthOptions && item.lengthOptions.length > 0 && (
                                        <div className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 px-6 py-4">
                                            <div className="mb-2">
                                                <h4 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest">Length Options</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {item.lengthOptions.map((option, optIdx) => (
                                                    <div key={optIdx} className="flex items-center justify-between text-sm py-3 px-4 rounded-lg bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                                                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{option.name}</span>
                                                        <span className="font-bold text-lg text-neutral-900 dark:text-white">{formatPrice(option.price)}</span>
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
                            <div className="text-center py-16 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                                <Package className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                                <p className="text-base font-semibold text-neutral-600 dark:text-neutral-400 mb-2">No sizes yet</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-500">Click "Add New Size" to create one</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
