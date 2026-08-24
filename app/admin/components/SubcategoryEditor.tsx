"use client";

import { useState, useEffect } from "react";
import type { BookingCategory, BookingSubcategory, CategoriesData, BookingItem } from "@/lib/booking-types";
import { emptyItem } from "../utils";
import { formatPrice } from "@/lib/utils/price";
import { API_BASE_URL } from "@/lib/config/api";
import type { GalleryImage } from "@/lib/types/gallery";
import { toProxyUrl } from "@/lib/utils/image";
import { ItemForm } from "./ItemForm";
import { AddOnsManager } from "@/components/AddOnsManager";
import { ChevronDown, ChevronRight, ChevronUp, Package, Plus, Trash2, CheckCircle, AlertCircle, Loader2, GripVertical, Pencil, Ruler, Images, X } from "lucide-react";
import { validateFile } from "../utils/fileValidation";
import { compressImage } from "../utils/imageCompression";
import type { GuideSettings } from "@/lib/guides";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";
import { ServicesSaveBar } from "./ServicesSaveBar";

function sortItemsBySize(items: BookingItem[]): { item: BookingItem; originalIdx: number }[] {
    return items.map((item, idx) => ({ item, originalIdx: idx })).sort((a, b) => {
        const orderA = a.item.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.item.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
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
    const [savedName, setSavedName] = useState(sub.name);
    const [image, setImage] = useState(sub.image ?? "");
    const [images, setImages] = useState(sub.images ?? []);
    const [dirty, setDirty] = useState(false);
    const [addingItem, setAddingItem] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [mobileSections, setMobileSections] = useState<Record<"settings" | "guides" | "addons", boolean>>({
        settings: false,
        guides: false,
        addons: false,
    });
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
    const [bulkSettingsDirty, setBulkSettingsDirty] = useState(false);
    const [applyingFoundations, setApplyingFoundations] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    const [draggedLength, setDraggedLength] = useState<{ itemId: number; optionIndex: number } | null>(null);
    const [guideSettings, setGuideSettings] = useState<GuideSettings | null>(null);
    const [guidesDirty, setGuidesDirty] = useState(false);
    const [savingGuides, setSavingGuides] = useState(false);
    const [uploadingGuide, setUploadingGuide] = useState<string | null>(null);
    const [editingGuide, setEditingGuide] = useState<"length" | "size" | null>(null);
    const [guideSnapshot, setGuideSnapshot] = useState<GuideSettings | null>(null);

    const base = `/${cat.slug}/subcategories/${sub.slug}`;
    const guideAuthHeaders: Record<string, string> = token && token !== "cookie-session"
        ? { Authorization: `Bearer ${token}` }
        : {};

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/admin/guides`, { headers: guideAuthHeaders })
            .then(async response => {
                if (!response.ok) throw new Error(`Could not load guide settings (${response.status})`);
                return response.json();
            })
            .then(setGuideSettings)
            .catch(error => setSaveError(error instanceof Error ? error.message : "Could not load guide settings."));
    }, [token]);

    const updateGuides = (change: (current: GuideSettings) => GuideSettings) => {
        setGuideSettings(current => current ? change(current) : current);
        setGuidesDirty(true);
    };

    const uploadGuideImage = async (file: File, guideKey?: string) => {
        const validation = validateFile(file);
        if (!validation.valid) { setSaveError(validation.error); return; }
        const target = guideKey || "length";
        setUploadingGuide(target); setSaveError(null);
        try {
            const compressed = await compressImage(file, { maxWidth: 1800, maxHeight: 1800, quality: 0.88, format: "image/webp" });
            const body = new FormData();
            body.append("file", compressed);
            body.append("title", guideKey ? `${guideKey} size guide` : "Length guide");
            const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, { method: "POST", headers: guideAuthHeaders, body });
            if (!response.ok) throw new Error(`Guide upload failed (${response.status})`);
            const uploaded = await response.json();
            if (!uploaded.imageUrl) throw new Error("Upload completed without an image URL.");
            updateGuides(current => guideKey
                ? { ...current, sizes: current.sizes.map(size => size.guideKey === guideKey ? { ...size, imageUrl: uploaded.imageUrl } : size) }
                : { ...current, lengthGuideImageUrl: uploaded.imageUrl });
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Could not upload guide image.");
        } finally { setUploadingGuide(null); }
    };

    const saveGuideSettings = async (settingsToSave: GuideSettings | null = guideSettings, closeEditor = false) => {
        if (!settingsToSave) return;
        setSavingGuides(true); setSaveError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/guides`, {
                method: "PUT", headers: { "Content-Type": "application/json", ...guideAuthHeaders }, body: JSON.stringify(settingsToSave)
            });
            if (!response.ok) {
                const detail = await response.text();
                throw new Error(detail || `Could not save guide settings (${response.status})`);
            }
            const savedSettings = await response.json();
            setGuideSettings(savedSettings); setGuideSnapshot(savedSettings); setGuidesDirty(false);
            if (closeEditor) { setEditingGuide(null); setGuideSnapshot(null); }
            setSaveSuccess("Guide settings saved and published.");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) { setSaveError(error instanceof Error ? error.message : "Could not save guide settings."); }
        finally { setSavingGuides(false); }
    };

    const toggleGuide = (kind: "length" | "size") => {
        if (!guideSettings || savingGuides) return;
        const next = kind === "length"
            ? { ...guideSettings, lengthGuideEnabled: !guideSettings.lengthGuideEnabled }
            : { ...guideSettings, sizeGuideEnabled: !guideSettings.sizeGuideEnabled };
        setGuideSettings(next);
        void saveGuideSettings(next);
    };

    const openGuideEditor = (kind: "length" | "size") => {
        if (!guideSettings) return;
        setSaveError(null);
        setGuideSnapshot(structuredClone(guideSettings));
        setEditingGuide(kind);
    };

    const cancelGuideEditor = () => {
        if (uploadingGuide) return;
        if (guidesDirty && !window.confirm("Discard your unsaved guide changes?")) return;
        if (guideSnapshot) setGuideSettings(guideSnapshot);
        setGuidesDirty(false); setEditingGuide(null); setGuideSnapshot(null);
    };

    useEffect(() => {
        setName(sub.name);
        setSavedName(sub.name);
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
        setBulkSettingsDirty(false);
        // Seed gallery images from the already-loaded subcategory detail (no extra fetch)
        const preloaded = (sub.galleryImages ?? []) as GalleryImage[];
        setGalleryImages(preloaded);
        if (preloaded.length > 0) {
            setImages(preloaded.map(img => img.imageUrl));
        } else {
            setImages(sub.images ?? []);
        }
    }, [sub.slug, sub.galleryImages, sub.items]);

    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (dirty || bulkSettingsDirty) event.preventDefault();
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [dirty, bulkSettingsDirty]);

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
        if ((dirty || bulkSettingsDirty) && !confirm('You have unsaved changes. Leave without saving?')) return;
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
            setSavedName(freshSub?.name ?? name);
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
            setBulkSettingsDirty(false);
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

    const reorderItemTo = async (itemId: number, targetItemId: number) => {
        const ordered = sortItemsBySize(items).map(entry => entry.item);
        const index = ordered.findIndex(item => item.id === itemId);
        const target = ordered.findIndex(item => item.id === targetItemId);
        if (index < 0 || target < 0 || index === target) return;
        const [movedItem] = ordered.splice(index, 1);
        ordered.splice(target, 0, movedItem);
        const reorderedItems = ordered.map((item, displayOrder) => ({ ...item, displayOrder }));
        setItems(reorderedItems);
        setSaving(true); setSaveError(null);
        try {
            const response = await fetch("/api/admin/services/reorder", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ serviceIds: ordered.map(item => item.id) }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Unable to reorder services.");
            setSaveSuccess("Customer display order updated.");
        } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to reorder services."); const freshSub = await onSubcategoryUpdate?.(sub.slug); if (freshSub?.items) setItems(freshSub.items); }
        finally { setSaving(false); }
    };

    const reorderLengthOption = async (itemId: number, fromIndex: number, toIndex: number) => {
        if (saving || fromIndex === toIndex) return;
        const currentItem = items.find(item => item.id === itemId);
        const currentOptions = currentItem?.lengthOptions ?? [];
        if (!currentItem || fromIndex < 0 || toIndex < 0 || fromIndex >= currentOptions.length || toIndex >= currentOptions.length) return;

        const reorderedOptions = [...currentOptions];
        const [movedOption] = reorderedOptions.splice(fromIndex, 1);
        reorderedOptions.splice(toIndex, 0, movedOption);
        const updatedItem = {
            ...currentItem,
            lengthOptions: reorderedOptions.map((option, displayOrder) => ({ ...option, displayOrder })),
        };

        setItems(previous => previous.map(item => item.id === itemId ? updatedItem : item));
        setSaving(true);
        setSaveError(null);
        try {
            await mutate("PUT", `${base}/items`, { item: updatedItem, itemId, subcategoryId: sub.id });
            setSaveSuccess("Length order updated.");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Unable to reorder lengths.");
            const freshSub = await onSubcategoryUpdate?.(sub.slug);
            if (freshSub?.items) setItems(freshSub.items);
        } finally {
            setSaving(false);
            setDraggedLength(null);
        }
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
    const toggleMobileSection = (section: keyof typeof mobileSections) => {
        setMobileSections(current => ({ ...current, [section]: !current[section] }));
    };
    const SectionButton = ({ section, title }: { section: keyof typeof mobileSections; title: string }) => (
        <button
            type="button"
            onClick={() => toggleMobileSection(section)}
            aria-expanded={mobileSections[section]}
            className="flex min-h-13 w-full items-center justify-between px-4 py-3 text-left sm:px-6"
        >
            <span className="font-serif text-lg font-semibold text-[#351a10] dark:text-white">{title}</span>
            {mobileSections[section] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
    );

    return (
        <div className="w-full min-w-0 space-y-5 px-3 py-4 pb-28 sm:space-y-7 sm:px-6 sm:py-5 lg:px-10 lg:py-8">
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
            <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                <button type="button" onClick={() => guardedSetSelection({ type: "root" })} className="transition-colors hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950 dark:hover:text-white dark:focus-visible:ring-white">All Categories</button>
                <ChevronRight className="w-3.5 h-3.5" />
                <button type="button" onClick={() => guardedSetSelection({ type: "category", catSlug: cat.slug })} className="transition-colors hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950 dark:hover:text-white dark:focus-visible:ring-white">{cat.name}</button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="truncate font-semibold text-neutral-900 dark:text-white">{sub.name}</span>
            </nav>

            {/* Compact header and details card */}
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-28 sm:w-28 dark:bg-neutral-800">
                            {coverPhoto ? (
                                <img src={coverPhoto} alt={sub.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-xl font-semibold text-neutral-950 sm:text-2xl dark:text-white">{sub.name}</h2>
                            <p className="mt-1 flex flex-wrap text-xs text-neutral-500 sm:mt-2 sm:text-sm">
                                {items.length} {items.length === 1 ? "size" : "sizes"}
                                <span className="px-2" aria-hidden="true">·</span>
                                {totalLengths} {totalLengths === 1 ? "length option" : "length options"}
                                <span className="px-2" aria-hidden="true">·</span>
                                {galleryImages.length} {galleryImages.length === 1 ? "photo" : "photos"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Subcategory name</label>
                        <input
                            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 transition focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setDirty(true); }}
                            placeholder="e.g., Knotless, Goddess Braids"
                        />
                    </div>

                    {/* Gallery photos */}
                    <div>
                        <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">Gallery photos <span className="ml-1 text-neutral-400">{galleryImages.length}</span></p>
                        {loadingGallery ? (
                            <div className="flex gap-2">
                                {[1,2,3].map(i => <div key={i} className="h-24 w-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}
                            </div>
                        ) : (
                            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                                {galleryImages.map((img, i) => (
                                    <div key={img.id} className="group relative h-24 w-24 shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        {i === 0 && (
                                            <span className="absolute left-1.5 top-1.5 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">Cover</span>
                                        )}
                                        <img src={toProxyUrl(img.imageUrl)} alt={img.title || `Photo ${i+1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => deleteGalleryImage(img.id)}
                                            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white opacity-100 transition hover:bg-black sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                            title="Remove"
                                            aria-label={`Remove ${img.title || `photo ${i + 1}`}`}
                                        >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        {i !== 0 && <button type="button" onClick={() => void setCoverPhoto(img.id)} className="absolute bottom-1.5 left-1.5 right-1.5 rounded bg-black/75 px-1 py-1 text-[9px] font-semibold text-white opacity-100 focus:ring-2 focus:ring-neutral-950 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">Set cover</button>}
                                    </div>
                                ))}
                                <label className="flex h-24 w-24 shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-500 transition hover:border-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                                    <Plus className="w-5 h-5 mb-0.5" />
                                    <span className="text-[10px] font-medium">Add photo</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadGalleryImage(f); e.target.value = ''; } }} />
                                </label>
                            </div>
                        )}
                    </div>

                    </div>
                </div>
            </div>

            {/* Settings shared by every size */}
            {items.length > 0 && <div className="w-full space-y-4">
                <header className="sr-only">
                    <h3 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl dark:text-white">Size settings</h3>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage choices and guides shared by all {items.length} sizes.</p>
                </header>
                <section aria-labelledby="bulk-foundation-title" className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    <SectionButton section="settings" title="Size settings" />
                    <div className={`${mobileSections.settings ? "block" : "hidden"} border-t border-neutral-200 p-4 sm:p-6 dark:border-neutral-800`}>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 id="bulk-foundation-title" className="text-base font-semibold text-neutral-950 dark:text-white">Settings for all sizes</h4>
                                <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{items.length} sizes</span>
                                {bulkSettingsDirty && <span className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-200">Unsaved changes</span>}
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 sm:flex-nowrap">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-neutral-950 dark:text-white">Braid foundation for all sizes</p>
                                    <p className="mt-1 text-xs text-neutral-500">Let customers choose Regular or Knotless for every size.</p>
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                    <button type="button" role="switch" aria-label="Offer Regular and Knotless for all sizes" aria-checked={bulkFoundationEnabled} onClick={() => { setBulkFoundationEnabled(current => !current); setBulkSettingsDirty(true); }} className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:ring-2 focus-visible:ring-[#7a4a28] focus-visible:ring-offset-2 ${bulkFoundationEnabled ? "bg-[#7a4a28]" : "bg-neutral-300 dark:bg-neutral-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${bulkFoundationEnabled ? "left-6" : "left-1"}`} /></button>
                                    <span className="min-w-7 text-xs font-medium text-neutral-500">{bulkFoundationEnabled ? "On" : "Off"}</span>
                                </div>
                            </div>

                            {bulkFoundationEnabled && (
                                <div className={`mt-4 grid gap-3 rounded-xl border border-neutral-200 p-4 sm:items-center dark:border-neutral-700 ${bulkUseAdjustment ? "sm:grid-cols-[minmax(9rem,1fr)_auto_12rem]" : "sm:grid-cols-[minmax(9rem,1fr)_auto]"}`}>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-950 dark:text-white">Knotless adjustment</p>
                                        <p className="mt-0.5 text-xs text-neutral-500">Add to every Regular length price.</p>
                                    </div>
                                    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600">
                                            <button type="button" onClick={() => { setBulkUseAdjustment(false); setBulkSettingsDirty(true); }} aria-pressed={!bulkUseAdjustment} className={`min-h-10 px-5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950 ${!bulkUseAdjustment ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}>No</button>
                                            <button type="button" onClick={() => { setBulkUseAdjustment(true); setBulkSettingsDirty(true); }} aria-pressed={bulkUseAdjustment} className={`min-h-10 border-l border-neutral-300 px-5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950 dark:border-neutral-600 ${bulkUseAdjustment ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}>Yes</button>
                                    </div>
                                    {bulkUseAdjustment && (
                                        <label>
                                            <span className="sr-only">Knotless adjustment for all sizes</span>
                                            <span className="flex min-h-10 items-center rounded-lg border border-neutral-300 bg-white focus-within:border-neutral-950 focus-within:ring-2 focus-within:ring-neutral-950/15 dark:border-neutral-600 dark:bg-neutral-900">
                                                <span className="border-r border-neutral-200 px-3 text-sm font-medium text-neutral-500 dark:border-neutral-700">$</span>
                                                <input required aria-label="Knotless adjustment for all sizes" inputMode="decimal" value={bulkFoundationAdjustment} onChange={event => { setBulkFoundationAdjustment(event.target.value.replace(/[^0-9.]/g, "")); setBulkSettingsDirty(true); }} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold outline-none" />
                                            </span>
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>
                            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-neutral-500">
                                    {!bulkFoundationEnabled
                                        ? <>Foundation selection will be removed from all {items.length} sizes.</>
                                        : bulkUseAdjustment
                                            ? <><strong className="text-neutral-800 dark:text-neutral-200">+${bulkFoundationAdjustment || "0"}</strong> across all {items.length} sizes</>
                                            : <>Knotless will use the same prices as Regular across all {items.length} sizes.</>}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void applyFoundationToAllSizes()}
                                    disabled={!bulkSettingsDirty || applyingFoundations || saving || !items.some(item => item.id) || (bulkFoundationEnabled && bulkUseAdjustment && (!/^\d+(?:\.\d{1,2})?$/.test(bulkFoundationAdjustment.trim()) || Number(bulkFoundationAdjustment) <= 0))}
                                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#5b3219] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#442412] focus:outline-none focus:ring-2 focus:ring-[#7a4a28] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                                >
                                    {applyingFoundations && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {applyingFoundations ? "Applying to all sizes…" : `Apply to ${items.length} sizes`}
                                </button>
                            </div>

                    </div>
                        {guideSettings && <div className="border-t border-neutral-200 dark:border-neutral-800">
                            <SectionButton section="guides" title="Customer guides" />
                            <div className={`${mobileSections.guides ? "block" : "hidden"} border-t border-neutral-200 p-4 sm:p-6 dark:border-neutral-800`}>
                            <div className="space-y-3">
                                {([
                                    { kind: "length" as const, title: "Length guide", subtitle: "One image shared by all sizes", enabled: guideSettings.lengthGuideEnabled, ready: Boolean(guideSettings.lengthGuideImageUrl), status: guideSettings.lengthGuideImageUrl ? "Ready" : "No image", icon: Ruler },
                                    { kind: "size" as const, title: "Size guide", subtitle: "Individual images for each size", enabled: guideSettings.sizeGuideEnabled, ready: guideSettings.sizes.every(size => Boolean(size.imageUrl)), status: guideSettings.sizes.every(size => Boolean(size.imageUrl)) ? "Ready" : `Incomplete · ${guideSettings.sizes.filter(size => size.imageUrl).length} of ${guideSettings.sizes.length}`, icon: Images }
                                ]).map(row => <div key={row.kind} className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-1 py-3.5 last:border-b-0 dark:border-neutral-800 sm:flex-nowrap">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"><row.icon className="h-5 w-5" /></span>
                                    <div className="min-w-40 flex-1"><p className="text-sm font-semibold">{row.title}</p><p className="text-xs text-neutral-500">{row.subtitle}</p></div>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.ready ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{row.status}</span>
                                    <div className="ml-auto flex items-center gap-3">
                                        <span className="text-xs font-medium text-neutral-500">{row.enabled ? "Enabled" : "Disabled"}</span>
                                        <button type="button" role="switch" aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.title}`} aria-checked={row.enabled} disabled={savingGuides} onClick={() => toggleGuide(row.kind)} className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${row.enabled ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${row.enabled ? "left-6" : "left-1"}`} /></button>
                                        <button type="button" onClick={() => openGuideEditor(row.kind)} aria-label={`Manage ${row.title}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"><Pencil className="h-4 w-4" />Manage</button>
                                    </div>
                                </div>)}
                            </div></div>
                        </div>}
            </section></div>}

            {guideSettings && editingGuide && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="guide-editor-title" onMouseDown={event => { if (event.target === event.currentTarget) cancelGuideEditor(); }}>
                <div className="max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-neutral-900 sm:max-h-[90vh] sm:rounded-2xl">
                    <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900 sm:px-6"><div><h3 id="guide-editor-title" className="text-lg font-semibold">Edit {editingGuide} guide</h3><p className="mt-1 text-sm text-neutral-500">{editingGuide === "length" ? "Upload the one image customers use to compare hair lengths." : "Upload the image that belongs to each size."}</p></div><button type="button" onClick={cancelGuideEditor} aria-label="Close editor" className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button></div>
                    <div className="p-5 sm:p-6">
                        {saveError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{saveError}</div>}
                        {editingGuide === "length" ? <div className="mx-auto max-w-sm rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                            {guideSettings.lengthGuideImageUrl ? <img src={toProxyUrl(guideSettings.lengthGuideImageUrl)} alt="Length guide preview" className="mx-auto h-72 w-full rounded-lg object-contain" /> : <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400 dark:border-neutral-700">No image uploaded</div>}
                            <div className="mt-3 flex gap-2"><label className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 text-sm font-semibold dark:border-neutral-600">{uploadingGuide === "length" ? "Uploading…" : guideSettings.lengthGuideImageUrl ? "Replace image" : "Upload image"}<input type="file" accept="image/*" disabled={uploadingGuide !== null} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadGuideImage(file); event.target.value = ""; }} /></label>{guideSettings.lengthGuideImageUrl && <button type="button" onClick={() => updateGuides(current => ({ ...current, lengthGuideImageUrl: null, lengthGuideEnabled: false }))} className="rounded-lg px-3 text-sm font-medium text-red-700">Remove</button>}</div>
                        </div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...guideSettings.sizes].sort((a,b) => a.displayOrder - b.displayOrder).map(size => <div key={size.guideKey} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"><p className="text-sm font-semibold">{size.displayName}</p><p className="mb-3 text-xs text-neutral-400">Key: {size.guideKey}</p>{size.imageUrl ? <img src={toProxyUrl(size.imageUrl)} alt={`${size.displayName} guide`} className="h-36 w-full rounded-lg object-cover" /> : <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700">No image</div>}<div className="mt-2 flex gap-1"><label className="flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 text-xs font-semibold dark:border-neutral-600">{uploadingGuide === size.guideKey ? "Uploading…" : size.imageUrl ? "Replace" : "Upload"}<input type="file" accept="image/*" disabled={uploadingGuide !== null} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadGuideImage(file, size.guideKey); event.target.value = ""; }} /></label>{size.imageUrl && <button type="button" aria-label={`Remove ${size.displayName} image`} onClick={() => updateGuides(current => ({ ...current, sizes: current.sizes.map(entry => entry.guideKey === size.guideKey ? { ...entry, imageUrl: null } : entry) }))} className="px-2 text-red-700"><Trash2 className="h-4 w-4" /></button>}</div></div>)}</div>}
                    </div>
                    <ServicesSaveBar visible={true} saving={savingGuides} disabled={!guidesDirty || uploadingGuide !== null} onSave={() => void saveGuideSettings(guideSettings, true)} onDiscard={cancelGuideEditor} mode="dialog" statusLabel={guidesDirty ? "Unsaved changes" : "No changes to save"} />
                </div>
            </div>}

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <SectionButton section="addons" title="Add-ons" />
            <div className={`${mobileSections.addons ? "block" : "hidden"} border-t border-neutral-200 dark:border-neutral-800`}>
            <AddOnsManager
                sub={sub}
                items={items}
                data={data}
                token={token}
                embeddedMobile
                onError={setSaveError}
                onSuccess={(message) => { setSaveSuccess(message); setTimeout(() => setSaveSuccess(null), 3000); }}
            />
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
                    {addingItem && (
                        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
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
                        <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center dark:border-neutral-700">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                <Package className="h-6 w-6 text-neutral-500" />
                            </div>
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No sizes yet</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Click <strong>Add Size</strong> above to get started</p>
                            <button type="button" onClick={() => { setAddingItem(true); setEditingId(null); }} className="mt-4 min-h-10 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">+ Add size</button>
                        </div>
                    ) : (
                        <SortableList items={sortItemsBySize(items)} getId={({ item, originalIdx }) => item.id ?? `new-${originalIdx}`} getLabel={({ item }) => item.name} onReorder={(_, meta) => { if (typeof meta.activeId === "number" && typeof meta.overId === "number") void reorderItemTo(meta.activeId, meta.overId); }} disabled={saving} ariaLabel="Size order" className="space-y-2">
                            {({ item, originalIdx }, orderedIndex) => (
                                <div key={item.id ?? `new-${originalIdx}`}>
                                    {editingId === item.id ? (
                                        <ItemForm
                                            initial={item}
                                            token={token}
                                            categoryId={cat.id}
                                            subcategoryId={sub.id}
                                            onSave={(updated) => saveItem(updated, item.id ?? null)}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    ) : (
                                        <div
                                            className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
                                        >
                                            {/* Compact summary keeps pricing mode, photos, and actions scannable. */}
                                            <div className="group grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto] sm:px-5">
                                                <SortableHandle className="hidden h-10 w-8 items-center justify-center sm:flex" />
                                                <span className="hidden w-5 text-center text-xs font-semibold text-neutral-400 sm:block">{orderedIndex + 1}</span>
                                                {item.sizePhotos?.[0] ? <img src={toProxyUrl(item.sizePhotos[0])} alt="" className="hidden h-10 w-10 rounded-md border border-neutral-200 object-cover sm:block dark:border-neutral-700" /> : <div className="hidden h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-400 sm:grid dark:bg-neutral-800"><Package className="h-4 w-4" /></div>}
                                                <button type="button" onClick={() => toggleExpand(item.id)} aria-expanded={item.id ? expandedItems.has(item.id) : false} className="col-start-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-neutral-950 sm:col-start-4">
                                                    <span className="block truncate text-sm font-semibold text-neutral-950 dark:text-white">{item.name}</span>
                                                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                                                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium dark:bg-neutral-800">{item.pricingMode === "BY_LENGTH" ? `${item.lengthOptions?.length ?? 0} length ${(item.lengthOptions?.length ?? 0) === 1 ? "price" : "prices"}` : "Fixed price"}</span>
                                                        <span>·</span><span>{item.sizePhotos?.length ?? 0} {(item.sizePhotos?.length ?? 0) === 1 ? "photo" : "photos"}</span>
                                                    </span>
                                                </button>
                                                <span className="col-start-1 row-start-2 text-sm font-semibold text-neutral-900 dark:text-white sm:col-start-5 sm:row-start-1 sm:min-w-24 sm:text-right">{servicePriceLabel(item)}</span>
                                                <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 sm:col-start-6 sm:row-span-1">
                                                    <button type="button" onClick={() => { setEditingId(item.id ?? null); setAddingItem(false); }} aria-label={`Edit ${item.name}`} className="inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 transition hover:border-neutral-500 hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-950 sm:h-9 sm:w-auto sm:px-3 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"><Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span></button>
                                                    <button type="button" disabled={saving} onClick={() => deleteItem(item.id)} aria-label={`Delete ${item.name}`} className="hidden h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-red-400 disabled:opacity-40 sm:flex dark:border-neutral-600 dark:hover:bg-red-950/30" title="Delete">
                                                        <Trash2 className="h-4 w-4" />
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
                                                            <SortableList items={item.lengthOptions} getId={option => option.id ?? `${item.id}-${option.name ?? "length"}`} getLabel={option => option.name ?? "Length"} onReorder={(_, meta) => { if (item.id) void reorderLengthOption(item.id, meta.fromIndex, meta.toIndex); }} disabled={saving} ariaLabel={`${item.name} length order`} className="grid grid-cols-1 gap-1.5" itemClassName="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900">
                                                                {(option, optIdx) => (<>
                                                                    <div
                                                                        data-length-option-row
                                                                        className="contents"
                                                                    >
                                                                        <SortableHandle className="flex h-9 w-8 items-center justify-center" />
                                                                        <div className="flex min-w-0 items-center gap-2">
                                                                            {option.imageUrl && (
                                                                        <img src={toProxyUrl(option.imageUrl)} alt={option.name} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-neutral-200" />
                                                                    )}
                                                                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{option.name}</span>
                                                                </div>
                                                                <span className="ml-3 flex-shrink-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatPrice(option.price)}</span>
                                                                    </div>
                                                                </>)}
                                                            </SortableList>
                                                    {item.lengthOptions.length > 1 && (
                                                        <p className="mt-2 text-[11px] text-neutral-500">Drag a length row to reorder it</p>
                                                    )}
                                                </>
                                            )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </SortableList>
                    )}
                    {items.length > 1 && !addingItem && (
                        <p className="pt-1 text-xs text-neutral-500">Drag rows to reorder</p>
                    )}
                </div>
            </div>
            <ServicesSaveBar
                visible={dirty}
                saving={saving}
                disabled={!name.trim()}
                onSave={() => void save()}
                onDiscard={() => {
                    setName(savedName);
                    setSaveError(null);
                    setDirty(false);
                }}
            />
        </div>
    );
}
