"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
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

    const rawImages = item.images?.length ? item.images : item.image ? [item.image] : [];
    const displayImages = rawImages.map(toProxyUrl).filter(Boolean);
    const setImages = (urls: string[]) => setItem((prev) => ({ ...prev, images: urls, image: urls[0] ?? "" }));

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
                <label className={lbl}>Photos</label>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Upload photos for this size
                </p>
                <MultiImageUploader
                    images={displayImages}
                    token={token}
                    categoryId={categoryId}
                    subcategoryId={subcategoryId}
                    serviceItemId={item.id}
                    onChange={(urls) => { setImages(urls); setDirty(true); setError(null); }}
                />
            </div>
            <LengthOptionsEditor
                options={item.lengthOptions ?? []}
                onChange={(opts) => { set("lengthOptions", opts); setDirty(true); setError(null); }}
            />
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => {
                    console.log("Saving item:", item);
                    setError(null);
                    onSave(item);
                    setSuccess("Item saved successfully!");
                    setTimeout(() => setSuccess(null), 3000);
                    setDirty(false);
                }} className={btnP} disabled={!item.name.trim()}>Save</button>
                <button type="button" onClick={handleCancel} className={btnS}>Cancel</button>
            </div>
        </div>
    );
}
