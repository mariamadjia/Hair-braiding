"use client";

import { useState, useRef } from "react";
import { Check, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft, Plus, Trash2, ImageIcon } from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption, uploadFile } from "../utils";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MutateResult { id?: number; slug?: string; name?: string; }

interface Props {
    token: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    onDone: (summary: CategorySummary) => void;
    onCancel: () => void;
    onCategorySummariesRefresh?: () => Promise<unknown>;
}

interface LengthEntry extends LengthOption { uid: string; }
interface SubEntry {
    uid: string;
    value: string;
    photos: File[];          // staged locally, uploaded after sub is created
    sizeName: string;
    sizeNameError: string;
    lengths: LengthEntry[];
    touchedLengths: Set<string>;
}

function emptySubEntry(): SubEntry {
    return {
        uid: crypto.randomUUID(),
        value: "",
        photos: [],
        sizeName: "",
        sizeNameError: "",
        lengths: [{ ...emptyLengthOption(), uid: crypto.randomUUID() }],
        touchedLengths: new Set(),
    };
}

const STEPS = ["Name", "Photos", "Subcategories"];

// ─── Shared sub-components (module-level — no remount on parent re-render) ────

function WizardErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
    if (!error) return null;
    return (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="text-red-400 hover:text-red-600">×</button>
        </div>
    );
}

function WizardNavRow({ onBack, onCancel, onNext, nextLabel = "Next", nextDisabled = false, busy = false }: {
    onBack?: () => void;
    onCancel?: () => void;
    onNext: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    busy?: boolean;
}) {
    return (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
            {onBack ? (
                <button type="button" onClick={onBack} className={`${btnS} flex items-center gap-1.5`}>
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back
                </button>
            ) : (
                <button type="button" onClick={onCancel} className={btnS}>Cancel</button>
            )}
            <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || busy}
                aria-disabled={nextDisabled || busy}
                className={`${btnP} flex items-center gap-2`}
            >
                {busy ? "Saving…" : nextLabel}
                {!busy && <ChevronRight className="w-3.5 h-3.5" aria-hidden />}
            </button>
        </div>
    );
}

