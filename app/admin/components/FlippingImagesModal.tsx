"use client";

import { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { GalleryImage } from "@/lib/api/gallery";
import { toProxyUrl } from "@/lib/utils/image";
import { ImageUploader } from "./ImageUploader";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";

interface FlippingImagesModalProps {
    category: {
        id: number;
        name: string;
        images?: string[];
    };
    allCategoryImages: GalleryImage[];
    fallbackImageUrls?: string[];
    onClose: () => void;
    onSave: (imageUrls: string[]) => void;
}

export function FlippingImagesModal({
  category,
  allCategoryImages,
  fallbackImageUrls = [],
  onClose,
  onSave,
}: FlippingImagesModalProps) {
    const [selectedImages, setSelectedImages] = useState<string[]>(category.images || []);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
    const [message, setMessage] = useState("");

    const MIN_IMAGES = 2;
    const MAX_IMAGES = 5;


    const handleRemove = (index: number) => {
        if (selectedImages.length <= MIN_IMAGES) {
            setMessage(`You need at least ${MIN_IMAGES} images for the flipping effect.`);
            return;
        }
        const newImages = selectedImages.filter((_, i) => i !== index);
        setSelectedImages(newImages);
    };

    const handleAddImage = (imageUrl: string) => {
        if (selectedImages.length >= MAX_IMAGES) {
            setMessage(`Maximum ${MAX_IMAGES} images allowed.`);
            return;
        }

        if (selectedImages.includes(imageUrl)) {
            setMessage("This image is already selected.");
            return;
        }

        setSelectedImages([...selectedImages, imageUrl]);
        setShowImagePicker(false);
    };

    const handleSave = async () => {
        if (selectedImages.length < MIN_IMAGES) {
            setMessage(`Please select at least ${MIN_IMAGES} images.`);
            return;
        }
        setSaving(true);
        try {
            await onSave(selectedImages);
        } finally {
            setSaving(false);
        }
    };

    const allSelectableImageUrls = Array.from(
        new Set([
            ...fallbackImageUrls,
            ...allCategoryImages.map((image) => image.imageUrl),
            ...uploadedImageUrls,
        ])
    );

    const availableImages = allSelectableImageUrls.filter(
        (imageUrl) => !selectedImages.includes(imageUrl)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="flipping-images-title">
            <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col rounded-t-2xl bg-white sm:my-8 sm:max-h-[90vh] sm:rounded-lg">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-white">
                    <div>
                        <h3 id="flipping-images-title" className="text-lg font-semibold text-neutral-900">
                            {category.name} - Flipping Images
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Drag to reorder • Min {MIN_IMAGES}, Max {MAX_IMAGES} images • Currently: {selectedImages.length}/{MAX_IMAGES}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                        aria-label="Close rotating images editor"
                    >
                        <X className="h-5 w-5 text-neutral-600" />
                    </button>
                </div>

                {/* Selected Images Grid */}
                <div className="p-6 overflow-y-auto flex-1">
                    <p aria-live="polite" className="mb-3 min-h-5 text-sm text-amber-800">{message}</p>
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
                            <SortableList items={selectedImages} getId={imageUrl => imageUrl} getLabel={() => "Image"} onReorder={setSelectedImages} strategy="grid" ariaLabel="Flipping images order" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4" itemClassName={(_, __, dragging) => `relative group border-2 rounded-lg overflow-hidden transition-all ${dragging ? 'border-neutral-900 opacity-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
                                {(imageUrl, index) => (<>
                                        {/* Drag Handle */}
                                        <SortableHandle className="absolute left-2 top-2 z-10 flex h-10 w-10 items-center justify-center bg-white shadow-sm" />

                                        {/* Order Badge */}
                                        <div className="absolute top-2 right-2 z-10 bg-neutral-900 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center">
                                            {index + 1}
                                        </div>

                                        {/* Image */}
                                        <div className="aspect-square bg-neutral-100">
                                            <img
                                                src={toProxyUrl(imageUrl)}
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
                                            aria-label={`Remove image ${index + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                </>)}
                            </SortableList>
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
                                    Select from Category Photos ({availableImages.length} available)
                                </h4>
                                <button
                                    onClick={() => setShowImagePicker(false)}
                                    className="text-sm text-neutral-600 hover:text-neutral-900"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="mb-5">
                                <ImageUploader
                                    categoryId={category.id}
                                    onChange={(imageUrl) => {
                                        setUploadedImageUrls((current) => [...current, imageUrl]);
                                        if (selectedImages.length < MAX_IMAGES) {
                                            setSelectedImages((current) => [...current, imageUrl]);
                                            setShowImagePicker(false);
                                            setMessage("Image uploaded and added.");
                                        } else {
                                            setMessage("Image uploaded. Remove a selected image before adding it.");
                                        }
                                    }}
                                />
                            </div>
                            
                            {availableImages.length === 0 ? (
                                <p className="text-center py-8 text-neutral-500">
                                    All images from this category are already selected
                                </p>
                            ) : (
                                <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                    {availableImages.map((imageUrl) => (
                                        <button
                                            key={imageUrl}
                                            onClick={() => handleAddImage(imageUrl)}
                                            className="aspect-square bg-neutral-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-neutral-900 transition-all"
                                        >
                                            <img
                                                src={toProxyUrl(imageUrl)}
                                                alt="Category image"
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Gallery keeps its original local footer behavior. */}
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
                            disabled={selectedImages.length < MIN_IMAGES || saving}
                            className="px-4 py-2 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
