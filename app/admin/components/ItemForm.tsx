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
    const [pricingTab, setPricingTab] = useState<"REGULAR" | "KNOTLESS">("REGULAR");
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
    const setKnotlessMode = (mode: "ADJUSTMENT" | "SEPARATE") => {
        setItem(previous => {
            const adjustment = Number((previous.knotlessPriceAdjustment || "0").replace(/[^0-9.]/g, "")) || 0;
            return {
                ...previous,
                knotlessPricingMode: mode,
                lengthOptions: mode === "SEPARATE"
                    ? (previous.lengthOptions ?? []).map(option => ({
                        ...option,
                        knotlessPrice: option.knotlessPrice?.replace(/^\$+/, "")
                            || String((Number((option.price || "0").replace(/[^0-9.]/g, "")) || 0) + adjustment),
                    }))
                    : previous.lengthOptions,
            };
        });
        setDirty(true);
        setError(null);
    };

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

            <fieldset className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-4">
                    <div><legend className="text-sm font-semibold text-neutral-900 dark:text-white">Braid foundation</legend><p className="mt-1 text-xs text-neutral-500">Optionally let customers choose Regular or Knotless before selecting a length.</p></div>
                    <label className="inline-flex cursor-pointer items-center gap-2"><span className="sr-only">Offer braid foundation choices</span><input type="checkbox" className="peer sr-only" checked={Boolean(item.foundationChoicesEnabled)} onChange={event => set("foundationChoicesEnabled", event.target.checked)} /><span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-[#2C1810] peer-focus-visible:ring-2 peer-focus-visible:ring-[#2C1810] peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" /></label>
                </div>
                {item.foundationChoicesEnabled && <p className="mt-4 text-xs text-neutral-500">Regular and Knotless pricing can be managed separately below.</p>}
            </fieldset>

            <fieldset><legend className={lbl}>Photos for this size</legend><div className="flex flex-wrap gap-2">
                <label aria-label="Upload size photos" className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-violet-300 text-violet-600 focus-within:ring-2 focus-within:ring-violet-400 ${uploading ? "opacity-50" : "hover:bg-violet-50"}`}>{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}<input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || saving} onChange={uploadPhotos} /></label>
                {photos.map((photo, index) => <div key={`${photo}-${index}`} className="group relative"><img src={toProxyUrl(photo)} alt={`Size photo ${index + 1}`} className="h-16 w-16 rounded-lg border object-cover" /><button type="button" aria-label={`Remove size photo ${index + 1}`} onClick={() => set("sizePhotos", photos.filter((_, photoIndex) => photoIndex !== index))} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white opacity-100 focus:ring-2 focus:ring-red-400 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><X className="h-3 w-3" /></button></div>)}
            </div></fieldset>

            {item.foundationChoicesEnabled ? (
                <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="flex border-b border-neutral-200 dark:border-neutral-700">
                        {(["REGULAR", "KNOTLESS"] as const).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setPricingTab(tab)}
                                className={`min-h-12 flex-1 border-b-2 px-4 text-sm font-semibold transition ${
                                    pricingTab === tab
                                        ? "border-neutral-950 text-neutral-950 dark:border-white dark:text-white"
                                        : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                }`}
                            >
                                {tab === "REGULAR" ? "Regular" : "Knotless"}
                                <span className="ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                                    {(item.lengthOptions ?? []).length} lengths
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-4 p-4">
                        {pricingTab === "REGULAR" ? (
                            <LengthOptionsEditor
                                options={item.lengthOptions ?? []}
                                onChange={options => set("lengthOptions", options)}
                                title="Regular length prices"
                            />
                        ) : (
                            <>
                                <fieldset>
                                    <legend className="mb-2 text-sm font-semibold text-neutral-950 dark:text-white">Knotless pricing method</legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button type="button" aria-pressed={(item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT"} onClick={() => setKnotlessMode("ADJUSTMENT")} className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm ${(item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT" ? "border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}><span className={`h-4 w-4 rounded-full border-4 ${(item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT" ? "border-neutral-950 dark:border-white" : "border-neutral-300"}`} /><span><span className="block font-semibold">Price adjustment</span><span className="text-xs text-neutral-500">Add one amount to every Regular price.</span></span></button>
                                        <button type="button" aria-pressed={item.knotlessPricingMode === "SEPARATE"} onClick={() => setKnotlessMode("SEPARATE")} className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm ${item.knotlessPricingMode === "SEPARATE" ? "border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}><span className={`h-4 w-4 rounded-full border-4 ${item.knotlessPricingMode === "SEPARATE" ? "border-neutral-950 dark:border-white" : "border-neutral-300"}`} /><span><span className="block font-semibold">Set separate prices</span><span className="text-xs text-neutral-500">Edit each Knotless length independently.</span></span></button>
                                    </div>
                                </fieldset>
                                {(item.knotlessPricingMode ?? "ADJUSTMENT") === "ADJUSTMENT" ? (
                                    <div className="space-y-4">
                                        <label className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center dark:border-neutral-700"><span><span className="block text-sm font-semibold">Knotless price adjustment</span><span className="mt-1 block text-xs text-neutral-500">Added to every length price.</span></span><span className="flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"><span className="border-r border-neutral-200 px-3 text-neutral-500 dark:border-neutral-700">$</span><input aria-label="Knotless price adjustment" inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-3 outline-none" value={(item.knotlessPriceAdjustment ?? "0").replace("$", "")} onChange={event => set("knotlessPriceAdjustment", event.target.value.replace(/[^0-9.]/g, ""))} /></span></label>
                                        <div>
                                            <p className="mb-2 text-xs text-neutral-500">Calculated preview from Regular prices + ${item.knotlessPriceAdjustment || "0"}.</p>
                                            <div className="space-y-2">
                                                {(item.lengthOptions ?? []).map((option, index) => {
                                                    const calculated = (Number((option.price || "0").replace(/[^0-9.]/g, "")) || 0) + (Number((item.knotlessPriceAdjustment || "0").replace(/[^0-9.]/g, "")) || 0);
                                                    return <div key={option.id ?? index} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"><span>{option.name}</span><span className="text-right font-semibold">${calculated}</span></div>;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <LengthOptionsEditor
                                        options={item.lengthOptions ?? []}
                                        onChange={options => set("lengthOptions", options)}
                                        priceField="knotlessPrice"
                                        title="Knotless length prices"
                                        editStructure={false}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </section>
            ) : (
                <LengthOptionsEditor options={item.lengthOptions ?? []} onChange={options => set("lengthOptions", options)} />
            )}

            <div className="-mx-4 flex items-center justify-between gap-3 border-t bg-white px-4 pb-0 pt-4 dark:bg-neutral-900"><span className="hidden text-xs text-neutral-500 sm:block">Save shortcut: Ctrl/⌘ + Enter</span><div className="ml-auto flex gap-2"><button type="button" onClick={handleCancel} className={btnS} disabled={saving}>Cancel</button><button type="submit" className={`${btnP} inline-flex min-w-24 items-center justify-center gap-2`} disabled={!dirty || !item.name.trim() || saving || uploading}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? "Saving…" : "Save service"}</button></div></div>
        </form>
    );
}