function WizardProgressBar({ step }: { step: number }) {
    return (
        <nav aria-label="Setup progress" className="flex items-center mb-8">
            {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                return (
                    <div key={label} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div
                                aria-current={active ? "step" : undefined}
                                aria-label={`Step ${i + 1}: ${label}${done ? " (completed)" : active ? " (current)" : ""}`}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                    done
                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                        : active
                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 ring-4 ring-neutral-200 dark:ring-neutral-700"
                                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
                                }`}
                            >
                                {done ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-widest whitespace-nowrap ${
                                active ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
                            }`}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div aria-hidden className={`flex-1 h-px mx-2 mb-5 transition-all ${
                                done ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
                            }`} />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewCategoryWizard({ token, mutate, onDone, onCancel, onCategorySummariesRefresh }: Props) {
    // ── Shared ───────────────────────────────────────────────────────────────
    const [step, setStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const clearError = () => setError(null);

    // ── Form data ────────────────────────────────────────────────────────────
    const [catName, setCatName] = useState("");
    const [catNameError, setCatNameError] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [subEntries, setSubEntries] = useState<SubEntry[]>([emptySubEntry()]);
    const [subInputError, setSubInputError] = useState("");

    // ── Server IDs ───────────────────────────────────────────────────────────
    const [createdCat, setCreatedCat] = useState<CategorySummary | null>(null);
    const [firstSubName, setFirstSubName] = useState("");

    // track already-created subs to prevent duplicate POSTs on retry
    // maps subName -> { slug, id }
    const persistedSubs = useRef<Map<string, { slug: string; id: number }>>(new Map());

    // ── Derived values ───────────────────────────────────────────────────────
    const photoOk = images.length >= 3 && images.length <= 5;
    const filledSubs = subEntries.filter(e => e.value.trim().length >= 2);
    const canAdvanceSubs = filledSubs.length > 0;
    const subsValid = filledSubs.length > 0 && filledSubs.every(e =>
        e.photos.length >= 1 &&
        e.sizeName.trim().length >= 1 &&
        e.lengths.length > 0 &&
        e.lengths.every(l => (l.name ?? "").trim() !== "" && (l.price ?? "").trim() !== "")
    );

    // ── Step 0: Category name ────────────────────────────────────────────────
    const handleStep0Next = async () => {
        const trimmed = catName.trim();
        if (!trimmed) { setCatNameError("Category name is required."); return; }
        if (trimmed.length < 2) { setCatNameError("Name must be at least 2 characters."); return; }
        setCatNameError(""); clearError(); setBusy(true);
        try {
            const created = await mutate("POST", "", { name: trimmed, slug: slugify(trimmed), subcategories: [] });
            if (!created.id) throw new Error("Server did not return a category ID.");
            setCreatedCat({ id: created.id, name: trimmed, slug: slugify(trimmed) });
            setStep(1);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create category. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 1: Photos ───────────────────────────────────────────────────────
    const handleStep1Next = async () => {
        if (!createdCat?.id) { setError("Category ID missing."); return; }
        if (images.length < 3) { setError("Upload at least 3 photos to continue."); return; }
        if (images.length > 5) { setError("Maximum 5 photos allowed."); return; }
        clearError(); setBusy(true);
        try {
            const backendUrls = images.map(fromProxyUrl).filter((u): u is string => Boolean(u));
            await galleryApi.updateCategoryFlippingImages(createdCat.id, backendUrls);
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save photos. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 2: Subcategories (with inline size + lengths per sub) ────────────
    const addSubRow = () => setSubEntries(prev => [...prev, emptySubEntry()]);
    const removeSubRow = (uid: string) => setSubEntries(prev => prev.filter(e => e.uid !== uid));
    const addPhotosToSub = (uid: string, files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);
        setSubEntries(prev => prev.map(e => e.uid === uid
            ? { ...e, photos: [...e.photos, ...incoming] }
            : e));
    };
    const removePhotoFromSub = (uid: string, idx: number) =>
        setSubEntries(prev => prev.map(e => e.uid === uid
            ? { ...e, photos: e.photos.filter((_, i) => i !== idx) }
            : e));
    const updateSubField = <K extends keyof SubEntry>(uid: string, field: K, val: SubEntry[K]) => {
        if (field === "value") setSubInputError("");
        setSubEntries(prev => prev.map(e => e.uid === uid ? { ...e, [field]: val } : e));
    };
    const addLengthToSub = (subUid: string) =>
        setSubEntries(prev => prev.map(e => e.uid === subUid
            ? { ...e, lengths: [...e.lengths, { ...emptyLengthOption(), uid: crypto.randomUUID() }] }
            : e));
    const removeLengthFromSub = (subUid: string, lenUid: string) =>
        setSubEntries(prev => prev.map(e => e.uid === subUid
            ? { ...e, lengths: e.lengths.filter(l => l.uid !== lenUid), touchedLengths: (() => { const s = new Set(e.touchedLengths); s.delete(lenUid); return s; })() }
            : e));
    const updateLengthInSub = (subUid: string, lenUid: string, field: keyof LengthOption, val: string) =>
        setSubEntries(prev => prev.map(e => e.uid === subUid ? {
            ...e,
            touchedLengths: new Set(e.touchedLengths).add(lenUid),
            lengths: e.lengths.map(l => l.uid === lenUid ? { ...l, [field]: val } : l),
        } : e));

    const handleStep2Next = async () => {
        const filled = filledSubs;
        if (filled.length === 0) { setSubInputError("Add at least one subcategory name (min 2 chars)."); return; }
        const invalidSize = filled.find(e => !e.sizeName.trim());
        if (invalidSize) { setError(`Enter a size name for "${invalidSize.value.trim()}".`); return; }
        const invalidLengths = filled.find(e => e.lengths.some(l => !(l.name ?? "").trim() || !(l.price ?? "").trim()));
        if (invalidLengths) { setError(`Each length under "${invalidLengths.value.trim()}" needs a name and price.`); return; }
        setSubInputError(""); clearError(); setBusy(true);
        try {
            let firstName = firstSubName;
            for (const sub of filled) {
                const subName = sub.value.trim();
                let subSlug: string;
                let subId: number;

                // If already created on a previous attempt, reuse the stored slug/id
                const already = persistedSubs.current.get(subName);
                if (already) {
                    subSlug = already.slug;
                    subId = already.id;
                } else {
                    const createdSub = await mutate("POST", `/${createdCat!.slug}/subcategories`, {
                        name: subName, categoryId: createdCat!.id,
                    });
                    if (!createdSub.slug || !createdSub.id) throw new Error(`Server did not return slug/id for "${subName}".`);
                    subSlug = createdSub.slug;
                    subId = createdSub.id;
                    persistedSubs.current.set(subName, { slug: subSlug, id: subId });

                    // Upload staged photos now that we have the subcategory ID
                    for (const file of sub.photos) {
                        await uploadFile(file, token, {
                            categoryId: createdCat!.id,
                            subcategoryId: subId,
                        });
                    }
                }

                if (!firstName) firstName = subName;

                const sizeLabel = sub.sizeName.trim();
                // POST to create the item
                const createdItem = await mutate(
                    "POST",
                    `/${createdCat!.slug}/subcategories/${subSlug}/items`,
                    { name: sizeLabel, price: "", description: "", subcategoryId: subId }
                );
                if (!createdItem.id) throw new Error(`Server did not return an item ID for "${sizeLabel}".`);

                // PUT on the collection route — itemId goes in the body, not the URL
                await mutate(
                    "PUT",
                    `/${createdCat!.slug}/subcategories/${subSlug}/items`,
                    {
                        itemId: createdItem.id,
                        subcategoryId: subId,
                        item: { name: sizeLabel, price: "", description: "", subcategory: { id: subId }, lengthOptions: sub.lengths },
                    }
                );
            }
            setFirstSubName(firstName);
            setStep(3);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 3: Done ─────────────────────────────────────────────────────────
    const handleFinish = () => {
        if (createdCat) onDone(createdCat);
        else onCategorySummariesRefresh?.();
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm bg-white dark:bg-neutral-900">
            <div className="px-5 pt-5">
                <WizardProgressBar step={step} />
            </div>
            <div className="px-5 pb-5">

                {/* ── Step 0: Name ── */}
                {step === 0 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">What is this category called?</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose a clear, descriptive name — you can change it later.</p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />
                        <div>
                            <label htmlFor="cat-name" className={lbl}>Category Name <span className="text-red-500" aria-hidden>*</span></label>
                            <input
                                id="cat-name"
                                className={`${inp} ${catNameError ? "border-red-400" : ""}`}
                                value={catName}
                                onChange={(e) => { setCatName(e.target.value); setCatNameError(""); }}
                                onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
                                placeholder="e.g. Box Braids, Twists, Locs"
                                aria-required
                                aria-describedby={catNameError ? "cat-name-error" : undefined}
                                autoFocus
                            />
                            {catNameError && (
                                <p id="cat-name-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" aria-hidden />{catNameError}
                                </p>
                            )}
                            <p className="mt-1.5 text-xs text-neutral-400">
                                URL slug: <span className="font-mono">{catName.trim() ? slugify(catName.trim()) : "—"}</span>
                            </p>
                        </div>
                        <WizardNavRow onCancel={onCancel} onNext={handleStep0Next} nextDisabled={!catName.trim()} busy={busy} />
                    </div>
                )}

                {/* ── Step 1: Photos ── */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add gallery photos</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Upload <strong>3 to 5</strong> photos for <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCat?.name}</span>. These appear in the public gallery.
                            </p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />
                        <MultiImageUploader images={images} token={token} categoryId={createdCat?.id} onChange={setImages} />
                        {images.length > 0 && (
                            <div role="status" className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                                {photoOk
                                    ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
                                    : <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden />}
                                {images.length < 3
                                    ? `${images.length} uploaded — add ${3 - images.length} more`
                                    : images.length > 5
                                    ? `${images.length} uploaded — remove ${images.length - 5} (max 5)`
                                    : `${images.length} photos ready`}
                            </div>
                        )}
                        <WizardNavRow onBack={() => setStep(0)} onNext={handleStep1Next} nextLabel="Save & Continue" nextDisabled={!photoOk} busy={busy} />
                    </div>
                )}

                {/* ── Step 2: Subcategories (with size + lengths inline) ── */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add subcategories</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                For each subcategory, enter its name, a size (e.g. Small), and the length options with prices.
                            </p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />

                        <div className="space-y-4">
                            {subEntries.map((sub, si) => (
                                <div key={sub.uid} className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-3 space-y-3">

                                    {/* Subcategory name row */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            aria-label={`Subcategory ${si + 1} name`}
                                            className={`${inp} flex-1 ${subInputError && !sub.value.trim() ? "border-red-400" : ""}`}
                                            value={sub.value}
                                            onChange={(e) => updateSubField(sub.uid, "value", e.target.value)}
                                            placeholder={si === 0 ? "Subcategory name, e.g. Knotless" : "e.g. Goddess"}
                                        />
                                        {subEntries.length > 1 && (
                                            <button type="button" onClick={() => removeSubRow(sub.uid)} className={btnD} aria-label={`Remove subcategory ${si + 1}`}>
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                            </button>
                                        )}
                                    </div>

                                    {/* Photos */}
                                    <div>
                                        <label className={`${lbl} text-[11px]`}>Photos <span className="text-red-500" aria-hidden>*</span></label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {sub.photos.map((file, pi) => (
                                                <div key={pi} className="relative group shrink-0">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="h-16 w-16 object-cover rounded border border-neutral-200 dark:border-neutral-700"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhotoFromSub(sub.uid, pi)}
                                                        aria-label={`Remove photo ${pi + 1} from subcategory ${si + 1}`}
                                                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >×</button>
                                                </div>
                                            ))}
                                            <label className={`cursor-pointer h-16 w-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded bg-neutral-50 dark:bg-neutral-800 transition-colors ${sub.photos.length === 0 ? "border-red-300 dark:border-red-700 hover:border-red-400" : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500"}`}>
                                                <ImageIcon className="w-4 h-4 text-neutral-400" aria-hidden />
                                                <span className="text-[10px] text-neutral-500">Add</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => addPhotosToSub(sub.uid, e.target.files)}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Size name */}
                                    <div>
                                        <label className={`${lbl} text-[11px]`}>Size <span className="text-red-500" aria-hidden>*</span></label>
                                        <input
                                            aria-label={`Subcategory ${si + 1} size name`}
                                            className={`${inp} ${sub.sizeNameError ? "border-red-400" : ""}`}
                                            value={sub.sizeName}
                                            onChange={(e) => updateSubField(sub.uid, "sizeName", e.target.value)}
                                            placeholder="e.g. Small, Medium, Large"
                                        />
                                        {sub.sizeNameError && (
                                            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" aria-hidden />{sub.sizeNameError}
                                            </p>
                                        )}
                                    </div>

                                    {/* Length options */}
                                    <div className="space-y-1.5">
                                        <p className={`${lbl} text-[11px]`}>Lengths <span className="text-red-500" aria-hidden>*</span></p>
                                        <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 px-1" aria-hidden>
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Length</span>
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Price</span>
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Notes</span>
                                            <span />
                                        </div>
                                        {sub.lengths.map((len, li) => {
                                            const touched = sub.touchedLengths.has(len.uid);
                                            return (
                                                <div key={len.uid} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                                                    <input
                                                        aria-label={`Sub ${si + 1} length ${li + 1} name`}
                                                        className={`${inp} ${touched && !(len.name ?? "").trim() ? "border-red-300" : ""}`}
                                                        placeholder='e.g. 16"'
                                                        value={len.name ?? ""}
                                                        onChange={(e) => updateLengthInSub(sub.uid, len.uid, "name", e.target.value)}
                                                    />
                                                    <input
                                                        aria-label={`Sub ${si + 1} length ${li + 1} price`}
                                                        className={`${inp} ${touched && !(len.price ?? "").trim() ? "border-red-300" : ""}`}
                                                        placeholder="e.g. $180"
                                                        value={len.price ?? ""}
                                                        onChange={(e) => updateLengthInSub(sub.uid, len.uid, "price", e.target.value)}
                                                    />
                                                    <input
                                                        aria-label={`Sub ${si + 1} length ${li + 1} notes`}
                                                        className={inp}
                                                        placeholder="e.g. $50 deposit"
                                                        value={len.notes ?? ""}
                                                        onChange={(e) => updateLengthInSub(sub.uid, len.uid, "notes", e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLengthFromSub(sub.uid, len.uid)}
                                                        disabled={sub.lengths.length === 1}
                                                        aria-label={`Remove length ${li + 1} from subcategory ${si + 1}`}
                                                        className={`${btnD} disabled:opacity-30`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <button type="button" onClick={() => addLengthToSub(sub.uid)} className={`${btnS} flex items-center gap-1.5 text-xs`}>
                                            <Plus className="w-3.5 h-3.5" aria-hidden /> Add length
                                        </button>
                                    </div>

                                </div>
                            ))}
                            {subInputError && (
                                <p role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" aria-hidden />{subInputError}
                                </p>
                            )}
                            <button type="button" onClick={addSubRow} className={`${btnS} flex items-center gap-1.5 text-xs`}>
                                <Plus className="w-3.5 h-3.5" aria-hidden /> Add another subcategory
                            </button>
                        </div>

                        <WizardNavRow onBack={() => setStep(1)} onNext={handleStep2Next} nextLabel="Save & Finish" nextDisabled={!canAdvanceSubs || !subsValid} busy={busy} />
                    </div>
                )}

                {/* ── Step 3: Done ── */}
                {step === 3 && (
                    <div className="space-y-5 text-center py-4">
                        <div className="flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" aria-hidden />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                                "{createdCat?.name}" is ready
                            </h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="block">Category created with {images.length} photos.</span>
                                <span className="block">
                                    {filledSubs.length} subcategor{filledSubs.length === 1 ? "y" : "ies"} created ({filledSubs.map(e => e.value.trim()).join(", ")}).
                                </span>
                                <span className="block">
                                    Each subcategory set up with a size and length options.
                                </span>
                                <span className="block mt-2">You can add more subcategories, sizes, and lengths from the editor.</span>
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                            <button type="button" onClick={onCancel} className={btnS}>Back to list</button>
                            <button type="button" onClick={handleFinish} className={btnP}>Open editor →</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
