"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, Edit, Trash2, Plus } from 'lucide-react';
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
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadCategoryData();
    }, [params.slug]);

    const loadCategoryData = async () => {
        try {
            // Fetch category by slug (includes subcategories)
            const categoryRes = await fetch(`http://localhost:8080/api/categories/slug/${params.slug}`);
            const categoryData = await categoryRes.json();
            setCategory(categoryData);

            // Fetch all gallery images
            const imagesRes = await fetch('http://localhost:8080/api/gallery');
            const allImages = await imagesRes.json();

            // Filter images for this category
            const categoryImages = allImages.filter(img => img.categoryId === categoryData.id);
            setImages(categoryImages);

            // Use actual subcategories from category data, enhanced with gallery images
            const subcategoriesWithImages = (categoryData.subcategories || []).map(sub => {
                // Find gallery images for this subcategory and sort by displayOrder
                const subImages = categoryImages
                    .filter(img => img.subcategoryId === sub.id)
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                
                return {
                    id: sub.id,
                    name: sub.name,
                    slug: sub.slug,
                    image: sub.image,
                    displayOrder: sub.displayOrder || 0,
                    images: subImages
                };
            });
            
            // Sort by displayOrder (null values go to end, then sort by ID)
            const sortedSubcategories = subcategoriesWithImages.sort((a, b) => {
                if (a.displayOrder === null && b.displayOrder === null) return a.id - b.id;
                if (a.displayOrder === null) return 1;
                if (b.displayOrder === null) return -1;
                return a.displayOrder - b.displayOrder;
            });
            
            setSubcategories(sortedSubcategories);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load category:', error);
            setLoading(false);
        }
    };

    const handleEditSubcategory = (subcategory) => {
        setEditingSubcategory(subcategory);
    };

    const handleCreateSubcategory = async (name) => {
        try {
            const token = localStorage.getItem('auth_token');
            
            // Create subcategory
            const response = await fetch('http://localhost:8080/api/subcategories', {
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
            const token = localStorage.getItem('auth_token');
            
            // Update display order for all subcategories
            for (let i = 0; i < subcategories.length; i++) {
                await fetch(`http://localhost:8080/api/subcategories/${subcategories[i].id}`, {
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

    const handleSaveSubcategory = async (name, imageIds, deletedImageIds) => {
        try {
            const token = localStorage.getItem('auth_token');
            
            // Update subcategory name
            const updateResponse = await fetch(`http://localhost:8080/api/subcategories/${editingSubcategory.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ name }),
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update subcategory');
            }

            // Delete removed images
            for (const imageId of deletedImageIds) {
                await fetch(`http://localhost:8080/api/gallery/${imageId}`, {
                    method: 'DELETE',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
            }

            // Update image display orders
            for (let i = 0; i < imageIds.length; i++) {
                await fetch(`http://localhost:8080/api/gallery/${imageIds[i]}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ displayOrder: i }),
                });
            }
            
            // Reload data
            await loadCategoryData();
            setEditingSubcategory(null);
        } catch (error) {
            console.error('Failed to save subcategory:', error);
            alert('Failed to save changes. Please try again.');
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
                <div className="text-neutral-600 dark:text-neutral-400">Category not found</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
                                {category.name}
                            </h1>
                            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                                {subcategories.length} subcategories • {images.length} images
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
                                <button
                                    onClick={() => handleEditSubcategory(subcategory)}
                                    className="p-2 bg-white dark:bg-neutral-700 rounded-full shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                >
                                    <Edit className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm(`Delete ${subcategory.name}? This will also delete all associated images.`)) {
                                            try {
                                                const token = localStorage.getItem('auth_token');
                                                const response = await fetch(`http://localhost:8080/api/subcategories/${subcategory.id}`, {
                                                    method: 'DELETE',
                                                    headers: {
                                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                    },
                                                });
                                                
                                                if (!response.ok) {
                                                    throw new Error('Failed to delete subcategory');
                                                }
                                                
                                                await loadCategoryData();
                                            } catch (error) {
                                                console.error('Failed to delete subcategory:', error);
                                                alert('Failed to delete subcategory. Please try again.');
                                            }
                                        }
                                    }}
                                    className="p-2 bg-white dark:bg-neutral-700 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900"
                                >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                            </div>

                            {/* Subcategory Card */}
                            <div className="border-2 border-black dark:border-neutral-600 p-4 mb-3 hover:border-neutral-600 dark:hover:border-neutral-400 transition-colors">
                                <div className="aspect-[4/5] bg-neutral-200 overflow-hidden">
                                    {subcategory.images[0] ? (
                                        <img
                                            src={subcategory.images[0].imageUrl}
                                            alt={subcategory.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                            No images
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Subcategory Info */}
                            <div className="text-center">
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-2 text-neutral-900 dark:text-white">
                                    {subcategory.name}
                                </h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                                    {subcategory.images.length} images
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
