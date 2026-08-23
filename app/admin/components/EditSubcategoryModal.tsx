"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Plus, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { API_BASE_URL } from '@/lib/config/api';
import { GalleryImage } from "@/lib/api/gallery";
import { validateFile, formatFileSize } from "../utils/fileValidation";
import { compressImages } from "../utils/imageCompression";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";

interface EditSubcategoryModalProps {
    subcategory: {
        id: number;
        name: string;
        image?: string;
        images?: GalleryImage[];
    };
    categoryId: number;
    onClose: () => void;
    onSave: (
        name: string,
        imageIds: number[],
        deletedImageIds: number[]
    ) => Promise<void>;
}

export function EditSubcategoryModal({ subcategory, categoryId, onClose, onSave }: EditSubcategoryModalProps) {
    const [name, setName] = useState(subcategory.name);
    const [images, setImages] = useState<GalleryImage[]>(
        () => subcategory.images ?? []
    );
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loadingImages, setLoadingImages] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    // Unsaved changes protection
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [dirty]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dirty]);

    const handleClose = () => {
        if (dirty && !confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        onClose();
    };

    useEffect(() => {
        let cancelled = false;

        const loadSubcategoryImages = async () => {
            setName(subcategory.name);
            setDeletedImageIds([]);
            setImages(subcategory.images ?? []);
            setLoadingImages(true);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/gallery/subcategory/${subcategory.id}`
                );

                if (!response.ok) {
                    throw new Error("Failed to load subcategory images");
                }

                let data: GalleryImage[] = await response.json();
                data = Array.isArray(data) ? data : [];

                // If no gallery records exist but the subcategory has a raw image URL,
                // register it as a gallery record so it appears in the modal.
                if (data.length === 0 && subcategory.image) {
                    try {
                        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                        const registerRes = await fetch(`${API_BASE_URL}/api/gallery/register-url`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                                imageUrl: subcategory.image,
                                title: subcategory.name,
                                subcategoryId: subcategory.id,
                                categoryId,
                            }),
                        });
                        if (registerRes.ok) {
                            const registered = await registerRes.json();
                            data = [registered];
                        }
                    } catch (regErr) {
                        console.error("Failed to register existing subcategory image:", regErr);
                    }
                }

                if (!cancelled) {
                    setImages(data);
                }
            } catch (error) {
                console.error(
                    "Failed to load subcategory gallery images:",
                    error
                );
            } finally {
                if (!cancelled) {
                    setLoadingImages(false);
                }
            }
        };

        loadSubcategoryImages();

        return () => {
            cancelled = true;
        };
    }, [subcategory.id]);

    const handleDelete = (index: number) => {
        if (images.length <= 1) {
            setError("Subcategory must have at least 1 image");
            return;
        }
        
        if (confirm('Are you sure you want to delete this image?')) {
            const imageToDelete = images[index];
            setDeletedImageIds(prev => [...prev, imageToDelete.id]);
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
            setDirty(true);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Validate all files before uploading
        const validationErrors: string[] = [];
        const validFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = validateFile(file);
            if (!result.valid) {
                validationErrors.push(`${file.name}: ${result.error}`);
            } else {
                validFiles.push(file);
            }
        }

        if (validationErrors.length > 0) {
            setError(validationErrors.join('; '));
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            
            // Compress images before uploading
            setUploadProgress(20);
            const compressedFiles = await compressImages(validFiles, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.85,
                format: 'image/webp'
            });
            
            setUploadProgress(50);
            
            for (let i = 0; i < compressedFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', compressedFiles[i]);
                formData.append('categoryId', categoryId.toString());
                formData.append('subcategoryId', subcategory.id.toString());
                formData.append('title', compressedFiles[i].name);

                const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload ${compressedFiles[i].name}`);
                }

                const uploadedImage = await response.json();
                setImages(prev => [...prev, uploadedImage]);
                setUploadProgress(50 + ((i + 1) / compressedFiles.length) * 50);
            }
            setSuccess(`${compressedFiles.length} image${compressedFiles.length > 1 ? 's' : ''} uploaded successfully`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Upload failed:', error);
            setError(error instanceof Error ? error.message : "Failed to upload images. Please try again.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleSave = async () => {
        if (saving) return;

        if (!name.trim()) {
            setError("Subcategory name is required");
            return;
        }

        if (images.length < 1) {
            setError("Subcategory must have at least 1 image");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const imageIds = images.map((image) => image.id);

            await onSave(
                name.trim(),
                imageIds,
                deletedImageIds
            );
            
            setSuccess("Subcategory updated successfully!");
            setTimeout(() => setSuccess(null), 3000);
            setDirty(false);
        } catch (error) {
            console.error("Failed to save subcategory:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to save changes. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between shrink-0 bg-white dark:bg-neutral-900">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Edit Subcategory - {subcategory.name}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Update subcategory name and manage images
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm mx-6 mt-4">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
                    </div>
                )}

                {/* Success Banner */}
                {success && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm text-green-700 dark:text-green-300 text-sm mx-6 mt-4">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{success}</span>
                        <button type="button" onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">×</button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Subcategory Name */}
                    <div className="mb-8">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Subcategory Name *
                        </h4>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setDirty(true); setError(null); }}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-white"
                            placeholder="Enter subcategory name"
                        />
                        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                            Choose a clear, descriptive name for your subcategory (e.g., "Small", "Medium", "Large")
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-neutral-200 dark:border-neutral-700 mb-6"></div>

                    {/* Images Section */}
                    <div>
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                            Images ({loadingImages ? "..." : images.length})
                        </h4>

                        {/* Images Grid */}
                        {loadingImages ? (
                            <div className="mb-6 flex min-h-48 items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                                <p className="text-neutral-500 dark:text-neutral-400">Loading images...</p>
                            </div>
                        ) : images.length > 0 ? (
                            <SortableList items={images} getId={image => image.id} getLabel={image => image.title || "Image"} onReorder={(next) => { setImages(next); setDirty(true); }} strategy="grid" ariaLabel="Style images order" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6" itemClassName={(_, __, dragging) => `relative group border-2 rounded-sm overflow-hidden ${dragging ? 'border-neutral-900 dark:border-neutral-400 opacity-50' : 'border-neutral-200 dark:border-neutral-700'}`}>
                                {(image, index) => (<>
                                        {/* Drag Handle */}
                                        <SortableHandle className="absolute left-2 top-2 z-10 flex h-10 w-10 items-center justify-center bg-white/90 shadow-sm dark:bg-neutral-800/90" />

                                        {/* Image */}
                                        <div className="aspect-square bg-neutral-100 dark:bg-neutral-800">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(index)}
                                            disabled={saving}
                                            className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                </>)}
                            </SortableList>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg mb-6">
                                <p className="text-neutral-500 dark:text-neutral-400">No images yet</p>
                            </div>
                        )}

                        {/* Upload Section */}
                        <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors relative">
                            {uploading && (
                                <div className="absolute inset-0 bg-white/90 dark:bg-neutral-900/90 flex flex-col items-center justify-center rounded-lg z-10">
                                    <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {uploadProgress < 50 ? 'Compressing...' : 'Uploading...'}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{uploadProgress}%</p>
                                </div>
                            )}
                            <input
                                type="file"
                                id="image-upload"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading || saving}
                            />
                            <label
                                htmlFor="image-upload"
                                className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Upload className="h-8 w-8 text-neutral-400 dark:text-neutral-500 mb-2" />
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    {uploading ? 'Processing...' : '+ Upload New Images'}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Drag & drop or click to browse
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                    Max 5MB per file • JPG, PNG, WebP
                                </p>
                            </label>
                        </div>

                        {/* Info */}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4 flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-center text-[10px] leading-4">ⓘ</span>
                            Drag images to reorder • Click trash to delete
                        </p>
                    </div>
                </div>

                {/* Gallery keeps its original local footer behavior. */}
                <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {!name.trim() && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                                ⚠️ Subcategory name is required
                            </span>
                        )}
                        {images.length < 1 && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                                ⚠️ At least 1 image is required
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!name.trim() || images.length < 1 || uploading || saving || loadingImages}
                            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
