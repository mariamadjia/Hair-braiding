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
  large = false,
  onChange,
}: {
  images: string[];
  token: string;
  categoryId?: number;
  subcategoryId?: number;
  serviceItemId?: number;
  large?: boolean;
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
                        <img src={url} alt={`photo ${i + 1}`} className={`${large ? "h-40 w-40 sm:h-48 sm:w-48" : "h-24 w-24"} rounded-xl border border-neutral-200 object-cover shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700`} />
                        <button 
                            type="button" 
                            onClick={() => remove(i)} 
                            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-sm text-white opacity-0 shadow-md transition-all hover:bg-neutral-700 group-hover:opacity-100"
                            title="Remove photo"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <label className={`${large ? "h-40 w-40 sm:h-48 sm:w-48" : "h-24 w-24"} group relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center transition-all hover:border-neutral-950 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-white dark:hover:bg-neutral-700`}>
                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-800/80 flex flex-col items-center justify-center rounded-lg">
                            <div className="mb-2 h-12 w-12 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent dark:border-white dark:border-t-transparent"></div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{uploadProgress}%</span>
                        </div>
                    )}
                    <div className="text-sm font-medium text-neutral-600 group-hover:text-neutral-950 dark:text-neutral-400 dark:group-hover:text-white">
                        {uploading ? "Compressing..." : <><span className="mb-2 block text-3xl font-light">+</span>Add Photo</>}
                    </div>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                </label>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        </div>
    );
}
