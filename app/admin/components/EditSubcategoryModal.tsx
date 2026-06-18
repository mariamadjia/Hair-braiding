"use client";

import { useState, useEffect } from "react";
import { X, GripVertical, Trash2, Plus, Upload } from "lucide-react";
import { API_BASE_URL } from '@/lib/config/api';
import { GalleryImage } from "@/lib/api/gallery";

interface EditSubcategoryModalProps {
    subcategory: {
        id: number;
        name: string;
        images: GalleryImage[];
    };
    categoryId: number;
    onClose: () => void;
    onSave: (name: string, imageIds: number[], deletedImageIds: number[]) => void;
}

export function EditSubcategoryModal({ subcategory, categoryId, onClose, onSave }: EditSubcategoryModalProps) {
    const [name, setName] = useState(subcategory.name);
    const [images, setImages] = useState<GalleryImage[]>(subcategory.images);
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newImages = [...images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);
        
        setImages(newImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleDelete = (index: number) => {
        if (images.length <= 1) {
            alert('Subcategory must have at least 1 image');
            return;
        }
        
        if (confirm('Are you sure you want to delete this image?')) {
            const imageToDelete = images[index];
            setDeletedImageIds(prev => [...prev, imageToDelete.id]);
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('auth_token');
            
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('categoryId', categoryId.toString());
                formData.append('subcategoryId', subcategory.id.toString());
                formData.append('title', files[i].name);

                const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const uploadedImage = await response.json();
                setImages(prev => [...prev, uploadedImage]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload images. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert('Subcategory name is required');
            return;
        }
        
        if (images.length < 1) {
            alert('Subcategory must have at least 1 image');
            return;
        }
        
        const imageIds = images.map(img => img.id);
        onSave(name.trim(), imageIds, deletedImageIds);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-white">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                            Edit Subcategory - {subcategory.name}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Update subcategory name and manage images
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-neutral-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Subcategory Name */}
                    <div className="mb-8">
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">
                            Subcategory Name *
                        </h4>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            placeholder="Enter subcategory name"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-neutral-200 mb-6"></div>

                    {/* Images Section */}
                    <div>
                        <h4 className="text-sm font-medium text-neutral-700 mb-4">
                            Images ({images.length})
                        </h4>

                        {/* Images Grid */}
                        {images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                                {images.map((image, index) => (
                                    <div
                                        key={image.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`relative group cursor-move border-2 rounded-sm overflow-hidden ${
                                            draggedIndex === index ? 'border-neutral-900 opacity-50' : 'border-neutral-200'
                                        }`}
                                    >
                                        {/* Drag Handle */}
                                        <div className="absolute top-2 left-2 bg-white/90 rounded p-1 shadow-sm">
                                            <GripVertical className="h-4 w-4 text-neutral-600" />
                                        </div>

                                        {/* Image */}
                                        <div className="aspect-square bg-neutral-100">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-neutral-300 rounded-lg mb-6">
                                <p className="text-neutral-500">No images yet</p>
                            </div>
                        )}

                        {/* Upload Section */}
                        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
                            <input
                                type="file"
                                id="image-upload"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="image-upload"
                                className="cursor-pointer flex flex-col items-center"
                            >
                                <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                                <p className="text-sm font-medium text-neutral-700 mb-1">
                                    {uploading ? 'Uploading...' : '+ Upload New Images'}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    Drag & drop or click to browse
                                </p>
                            </label>
                        </div>

                        {/* Info */}
                        <p className="text-xs text-neutral-500 mt-4 flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded-full bg-neutral-200 text-center text-[10px] leading-4">ⓘ</span>
                            Drag images to reorder • Click trash to delete
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
                    <div className="text-sm text-neutral-600">
                        {!name.trim() && (
                            <span className="text-red-600 font-medium">
                                ⚠️ Subcategory name is required
                            </span>
                        )}
                        {images.length < 1 && (
                            <span className="text-red-600 font-medium">
                                ⚠️ At least 1 image is required
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-sm hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || images.length < 1 || uploading}
                            className="px-4 py-2 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
