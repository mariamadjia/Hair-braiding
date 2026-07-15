"use client";

import { useState } from "react";
import type { LengthOption } from "@/lib/booking-types";
import { inp, lbl, btnS, btnD } from "../constants";
import { emptyLengthOption } from "../utils";
import { toProxyUrl } from "@/lib/utils/image";
import { galleryApi } from "@/lib/api/gallery";

export function LengthOptionsEditor({
    options,
    onChange,
    token,
    categoryId,
    subcategoryId,
    serviceItemId,
}: {
    options: LengthOption[];
    onChange: (opts: LengthOption[]) => void;
    token: string;
    categoryId?: number;
    subcategoryId?: number;
    serviceItemId?: number;
}) {
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const update = (i: number, field: keyof LengthOption, val: string) =>
        onChange(options.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));

    const handleImageUpload = async (i: number, file: File) => {
        if (!token) {
            setImageError("Your admin session expired. Please sign in again.");
            return;
        }

        setUploadingIndex(i);
        setImageError(null);

        try {
            const uploaded = await galleryApi.uploadImage({
                file,
                title: file.name,
                categoryId,
                subcategoryId,
                serviceItemId,
            });

            // Store the real backend/public image path, not a base64 data URL.
            update(i, "imageUrl", uploaded.imageUrl);
        } catch (error) {
            console.error("Failed to upload length option image:", error);
            setImageError(error instanceof Error ? error.message : "Failed to upload image.");
        } finally {
            setUploadingIndex(null);
        }
    };

    return (
        <div className="space-y-2">
            <p className={lbl}>Length Options</p>
            {imageError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">{imageError}</p>
            )}
            {options.map((opt, i) => (
                <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-2 bg-white dark:bg-neutral-900">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                        <input className={inp} placeholder="Name" value={opt.name ?? ""} onChange={(e) => update(i, "name", e.target.value)} />
                        <input className={inp} placeholder="Price" value={opt.price ?? ""} onChange={(e) => update(i, "price", e.target.value)} />
                        <input className={inp} placeholder="Notes" value={opt.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} />
                        <button type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))} className={btnD}>×</button>
                    </div>
                    <div className="flex items-center gap-3">
                        {opt.imageUrl && (
                            <img src={toProxyUrl(opt.imageUrl)} alt={opt.name || "Length option"} className="w-12 h-12 rounded object-cover border border-neutral-200 dark:border-neutral-700" />
                        )}
                        <label className={`cursor-pointer text-xs text-violet-600 dark:text-violet-400 hover:underline ${uploadingIndex === i ? "opacity-60 pointer-events-none" : ""}`}>
                            {uploadingIndex === i ? "Uploading…" : opt.imageUrl ? "Change image" : "Add image"}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingIndex !== null}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleImageUpload(i, file);
                                    e.currentTarget.value = "";
                                }}
                            />
                        </label>
                        {opt.imageUrl && (
                            <button
                                type="button"
                                onClick={() => update(i, "imageUrl", "")}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                                Remove image
                            </button>
                        )}
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...options, emptyLengthOption()])} className={btnS}>+ Length option</button>
        </div>
    );
}
