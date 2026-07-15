"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { LengthOptionsEditor } from "./LengthOptionsEditor";
import { toProxyUrl } from "@/lib/utils/image";
import { Plus, X } from "lucide-react";
import { uploadFile } from "../utils";

export function ItemForm({
  initial,
  token,
  categoryId,
  subcategoryId,
  onSave,
  onCancel,
}: {
  initial: BookingItem;
  token: string;
  categoryId?: number;
  subcategoryId?: number;
  onSave: (item: BookingItem) => void;
  onCancel: () => void;
}) {
    const [item, setItem] = useState<BookingItem>(initial);

    useEffect(() => {
        setItem(initial);
    }, [initial.id, initial.name]);

    const set = (field: keyof BookingItem, val: unknown) => setItem((prev) => ({ ...prev, [field]: val }));

    const rawImages = item.images?.length ? item.images : item.image ? [item.image] : [];
    const displayImages = rawImages.map(toProxyUrl).filter(Boolean);
    const setImages = (urls: string[]) => setItem((prev) => ({ ...prev, images: urls, image: urls[0] ?? "" }));

    const rawSizePhotos = item.sizePhotos ?? [];
    const displaySizePhotos = rawSizePhotos.map(toProxyUrl).filter(Boolean);
    const setSizePhotos = (urls: string[]) => setItem((prev) => ({ ...prev, sizePhotos: urls }));

    const [uploadingSizePhotos, setUploadingSizePhotos] = useState(false);

    const handleSizePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setUploadingSizePhotos(true);
        try {
            const uploadedUrls = await Promise.all(
                Array.from(files).map((file) =>
                    uploadFile(file, token, {
                        categoryId,
                        subcategoryId,
                        serviceItemId: item.id,
                    })
                )
            );
            setSizePhotos([...rawSizePhotos, ...uploadedUrls]);
        } catch (error) {
            console.error("Failed to upload size photos:", error);
            alert("Failed to upload size photos. Please try again.");
        } finally {
            setUploadingSizePhotos(false);
            e.target.value = "";
        }
    };

    const removeSizePhoto = (index: number) => {
        setSizePhotos(rawSizePhotos.filter((_, i) => i !== index));
    };

    return (
        <div className="border border-neutral-200 rounded-sm p-3 space-y-2.5 bg-neutral-50">
            <div><label className={lbl}>Size *</label><input className={inp} value={item.name} onChange={(e) => set("name", e.target.value)} /></div>
            <MultiImageUploader
                images={displayImages}
                token={token}
                categoryId={categoryId}
                subcategoryId={subcategoryId}
                serviceItemId={item.id}
                onChange={setImages}
            />
            <div>
                <label className={lbl}>Photos for this size</label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <label className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-dashed ${uploadingSizePhotos ? 'border-neutral-300 text-neutral-400 cursor-not-allowed' : 'border-violet-300 text-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30'}`}>
                        {uploadingSizePhotos ? (
                            <span className="text-xs">...</span>
                        ) : (
                            <Plus className="h-5 w-5" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleSizePhotoUpload}
                            disabled={uploadingSizePhotos}
                        />
                    </label>
                    {displaySizePhotos.slice(0, 3).map((photo, index) => (
                        <div key={index} className="relative group">
                            <img src={photo} alt="" className="h-10 w-10 rounded-md border border-neutral-200 object-cover dark:border-neutral-700" />
                            <button
                                type="button"
                                onClick={() => removeSizePhoto(index)}
                                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-white opacity-0 group-hover:opacity-100"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {displaySizePhotos.length > 3 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            +{displaySizePhotos.length - 3}
                        </span>
                    )}
                </div>
            </div>
            <LengthOptionsEditor
                options={item.lengthOptions ?? []}
                onChange={(opts) => set("lengthOptions", opts)}
            />
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => {
                    console.log("Saving item:", item);
                    onSave(item);
                }} className={btnP} disabled={!item.name.trim()}>Save</button>
                <button type="button" onClick={onCancel} className={btnS}>Cancel</button>
            </div>
        </div>
    );
}
