"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { galleryApi, GalleryImage } from '@/lib/api/gallery';
import { API_BASE_URL } from '@/lib/config/api';
import { FlippingImagesModal } from "./FlippingImagesModal";
import { toProxyUrl } from '@/lib/utils/image';
import {
  fetchCategoryDisplayPhotos,
  getDisplayImages,
  saveCategoryFlippingImages,
} from "@/lib/api/categoryDisplayPhotos";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";

interface Category {
    id: number;
    name: string;
    slug: string;
    image?: string;
    summary?: string;
    images?: string[]; // Browser-ready card images (proxy URLs)
    rawImages?: string[]; // Original URLs for saving back to backend
    fallbackImages?: string[]; // Existing subcategory cover photos
    flippingImages?: string[];
    displayOrder?: number;
}

export function GalleryAdminNew() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<number | null>(null);
    const [cardImageIndexes, setCardImageIndexes] = useState<{ [key: number]: number }>({});
    const [isFlipping, setIsFlipping] = useState<{ [key: number]: boolean }>({});
    const [flippingModalOpen, setFlippingModalOpen] = useState(false);
    const [selectedCategoryForFlipping, setSelectedCategoryForFlipping] = useState<Category | null>(null);
    const [selectedCategoryImages, setSelectedCategoryImages] = useState<GalleryImage[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [loadError, setLoadError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const orderBeforeDrag = useRef<Category[]>([]);
    const rotationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setLoadError("");

            const [imagesData, categoriesData] = await Promise.all([
                galleryApi.getAllImages(),
                fetchCategoryDisplayPhotos(),
            ]);

            setImages(imagesData);

            const transformedCategories = categoriesData
                .map((cat: any) => {
                    const displayImages = getDisplayImages(cat);

                    return {
                        ...cat,

                        // Keep original paths for saving to the backend later.
                        rawImages: cat.flippingImages || [],

                        // Browser-ready image URLs for the cards.
                        images: displayImages,

                        image: displayImages[0] || toProxyUrl(cat.image),
                    };
                })
                .sort((a: any, b: any) => {
                    if (a.displayOrder === null && b.displayOrder === null) {
                        return a.id - b.id;
                    }

                    if (a.displayOrder === null) return 1;
                    if (b.displayOrder === null) return -1;

                    return a.displayOrder - b.displayOrder;
                });

            setCategories(transformedCategories);
        } catch (error) {
            console.error("Failed to load Admin Gallery:", error);
            setCategories([]);
            setLoadError("Gallery data could not be loaded. Nothing has been deleted.");
        } finally {
            setLoading(false);
        }
    };

    const getCategoryImages = (categoryId: number) => {
        return images.filter(img => img.categoryId === categoryId);
    };

    const handleDeleteImage = async (imageId: number) => {
        if (!confirm("Are you sure you want to delete this image?")) return;
        
        try {
            await galleryApi.deleteImage(imageId);
            setImages(images.filter(img => img.id !== imageId));
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete image");
        }
    };

    const handleEditCategory = (categoryId: number) => {
        setEditingCategory(editingCategory === categoryId ? null : categoryId);
    };

    const handleOpenFlippingModal = async (category: Category) => {
        setSelectedCategoryForFlipping(category);
        setSelectedCategoryImages([]);
        setFlippingModalOpen(true);

        try {
            const categoryImages = await galleryApi.getImagesByCategory(category.id);
            setSelectedCategoryImages(categoryImages);
        } catch (error) {
            console.error("Failed to load category Gallery images:", error);
        }
    };

    const handleSaveFlippingImages = async (imageUrls: string[]) => {
        if (!selectedCategoryForFlipping) return;

        try {
            await saveCategoryFlippingImages(
                selectedCategoryForFlipping.id,
                imageUrls
            );

            await loadData();

            setFlippingModalOpen(false);
            setSelectedCategoryForFlipping(null);
        } catch (error) {
            console.error("Failed to save flipping images:", error);
            alert("Failed to save flipping images. Please try again.");
        }
    };

    const handleDragStart = (index: number) => {
        orderBeforeDrag.current = [...categories];
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newCategories = [...categories];
        const draggedItem = newCategories[draggedIndex];
        newCategories.splice(draggedIndex, 1);
        newCategories.splice(index, 0, draggedItem);
        
        setCategories(newCategories);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        setDraggedIndex(null);

        try {
            await saveCategoryOrder(categories);
            setStatusMessage("Gallery order saved.");
        } catch (error) {
            console.error('Failed to update order:', error);
            setCategories(orderBeforeDrag.current);
            setStatusMessage("Gallery order could not be saved. The previous order was restored.");
        }
    };

    const saveCategoryOrder = async (orderedCategories: Category[]) => {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/api/categories/reorder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify(orderedCategories.map((category) => category.id)),
        });
        if (!response.ok) throw new Error(`Failed to update display order: ${response.status}`);
    };

    const reorderCategories = async (next: Category[]) => {
        const previous = categories;
        setCategories(next);
        try {
            await saveCategoryOrder(next);
            setStatusMessage("Gallery order saved.");
        } catch (error) {
            console.error("Failed to update order:", error);
            setCategories(previous);
            setStatusMessage("Gallery order could not be saved. The previous order was restored.");
        }
    };

    const moveCategory = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= categories.length) return;
        const previous = [...categories];
        const next = [...categories];
        [next[index], next[target]] = [next[target], next[index]];
        setCategories(next);
        try {
            await saveCategoryOrder(next);
            setStatusMessage(`${next[target].name} moved ${direction < 0 ? 'up' : 'down'}.`);
        } catch {
            setCategories(previous);
            setStatusMessage("The order could not be saved. The previous order was restored.");
        }
    };

    // Auto-rotate images for category cards (same as public gallery)
    useEffect(() => {
        if (reduceMotion) return;
        const interval = setInterval(() => {
            categories.forEach((category) => {
                const key = category.id;
                // Only rotate if category has multiple images
                if (category.images && category.images.length > 1) {
                    setIsFlipping(prev => ({ ...prev, [key]: true }));
                    
                    const changeTimer = setTimeout(() => {
                        setCardImageIndexes(prev => {
                            const currentIndex = Math.min(prev[key] || 0, category.images!.length - 1);
                            const newIndex = currentIndex === category.images!.length - 1 ? 0 : currentIndex + 1;
                            return { ...prev, [key]: newIndex };
                        });
                        
                        const finishTimer = setTimeout(() => {
                            setIsFlipping(prev => ({ ...prev, [key]: false }));
                        }, 300);
                        rotationTimers.current.push(finishTimer);
                    }, 300);
                    rotationTimers.current.push(changeTimer);
                }
            });
        }, 3000); // Flip every 3 seconds

        return () => {
            clearInterval(interval);
            rotationTimers.current.forEach(clearTimeout);
            rotationTimers.current = [];
        };
    }, [categories, reduceMotion]);

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <div className="text-neutral-500 dark:text-neutral-400">Loading gallery...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
            {/* Header */}
            <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-5 dark:border-neutral-700 dark:bg-neutral-800 sm:px-6 lg:px-8 lg:py-6">
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Gallery Management</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {categories.length} categories
                </p>
            </div>

            {/* Gallery Grid - Same as Public */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
                <div aria-live="polite" className="mx-auto mb-5 max-w-7xl">
                    {loadError && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<button type="button" onClick={loadData} className="ml-3 underline">Retry</button></div>}
                    {statusMessage && <p className="mt-2 text-sm text-neutral-600">{statusMessage}</p>}
                </div>
                <SortableList items={categories} getId={category => category.id} getLabel={category => category.name} onReorder={reorderCategories} strategy="grid" ariaLabel="Gallery category order" className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8" itemClassName="group relative">
                    {(category) => {
                        const categoryImages = getCategoryImages(category.id);
                        const isEditing = editingCategory === category.id;
                        
                        // Get current rotating image
                        const cardImageIndex = Math.min(cardImageIndexes[category.id] || 0, Math.max(0, (category.images?.length || 1) - 1));
                        const currentImage = category.images && category.images.length > 0 
                            ? category.images[cardImageIndex] 
                            : category.image;

                        return (
                            <div className="contents">
                                {/* Edit Button */}
                                <div className="absolute top-4 right-4 z-10 flex gap-1">
                                    <SortableHandle className="flex h-10 w-10 items-center justify-center bg-white shadow" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenFlippingModal(category);
                                        }}
                                        className="p-2 rounded-full shadow-lg transition-colors bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                        title="Edit flipping images"
                                        aria-label={`Edit ${category.name} rotating images`}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Image Container with Border (Same as Public Gallery) */}
                                <div 
                                    className="border-2 border-black dark:border-neutral-600 p-4 mb-3 hover:border-neutral-600 dark:hover:border-neutral-400 transition-colors relative overflow-hidden"
                                    onClick={() => router.push(`/admin/gallery/${category.slug}`)}
                                >
                                    <div 
                                        className="aspect-[4/5] bg-neutral-200 overflow-hidden relative"
                                        style={{ perspective: '1000px' }}
                                    >
                                        <div
                                            className="w-full h-full transition-transform duration-600"
                                            style={{
                                                transformStyle: 'preserve-3d',
                                                transform: isFlipping[category.id] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                                            }}
                                        >
                                            {currentImage ? (
                                                <img
                                                    src={currentImage}
                                                    alt={category.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    style={{ backfaceVisibility: 'hidden' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                    No images
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Category Info (Same as Public Gallery) */}
                                <div className="text-center">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-neutral-900 dark:text-white">
                                        {category.name}
                                    </h3>
                                    
                                    <button
                                        onMouseEnter={() => {
                                            router.prefetch(`/admin/gallery/${category.slug}`);
                                        }}
                                        onClick={() => router.push(`/admin/gallery/${category.slug}`)}
                                        className="inline-block px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-[0.15em] font-semibold hover:bg-neutral-800 transition-all"
                                    >
                                        Explore
                                    </button>
                                </div>
                            </div>
                        );
                    }}
                </SortableList>
                {!loadError && categories.length === 0 && (
                    <div className="mx-auto max-w-xl border border-neutral-200 bg-white p-10 text-center">
                        <h2 className="text-lg font-semibold text-neutral-900">No gallery categories yet</h2>
                        <p className="mt-2 text-sm text-neutral-500">Create a service category first, then return here to choose its gallery photos.</p>
                    </div>
                )}
            </div>

            {/* Flipping Images Modal */}
            {flippingModalOpen && selectedCategoryForFlipping && (
                <FlippingImagesModal
                    category={{
                        id: selectedCategoryForFlipping.id,
                        name: selectedCategoryForFlipping.name,
                        images:
                            selectedCategoryForFlipping.rawImages &&
                            selectedCategoryForFlipping.rawImages.length > 0
                                ? selectedCategoryForFlipping.rawImages
                                : (selectedCategoryForFlipping.fallbackImages ?? []).slice(0, 5),
                    }}
                    allCategoryImages={selectedCategoryImages}
                    fallbackImageUrls={selectedCategoryForFlipping.fallbackImages ?? []}
                    onClose={() => {
                        setFlippingModalOpen(false);
                        setSelectedCategoryForFlipping(null);
                        setSelectedCategoryImages([]);
                    }}
                    onSave={handleSaveFlippingImages}
                />
            )}
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
