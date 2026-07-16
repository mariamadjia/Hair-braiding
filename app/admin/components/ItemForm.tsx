"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { LengthOptionsEditor } from "./LengthOptionsEditor";
import { toProxyUrl } from "@/lib/utils/image";
import { Plus, X, AlertCircle, CheckCircle } from "lucide-react";
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
            if (e.key === 'Enter' && !e.shiftKey && !dirty) {
                e.preventDefault();
                onSave(item);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, dirty, onSave]);

    const handleCancel = () => {
        if (dirty && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
            return;
        }
        onCancel();
    };

    useEffect(() => {
        setItem(initial);
    }, [initial.id, initial.name]);

    const set = (field: keyof BookingItem, val: unknown) => setItem((prev) => ({ ...prev, [field]: val }));

    const [uploadingSizePhotos, setUploadingSizePhotos] = useState(false);
    const rawSizePhotos = item.sizePhotos ?? [];
    const displaySizePhotos = rawSizePhotos.map(toProxyUrl).filter(Boolean);

    const handleSizePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setUploadingSizePhotos(true);
        try {
            const uploadedUrls = await Promise.all(
                Array.from(files).map((file) =>
                    uploadFile(file, token, {
                        // Don't pass any relationship parameters to prevent gallery association
                        // No categoryId, subcategoryId, or serviceItemId
                    }, true) // Use simple upload for size photos (not gallery)
                )
            );
            // Only store in sizePhotos, ensure images/image are not affected
            setItem((prev) => ({ 
                ...prev, 
                sizePhotos: [...rawSizePhotos, ...uploadedUrls]
            }));
            setDirty(true);
        } catch (error) {
            console.error("Failed to upload size photos:", error);
            setError("Failed to upload size photos. Please try again.");
        } finally {
            setUploadingSizePhotos(false);
            e.target.value = "";
        }
    };

    const removeSizePhoto = (index: number) => {
        setItem((prev) => ({ ...prev, sizePhotos: rawSizePhotos.filter((_, i) => i !== index) }));
        setDirty(true);
    };

    return (
        <div className="border border-neutral-200 rounded-sm p-3 space-y-2.5 bg-neutral-50">
            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-xs">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                </div>
            )}

            {/* Success Banner */}
            {success && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm text-green-700 dark:text-green-300 text-xs">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="flex-1">{success}</span>
                    <button type="button" onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 text-xs">×</button>
                </div>
            )}

            <div><label className={lbl}>Size *</label><input className={inp} value={item.name} onChange={(e) => { set("name", e.target.value); setDirty(true); setError(null); }} />
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                Enter the size name (e.g., "Small", "Medium", "Large")
            </p>
            </div>
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
                onChange={(opts) => { set("lengthOptions", opts); setDirty(true); setError(null); }}
            />
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => {
                    console.log("Saving item:", item);
                    setError(null);
                    // Only send sizePhotos, not images/image to prevent gallery/cover issues
                    const itemToSave = {
                        ...item,
                        sizePhotos: item.sizePhotos ?? [],
                        // Explicitly clear images/image to prevent them from being used as gallery/cover
                        images: undefined,
                        image: undefined
                    };
                    onSave(itemToSave);
                    setSuccess("Item saved successfully!");
                    setTimeout(() => setSuccess(null), 3000);
                    setDirty(false);
                }} className={btnP} disabled={!item.name.trim()}>Save</button>
                <button type="button" onClick={handleCancel} className={btnS}>Cancel</button>
            </div>
        </div>
    );
}
