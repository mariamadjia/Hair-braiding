"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { LengthOptionsEditor } from "./LengthOptionsEditor";
import { toProxyUrl } from "@/lib/utils/image";
import { AlertCircle, CheckCircle, Loader2, Plus, X } from "lucide-react";
import { uploadFile } from "../utils";

export function ItemForm({ initial, token, onSave, onCancel }: { initial: BookingItem; token: string; categoryId?: number; subcategoryId?: number; onSave: (item: BookingItem) => Promise<void>; onCancel: () => void }) {
    const [item, setItem] = useState<BookingItem>(initial);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const photos = item.sizePhotos ?? [];

    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [dirty]);

    useEffect(() => {
        const keyboardSave = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && dirty && !saving) { event.preventDefault(); void handleSave(); }
        };
        window.addEventListener("keydown", keyboardSave);
        return () => window.removeEventListener("keydown", keyboardSave);
    }, [item, dirty, saving]);

    const set = (field: keyof BookingItem, value: unknown) => { setItem(previous => ({ ...previous, [field]: value })); setDirty(true); setError(null); };

    const handleSave = async () => {
        if (!item.name.trim() || saving || uploading) return;
        setSaving(true); setError(null);
        try {
            await onSave({ ...item, sizePhotos: photos });
            setDirty(false); setSuccess("Service saved successfully.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save this service.");
        } finally { setSaving(false); }
    };

    const handleCancel = () => {
        if (dirty && !confirm("You have unsaved changes. Cancel editing?")) return;
        onCancel();
    };

    const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;
        setUploading(true); setError(null);
        try {
            const urls = await Promise.all(Array.from(files).map(file => uploadFile(file, token, {}, true)));
            set("sizePhotos", [...photos, ...urls]);
        } catch { setError("Failed to upload one or more size photos."); }
        finally { setUploading(false); event.target.value = ""; }
    };

    return (
        <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }} className="space-y-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            {error && <div role="alert" tabIndex={-1} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4" /><span className="flex-1">{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
            {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700"><CheckCircle className="h-4 w-4" />{success}</div>}

            <label className="block"><span className={lbl}>Size or service name *</span><input className={inp} value={item.name} onChange={event => set("name", event.target.value)} placeholder="Small" /></label>

            <fieldset><legend className={lbl}>Photos for this size</legend><div className="flex flex-wrap gap-2">
                <label aria-label="Upload size photos" className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-violet-300 text-violet-600 focus-within:ring-2 focus-within:ring-violet-400 ${uploading ? "opacity-50" : "hover:bg-violet-50"}`}>{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}<input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || saving} onChange={uploadPhotos} /></label>
                {photos.map((photo, index) => <div key={`${photo}-${index}`} className="group relative"><img src={toProxyUrl(photo)} alt={`Size photo ${index + 1}`} className="h-16 w-16 rounded-lg border object-cover" /><button type="button" aria-label={`Remove size photo ${index + 1}`} onClick={() => set("sizePhotos", photos.filter((_, photoIndex) => photoIndex !== index))} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white opacity-100 focus:ring-2 focus:ring-red-400 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><X className="h-3 w-3" /></button></div>)}
            </div></fieldset>

            <LengthOptionsEditor options={item.lengthOptions ?? []} onChange={options => set("lengthOptions", options)} />

            <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-neutral-50/95 px-4 py-3 backdrop-blur dark:bg-neutral-900/95"><span className="hidden text-xs text-neutral-500 sm:block">Save shortcut: Ctrl/⌘ + Enter</span><div className="ml-auto flex gap-2"><button type="button" onClick={handleCancel} className={btnS} disabled={saving}>Cancel</button><button type="submit" className={`${btnP} inline-flex min-w-24 items-center justify-center gap-2`} disabled={!dirty || !item.name.trim() || saving || uploading}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? "Saving…" : "Save service"}</button></div></div>
        </form>
    );
}
