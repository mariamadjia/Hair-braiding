"use client";

import { useState } from "react";
import { Check, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption } from "../utils";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

// Steps: 0=Name 1=Photos 2=Subcategory 3=Size 4=Lengths 5=Done
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface Props {
    token: string;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    onDone: (summary: CategorySummary) => void;
    onCancel: () => void;
    onCategorySummariesRefresh?: () => Promise<any>;
}

const STEPS = [
    { label: "Name" },
    { label: "Photos" },
    { label: "Subcategory" },
    { label: "Size" },
    { label: "Lengths" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NewCategoryWizard({ token, headers, mutate, onDone, onCancel, onCategorySummariesRefresh }: Props) {
    // ── Shared state ─────────────────────────────────────────────────────────
    const [step, setStep] = useState<Step>(0);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // ── Step 0: Name ─────────────────────────────────────────────────────────
    const [catName, setCatName] = useState("");
    const [catNameError, setCatNameError] = useState("");
    const [createdCat, setCreatedCat] = useState<CategorySummary | null>(null);

    // ── Step 1: Photos ───────────────────────────────────────────────────────
    const [images, setImages] = useState<string[]>([]);

    // ── Step 2: Subcategories ────────────────────────────────────────────────
    const [subNames, setSubNames] = useState<string[]>([""]);   // list of names
    const [subInputError, setSubInputError] = useState("");
    // first created subcategory is used for Steps 3+4
    const [createdSubSlug, setCreatedSubSlug] = useState("");
    const [createdSubId, setCreatedSubId] = useState<number | undefined>();
    const [firstSubName, setFirstSubName] = useState("");

    // ── Step 3: Size (item name) ─────────────────────────────────────────────
    const [sizeName, setSizeName] = useState("");
    const [sizeNameError, setSizeNameError] = useState("");
    const [createdItemId, setCreatedItemId] = useState<number | undefined>();

    // ── Step 4: Length options ───────────────────────────────────────────────
    const [lengthOptions, setLengthOptions] = useState<LengthOption[]>([emptyLengthOption()]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const clearError = () => setError(null);

    const ErrorBanner = () => error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={clearError} className="text-red-400 hover:text-red-600">×</button>
        </div>
    ) : null;

    const NavRow = ({ onBack, onNext, nextLabel = "Next", nextDisabled = false }: {
        onBack?: () => void;
        onNext: () => void;
        nextLabel?: string;
        nextDisabled?: boolean;
    }) => (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
            {onBack ? (
                <button type="button" onClick={onBack} className={`${btnS} flex items-center gap-1.5`}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
            ) : (
                <button type="button" onClick={onCancel} className={btnS}>Cancel</button>
            )}
            <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || busy}
                className={`${btnP} flex items-center gap-2`}
            >
                {busy ? "Saving..." : nextLabel}
                {!busy && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
        </div>
    );

    // ─── Progress bar ─────────────────────────────────────────────────────────

    const ProgressBar = () => (
        <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                    <div key={i} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                done
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                    : active
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 ring-4 ring-neutral-200 dark:ring-neutral-700"
                                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
                            }`}>
                                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-widest whitespace-nowrap ${
                                active ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
                            }`}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px mx-2 mb-5 transition-all ${
                                done ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
                            }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );

    // ─── Step 0: Name ─────────────────────────────────────────────────────────

    const handleStep0Next = async () => {
        const trimmed = catName.trim();
        if (!trimmed) { setCatNameError("Category name is required."); return; }
        if (trimmed.length < 2) { setCatNameError("Name must be at least 2 characters."); return; }
        setCatNameError(""); clearError(); setBusy(true);
        try {
            const created = await mutate("POST", "", { name: trimmed, slug: slugify(trimmed), subcategories: [] });
            if (!created?.id) throw new Error("Server did not return a category ID.");
            setCreatedCat(created as CategorySummary);
            setStep(1);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create category. Please try again.");
        } finally { setBusy(false); }
    };

    const Step0 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">What is this category called?</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose a clear, descriptive name — you can change it later.</p>
            </div>
            <ErrorBanner />
            <div>
                <label className={lbl}>Category Name <span className="text-red-500">*</span></label>
                <input
                    className={`${inp} ${catNameError ? "border-red-400" : ""}`}
                    value={catName}
                    onChange={(e) => { setCatName(e.target.value); setCatNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
                    placeholder="e.g. Box Braids, Twists, Locs"
                    autoFocus
                />
                {catNameError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{catNameError}
                    </p>
                )}
                <p className="mt-1.5 text-xs text-neutral-400">
                    URL slug: <span className="font-mono">{catName.trim() ? slugify(catName.trim()) : "—"}</span>
                </p>
            </div>
            <NavRow onNext={handleStep0Next} nextDisabled={!catName.trim()} />
        </div>
    );

    // ─── Step 1: Photos ───────────────────────────────────────────────────────

    const handleStep1Next = async () => {
        if (!createdCat?.id) { setError("Category ID missing."); return; }
        if (images.length < 3) { setError("Upload at least 3 photos to continue."); return; }
        if (images.length > 5) { setError("Maximum 5 photos allowed."); return; }
        clearError(); setBusy(true);
        try {
            const backendUrls = images.map(fromProxyUrl).filter((u): u is string => Boolean(u));
            await galleryApi.updateCategoryFlippingImages(createdCat.id!, backendUrls);
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save photos. Please try again.");
        } finally { setBusy(false); }
    };

    const photoOk = images.length >= 3 && images.length <= 5;

    const Step1 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add gallery photos</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Upload <strong>3 to 5</strong> photos for <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCat?.name}</span>. These appear in the public gallery.
                </p>
            </div>
            <ErrorBanner />
            <MultiImageUploader images={images} token={token} categoryId={createdCat?.id} onChange={setImages} />
            {images.length > 0 && (
                <div className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                    {photoOk
                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {images.length < 3
                        ? `${images.length} uploaded — add ${3 - images.length} more`
                        : images.length > 5
                        ? `${images.length} uploaded — remove ${images.length - 5} (max 5)`
                        : `${images.length} photos ready`}
                </div>
            )}
            <NavRow onBack={() => setStep(0)} onNext={handleStep1Next} nextLabel="Save & Continue" nextDisabled={!photoOk} />
        </div>
    );

    // ─── Step 2: Subcategories ────────────────────────────────────────────────

    const addSubRow = () => setSubNames(prev => [...prev, ""]);
    const updateSubRow = (i: number, val: string) => {
        setSubInputError("");
        setSubNames(prev => prev.map((n, idx) => idx === i ? val : n));
    };
    const removeSubRow = (i: number) => setSubNames(prev => prev.filter((_, idx) => idx !== i));

    const handleStep2Next = async () => {
        const filled = subNames.map(n => n.trim()).filter(Boolean);
        if (filled.length === 0) { setSubInputError("Add at least one subcategory name."); return; }
        if (filled.some(n => n.length < 2)) { setSubInputError("Each name must be at least 2 characters."); return; }
        setSubInputError(""); clearError(); setBusy(true);
        try {
            let firstSlug = "";
            let firstId: number | undefined;
            let firstName = "";
            for (const name of filled) {
                const created = await mutate("POST", `/${createdCat!.slug}/subcategories`, {
                    name,
                    categoryId: createdCat!.id,
                });
                if (!created?.slug) throw new Error(`Server did not return a slug for "${name}".`);
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

    const canAdvanceStep2 = subNames.some(n => n.trim().length >= 2);

    const Step2 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add subcategories</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Subcategories group the styles within <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCat?.name}</span>.
                    Add as many as you need — e.g. Knotless, Goddess, Bohemian.
                </p>
            </div>
            <ErrorBanner />

            <div className="space-y-2">
                <label className={lbl}>Subcategory Names <span className="text-red-500">*</span></label>
                {subNames.map((val, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            className={`${inp} flex-1 ${subInputError && !val.trim() ? "border-red-400" : ""}`}
                            value={val}
                            onChange={(e) => updateSubRow(i, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubRow(); } }}
                            placeholder={i === 0 ? "e.g. Knotless" : "e.g. Goddess"}
                            autoFocus={i === subNames.length - 1 && i > 0}
                        />
                        {subNames.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeSubRow(i)}
                                className={btnD}
                                title="Remove"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                ))}
                {subInputError && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{subInputError}
                    </p>
                )}
                <button type="button" onClick={addSubRow} className={`${btnS} flex items-center gap-1.5 text-xs`}>
                    <Plus className="w-3.5 h-3.5" /> Add another subcategory
                </button>
            </div>

            <NavRow onBack={() => setStep(1)} onNext={handleStep2Next} nextDisabled={!canAdvanceStep2} />
        </div>
    );

    // ─── Step 3: Size ─────────────────────────────────────────────────────────

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
            if (created?.id) setCreatedItemId(created.id);
            setStep(4);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create size. Please try again.");
        } finally { setBusy(false); }
    };

    const Step3 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add a size</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Sizes represent the braid dimensions offered under <span className="font-medium text-neutral-700 dark:text-neutral-300">{firstSubName}</span>. Common sizes: Small, Medium, Large, Jumbo.
                </p>
            </div>
            <ErrorBanner />
            <div>
                <label className={lbl}>Size Name <span className="text-red-500">*</span></label>
                <input
                    className={`${inp} ${sizeNameError ? "border-red-400" : ""}`}
                    value={sizeName}
                    onChange={(e) => { setSizeName(e.target.value); setSizeNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep3Next()}
                    placeholder="e.g. Small, Medium, Large, Jumbo"
                    autoFocus
                />
                {sizeNameError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{sizeNameError}
                    </p>
                )}
            </div>
            <NavRow onBack={() => setStep(2)} onNext={handleStep3Next} nextDisabled={!sizeName.trim()} />
        </div>
    );

    // ─── Step 4: Length options ───────────────────────────────────────────────

    const updateLength = (i: number, field: keyof LengthOption, val: string) =>
        setLengthOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
    const addLength = () => setLengthOptions(prev => [...prev, emptyLengthOption()]);
    const removeLength = (i: number) => setLengthOptions(prev => prev.filter((_, idx) => idx !== i));

    const lengthsValid = lengthOptions.length > 0 &&
        lengthOptions.every(o => (o.name ?? "").trim() !== "" && (o.price ?? "").trim() !== "");

    const handleStep4Next = async () => {
        if (!lengthsValid) { setError("Each length option needs a name and a price."); return; }
        clearError(); setBusy(true);
        try {
            if (createdItemId) {
                await mutate(
                    "PUT",
                    `/${createdCat!.slug}/subcategories/${createdSubSlug}/items/${createdItemId}`,
                    { name: sizeName, price: "", description: "", subcategoryId: createdSubId, lengthOptions }
                );
            }
            setStep(5);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save length options. Please try again.");
        } finally { setBusy(false); }
    };

    const Step4 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add length options</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Each length option has a name (e.g. 16") and a price. Add as many as you offer for <span className="font-medium text-neutral-700 dark:text-neutral-300">{sizeName}</span>.
                </p>
            </div>
            <ErrorBanner />

            <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 px-1">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Length</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Price</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Notes</span>
                    <span />
                </div>
                {lengthOptions.map((opt, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                        <input
                            className={`${inp} ${!(opt.name ?? "").trim() ? "border-red-300" : ""}`}
                            placeholder='e.g. 16"'
                            value={opt.name ?? ""}
                            onChange={(e) => updateLength(i, "name", e.target.value)}
                        />
                        <input
                            className={`${inp} ${!(opt.price ?? "").trim() ? "border-red-300" : ""}`}
                            placeholder="e.g. $180"
                            value={opt.price ?? ""}
                            onChange={(e) => updateLength(i, "price", e.target.value)}
                        />
                        <input
                            className={inp}
                            placeholder="e.g. $50 deposit"
                            value={opt.notes ?? ""}
                            onChange={(e) => updateLength(i, "notes", e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => removeLength(i)}
                            disabled={lengthOptions.length === 1}
                            className={`${btnD} disabled:opacity-30`}
                            title="Remove"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={addLength} className={`${btnS} flex items-center gap-1.5 text-xs`}>
                    <Plus className="w-3.5 h-3.5" /> Add another length
                </button>
            </div>

            <NavRow
                onBack={() => setStep(3)}
                onNext={handleStep4Next}
                nextLabel="Save & Finish"
                nextDisabled={!lengthsValid}
            />
        </div>
    );

    // ─── Step 5: Done ─────────────────────────────────────────────────────────

    const handleFinish = () => {
        if (createdCat) onDone(createdCat);
        else onCategorySummariesRefresh?.();
    };

    const Step5 = () => (
        <div className="space-y-5 text-center py-4">
            <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                    "{createdCat?.name}" is ready
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 space-y-0.5">
                    <span className="block">Category created with {images.length} photos.</span>
                    <span className="block">{subNames.filter(n => n.trim()).length} subcategor{subNames.filter(n => n.trim()).length === 1 ? 'y' : 'ies'} created ({subNames.filter(n => n.trim()).join(', ')}).</span>
                    <span className="block">Size <strong>{sizeName}</strong> → {lengthOptions.length} length option{lengthOptions.length !== 1 ? "s" : ""} added to <strong>{firstSubName}</strong>.</span>
                    <span className="block mt-2">You can add more subcategories, sizes, and lengths from the editor.</span>
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={onCancel} className={btnS}>Back to list</button>
                <button type="button" onClick={handleFinish} className={btnP}>
                    Open editor →
                </button>
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm bg-white dark:bg-neutral-900">
            <div className="px-5 pt-5">
                <ProgressBar />
            </div>
            <div className="px-5 pb-5 space-y-0">
                {step === 0 && <Step0 />}
                {step === 1 && <Step1 />}
                {step === 2 && <Step2 />}
                {step === 3 && <Step3 />}
                {step === 4 && <Step4 />}
                {step === 5 && <Step5 />}
            </div>
        </div>
    );
}
