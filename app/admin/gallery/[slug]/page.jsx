"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Edit, EllipsisVertical, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config/api";
import { EditSubcategoryModal } from '../../components/EditSubcategoryModal';
import { CreateSubcategoryModal } from '../../components/CreateSubcategoryModal';

export default function AdminCategoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [category, setCategory] = useState(null);
    const [subcategories, setSubcategories] = useState([]);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const orderBeforeDrag = useRef([]);

    useEffect(() => {
        loadCategoryData();
    }, [params.slug]);

    const loadCategoryImagesInBackground = async (categoryId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/gallery/category/${categoryId}`
            );

            if (!response.ok) {
                throw new Error("Failed to load category gallery images");
            }

            const categoryImages = await response.json();

            setImages(categoryImages);

            setSubcategories((currentSubcategories) =>
                currentSubcategories.map((subcategory) => {
                    const subcategoryImages = categoryImages
                        .filter((image) => image.subcategoryId === subcategory.id)
                        .sort(
                            (a, b) =>
                                (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
                        );

                    return {
                        ...subcategory,
                        images: subcategoryImages,
                    };
                })
            );
        } catch (error) {
            console.error("Failed to load category gallery images:", error);
        }
    };

    const loadCategoryData = async () => {
        try {
            setLoading(true);
            setLoadError("");

            const categoryResponse = await fetch(
                `${API_BASE_URL}/api/categories/slug/${params.slug}`
            );

            if (!categoryResponse.ok) {
                throw new Error("Failed to load category");
            }

            const categoryData = await categoryResponse.json();

            const initialSubcategories = (categoryData.subcategories || [])
                .map((subcategory) => ({
                    id: subcategory.id,
                    name: subcategory.name,
                    slug: subcategory.slug,
                    image: subcategory.image || "",
                    displayOrder: subcategory.displayOrder ?? 0,

                    // Render immediately using subcategory.image.
                    // GalleryImage records load afterward in the background.
                    images: [],
                }))
                .sort(
                    (a, b) =>
                        (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
                );

            setCategory(categoryData);
            setSubcategories(initialSubcategories);

            // Start this request but do not make the whole page wait for it.
            void loadCategoryImagesInBackground(categoryData.id);
        } catch (error) {
            console.error("Failed to load category:", error);
            setLoadError("This gallery category could not be loaded.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubcategory = (subcategory) => {
        setEditingSubcategory({
            ...subcategory,
            images: subcategory.images ?? [],
        });
    };

    const handleDeleteSubcategory = async (subcategory) => {
        setOpenActionMenuId(null);
        if (!confirm(`Delete ${subcategory.name}? This will also delete all associated images.`)) return;
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/subcategories/${subcategory.id}`, {
                method: 'DELETE',
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!response.ok) throw new Error('Failed to delete subcategory');
            await loadCategoryData();
        } catch (error) {
            console.error('Failed to delete subcategory:', error);
            alert('Failed to delete subcategory. Please try again.');
        }
    };

    const getAuthToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        }
        return null;
    };

    const handleCreateSubcategory = async (name) => {
        try {
            const token = getAuthToken();
            
            // Create subcategory
            const response = await fetch(`${API_BASE_URL}/api/subcategories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    name,
                    categoryId: category.id
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create subcategory');
            }

            // Reload data
            await loadCategoryData();
            setIsCreatingNew(false);
        } catch (error) {
            console.error('Failed to create subcategory:', error);
            alert('Failed to create subcategory. Please try again.');
        }
    };

    const handleDragStart = (index) => {
        orderBeforeDrag.current = [...subcategories];
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newSubcategories = [...subcategories];
        const draggedItem = newSubcategories[draggedIndex];
        newSubcategories.splice(draggedIndex, 1);
        newSubcategories.splice(index, 0, draggedItem);
        
        setSubcategories(newSubcategories);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;
        
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/subcategories/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(subcategories.map((subcategory) => subcategory.id)),
            });
            if (!response.ok) throw new Error("Failed to save subcategory order");
            setStatusMessage("Subcategory order saved.");
        } catch (error) {
            console.error('Failed to update order:', error);
            setSubcategories(orderBeforeDrag.current);
            setStatusMessage("Order could not be saved. The previous order was restored.");
        }
        
        setDraggedIndex(null);
    };

    const moveSubcategory = async (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= subcategories.length) return;
        orderBeforeDrag.current = [...subcategories];
        const next = [...subcategories];
        [next[index], next[target]] = [next[target], next[index]];
        setSubcategories(next);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/subcategories/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(next.map((subcategory) => subcategory.id)),
            });
            if (!response.ok) throw new Error("Failed to save subcategory order");
            setStatusMessage(`${next[target].name} moved ${direction < 0 ? "up" : "down"}.`);
        } catch {
            setSubcategories(orderBeforeDrag.current);
            setStatusMessage("Order could not be saved. The previous order was restored.");
        }
    };

    const handleSaveSubcategory = async (
        name,
        imageIds,
        deletedImageIds
    ) => {
        if (!editingSubcategory) return;

        const token = getAuthToken();

        const authHeaders = token
            ? { Authorization: `Bearer ${token}` }
            : {};

        const jsonHeaders = {
            "Content-Type": "application/json",
            ...authHeaders,
        };

        try {
            const requests = [];

            if (name.trim() !== editingSubcategory.name.trim()) {
                requests.push(
                    fetch(
                        `${API_BASE_URL}/api/subcategories/${editingSubcategory.id}`,
                        {
                            method: "PUT",
                            headers: jsonHeaders,
                            body: JSON.stringify({ name: name.trim() }),
                        }
                    ).then((response) => {
                        if (!response.ok) {
                            throw new Error("Failed to update subcategory name.");
                        }
                    })
                );
            }

            for (const imageId of deletedImageIds) {
                requests.push(
                    fetch(`${API_BASE_URL}/api/gallery/${imageId}`, {
                        method: "DELETE",
                        headers: authHeaders,
                    }).then((response) => {
                        if (!response.ok) {
                            throw new Error("Failed to delete an image.");
                        }
                    })
                );
            }

            if (imageIds.length > 0) {
                requests.push(
                    fetch(`${API_BASE_URL}/api/gallery/reorder`, {
                        method: "POST",
                        headers: jsonHeaders,
                        body: JSON.stringify(imageIds),
                    }).then((response) => {
                        if (!response.ok) {
                            throw new Error("Failed to save image order.");
                        }
                    })
                );
            }

            await Promise.all(requests);

            const deletedIds = new Set(deletedImageIds);

            const reorderedImages = imageIds
                .map((imageId, index) => {
                    const image = images.find((item) => item.id === imageId);

                    return image
                        ? { ...image, displayOrder: index }
                        : null;
                })
                .filter(Boolean);

            setImages((currentImages) =>
                currentImages
                    .filter((image) => !deletedIds.has(image.id))
                    .map((image) => {
                        const reordered = reorderedImages.find(
                            (item) => item.id === image.id
                        );

                        return reordered ?? image;
                    })
            );

            setSubcategories((currentSubcategories) =>
                currentSubcategories.map((subcategory) => {
                    if (subcategory.id !== editingSubcategory.id) {
                        return subcategory;
                    }

                    return {
                        ...subcategory,
                        name: name.trim(),
                        images: reorderedImages,
                    };
                })
            );

            setEditingSubcategory(null);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
                <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
                <div className="text-center text-neutral-600 dark:text-neutral-400"><p>{loadError || "Category not found"}</p><button type="button" onClick={loadCategoryData} className="mt-4 underline">Retry</button></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <button
                        type="button"
                        onClick={() => router.push('/admin?section=gallery')}
                        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Gallery
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
                                {category.name}
                            </h1>
                            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                                {subcategories.length} subcategories • {images.length} uploaded Gallery images
                            </p>
                        </div>
                        
                        {/* Add Subcategory Button */}
                        <button
                            onClick={() => setIsCreatingNew(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Subcategory
                        </button>
                    </div>
                </div>
            </div>

            {/* Subcategories Grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-6 py-12">
                <p aria-live="polite" className="mb-4 min-h-5 text-sm text-neutral-600">{statusMessage}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {subcategories.map((subcategory, index) => (
                        <div 
                            key={subcategory.id} 
                            className={`group relative cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Edit Controls */}
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <button type="button" onClick={() => moveSubcategory(index, -1)} disabled={index === 0} className="p-2 bg-white rounded-full shadow disabled:opacity-30" aria-label={`Move ${subcategory.name} up`}><ArrowUp className="h-4 w-4" /></button>
                                <button type="button" onClick={() => moveSubcategory(index, 1)} disabled={index === subcategories.length - 1} className="p-2 bg-white rounded-full shadow disabled:opacity-30" aria-label={`Move ${subcategory.name} down`}><ArrowDown className="h-4 w-4" /></button>
                                <button
                                    onClick={() => handleEditSubcategory(subcategory)}
                                    className="p-2 bg-white dark:bg-neutral-700 rounded-full shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                >
                                    <Edit className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                                </button>
                                <div className="relative">
                                    <button
                                        type="button"
                                        aria-label={`Actions for ${subcategory.name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={openActionMenuId === subcategory.id}
                                        onClick={(event) => { event.stopPropagation(); setOpenActionMenuId(current => current === subcategory.id ? null : subcategory.id); }}
                                        className="rounded-full bg-white p-2 text-neutral-700 shadow-lg hover:bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                                    >
                                        <EllipsisVertical className="h-4 w-4" />
                                    </button>
                                    {openActionMenuId === subcategory.id && (
                                        <div role="menu" className="absolute right-0 top-11 z-20 min-w-32 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                                            <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); void handleDeleteSubcategory(subcategory); }} className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Subcategory Card */}
                            <div className="border-2 border-black dark:border-neutral-600 p-4 mb-3 hover:border-neutral-600 dark:hover:border-neutral-400 transition-colors">
                                <div className="aspect-[4/5] bg-neutral-200 overflow-hidden">
                                    {(() => {
                                        const cardImageUrl =
                                            subcategory.images?.[0]?.imageUrl ||
                                            subcategory.image ||
                                            "";

                                        return cardImageUrl ? (
                                            <img
                                                src={cardImageUrl}
                                                alt={subcategory.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                No images
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Subcategory Info */}
                            <div className="text-center">
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-2 text-neutral-900 dark:text-white">
                                    {subcategory.name}
                                </h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                                    {subcategory.images?.length || (subcategory.image ? 1 : 0)} images
                                </p>
                                
                                <button
                                    onClick={() => handleEditSubcategory(subcategory)}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-[0.15em] font-semibold hover:bg-neutral-800 transition-all"
                                >
                                    <Plus className="h-4 w-4" />
                                    Manage Images
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>

            {/* Edit Subcategory Modal */}
            {editingSubcategory && (
                <EditSubcategoryModal
                    subcategory={editingSubcategory}
                    categoryId={category.id}
                    onClose={() => setEditingSubcategory(null)}
                    onSave={handleSaveSubcategory}
                />
            )}

            {/* Create Subcategory Modal */}
            {isCreatingNew && (
                <CreateSubcategoryModal
                    categoryId={category.id}
                    onClose={() => setIsCreatingNew(false)}
                    onCreate={handleCreateSubcategory}
                />
            )}
        </div>
    );
}
