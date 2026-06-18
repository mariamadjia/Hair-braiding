"use client";

import { useState } from "react";
import { lbl, btnS } from "../constants";
import { uploadFile } from "../utils";

export function MultiImageUploader({ images, token, onChange }: { images: string[]; token: string; onChange: (urls: string[]) => void }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setUploading(true); setError("");
        try {
            const urls = await Promise.all(files.map((f) => uploadFile(f, token)));
            onChange([...images, ...urls]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
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
                <label className="cursor-pointer h-24 w-24 flex items-center justify-center text-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                        {uploading ? "Uploading..." : "+ Add Photo"}
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                </label>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        </div>
    );
}
