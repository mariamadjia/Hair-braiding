"use client";

import { useState } from "react";
import { Check, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft, Image as ImageIcon } from "lucide-react";
import type { CategorySummary } from "@/lib/booking-types";
import { slugify } from "../utils";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

// 0=Name  1=Photos  2=Review  3=Done
type Step = 0 | 1 | 2 | 3;

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
    { label: "Review" },
    { label: "Done" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NewCategoryWizard({ token, mutate, onDone, onCancel, onCategorySummariesRefresh }: Props) {
    const [step, setStep] = useState<Step>(0);

    // Local draft — nothing hits the backend until step 2 → 3
    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");
    const [images, setImages] = useState<string[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdCategory, setCreatedCategory] = useState<CategorySummary | null>(null);

    // ── Navigation ───────────────────────────────────────────────────────────
    const goBack = () => setStep(prev => (prev > 0 ? (prev - 1) as Step : prev));

    // ── Step 0 → 1: validate name only (no API) ──────────────────────────────
    const handleStep0Next = () => {
        const trimmed = name.trim();
        if (!trimmed) { setNameError("Category name is required."); return; }
        if (trimmed.length < 2) { setNameError("Name must be at least 2 characters."); return; }
        setNameError("");
        setError(null);
        setStep(1);
    };

    // ── Step 1 → 2: photos are already uploaded to gallery (no categoryId yet) ──
    const handleStep1Next = () => {
        setError(null);
        setStep(2);
    };

    // ── Step 2 → 3: create category + attach photos ──────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            // 1. Create the category record
            const trimmed = name.trim();
            const created = await mutate("POST", "", {
                name: trimmed,
                slug: slugify(trimmed),
                subcategories: [],
            });
            if (!created?.id) throw new Error("Server did not return a category ID.");

            // 2. Attach photos if any were staged
            if (images.length > 0 && created.id) {
                const backendUrls = images
                    .map(fromProxyUrl)
                    .filter((url): url is string => Boolean(url));
                await galleryApi.updateCategoryFlippingImages(created.id, backendUrls);
            }

            setCreatedCategory(created as CategorySummary);
            setStep(3);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ── Final: navigate into the new category editor ─────────────────────────
    const handleFinish = () => {
        if (createdCategory) onDone(createdCategory);
        else onCategorySummariesRefresh?.();
    };

    // ─── Progress bar ─────────────────────────────────────────────────────────
    const ProgressBar = () => (
        <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                done
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                    : active
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 ring-4 ring-neutral-200 dark:ring-neutral-700"
                                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
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

    // ─── Error Banner ─────────────────────────────────────────────────────────
    const ErrorBanner = () => error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
    ) : null;

    // ─── Footer nav ───────────────────────────────────────────────────────────
    const Footer = ({ onNext, nextLabel, nextDisabled, showSkip, onSkip }: {
        onNext: () => void;
        nextLabel: string;
        nextDisabled?: boolean;
        showSkip?: boolean;
        onSkip?: () => void;
    }) => (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700 mt-5">
            <button
                type="button"
                onClick={step === 0 ? onCancel : goBack}
                className={`${btnS} flex items-center gap-1.5`}
            >
                {step === 0 ? "Cancel" : <><ArrowLeft className="w-3.5 h-3.5" />Back</>}
            </button>
            <div className="flex items-center gap-2">
                {showSkip && (
                    <button type="button" onClick={onSkip} className={btnS}>Skip photos</button>
                )}
                <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled}
                    className={`${btnP} flex items-center gap-2`}
                >
                    {nextLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    // ─── Step 0: Name ─────────────────────────────────────────────────────────
    const Step0 = () => (
        <div className="space-y-4">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">What is this category called?</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose a clear name. You can always rename it later.</p>
            </div>
            <ErrorBanner />
            <div>
                <label className={lbl}>Category Name *</label>
                <input
                    className={`${inp} ${nameError ? "border-red-400" : ""}`}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
                    placeholder="e.g. Box Braids, Twists, Locs"
                    autoFocus
                />
                {nameError
                    ? <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameError}</p>
                    : <p className="mt-1.5 text-xs text-neutral-400">Slug: <span className="font-mono">{name.trim() ? slugify(name.trim()) : "—"}</span></p>
                }
            </div>
            <Footer onNext={handleStep0Next} nextLabel="Next" nextDisabled={!name.trim()} />
        </div>
    );

    // ─── Step 1: Photos ───────────────────────────────────────────────────────
    const photoOk = images.length >= 3 && images.length <= 5;
    const Step1 = () => (
        <div className="space-y-4">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add gallery photos</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Upload <strong>3–5</strong> high-quality photos for <span className="font-medium text-neutral-700 dark:text-neutral-300">{name.trim()}</span>. Nothing is saved yet.
                </p>
            </div>
            <ErrorBanner />
            <MultiImageUploader
                images={images}
                token={token}
                onChange={setImages}
            />
            {images.length > 0 && (
                <div className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                    {photoOk
                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        : <AlertTriangle className="w-4 h-4 text-amber-500" />
                    }
                    {images.length < 3
                        ? `${images.length} uploaded — add ${3 - images.length} more`
                        : images.length > 5
                        ? `${images.length} uploaded — remove ${images.length - 5}`
                        : `${images.length} photos ready`}
                </div>
            )}
            <Footer
                onNext={handleStep1Next}
                nextLabel="Next"
                nextDisabled={images.length > 5}
                showSkip={images.length === 0}
                onSkip={handleStep1Next}
            />
        </div>
    );

    // ─── Step 2: Review ───────────────────────────────────────────────────────
    const Step2 = () => (
        <div className="space-y-4">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Review before saving</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Check everything looks right. Nothing has been saved yet.</p>
            </div>
            <ErrorBanner />

            {/* Summary card */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm divide-y divide-neutral-100 dark:divide-neutral-700">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-[10px] font-medium">Name</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{name.trim()}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-[10px] font-medium">URL Slug</span>
                    <span className="font-mono text-neutral-600 dark:text-neutral-400">{slugify(name.trim())}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-[10px] font-medium">Photos</span>
                    <span className={`flex items-center gap-1.5 ${images.length >= 3 ? "text-green-700 dark:text-green-300" : "text-amber-600 dark:text-amber-400"}`}>
                        <ImageIcon className="w-3.5 h-3.5" />
                        {images.length === 0 ? "None — can be added later" : `${images.length} photo${images.length > 1 ? "s" : ""}`}
                        {images.length > 0 && images.length < 3 && " (below minimum of 3)"}
                    </span>
                </div>
            </div>

            {images.length > 0 && images.length < 3 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-sm text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>The category will be saved but you'll need to add {3 - images.length} more photo{3 - images.length > 1 ? "s" : ""} before the gallery is shown publicly.</span>
                </div>
            )}

            <Footer
                onNext={handleSave}
                nextLabel={saving ? "Saving…" : "Save category"}
                nextDisabled={saving}
            />
        </div>
    );

    // ─── Step 3: Done ─────────────────────────────────────────────────────────
    const Step3 = () => (
        <div className="space-y-5 text-center py-4">
            <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">"{createdCategory?.name}" saved</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {images.length >= 3
                        ? `Category saved with ${images.length} photos.`
                        : "Category saved. You can add photos any time from the Edit view."}
                    {" "}Next, add subcategories and service sizes.
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={onCancel} className={btnS}>Back to list</button>
                <button type="button" onClick={handleFinish} className={btnP}>Open &amp; continue editing →</button>
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm bg-white dark:bg-neutral-900">
            <div className="px-5 pt-5">
                <ProgressBar />
            </div>
            <div className="px-5 pb-5">
                {step === 0 && <Step0 />}
                {step === 1 && <Step1 />}
                {step === 2 && <Step2 />}
                {step === 3 && <Step3 />}
            </div>
        </div>
    );
}
