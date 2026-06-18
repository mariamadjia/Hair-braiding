"use client";

import { useState } from "react";
import { lbl, btnS } from "../constants";
import { uploadFile } from "../utils";

export function ImageUploader({ value, token, onChange }: { value?: string; token: string; onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true); setError("");
        try { onChange(await uploadFile(file, token)); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : "Upload failed"); }
        finally { setUploading(false); }
    };

    return (
        <div className="space-y-2">
            <label className={lbl}>Photo</label>
            <div className="flex gap-3 items-start">
                {value && (
                    <div className="relative shrink-0">
                        <img src={value} alt="preview" className="h-20 w-20 object-cover border border-neutral-200 rounded-sm" />
                        <button type="button" onClick={() => onChange("")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center">×</button>
                    </div>
                )}
                <label className={`${btnS} cursor-pointer`}>
                    {uploading ? "Uploading…" : value ? "Replace" : "Upload photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                </label>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
