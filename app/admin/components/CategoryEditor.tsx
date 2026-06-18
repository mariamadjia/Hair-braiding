"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config/api";
import type { GalleryImage } from "@/lib/types/gallery";
import type { BookingCategory, CategoriesData } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { slugify } from "../utils";
import { ChevronRight, FolderTree, FileText } from "lucide-react";
import { MultiImageUploader } from "./MultiImageUploader";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function CategoryEditor({ cat, token, headers, mutate, setSelection }: {
    cat: BookingCategory;
    token: string;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<CategoriesData>;
    setSelection: (s: Selection) => void;
}) {
    const [name, setName] = useState(cat.name);
    const [images, setImages] = useState<string[]>(cat.flippingImages ?? []);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [dirty, setDirty] = useState(false);
    const [addingSub, setAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState("");

    useEffect(() => { 
        setName(cat.name); 
        setImages(cat.flippingImages ?? []);
        setDirty(false); 
        
        // Fetch gallery images for this category
        const fetchGalleryImages = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/gallery/category/${cat.id}`);
                if (response.ok) {
                    const images = await response.json();
                    setGalleryImages(images);
                    
                    // Auto-populate flipping images if empty
                    if ((!cat.flippingImages || cat.flippingImages.length === 0) && images.length >= 3) {
                        const autoImages = images.slice(0, 5).map((img: GalleryImage) => img.imageUrl);
                        setImages(autoImages);
                        setDirty(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch gallery images:', error);
            }
        };
        fetchGalleryImages();
    }, [cat.slug, cat.id]);

    const save = async () => {
        if (images.length < 3) {
            alert("Please upload at least 3 photos for the gallery.");
            return;
        }
        if (images.length > 5) {
            alert("Maximum 5 photos allowed.");
            return;
        }
        await mutate("PUT", `/${cat.slug}`, { name, flippingImages: images });
        setDirty(false);
    };

    const addSub = async () => {
        if (!newSubName.trim()) return;
        await mutate("POST", `/${cat.slug}/subcategories`, { name: newSubName.trim(), slug: slugify(newSubName), items: [] });
        setNewSubName(""); setAddingSub(false);
    };

    const delSub = async (subSlug: string, subName: string) => {
        if (!confirm(`Delete subcategory "${subName}"?`)) return;
        await mutate("DELETE", `/${cat.slug}/subcategories/${subSlug}`);
    };

    const totalServices = (cat.subcategories ?? []).reduce((acc, sub) => acc + (sub.items?.length || 0), 0);
    const hasSubcategories = (cat.subcategories ?? []).length > 0;

    return (
        <div className="space-y-5">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <button 
                    type="button" 
                    onClick={() => setSelection({ type: "root" })} 
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
                <div className="border border-neutral-300 dark:border-neutral-600 rounded-lg p-5 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">Gallery Photos</h3>
                        <span className="text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-2 py-0.5 rounded font-medium">⭐ REQUIRED</span>
                    </div>
                    
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md p-3 mb-4">
                        <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                            📸 Upload 3-5 high-quality photos
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            These will be showcased in your website's gallery section
                        </p>
                    </div>
                    
                    <MultiImageUploader images={images} token={token} onChange={(urls) => { setImages(urls); setDirty(true); }} />
                    
                    {/* Status Indicator */}
                    <div className="mt-3">
                        {images.length >= 3 && images.length <= 5 ? (
                            <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                                ✅ {images.length} photo{images.length > 1 ? 's' : ''} uploaded (3-5 required)
                            </p>
                        ) : images.length === 0 ? (
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                                ⚠️ No photos uploaded yet (3-5 required)
                            </p>
                        ) : images.length < 3 ? (
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                                ⚠️ {images.length} photo{images.length > 1 ? 's' : ''} uploaded - add {3 - images.length} more (3-5 required)
                            </p>
                        ) : (
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                                ⚠️ {images.length} photos uploaded - remove {images.length - 5} (maximum 5 allowed)
                            </p>
                        )}
                    </div>
                </div>
                
                {dirty && <button type="button" onClick={save} className={btnP} disabled={images.length < 3 || images.length > 5}>Save changes</button>}
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
                    {(cat.subcategories ?? []).map((sub) => (
                        <div 
                            key={sub.id || sub.slug} 
                            className="flex items-center gap-3 p-3 rounded-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <FileText className="w-4 h-4 text-purple-500" />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug })} 
                                className="flex-1 text-left min-w-0"
                            >
                                <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                    {sub.name}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    {sub.items.length} services
                                </div>
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button type="button" onClick={() => setSelection({ type: "subcategory", catSlug: cat.slug, subSlug: sub.slug })} className={btnS}>Edit</button>
                                <button type="button" onClick={() => delSub(sub.slug, sub.name)} className={btnD}>×</button>
                            </div>
                        </div>
                    ))}
                    {(cat.subcategories ?? []).length === 0 && (
                        <div className="text-center py-8 text-sm text-neutral-400 dark:text-neutral-500 italic">
                            No subcategories yet. Click "+ Add" to create one.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
