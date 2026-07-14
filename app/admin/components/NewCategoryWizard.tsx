"use client";

import { useState } from "react";
import { Check, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import type { CategorySummary } from "@/lib/booking-types";
import { slugify } from "../utils";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2; // 0 = Name, 1 = Photos, 2 = Done

interface Props {
    token: string;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    onDone: (summary: CategorySummary) => void;
    onCancel: () => void;
    onCategorySummariesRefresh?: () => Promise<any>;
}

// ─── Step Metadata ────────────────────────────────────────────────────────────

const STEPS = [
    { label: "Name" },
    { label: "Photos" },
    { label: "Done" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NewCategoryWizard({ token, headers, mutate, onDone, onCancel, onCategorySummariesRefresh }: Props) {
    const [step, setStep] = useState<Step>(0);
    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [createdCategory, setCreatedCategory] = useState<CategorySummary | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Step 0 → 1: create the category record ──────────────────────────────
    const handleStep0Next = async () => {
        const trimmed = name.trim();
        if (!trimmed) { setNameError("Category name is required."); return; }
        if (trimmed.length < 2) { setNameError("Name must be at least 2 characters."); return; }
        setNameError("");
        setCreating(true);
        setError(null);
        try {
            const created = await mutate("POST", "", { name: trimmed, slug: slugify(trimmed), subcategories: [] });
            if (!created?.id) throw new Error("Server did not return a category ID.");
            setCreatedCategory(created as CategorySummary);
            setStep(1);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create category. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    // ── Step 1 → 2: attach photos ────────────────────────────────────────────
    const handleStep1Next = async () => {
        if (!createdCategory?.id) { setError("Category ID missing — cannot save photos."); return; }
        if (images.length < 3) { setError("Please upload at least 3 photos before continuing."); return; }
        if (images.length > 5) { setError("Maximum 5 photos allowed."); return; }
        setSaving(true);
        setError(null);
        try {
            const backendUrls = images
                .map(fromProxyUrl)
                .filter((url): url is string => Boolean(url));
            await galleryApi.updateCategoryFlippingImages(createdCategory.id!, backendUrls);
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save photos. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ── Step 1: skip photos ──────────────────────────────────────────────────
    const handleSkipPhotos = () => setStep(2);

    // ── Final: notify parent ─────────────────────────────────────────────────
    const handleFinish = () => {
        if (createdCategory) onDone(createdCategory);
        else onCategorySummariesRefresh?.();
    };

    // ── Back ─────────────────────────────────────────────────────────────────
    const handleBack = () => {
        if (step === 1) setStep(0);
    };

    // ─── Progress bar ────────────────────────────────────────────────────────
    const ProgressBar = () => (
        <div className="flex items-center gap-0 mb-8">
            {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                    <div key={i} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1.5">
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

    // ─── Error Banner ────────────────────────────────────────────────────────
    const ErrorBanner = () => error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
    ) : null;

    // ─── Step 0: Name ─────────────────────────────────────────────────────────
    const Step0 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">What is this category called?</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Choose a clear, descriptive name. You can change it later.
                </p>
            </div>
            <ErrorBanner />
            <div>
                <label className={lbl}>Category Name *</label>
                <input
                    className={`${inp} ${nameError ? "border-red-400 focus:border-red-500" : ""}`}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
                    placeholder="e.g. Box Braids, Twists, Locs"
                    autoFocus
                />
                {nameError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{nameError}
                    </p>
                )}
                <p className="mt-1.5 text-xs text-neutral-400">
                    URL slug: <span className="font-mono">{name.trim() ? slugify(name.trim()) : "—"}</span>
                </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={onCancel} className={btnS}>Cancel</button>
                <button
                    type="button"
                    onClick={handleStep0Next}
                    disabled={!name.trim() || creating}
                    className={`${btnP} flex items-center gap-2`}
                >
                    {creating ? "Creating..." : "Next"}
                    {!creating && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );

    // ─── Step 1: Photos ───────────────────────────────────────────────────────
    const photoStatus = images.length === 0
        ? null
        : images.length >= 3 && images.length <= 5
        ? "ok"
        : "warn";

    const Step1 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add gallery photos</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Upload <strong>3 to 5</strong> high-quality photos. These appear in the public gallery for <span className="font-medium text-neutral-700 dark:text-neutral-300">{createdCategory?.name}</span>.
                </p>
            </div>
            <ErrorBanner />

            <MultiImageUploader
                images={images}
                token={token}
                categoryId={createdCategory?.id}
                onChange={setImages}
            />

            {/* Photo count feedback */}
            {photoStatus && (
                <div className={`flex items-center gap-2 text-sm ${photoStatus === "ok" ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                    {photoStatus === "ok"
                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
                        : <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden />
                    }
                    {images.length < 3
                        ? `${images.length} uploaded — add ${3 - images.length} more`
                        : images.length > 5
                        ? `${images.length} uploaded — remove ${images.length - 5} (max 5)`
                        : `${images.length} photos ready`}
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={handleBack} className={`${btnS} flex items-center gap-1.5`}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleSkipPhotos} className={btnS}>
                        Skip for now
                    </button>
                    <button
                        type="button"
                        onClick={handleStep1Next}
                        disabled={images.length < 3 || images.length > 5 || saving}
                        className={`${btnP} flex items-center gap-2`}
                    >
                        {saving ? "Saving..." : "Save & Finish"}
                        {!saving && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );

    // ─── Step 2: Done ─────────────────────────────────────────────────────────
    const Step2 = () => (
        <div className="space-y-5 text-center py-4">
            <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                    "{createdCategory?.name}" created
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {images.length >= 3
                        ? `Category created with ${images.length} photos.`
                        : "Category created. You can add photos any time from the Edit view."}
                    {" "}Next, add subcategories and service sizes.
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={onCancel} className={btnS}>Back to list</button>
                <button type="button" onClick={handleFinish} className={btnP}>
                    Open &amp; continue editing →
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
            <div className="px-5 pb-5">
                {step === 0 && <Step0 />}
                {step === 1 && <Step1 />}
                {step === 2 && <Step2 />}
            </div>
        </div>
    );
}
