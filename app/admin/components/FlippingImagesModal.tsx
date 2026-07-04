"use client";

import { useState, useEffect } from "react";
import { X, GripVertical, Trash2, Plus } from "lucide-react";
import { GalleryImage } from "@/lib/api/gallery";

interface FlippingImagesModalProps {
    category: {
        id: number;
        name: string;
        images?: string[];
    };
    allCategoryImages: GalleryImage[];
    onClose: () => void;
    onSave: (imageUrls: string[]) => void;
}

export function FlippingImagesModal({ category, allCategoryImages, onClose, onSave }: FlippingImagesModalProps) {
    const [selectedImages, setSelectedImages] = useState<string[]>(category.images || []);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [showImagePicker, setShowImagePicker] = useState(false);

    const MIN_IMAGES = 2;
    const MAX_IMAGES = 5;

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newImages = [...selectedImages];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);
        
        setSelectedImages(newImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleRemove = (index: number) => {
        if (selectedImages.length <= MIN_IMAGES) {
            alert(`You need at least ${MIN_IMAGES} images for the flipping effect.`);
            return;
        }
        const newImages = selectedImages.filter((_, i) => i !== index);
        setSelectedImages(newImages);
    };

    const handleAddImage = (imageUrl: string) => {
        if (selectedImages.length >= MAX_IMAGES) {
            alert(`Maximum ${MAX_IMAGES} images allowed.`);
            return;
        }
        if (selectedImages.includes(imageUrl)) {
            alert("This image is already selected.");
            return;
        }
        setSelectedImages([...selectedImages, imageUrl]);
        setShowImagePicker(false);
    };

    const handleSave = () => {
        if (selectedImages.length < MIN_IMAGES) {
            alert(`Please select at least ${MIN_IMAGES} images.`);
            return;
        }
        onSave(selectedImages);
    };

    const availableImages = allCategoryImages.filter(
        img => !selectedImages.includes(img.imageUrl)
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-white">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                            {category.name} - Flipping Images
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Drag to reorder • Min {MIN_IMAGES}, Max {MAX_IMAGES} images • Currently: {selectedImages.length}/{MAX_IMAGES}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-neutral-600" />
                    </button>
                </div>

                {/* Selected Images Grid */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-neutral-700 mb-4">
                            Selected Images ({selectedImages.length})
                        </h4>
                        
                        {selectedImages.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-neutral-300 rounded-lg">
                                <p className="text-neutral-500 mb-4">No images selected</p>
                                <button
                                    onClick={() => setShowImagePicker(true)}
                                    className="px-4 py-2 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800"
                                >
                                    Add Images
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {selectedImages.map((imageUrl, index) => (
                                    <div
                                        key={index}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`relative group cursor-move border-2 rounded-lg overflow-hidden transition-all ${
                                            draggedIndex === index
                                                ? 'border-neutral-900 opacity-50'
                                                : 'border-neutral-200 hover:border-neutral-400'
                                        }`}
                                    >
                                        {/* Drag Handle */}
                                        <div className="absolute top-2 left-2 z-10 bg-white rounded p-1 shadow-sm">
                                            <GripVertical className="h-4 w-4 text-neutral-600" />
                                        </div>

                                        {/* Order Badge */}
                                        <div className="absolute top-2 right-2 z-10 bg-neutral-900 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center">
                                            {index + 1}
                                        </div>

                                        {/* Image */}
                                        <div className="aspect-square bg-neutral-100">
                                            <img
                                                src={imageUrl}
                                                alt={`Image ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleRemove(index)}
                                            disabled={selectedImages.length <= MIN_IMAGES}
                                            className={`absolute bottom-2 right-2 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                                                selectedImages.length <= MIN_IMAGES
                                                    ? 'bg-neutral-300 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                            }`}
                                            title={selectedImages.length <= MIN_IMAGES ? `Minimum ${MIN_IMAGES} images required` : 'Remove'}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Image Button */}
                    {selectedImages.length < MAX_IMAGES && (
                        <button
                            onClick={() => setShowImagePicker(true)}
                            className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors flex items-center justify-center gap-2 text-neutral-600 hover:text-neutral-900"
                        >
                            <Plus className="h-5 w-5" />
                            Add Image ({selectedImages.length}/{MAX_IMAGES})
                        </button>
                    )}

                    {/* Image Picker */}
                    {showImagePicker && (
                        <div className="mt-6 border-t border-neutral-200 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium text-neutral-700">
                                    Select from Category Images ({availableImages.length} available)
                                </h4>
                                <button
                                    onClick={() => setShowImagePicker(false)}
                                    className="text-sm text-neutral-600 hover:text-neutral-900"
                                >
                                    Cancel
                                </button>
                            </div>
                            
                            {availableImages.length === 0 ? (
                                <p className="text-center py-8 text-neutral-500">
                                    All images from this category are already selected
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                                    {availableImages.map((image) => (
                                        <button
                                            key={image.id}
                                            onClick={() => handleAddImage(image.imageUrl)}
                                            className="aspect-square bg-neutral-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-neutral-900 transition-all"
                                        >
                                            <img
                                                src={image.imageUrl}
                                                alt={image.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
                    <div className="text-sm text-neutral-600">
                        {selectedImages.length < MIN_IMAGES && (
                            <span className="text-red-600 font-medium">
                                ⚠️ Select at least {MIN_IMAGES} images
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-sm hover:bg-neutral-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={selectedImages.length < MIN_IMAGES}
                            className="px-4 py-2 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
