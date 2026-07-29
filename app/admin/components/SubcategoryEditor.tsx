"use client";

import { useState, useEffect } from "react";
import type { BookingCategory, BookingSubcategory, CategoriesData, BookingItem } from "@/lib/booking-types";
import { emptyItem } from "../utils";
import { formatPrice } from "@/lib/utils/price";
import { API_BASE_URL } from "@/lib/config/api";
import type { GalleryImage } from "@/lib/types/gallery";
import { toProxyUrl } from "@/lib/utils/image";
import { ItemForm } from "./ItemForm";
import { ArrowDown, ArrowUp, ChevronRight, Package, Plus, Edit3, Trash2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { validateFile } from "../utils/fileValidation";
import { compressImage } from "../utils/imageCompression";

const SIZE_ORDER = ['XSmall', 'Small', 'Medium', 'Smedium', 'Large', 'Jumbo'];

function sortItemsBySize(items: BookingItem[]): { item: BookingItem; originalIdx: number }[] {
    return items.map((item, idx) => ({ item, originalIdx: idx })).sort((a, b) => {
        if ((a.item.displayOrder ?? 0) !== (b.item.displayOrder ?? 0)) return (a.item.displayOrder ?? 0) - (b.item.displayOrder ?? 0);
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

function servicePriceLabel(item: BookingItem) {
    const prices = (item.lengthOptions ?? []).map(option => Number((option.price ?? "").replace(/[^0-9.]/g, ""))).filter(Number.isFinite);
    if (!prices.length) return formatPrice(item.price);
    const minimum = Math.min(...prices); const maximum = Math.max(...prices);
    return minimum === maximum ? formatPrice(minimum) : `${formatPrice(minimum)} – ${formatPrice(maximum)}`;
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
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(
        (sub.galleryImages ?? []) as GalleryImage[]
    );
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [bulkFoundationEnabled, setBulkFoundationEnabled] = useState(false);
    const [bulkUseAdjustment, setBulkUseAdjustment] = useState(false);
    const [bulkFoundationAdjustment, setBulkFoundationAdjustment] = useState("0");
    const [applyingFoundations, setApplyingFoundations] = useState(false);

    const base = `/${cat.slug}/subcategories/${sub.slug}`;

    useEffect(() => {
        setName(sub.name);
        setImage(sub.image ?? "");
        setDirty(false);
        const nextItems = Array.isArray(sub.items) ? sub.items : [];
        setItems(nextItems);
        const allFoundationsEnabled = nextItems.length > 0 && nextItems.every(item => item.foundationChoicesEnabled);
        setBulkFoundationEnabled(allFoundationsEnabled);
        if (allFoundationsEnabled) {
            const adjustments = new Set(nextItems.map(item => item.knotlessPriceAdjustment || "0"));
            const sharedAdjustment = adjustments.size === 1 ? adjustments.values().next().value ?? "0" : "0";
            const allUseAdjustmentMode = nextItems.every(item => (item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT");
            setBulkFoundationAdjustment(sharedAdjustment);
            setBulkUseAdjustment(allUseAdjustmentMode && Number(sharedAdjustment) > 0);
        } else {
            setBulkUseAdjustment(false);
        }
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

    const uploadGalleryImage = async (file: File) => {
        if (saving) {
            setSaveError("Please wait for the current operation to complete.");
            return;
        }
        
        // Validate file before uploading
        const validation = validateFile(file);
        if (!validation.valid) {
            setSaveError(validation.error);
            return;
        }
        
        setSaving(true);
        setSaveError(null);
        try {
            if (!cat.id || !sub.id) {
                throw new Error('Category or subcategory ID is missing');
            }
            
            // Compress image before uploading
            const compressedFile = await compressImage(file, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.85,
                format: 'image/webp'
            });
            
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('categoryId', cat.id.toString());
            formData.append('subcategoryId', sub.id.toString());
            formData.append('title', `${sub.name} - ${compressedFile.name}`);
            
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
            let errorMessage = 'Failed to upload image. Please try again.';
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = 'Authentication error. Please log in again.';
                } else if (error.message.includes('413')) {
                    errorMessage = 'File is too large. Please use a smaller image (max 5MB).';
                } else if (error.message.includes('415')) {
                    errorMessage = 'Invalid file type. Please use JPG, PNG, or WebP.';
                }
            }
            
            setSaveError(errorMessage);
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
            let errorMessage = 'Failed to delete image. Please try again.';
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = 'Authentication error. Please log in again.';
                } else if (error.message.includes('404')) {
                    errorMessage = 'Image not found. It may have been already deleted.';
                }
            }
            
            setSaveError(errorMessage);
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
        if (saving) throw new Error("Another change is still being saved.");
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
            
            // Update the selection with the potentially new slug
            if (freshSub?.slug && freshSub.slug !== sub.slug) {
                // Slug changed, update selection
                setSelection({
                    type: "subcategory",
                    catSlug: cat.slug,
                    subSlug: freshSub.slug
                });
            }
            
            // Only update local state after server confirms
            setDirty(false);
            setSaveSuccess("Subcategory saved successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            let errorMessage = "Failed to save subcategory. Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = "Authentication error. Please log in again.";
                } else if (error.message.includes('404')) {
                    errorMessage = "Subcategory not found. It may have been deleted.";
                } else if (error.message.includes('409')) {
                    errorMessage = "A subcategory with this name already exists.";
                }
            }
            
            setSaveError(errorMessage);
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

    const saveItem = async (item: BookingItem, itemId: number | null) => {
        if (saving) throw new Error("Another change is still being saved.");
        if (!item.name?.trim()) {
            setSaveError("Size name is required.");
            throw new Error("Size name is required.");
        }
        const options = item.lengthOptions ?? [];
        const pricePattern = /^\$?\d+(?:\.\d{1,2})?$/;
        if (!item.price?.trim() && options.length === 0) throw new Error("Add a price or at least one length option.");
        if (item.price?.trim() && !pricePattern.test(item.price.trim())) throw new Error("Enter a valid non-negative price.");
        if (item.foundationChoicesEnabled && (item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT"
                && !pricePattern.test((item.knotlessPriceAdjustment || "").trim())) {
            throw new Error("Enter a valid Knotless price adjustment.");
        }
        const normalizedNames = options.map(option => option.name?.trim().toLowerCase() ?? "");
        if (options.some(option => !option.name?.trim() || !option.price?.trim() || !pricePattern.test(option.price.trim()))) {
            throw new Error("Every length option needs a name and a valid price.");
        }
        if (item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE"
                && options.some(option => !option.knotlessPrice?.trim() || !pricePattern.test(option.knotlessPrice.trim()))) {
            throw new Error("Every length option needs a valid Knotless price.");
        }
        if (new Set(normalizedNames).size !== normalizedNames.length) throw new Error("Length option names must be unique.");
        setSaving(true);
        setSaveError(null);
        try {
            if (itemId !== null) {
                await mutate("PUT", `${base}/items`, { item, itemId, subcategoryId: sub.id });
                setItems(prev => prev.map(existing => existing.id === itemId ? { ...item, id: itemId } : existing));
                setEditingId(null);
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
            let errorMessage = "Failed to save size. Please try again.";
            
            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage = "Authentication error. Please log in again.";
                } else if (error.message.includes('404')) {
                    errorMessage = "Subcategory not found. It may have been deleted.";
                } else if (error.message.includes('409')) {
                    errorMessage = "A size with this name already exists.";
                }
            }
            
            setSaveError(errorMessage);
            // Re-fetch to ensure state is consistent
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) {
                setItems(freshSub.items);
            }
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const applyFoundationToAllSizes = async () => {
        const persistedItems = items.filter((item): item is BookingItem & { id: number } => typeof item.id === "number");
        if (!persistedItems.length || applyingFoundations || saving) return;
        const pricePattern = /^\d+(?:\.\d{1,2})?$/;
        const adjustment = bulkFoundationAdjustment.trim();
        if (bulkFoundationEnabled && bulkUseAdjustment
                && (!pricePattern.test(adjustment) || Number(adjustment) <= 0)) {
            setSaveError("Enter a Knotless adjustment greater than $0 before applying it to all sizes.");
            return;
        }

        setApplyingFoundations(true);
        setSaveError(null);
        try {
            const updatedItems = persistedItems.map(item => ({
                ...item,
                foundationChoicesEnabled: bulkFoundationEnabled,
                knotlessPriceAdjustment: bulkFoundationEnabled && bulkUseAdjustment ? adjustment : "0",
                knotlessPricingMode: "ADJUSTMENT" as const,
            }));
            await Promise.all(updatedItems.map(item =>
                mutate("PUT", `${base}/items`, { item, itemId: item.id, subcategoryId: sub.id })
            ));
            setItems(previous => previous.map(item => {
                const updated = updatedItems.find(candidate => candidate.id === item.id);
                return updated ?? item;
            }));
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) setItems(freshSub.items);
            setSaveSuccess(`Foundation choices ${bulkFoundationEnabled ? "applied to" : "removed from"} all ${updatedItems.length} sizes.`);
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Unable to update foundation choices for all sizes.");
        } finally {
            setApplyingFoundations(false);
        }
    };

    const deleteItem = async (itemId?: number) => {
        if (!itemId || saving) return;
        const itemName = items.find(item => item.id === itemId)?.name ?? "this size";
        if (!confirm(`Delete "${itemName}"?`)) return;

        setSaving(true);
        setSaveError(null);
        try {
            await mutate("DELETE", `${base}/items/${itemId}`, undefined);
            setItems(previous => previous.filter(item => item.id !== itemId));
            setEditingId(null);
            setExpandedItems(previous => new Set(Array.from(previous).filter(id => id !== itemId)));
            setSaveSuccess("Size deleted successfully!");
            setTimeout(() => setSaveSuccess(null), 3000);
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) setItems(freshSub.items);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Delete failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (itemId?: number) => {
        if (!itemId) return;
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const reorderItem = async (itemId: number, offset: number) => {
        const ordered = sortItemsBySize(items).map(entry => entry.item);
        const index = ordered.findIndex(item => item.id === itemId);
        const target = index + offset;
        if (index < 0 || target < 0 || target >= ordered.length) return;
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
        setItems(ordered.map((item, displayOrder) => ({ ...item, displayOrder })));
        setSaving(true); setSaveError(null);
        try {
            const response = await fetch("/api/admin/services/reorder", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ serviceIds: ordered.map(item => item.id) }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Unable to reorder services.");
            setSaveSuccess("Customer display order updated.");
        } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to reorder services."); const freshSub = await onSubcategoryUpdate?.(sub.slug); if (freshSub?.items) setItems(freshSub.items); }
        finally { setSaving(false); }
    };

    const setCoverPhoto = async (imageId: number) => {
        const selected = galleryImages.find(imageItem => imageItem.id === imageId);
        if (!selected) return;
        const ordered = [selected, ...galleryImages.filter(imageItem => imageItem.id !== imageId)];
        setSaving(true); setSaveError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/gallery/reorder`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(ordered.map(imageItem => imageItem.id)) });
            if (!response.ok) throw new Error("Unable to set the cover photo.");
            setGalleryImages(ordered);
            setSaveSuccess("Cover photo updated.");
        } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to set the cover photo."); }
        finally { setSaving(false); }
    };

    const coverPhoto = galleryImages[0] ? toProxyUrl(galleryImages[0].imageUrl) : null;
    const totalLengths = items.reduce((acc, i) => acc + (i.lengthOptions?.length ?? 0), 0);

    return (
        <div className="space-y-4">
            {/* Banners */}
            {saveSuccess && (
                <div role="status" className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
                    <span className="flex-1 font-medium">{saveSuccess}</span>
                </div>
            )}
            {saveError && (
                <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
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
                                            aria-label={`Remove ${img.title || `photo ${i + 1}`}`}
                                        >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        {i !== 0 && <button type="button" onClick={() => void setCoverPhoto(img.id)} className="absolute bottom-1 left-1 right-1 rounded bg-black/70 px-1 py-1 text-[9px] font-semibold text-white opacity-100 focus:ring-2 focus:ring-violet-400 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">Set cover</button>}
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
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">Sizes</h3>
                        {items.length > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-neutral-100 px-1.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{items.length}</span>
                        )}
                    </div>
                    <button type="button" onClick={() => { setAddingItem(true); setEditingId(null); }} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"><Plus className="h-3.5 w-3.5" />Add size</button>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                    {items.length > 0 && <section aria-labelledby="bulk-foundation-title" className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 id="bulk-foundation-title" className="text-base font-semibold text-neutral-950 dark:text-white">Braid foundation</h4>
                                <span className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">Applies to all {items.length} sizes</span>
                            </div>
                            <p className="mt-1.5 text-sm text-neutral-500">Set the foundation choice once for every size in {sub.name}.</p>
                        </div>

                        <div className="mt-5 space-y-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                            <fieldset>
                                <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Customer options</legend>
                                <div className="space-y-2">
                                    <button type="button" aria-pressed={!bulkFoundationEnabled} onClick={() => setBulkFoundationEnabled(false)} className={`grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(15rem,1fr)] ${!bulkFoundationEnabled ? "border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-800/70" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}>
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${!bulkFoundationEnabled ? "border-neutral-950 dark:border-white" : "border-neutral-300 dark:border-neutral-600"}`}>{!bulkFoundationEnabled && <span className="h-2 w-2 rounded-full bg-neutral-950 dark:bg-white" />}</span>
                                        <span className="text-sm font-semibold text-neutral-950 dark:text-white">No foundation choice</span>
                                        <span className="col-start-2 text-xs text-neutral-500 sm:col-start-3">Customers go directly to length selection.</span>
                                    </button>
                                    <button type="button" aria-pressed={bulkFoundationEnabled} onClick={() => setBulkFoundationEnabled(true)} className={`grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(15rem,1fr)] ${bulkFoundationEnabled ? "border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-800/70" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}>
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bulkFoundationEnabled ? "border-neutral-950 dark:border-white" : "border-neutral-300 dark:border-neutral-600"}`}>{bulkFoundationEnabled && <span className="h-2 w-2 rounded-full bg-neutral-950 dark:bg-white" />}</span>
                                        <span className="text-sm font-semibold text-neutral-950 dark:text-white">Regular and Knotless</span>
                                        <span className="col-start-2 text-xs text-neutral-500 sm:col-start-3">Customers choose a foundation before length.</span>
                                    </button>
                                </div>
                            </fieldset>

                            {bulkFoundationEnabled && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm font-semibold text-neutral-950 dark:text-white">Add a Knotless price adjustment?</p>
                                        <div className="grid min-w-48 grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600">
                                            <button type="button" onClick={() => setBulkUseAdjustment(false)} aria-pressed={!bulkUseAdjustment} className={`min-h-10 px-5 text-sm font-semibold transition ${!bulkUseAdjustment ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}>No</button>
                                            <button type="button" onClick={() => setBulkUseAdjustment(true)} aria-pressed={bulkUseAdjustment} className={`min-h-10 border-l border-neutral-300 px-5 text-sm font-semibold transition dark:border-neutral-600 ${bulkUseAdjustment ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}>Yes</button>
                                        </div>
                                    </div>
                                    {bulkUseAdjustment && (
                                        <div className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center dark:border-neutral-800">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-950 dark:text-white">Knotless adjustment for all sizes <span aria-hidden="true">*</span></p>
                                                <p className="mt-1 text-xs text-neutral-500">Added to every existing length price.</p>
                                            </div>
                                            <label>
                                                <span className="sr-only">Knotless adjustment for all sizes</span>
                                                <span className="flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/15 dark:border-neutral-600 dark:bg-neutral-900">
                                                    <span className="border-r border-neutral-200 px-3 text-sm font-medium text-neutral-500 dark:border-neutral-700">$</span>
                                                    <input required aria-label="Knotless adjustment for all sizes" inputMode="decimal" value={bulkFoundationAdjustment} onChange={event => setBulkFoundationAdjustment(event.target.value.replace(/[^0-9.]/g, ""))} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base font-semibold outline-none" />
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                                <p className="text-xs text-neutral-500">
                                    {!bulkFoundationEnabled
                                        ? <>Foundation selection will be removed from all {items.length} sizes.</>
                                        : bulkUseAdjustment
                                            ? <>Add <strong className="text-neutral-800 dark:text-neutral-200">${bulkFoundationAdjustment || "0"}</strong> to every Regular length price across all {items.length} sizes.</>
                                            : <>Knotless will use the same prices as Regular across all {items.length} sizes.</>}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void applyFoundationToAllSizes()}
                                    disabled={applyingFoundations || saving || !items.some(item => item.id) || (bulkFoundationEnabled && bulkUseAdjustment && (!/^\d+(?:\.\d{1,2})?$/.test(bulkFoundationAdjustment.trim()) || Number(bulkFoundationAdjustment) <= 0))}
                                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                                >
                                    {applyingFoundations && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {applyingFoundations
                                        ? "Applying to all sizes…"
                                        : bulkFoundationEnabled && bulkUseAdjustment
                                            ? `Apply +$${bulkFoundationAdjustment || "0"} to ${items.length} sizes`
                                            : `Apply to all ${items.length} sizes`}
                                </button>
                            </div>
                        </div>
                    </section>}
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
                            {sortItemsBySize(items).map(({ item, originalIdx }, orderedIndex, orderedEntries) => (
                                <div key={item.id ?? `new-${originalIdx}`}>
                                    {editingId === item.id ? (
                                        <div className="rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4">
                                            <ItemForm
                                                initial={item}
                                                token={token}
                                                categoryId={cat.id}
                                                subcategoryId={sub.id}
                                                onSave={(updated) => saveItem(updated, item.id ?? null)}
                                                onCancel={() => setEditingId(null)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm transition-all">
                                            <div className="group flex items-center gap-3 px-4 py-3">
                                                {item.image && (
                                                    <img src={item.image} alt={item.name} className="w-14 h-14 flex-shrink-0 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm" />
                                                )}
                                                <button type="button" onClick={() => toggleExpand(item.id)} aria-expanded={item.id ? expandedItems.has(item.id) : false} className="flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-violet-400">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.name}</span>
                                                        {item.lengthOptions?.length ? (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                                                                {item.lengthOptions.length} {item.lengthOptions.length === 1 ? 'length' : 'lengths'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">No lengths</span>
                                                        )}
                                                        {item.foundationChoicesEnabled && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full">Regular + Knotless</span>}
                                                    </div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{servicePriceLabel(item)} · {item.sizePhotos?.length ?? 0} photos</p>
                                                </button>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button type="button" disabled={orderedIndex === 0 || saving} onClick={() => item.id && void reorderItem(item.id, -1)} aria-label={`Move ${item.name} up`} className="p-2 hover:bg-neutral-100 rounded-lg disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                                    <button type="button" disabled={orderedIndex === orderedEntries.length - 1 || saving} onClick={() => item.id && void reorderItem(item.id, 1)} aria-label={`Move ${item.name} down`} className="p-2 hover:bg-neutral-100 rounded-lg disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                                    <button type="button" onClick={() => toggleExpand(item.id)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors" title={item.id && expandedItems.has(item.id) ? "Collapse" : "Expand"}>
                                                        {item.id && expandedItems.has(item.id) ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                                    </button>
                                                    <button type="button" onClick={() => { setEditingId(item.id ?? null); setAddingItem(false); }} aria-label={`Edit ${item.name}`} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors opacity-100 focus:ring-2 focus:ring-violet-400 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" title="Edit">
                                                        <Edit3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                                    </button>
                                                    <button type="button" disabled={saving} onClick={() => deleteItem(item.id)} aria-label={`Delete ${item.name}`} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-100 focus:ring-2 focus:ring-red-400 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>

                                            {item.id && expandedItems.has(item.id) && (
                                                <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3">
                                                    {item.sizePhotos && item.sizePhotos.length > 0 && (
                                                        <div className="mb-3">
                                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Photos for this size</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.sizePhotos.slice(0, 3).map((photo, idx) => (
                                                                    <img key={idx} src={toProxyUrl(photo)} alt="" className="h-10 w-10 rounded-md border border-neutral-200 object-cover dark:border-neutral-700" />
                                                                ))}
                                                                {item.sizePhotos.length > 3 && (
                                                                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                                                        +{item.sizePhotos.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.lengthOptions && item.lengthOptions.length > 0 && (
                                                        <>
                                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Length Options</p>
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                                {item.lengthOptions.map((option, optIdx) => (
                                                                    <div key={optIdx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            {option.imageUrl && (
                                                                        <img src={toProxyUrl(option.imageUrl)} alt={option.name} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-neutral-200" />
                                                                    )}
                                                                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{option.name}</span>
                                                                </div>
                                                                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex-shrink-0 ml-3">{formatPrice(option.price)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
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
