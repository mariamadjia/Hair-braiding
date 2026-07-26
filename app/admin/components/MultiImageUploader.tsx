"use client";

import { useState } from "react";
import { lbl, btnS } from "../constants";
import { uploadFile } from "../utils";
import { validateFile, validateFiles } from "../utils/fileValidation";
import { compressImages } from "../utils/imageCompression";

export function MultiImageUploader({
  images,
  token,
  categoryId,
  subcategoryId,
  serviceItemId,
  onChange,
}: {
  images: string[];
  token: string;
  categoryId?: number;
  subcategoryId?: number;
  serviceItemId?: number;
  onChange: (urls: string[]) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        
        // Validate all files before uploading
        const validation = validateFiles(files);
        if (!validation.valid) {
            setError(validation.errors.join('; '));
            return;
        }
        
        // Check if adding these files would exceed the limit (max 5 for categories)
        const maxPhotos = 5;
        if (images.length + files.length > maxPhotos) {
            setError(`Maximum ${maxPhotos} photos allowed. You currently have ${images.length} photos.`);
            return;
        }
        
        setUploading(true); setUploadProgress(0); setError("");
        try {
            // Compress images before uploading
            setUploadProgress(20);
            const compressedFiles = await compressImages(files, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.85,
                format: 'image/webp'
            });
            
            setUploadProgress(50);
            
            const urls: string[] = [];
            for (let i = 0; i < compressedFiles.length; i++) {
                const url = await uploadFile(compressedFiles[i], token, {
                    categoryId,
                    subcategoryId,
                    serviceItemId,
                });
                urls.push(url);
                setUploadProgress(50 + ((i + 1) / compressedFiles.length) * 50);
            }
            
            onChange([...images, ...urls]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            setUploadProgress(0);
            e.target.value = "";
        }
    };

    const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                {images.map((url, i) => (
                    <div key={i} className="relative shrink-0 group">
                        <img src={url} alt={`photo ${i + 1}`} className="h-24 w-24 object-cover border-2 border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm hover:shadow-md transition-shadow" />
                        <button 
                            type="button" 
                            onClick={() => remove(i)} 
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                            title="Remove photo"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <label className="cursor-pointer h-24 w-24 flex items-center justify-center text-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group relative">
                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-800/80 flex flex-col items-center justify-center rounded-lg">
                            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{uploadProgress}%</span>
                        </div>
                    )}
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                        {uploading ? "Compressing..." : "+ Add Photo"}
                    </div>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                </label>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        </div>
    );
}
