"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl } from "../constants";
import { LengthOptionsEditor } from "./LengthOptionsEditor";
import { toProxyUrl } from "@/lib/utils/image";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { uploadFile } from "../utils";
import { ServicesSaveBar } from "./ServicesSaveBar";

export function ItemForm({ initial, token, onSave, onCancel }: { initial: BookingItem; token: string; categoryId?: number; subcategoryId?: number; onSave: (item: BookingItem) => Promise<void>; onCancel: () => void }) {
    const [item, setItem] = useState<BookingItem>(() => ({
        ...initial,
        pricingMode: initial.pricingMode ?? "BY_LENGTH",
    }));
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pricingTab, setPricingTab] = useState<"REGULAR" | "KNOTLESS">("REGULAR");
    const [defaultDepositCents, setDefaultDepositCents] = useState(5000);
    const [customDeposit, setCustomDeposit] = useState(initial.depositOverrideCents != null);
    const [depositInput, setDepositInput] = useState(initial.depositOverrideCents == null ? "" : (initial.depositOverrideCents / 100).toFixed(2));
    const [sections, setSections] = useState({ basic: false, pricing: false, deposit: false });
    const photos = item.sizePhotos ?? [];

    const SectionHeader = ({ section, number, title }: { section: keyof typeof sections; number: string; title: string }) => (
        <button type="button" onClick={() => setSections(current => ({ ...current, [section]: !current[section] }))} aria-expanded={sections[section]} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-6">
            <span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b9855b] text-sm font-semibold text-[#7a4a28]">{number}</span><span className="font-serif text-lg font-semibold text-[#351a10] dark:text-white">{title}</span></span>
            {sections[section] ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
        </button>
    );

    useEffect(() => {
        fetch("/api/admin/pricing/deposits", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
            .then(response => response.ok ? response.json() : null)
            .then(payload => { if (payload?.defaultDepositCents) setDefaultDepositCents(payload.defaultDepositCents); })
            .catch(() => undefined);
    }, [token]);

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

    const setPricingMode = (mode: "FIXED" | "BY_LENGTH") => {
        if (mode === item.pricingMode) return;
        if (mode === "FIXED" && item.lengthOptions?.length
            && !confirm("Switching to Fixed price will remove all length options. Continue?")) return;
        setItem(previous => ({
            ...previous,
            pricingMode: mode,
            lengthOptions: mode === "FIXED" ? [] : previous.lengthOptions,
            knotlessPricingMode: mode === "FIXED" ? "ADJUSTMENT" : previous.knotlessPricingMode,
        }));
        setDirty(true);
        setError(null);
    };

    const handleSave = async () => {
        if (!item.name.trim() || saving || uploading) return;
        if (item.pricingMode === "FIXED" && !item.price?.trim()) {
            setError("Enter a base price for this fixed-price service.");
            return;
        }
        if (item.pricingMode === "BY_LENGTH" && !item.lengthOptions?.length) {
            setError("Add at least one length option for price-by-length service.");
            return;
        }
        if (customDeposit && (!item.depositOverrideCents || item.depositOverrideCents < 1)) {
            setError("Enter a valid deposit amount.");
            return;
        }
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
        <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }} className="mx-auto max-w-5xl space-y-4 pb-24 sm:space-y-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl dark:text-white">Edit service</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Configure availability, pricing, and customer choices.</p>
                </div>
            </header>
            <div className="space-y-5">
            {error && <div role="alert" tabIndex={-1} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4" /><span className="flex-1">{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
            {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700"><CheckCircle className="h-4 w-4" />{success}</div>}

            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                <SectionHeader section="basic" number="1" title="Basic information" />
                <div className={`${sections.basic ? "block" : "hidden"} border-t border-neutral-200 p-4 sm:p-6 dark:border-neutral-800`}>
                <div>
                    <label className="block"><span className={lbl}>Size name *</span><input className={inp} value={item.name} onChange={event => set("name", event.target.value)} placeholder="Small" /></label>
                </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <SectionHeader section="pricing" number="2" title="Pricing" />
            <div className={`${sections.pricing ? "block" : "hidden"} space-y-5 border-t border-neutral-200 p-4 sm:space-y-6 sm:p-6 dark:border-neutral-800`}>
            <fieldset>
                <legend className="text-sm font-semibold text-neutral-900 dark:text-white">Pricing method</legend>
                <p className="mt-1 text-xs text-neutral-500">Choose how this service is priced.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button type="button" aria-pressed={item.pricingMode === "FIXED"} onClick={() => setPricingMode("FIXED")} className={`flex min-h-16 items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${item.pricingMode === "FIXED" ? "border-[#a96835] bg-[#fcf7f1] text-neutral-950 shadow-sm dark:border-amber-300 dark:bg-neutral-800 dark:text-white" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}><CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${item.pricingMode === "FIXED" ? "text-[#8a522a] opacity-100 dark:text-amber-200" : "opacity-25"}`} /><span><span className="block font-semibold">Fixed price</span><span className="text-xs text-neutral-500">One base price; customers skip length selection.</span></span></button>
                    <button type="button" aria-pressed={item.pricingMode === "BY_LENGTH"} onClick={() => setPricingMode("BY_LENGTH")} className={`flex min-h-16 items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${item.pricingMode === "BY_LENGTH" ? "border-[#a96835] bg-[#fcf7f1] text-neutral-950 shadow-sm dark:border-amber-300 dark:bg-neutral-800 dark:text-white" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}><CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${item.pricingMode === "BY_LENGTH" ? "text-[#8a522a] opacity-100 dark:text-amber-200" : "opacity-25"}`} /><span><span className="block font-semibold">Price by length</span><span className="text-xs text-neutral-500">Customers must choose a priced length.</span></span></button>
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Foundation options</legend>
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                <div className="flex items-start justify-between gap-4">
                    <div><p className="text-sm font-semibold text-neutral-900 dark:text-white">Braid foundation</p><p className="mt-1 text-xs text-neutral-500">Let customers choose Regular or Knotless{item.pricingMode === "BY_LENGTH" ? " before selecting a length" : ""}.</p></div>
                    <label className="inline-flex cursor-pointer items-center gap-2"><span className="sr-only">Offer braid foundation choices</span><input type="checkbox" className="peer sr-only" checked={Boolean(item.foundationChoicesEnabled)} onChange={event => set("foundationChoicesEnabled", event.target.checked)} /><span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-[#2C1810] peer-focus-visible:ring-2 peer-focus-visible:ring-[#2C1810] peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" /><span className="min-w-7 text-xs font-medium text-neutral-500">{item.foundationChoicesEnabled ? "On" : "Off"}</span></label>
                </div>
                {item.foundationChoicesEnabled && <p className="mt-4 text-xs text-neutral-500">Regular and Knotless pricing can be managed separately below.</p>}
                </div>
            </fieldset>
            </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                <SectionHeader section="deposit" number="3" title="Booking deposit" />
                <div className={`${sections.deposit ? "block" : "hidden"} border-t border-neutral-200 p-4 sm:p-6 dark:border-neutral-800`}>
                <p className="text-xs text-neutral-500">Amount required to request this service. The balance is due later.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button type="button" aria-pressed={!customDeposit} onClick={() => { setCustomDeposit(false); set("depositOverrideCents", null); }} className={`rounded-lg border px-4 py-3 text-left transition ${!customDeposit ? "border-[#a96835] bg-[#fcf7f1] dark:border-amber-300 dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}><span className="block text-sm font-semibold">Salon default · ${(defaultDepositCents / 100).toFixed(2)}</span><span className="mt-1 block text-xs text-neutral-500">Automatically follows the salon default.</span></button>
                    <button type="button" aria-pressed={customDeposit} onClick={() => { const cents = item.depositOverrideCents ?? defaultDepositCents; setCustomDeposit(true); setDepositInput((cents / 100).toFixed(2)); set("depositOverrideCents", cents); }} className={`rounded-lg border px-4 py-3 text-left transition ${customDeposit ? "border-[#a96835] bg-[#fcf7f1] dark:border-amber-300 dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}><span className="block text-sm font-semibold">Custom amount</span><span className="mt-1 block text-xs text-neutral-500">Set a different amount for this service.</span></button>
                </div>
                {customDeposit && <label className="mt-3 block max-w-xs"><span className={lbl}>Deposit amount *</span><span className="flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"><span className="border-r border-neutral-200 px-3 text-neutral-500 dark:border-neutral-700">$</span><input aria-label="Deposit amount" inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-3 outline-none" value={depositInput} onChange={event => { const clean = event.target.value.replace(/[^0-9.]/g, ""); setDepositInput(clean); set("depositOverrideCents", clean && Number.isFinite(Number(clean)) ? Math.round(Number(clean) * 100) : null); }} /></span></label>}
                <p className="mt-3 text-xs font-medium text-neutral-700 dark:text-neutral-300">Customers will see a ${(Number(item.depositOverrideCents ?? defaultDepositCents) / 100).toFixed(2)} deposit required.</p>
                </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-neutral-900 dark:text-white">Photos for this size</h3><span className="text-xs text-neutral-500">{photos.length} uploaded</span></div>
                <div className="flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 pt-1">
                    <label aria-label="Upload size photos" className={`flex h-20 w-20 shrink-0 snap-start cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-500 transition focus-within:ring-2 focus-within:ring-neutral-400 ${uploading ? "opacity-50" : "hover:border-neutral-500 hover:bg-neutral-50"}`}>{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-5 w-5" /><span className="text-[10px] font-medium">Add photo</span></>}<input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || saving} onChange={uploadPhotos} /></label>
                    {photos.map((photo, index) => <div key={`${photo}-${index}`} className="group relative shrink-0 snap-start"><img src={toProxyUrl(photo)} alt={`Size photo ${index + 1}`} className="h-20 w-20 rounded-lg border object-cover" /><button type="button" aria-label={`Remove size photo ${index + 1}`} onClick={() => set("sizePhotos", photos.filter((_, photoIndex) => photoIndex !== index))} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white opacity-100 focus:ring-2 focus:ring-red-400 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><X className="h-3 w-3" /></button></div>)}
                </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">


            {item.pricingMode === "FIXED" ? (
                <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <label className="block"><span className={lbl}>Base price *</span><span className="flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"><span className="border-r border-neutral-200 px-3 text-neutral-500 dark:border-neutral-700">$</span><input inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-3 outline-none" value={(item.price ?? "").replace("$", "")} onChange={event => set("price", event.target.value.replace(/[^0-9.]/g, ""))} /></span></label>
                    {item.foundationChoicesEnabled && <label className="block"><span className={lbl}>Knotless price adjustment</span><span className="flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"><span className="border-r border-neutral-200 px-3 text-neutral-500 dark:border-neutral-700">+$</span><input inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-3 outline-none" value={(item.knotlessPriceAdjustment ?? "0").replace("$", "")} onChange={event => set("knotlessPriceAdjustment", event.target.value.replace(/[^0-9.]/g, ""))} /></span></label>}
                </section>
            ) : item.foundationChoicesEnabled ? (
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
            </section>

            </div>
            <ServicesSaveBar
                visible={dirty}
                saving={saving}
                disabled={!item.name.trim() || uploading}
                onSave={() => void handleSave()}
                onDiscard={handleCancel}
            />
        </form>
    );
}
