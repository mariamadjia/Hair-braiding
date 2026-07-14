"use client";

import { useState, useRef } from "react";
import { Check, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption } from "../utils";
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

interface SubEntry { uid: string; value: string; }
interface LengthEntry extends LengthOption { uid: string; }

const STEPS = ["Name", "Photos", "Subcategory", "Size", "Lengths"];

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

    // ── Form data (Fix #2: consolidated) ────────────────────────────────────
    const [catName, setCatName] = useState("");
    const [catNameError, setCatNameError] = useState("");
    const [images, setImages] = useState<string[]>([]);
    // Fix #6: stable uid keys instead of array index
    const [subEntries, setSubEntries] = useState<SubEntry[]>([{ uid: crypto.randomUUID(), value: "" }]);
    const [subInputError, setSubInputError] = useState("");
    const [sizeName, setSizeName] = useState("");
    const [sizeNameError, setSizeNameError] = useState("");
    // Fix #6 + #7: stable uids + touched tracking for length rows
    const [lengthEntries, setLengthEntries] = useState<LengthEntry[]>([{ ...emptyLengthOption(), uid: crypto.randomUUID() }]);
    const [touchedLengths, setTouchedLengths] = useState<Set<string>>(new Set());

    // ── Server IDs (Fix #2: consolidated) ───────────────────────────────────
    const [createdCat, setCreatedCat] = useState<CategorySummary | null>(null);
    const [createdSubSlug, setCreatedSubSlug] = useState("");
    const [createdSubId, setCreatedSubId] = useState<number | undefined>();
    const [firstSubName, setFirstSubName] = useState("");
    const [createdItemId, setCreatedItemId] = useState<number | undefined>();

    // Fix #4: track which sub names are already persisted to prevent duplicates on retry
    const persistedSubNames = useRef<Set<string>>(new Set());

    // ── Derived values (Fix #9: computed once) ───────────────────────────────
    const photoOk = images.length >= 3 && images.length <= 5;
    const filledSubs = subEntries.map(e => e.value.trim()).filter(Boolean);
    const canAdvanceSubs = filledSubs.some(n => n.length >= 2);
    const lengthsValid = lengthEntries.length > 0 &&
        lengthEntries.every(e => (e.name ?? "").trim() !== "" && (e.price ?? "").trim() !== "");

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

    // ── Step 2: Subcategories ────────────────────────────────────────────────
    const addSubRow = () => setSubEntries(prev => [...prev, { uid: crypto.randomUUID(), value: "" }]);
    const updateSubRow = (uid: string, val: string) => {
        setSubInputError("");
        setSubEntries(prev => prev.map(e => e.uid === uid ? { ...e, value: val } : e));
    };
    const removeSubRow = (uid: string) => setSubEntries(prev => prev.filter(e => e.uid !== uid));

    const handleStep2Next = async () => {
        const filled = filledSubs;
        if (filled.length === 0) { setSubInputError("Add at least one subcategory name."); return; }
        if (filled.some(n => n.length < 2)) { setSubInputError("Each name must be at least 2 characters."); return; }
        setSubInputError(""); clearError(); setBusy(true);
        try {
            let firstSlug = createdSubSlug; // preserve if retrying
            let firstId = createdSubId;
            let firstName = firstSubName;
            for (const name of filled) {
                // Fix #4: skip names already successfully created on a previous attempt
                if (persistedSubNames.current.has(name)) continue;
                const created = await mutate("POST", `/${createdCat!.slug}/subcategories`, {
                    name, categoryId: createdCat!.id,
                });
                if (!created.slug) throw new Error(`Server did not return a slug for "${name}".`);
                persistedSubNames.current.add(name);
                if (!firstSlug) { firstSlug = created.slug; firstId = created.id; firstName = name; }
            }
            setCreatedSubSlug(firstSlug);
            setCreatedSubId(firstId);
            setFirstSubName(firstName);
            setStep(3);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create subcategories. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 3: Size ─────────────────────────────────────────────────────────
    const handleStep3Next = async () => {
        const trimmed = sizeName.trim();
        if (!trimmed) { setSizeNameError("Size name is required."); return; }
        setSizeNameError(""); clearError(); setBusy(true);
        try {
            const created = await mutate(
                "POST",
                `/${createdCat!.slug}/subcategories/${createdSubSlug}/items`,
                { name: trimmed, price: "", description: "", subcategoryId: createdSubId }
            );
            if (!created.id) throw new Error("Server did not return an item ID.");
            setCreatedItemId(created.id);
            setStep(4);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create size. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 4: Length options ───────────────────────────────────────────────
    const updateLength = (uid: string, field: keyof LengthOption, val: string) => {
        setTouchedLengths(prev => new Set(prev).add(uid));
        setLengthEntries(prev => prev.map(e => e.uid === uid ? { ...e, [field]: val } : e));
    };
    const addLength = () => setLengthEntries(prev => [...prev, { ...emptyLengthOption(), uid: crypto.randomUUID() }]);
    const removeLength = (uid: string) => {
        setLengthEntries(prev => prev.filter(e => e.uid !== uid));
        setTouchedLengths(prev => { const s = new Set(prev); s.delete(uid); return s; });
    };

    const handleStep4Next = async () => {
        // Fix #5: throw if item ID is missing — never silently skip
        if (!createdItemId) { setError("Item ID missing — cannot save lengths. Please go back and try again."); return; }
        if (!lengthsValid) { setError("Each length option needs a name and a price."); return; }
        clearError(); setBusy(true);
        try {
            await mutate(
                "PUT",
                `/${createdCat!.slug}/subcategories/${createdSubSlug}/items/${createdItemId}`,
                { name: sizeName, price: "", description: "", subcategoryId: createdSubId, lengthOptions: lengthEntries }
            );
            setStep(5);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save length options. Please try again.");
        } finally { setBusy(false); }
    };

    // ── Step 5: Done ─────────────────────────────────────────────────────────
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

                {/* ── Step 2: Subcategories ── */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add subcategories</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Subcategories group the styles within <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCat?.name}</span>.
                                Add as many as you need — e.g. Knotless, Goddess, Bohemian.
                            </p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />
                        <fieldset className="space-y-2 border-0 p-0 m-0">
                            <legend className={lbl}>Subcategory Names <span className="text-red-500" aria-hidden>*</span></legend>
                            {subEntries.map((entry, i) => (
                                <div key={entry.uid} className="flex items-center gap-2">
                                    <input
                                        aria-label={`Subcategory ${i + 1}`}
                                        className={`${inp} flex-1 ${subInputError && !entry.value.trim() ? "border-red-400" : ""}`}
                                        value={entry.value}
                                        onChange={(e) => updateSubRow(entry.uid, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubRow(); } }}
                                        placeholder={i === 0 ? "e.g. Knotless" : "e.g. Goddess"}
                                    />
                                    {subEntries.length > 1 && (
                                        <button type="button" onClick={() => removeSubRow(entry.uid)} className={btnD} aria-label={`Remove subcategory ${i + 1}`}>
                                            <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                        </button>
                                    )}
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
                        </fieldset>
                        <WizardNavRow onBack={() => setStep(1)} onNext={handleStep2Next} nextDisabled={!canAdvanceSubs} busy={busy} />
                    </div>
                )}

                {/* ── Step 3: Size ── */}
                {step === 3 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add a size</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Sizes represent the braid dimensions offered under <span className="font-medium text-neutral-700 dark:text-neutral-300">{firstSubName}</span>. Common sizes: Small, Medium, Large, Jumbo.
                            </p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />
                        <div>
                            <label htmlFor="size-name" className={lbl}>Size Name <span className="text-red-500" aria-hidden>*</span></label>
                            <input
                                id="size-name"
                                className={`${inp} ${sizeNameError ? "border-red-400" : ""}`}
                                value={sizeName}
                                onChange={(e) => { setSizeName(e.target.value); setSizeNameError(""); }}
                                onKeyDown={(e) => e.key === "Enter" && handleStep3Next()}
                                placeholder="e.g. Small, Medium, Large, Jumbo"
                                aria-required
                                aria-describedby={sizeNameError ? "size-name-error" : undefined}
                                autoFocus
                            />
                            {sizeNameError && (
                                <p id="size-name-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" aria-hidden />{sizeNameError}
                                </p>
                            )}
                        </div>
                        <WizardNavRow onBack={() => setStep(2)} onNext={handleStep3Next} nextDisabled={!sizeName.trim()} busy={busy} />
                    </div>
                )}

                {/* ── Step 4: Length options ── */}
                {step === 4 && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add length options</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Each length option has a name (e.g. 16") and a price. Add as many as you offer for <span className="font-medium text-neutral-700 dark:text-neutral-300">{sizeName}</span>.
                            </p>
                        </div>
                        <WizardErrorBanner error={error} onDismiss={clearError} />
                        <div className="space-y-2">
                            <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 px-1" aria-hidden>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Length</span>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Price</span>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Notes</span>
                                <span />
                            </div>
                            {lengthEntries.map((entry, i) => {
                                const touched = touchedLengths.has(entry.uid);
                                return (
                                    <div key={entry.uid} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                                        <input
                                            aria-label={`Length option ${i + 1} name`}
                                            className={`${inp} ${touched && !(entry.name ?? "").trim() ? "border-red-300" : ""}`}
                                            placeholder='e.g. 16"'
                                            value={entry.name ?? ""}
                                            onChange={(e) => updateLength(entry.uid, "name", e.target.value)}
                                        />
                                        <input
                                            aria-label={`Length option ${i + 1} price`}
                                            className={`${inp} ${touched && !(entry.price ?? "").trim() ? "border-red-300" : ""}`}
                                            placeholder="e.g. $180"
                                            value={entry.price ?? ""}
                                            onChange={(e) => updateLength(entry.uid, "price", e.target.value)}
                                        />
                                        <input
                                            aria-label={`Length option ${i + 1} notes`}
                                            className={inp}
                                            placeholder="e.g. $50 deposit"
                                            value={entry.notes ?? ""}
                                            onChange={(e) => updateLength(entry.uid, "notes", e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeLength(entry.uid)}
                                            disabled={lengthEntries.length === 1}
                                            aria-label={`Remove length option ${i + 1}`}
                                            className={`${btnD} disabled:opacity-30`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                        </button>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={addLength} className={`${btnS} flex items-center gap-1.5 text-xs`}>
                                <Plus className="w-3.5 h-3.5" aria-hidden /> Add another length
                            </button>
                        </div>
                        <WizardNavRow onBack={() => setStep(3)} onNext={handleStep4Next} nextLabel="Save & Finish" nextDisabled={!lengthsValid} busy={busy} />
                    </div>
                )}

                {/* ── Step 5: Done ── */}
                {step === 5 && (
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
                                    {filledSubs.length} subcategor{filledSubs.length === 1 ? "y" : "ies"} created ({filledSubs.join(", ")}).
                                </span>
                                <span className="block">
                                    Size <strong>{sizeName}</strong> → {lengthEntries.length} length option{lengthEntries.length !== 1 ? "s" : ""} added to <strong>{firstSubName}</strong>.
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
