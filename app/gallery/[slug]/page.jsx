"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, Edit, Trash2, Plus } from 'lucide-react';

export default function CategoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [category, setCategory] = useState(null);
    const [subcategories, setSubcategories] = useState([]);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        loadCategoryData();
    }, [params.slug]);

    const loadCategoryData = async () => {
        try {
            // Fetch category by slug
            const categoryRes = await fetch(`http://localhost:8080/api/categories/slug/${params.slug}`);
            const categoryData = await categoryRes.json();
            setCategory(categoryData);

            // Fetch all images
            const imagesRes = await fetch('http://localhost:8080/api/gallery');
            const allImages = await imagesRes.json();

            // Filter images for this category
            const categoryImages = allImages.filter(img => img.categoryId === categoryData.id);
            setImages(categoryImages);

            // Group by subcategory
            const subMap = {};
            categoryImages.forEach(img => {
                if (img.subcategoryId) {
                    if (!subMap[img.subcategoryId]) {
                        subMap[img.subcategoryId] = {
                            id: img.subcategoryId,
                            name: img.subcategoryName,
                            images: []
                        };
                    }
                    subMap[img.subcategoryId].images.push(img);
                }
            });
            setSubcategories(Object.values(subMap));
            setLoading(false);
        } catch (error) {
            console.error('Failed to load category:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF5EE] flex items-center justify-center">
                <div className="text-neutral-600">Loading...</div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-screen bg-[#FFF5EE] flex items-center justify-center">
                <div className="text-neutral-600">Category not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFF5EE]">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        Back
                    </button>
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-neutral-900">
                                {category.name}
                            </h1>
                            <p className="text-neutral-600 mt-2">
                                {subcategories.length} subcategories • {images.length} images
                            </p>
                        </div>
                        
                        {/* Edit Mode Toggle (only show if admin) */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`px-4 py-2 rounded-sm transition-colors ${
                                isEditMode
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                            }`}
                        >
                            {isEditMode ? 'Done Editing' : 'Edit Mode'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Subcategories Grid */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="group relative">
                            {/* Edit Controls */}
                            {isEditMode && (
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <button
                                        onClick={() => {
                                            // TODO: Add edit subcategory logic
                                            alert('Edit subcategory: ' + subcategory.name);
                                        }}
                                        className="p-2 bg-white rounded-full shadow-lg hover:bg-neutral-100"
                                    >
                                        <Edit className="h-4 w-4 text-neutral-700" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            // TODO: Add delete subcategory logic
                                            if (confirm(`Delete ${subcategory.name}?`)) {
                                                alert('Delete subcategory: ' + subcategory.name);
                                            }
                                        }}
                                        className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </button>
                                </div>
                            )}

                            {/* Subcategory Card */}
                            <div className="border-2 border-black p-4 mb-3 hover:border-neutral-600 transition-colors">
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
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-2 text-neutral-900">
                                    {subcategory.name}
                                </h3>
                                <p className="text-xs text-neutral-600 mb-4">
                                    {subcategory.images.length} images
                                </p>
                                
                                {isEditMode ? (
                                    <button
                                        onClick={() => {
                                            // TODO: Navigate to image management
                                            router.push(`/admin/gallery/${category.id}/subcategory/${subcategory.id}`);
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-[0.15em] font-semibold hover:bg-neutral-800 transition-all"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Manage Images
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            // TODO: View subcategory images
                                            alert('View images for: ' + subcategory.name);
                                        }}
                                        className="inline-block px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-[0.15em] font-semibold hover:bg-neutral-800 transition-all"
                                    >
                                        View Images
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Subcategory Card (Edit Mode Only) */}
                    {isEditMode && (
                        <div className="group relative">
                            <div className="border-2 border-dashed border-neutral-300 p-4 mb-3 hover:border-neutral-600 transition-colors cursor-pointer"
                                onClick={() => {
                                    // TODO: Add new subcategory
                                    alert('Add new subcategory');
                                }}
                            >
                                <div className="aspect-[4/5] bg-neutral-100 flex items-center justify-center">
                                    <Plus className="h-12 w-12 text-neutral-400" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                                    Add Subcategory
                                </h3>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
