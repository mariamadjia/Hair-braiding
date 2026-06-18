"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Plus } from "lucide-react";
import { galleryApi, GalleryImage } from '@/lib/api/gallery';
import { API_BASE_URL } from '@/lib/config/api';
import { FlippingImagesModal } from "./FlippingImagesModal";

interface Category {
    id: number;
    name: string;
    slug: string;
    image?: string;
    summary?: string;
    images?: string[]; // Flipping images array
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
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            
            const [imagesData, categoriesRes] = await Promise.all([
                galleryApi.getAllImages(),
                fetch(`${API_BASE_URL}/api/categories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(r => r.json())
            ]);
            
            setImages(imagesData);
            setCategories(categoriesRes.categories || []);
            
            // Transform categories to include flipping images (same as public gallery)
            const transformedCategories = categoriesRes.categories.map((cat: any) => {
                const categoryImages = imagesData.filter((img: GalleryImage) => img.categoryId === cat.id);
                const firstImage = categoryImages[0];
                
                // Use flipping images from backend, or fallback to first 5 images
                const flippingImages = cat.flippingImages && cat.flippingImages.length > 0
                    ? cat.flippingImages
                    : categoryImages.slice(0, 5).map((img: GalleryImage) => img.imageUrl);
                
                return {
                    ...cat,
                    image: firstImage ? firstImage.imageUrl : cat.image,
                    images: flippingImages.length > 0 ? flippingImages : (firstImage ? [firstImage.imageUrl] : [])
                };
            });
            
            // Sort by displayOrder (null values go to end, then sort by ID)
            const sortedCategories = transformedCategories.sort((a: any, b: any) => {
                if (a.displayOrder === null && b.displayOrder === null) return a.id - b.id;
                if (a.displayOrder === null) return 1;
                if (b.displayOrder === null) return -1;
                return a.displayOrder - b.displayOrder;
            });
            
            setCategories(sortedCategories);
        } catch (error) {
            console.error("Failed to load data:", error);
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

    const handleOpenFlippingModal = (category: Category) => {
        console.log('Opening flipping modal for category:', category);
        setSelectedCategoryForFlipping(category);
        setFlippingModalOpen(true);
    };

    const handleSaveFlippingImages = async (imageUrls: string[]) => {
        if (!selectedCategoryForFlipping) return;

        try {
            // Save to backend
            await galleryApi.updateCategoryFlippingImages(selectedCategoryForFlipping.id, imageUrls);
            
            // Update local state
            const updatedCategories = categories.map(cat => 
                cat.id === selectedCategoryForFlipping.id 
                    ? { ...cat, images: imageUrls }
                    : cat
            );
            setCategories(updatedCategories);
            
            setFlippingModalOpen(false);
            setSelectedCategoryForFlipping(null);
        } catch (error) {
            console.error("Failed to save flipping images:", error);
            alert("Failed to save flipping images. Please try again.");
        }
    };

    const handleDragStart = (index: number) => {
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
        
        try {
            const token = localStorage.getItem('auth_token');
            
            // Update display order for all categories
            for (let i = 0; i < categories.length; i++) {
                await fetch(`${API_BASE_URL}/api/categories/${categories[i].id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ displayOrder: i.toString() }),
                });
            }
        } catch (error) {
            console.error('Failed to update order:', error);
        }
        
        setDraggedIndex(null);
    };

    // Auto-rotate images for category cards (same as public gallery)
    useEffect(() => {
        const interval = setInterval(() => {
            categories.forEach((category, index) => {
                // Only rotate if category has multiple images
                if (category.images && category.images.length > 1) {
                    setIsFlipping(prev => ({ ...prev, [index]: true }));
                    
                    setTimeout(() => {
                        setCardImageIndexes(prev => {
                            const currentIndex = prev[index] || 0;
                            const newIndex = currentIndex === category.images!.length - 1 ? 0 : currentIndex + 1;
                            return { ...prev, [index]: newIndex };
                        });
                        
                        setTimeout(() => {
                            setIsFlipping(prev => ({ ...prev, [index]: false }));
                        }, 300);
                    }, 300);
                }
            });
        }, 3000); // Flip every 3 seconds

        return () => clearInterval(interval);
    }, [categories]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
                <div className="text-neutral-500 dark:text-neutral-400">Loading gallery...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-8 py-6 shrink-0">
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Gallery Management</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {categories.length} categories • {images.length} total images
                </p>
            </div>

            {/* Gallery Grid - Same as Public */}
            <div className="px-8 py-12 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {categories.map((category, index) => {
                        const categoryImages = getCategoryImages(category.id);
                        const isEditing = editingCategory === category.id;
                        
                        // Get current rotating image
                        const cardImageIndex = cardImageIndexes[index] || 0;
                        const currentImage = category.images && category.images.length > 0 
                            ? category.images[cardImageIndex] 
                            : category.image;

                        return (
                            <div 
                                key={category.id} 
                                className={`group cursor-move relative ${draggedIndex === index ? 'opacity-50' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                {/* Edit Button */}
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenFlippingModal(category);
                                        }}
                                        className="p-2 rounded-full shadow-lg transition-colors bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                        title="Edit flipping images"
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
                                                transform: isFlipping[index] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                                            }}
                                        >
                                            {currentImage ? (
                                                <img
                                                    src={currentImage}
                                                    alt={category.name}
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
                                        onClick={() => router.push(`/admin/gallery/${category.slug}`)}
                                        className="inline-block px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-[0.15em] font-semibold hover:bg-neutral-800 transition-all"
                                    >
                                        Explore
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Flipping Images Modal */}
            {flippingModalOpen && selectedCategoryForFlipping && (
                <FlippingImagesModal
                    category={selectedCategoryForFlipping}
                    allCategoryImages={getCategoryImages(selectedCategoryForFlipping.id)}
                    onClose={() => {
                        setFlippingModalOpen(false);
                        setSelectedCategoryForFlipping(null);
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
