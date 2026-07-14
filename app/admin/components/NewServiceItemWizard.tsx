"use client";

import { useState } from "react";
import {
    Check, ChevronRight, ArrowLeft, AlertCircle,
    CheckCircle, AlertTriangle, Image as ImageIcon,
    Layers, Ruler, Tag,
} from "lucide-react";
import type { BookingItem, LengthOption, SubcategorySummary } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { emptyLengthOption, formatPrice } from "../utils";
import { MultiImageUploader } from "./MultiImageUploader";

// ─── Types ────────────────────────────────────────────────────────────────────

// 0=Name  1=Photos  2=Subcategory  3=Lengths  4=Review  5=Done
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "Name",        icon: Tag },
    { label: "Photos",      icon: ImageIcon },
    { label: "Subcategory", icon: Layers },
    { label: "Lengths",     icon: Ruler },
    { label: "Review",      icon: Check },
];

interface Props {
    token: string;
    categoryId?: number;
    subcategories: SubcategorySummary[];          // existing subs to choose from
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    catSlug: string;
    onDone: () => void;
    onCancel: () => void;
}

const SIZE_SUGGESTIONS = ["XSmall", "Small", "Medium", "Smedium", "Large", "Jumbo"];

// ─── Component ────────────────────────────────────────────────────────────────

export function NewServiceItemWizard({
    token, categoryId, subcategories, mutate, catSlug, onDone, onCancel,
}: Props) {
    const [step, setStep] = useState<Step>(0);

    // ── Draft state (nothing hits backend until final save) ──────────────────
    const [name, setName]           = useState("");
    const [nameError, setNameError] = useState("");
    const [images, setImages]       = useState<string[]>([]);
    const [selectedSub, setSelectedSub] = useState<SubcategorySummary | null>(null);
    const [subError, setSubError]   = useState("");
    const [lengths, setLengths]     = useState<LengthOption[]>([emptyLengthOption()]);
    const [lengthError, setLengthError] = useState("");

    // ── Save state ───────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState<string | null>(null);
    const [done, setDone]     = useState(false);

    // ── Navigation ───────────────────────────────────────────────────────────
    const goBack  = () => { setError(null); setStep(prev => (prev > 0 ? (prev - 1) as Step : prev)); };

    // ── Step validators ──────────────────────────────────────────────────────
    const validateName = () => {
        if (!name.trim()) { setNameError("Size name is required."); return false; }
        if (name.trim().length < 2) { setNameError("Must be at least 2 characters."); return false; }
        setNameError(""); return true;
    };
    const validateSub = () => {
        if (!selectedSub) { setSubError("Please select a subcategory."); return false; }
        setSubError(""); return true;
    };
    const validateLengths = () => {
        const filled = lengths.filter(l => l.name?.trim() && l.price?.trim());
        if (filled.length === 0) { setLengthError("Add at least one length option with a name and price."); return false; }
        setLengthError(""); return true;
    };

    // ── Step next handlers ───────────────────────────────────────────────────
    const step0Next = () => { if (validateName()) { setError(null); setStep(1); } };
    const step1Next = () => { setError(null); setStep(2); };           // photos optional
    const step2Next = () => { if (validateSub()) { setError(null); setStep(3); } };
    const step3Next = () => { if (validateLengths()) { setError(null); setStep(4); } };

    // ── Final save ───────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedSub) return;
        setSaving(true); setError(null);
        try {
            const validLengths = lengths.filter(l => l.name?.trim() && l.price?.trim());
            const item: BookingItem = {
                name: name.trim(),
                price: validLengths[0]?.price ?? "",
                description: "",
                image: images[0] ?? "",
                images,
                lengthOptions: validLengths,
            };
            await mutate(
                "POST",
                `/${catSlug}/subcategories/${selectedSub.slug}/items`,
                { ...item, subcategoryId: selectedSub.id },
            );
            setDone(true);
            setStep(5);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ── Length helpers ───────────────────────────────────────────────────────
    const updateLength = (i: number, field: keyof LengthOption, val: string) =>
        setLengths(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
    const addLength    = () => setLengths(prev => [...prev, emptyLengthOption()]);
    const removeLength = (i: number) => setLengths(prev => prev.filter((_, idx) => idx !== i));

    // ─── Shared UI ────────────────────────────────────────────────────────────

    const ProgressBar = () => (
        <div className="flex items-center mb-7">
            {STEPS.map((s, i) => {
                const done  = i < step;
                const active = i === step;
                return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                done    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                : active ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 ring-4 ring-neutral-200 dark:ring-neutral-700"
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

    const ErrorBanner = () => error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
    ) : null;

    const StepHeader = ({ title, hint }: { title: string; hint: string }) => (
        <div className="mb-5">
            <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">{title}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>
        </div>
    );

    const Footer = ({
        onNext, nextLabel = "Next", nextDisabled = false,
    }: { onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) => (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700 mt-5">
            <button
                type="button"
                onClick={step === 0 ? onCancel : goBack}
                className={`${btnS} flex items-center gap-1.5`}
            >
                {step === 0 ? "Cancel" : <><ArrowLeft className="w-3.5 h-3.5" />Back</>}
            </button>
            <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled}
                className={`${btnP} flex items-center gap-2 disabled:opacity-40`}
            >
                {nextLabel}
                {!nextDisabled && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
        </div>
    );

    // ─── Step 0: Name ─────────────────────────────────────────────────────────
    const Step0 = () => (
        <>
            <StepHeader
                title="What size is this service?"
                hint="Enter the size name. Use a common term like Small, Medium, or Large."
            />
            <ErrorBanner />
            <div>
                <label className={lbl}>Size Name *</label>
                <input
                    className={`${inp} ${nameError ? "border-red-400" : ""}`}
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(""); }}
                    onKeyDown={e => e.key === "Enter" && step0Next()}
                    placeholder="e.g. Medium, Large, Jumbo"
                    autoFocus
                />
                {nameError
                    ? <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameError}</p>
                    : <p className="mt-1.5 text-xs text-neutral-400">Nothing is saved yet — you'll review everything before submitting.</p>
                }
                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {SIZE_SUGGESTIONS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => { setName(s); setNameError(""); }}
                            className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                                name === s
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                    : "border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
            <Footer onNext={step0Next} nextDisabled={!name.trim()} />
        </>
    );

    // ─── Step 1: Photos ───────────────────────────────────────────────────────
    const photoOk = images.length >= 1;
    const Step1 = () => (
        <>
            <StepHeader
                title="Add a photo"
                hint="Upload at least 1 photo showing this size. This helps customers know what to expect."
            />
            <ErrorBanner />
            <MultiImageUploader
                images={images}
                token={token}
                categoryId={categoryId}
                onChange={setImages}
            />
            {images.length > 0 && (
                <div className={`flex items-center gap-2 text-sm mt-3 ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    {images.length} photo{images.length > 1 ? "s" : ""} ready
                </div>
            )}
            {images.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> At least 1 photo is required to continue.
                </p>
            )}
            <Footer onNext={step1Next} nextLabel="Next" nextDisabled={images.length === 0} />
        </>
    );

    // ─── Step 2: Subcategory ──────────────────────────────────────────────────
    const Step2 = () => (
        <>
            <StepHeader
                title="Which subcategory does this belong to?"
                hint="Select the subcategory this size will appear under."
            />
            <ErrorBanner />
            {subcategories.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-sm text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>No subcategories exist yet. Go back and create a subcategory first before adding a service item.</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {subcategories.map(sub => (
                        <button
                            key={sub.id ?? sub.slug}
                            type="button"
                            onClick={() => { setSelectedSub(sub); setSubError(""); }}
                            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-sm border text-sm transition-colors ${
                                selectedSub?.slug === sub.slug
                                    ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-white"
                                    : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500"
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                                selectedSub?.slug === sub.slug
                                    ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white"
                                    : "border-neutral-300 dark:border-neutral-600"
                            }`} />
                            {sub.name}
                        </button>
                    ))}
                </div>
            )}
            {subError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{subError}
                </p>
            )}
            <Footer onNext={step2Next} nextDisabled={subcategories.length === 0 || !selectedSub} />
        </>
    );

    // ─── Step 3: Lengths ──────────────────────────────────────────────────────
    const Step3 = () => (
        <>
            <StepHeader
                title="Add length options"
                hint="Each length option has a name (e.g. 18″), a price, and optional notes. Add at least one."
            />
            <ErrorBanner />
            <div className="space-y-2">
                {lengths.map((opt, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                        <div>
                            {i === 0 && <label className={lbl}>Length</label>}
                            <input
                                className={inp}
                                placeholder='e.g. 18"'
                                value={opt.name ?? ""}
                                onChange={e => updateLength(i, "name", e.target.value)}
                            />
                        </div>
                        <div>
                            {i === 0 && <label className={lbl}>Price</label>}
                            <input
                                className={inp}
                                placeholder="e.g. $150"
                                value={opt.price ?? ""}
                                onChange={e => updateLength(i, "price", e.target.value)}
                            />
                        </div>
                        <div>
                            {i === 0 && <label className={lbl}>Notes</label>}
                            <input
                                className={inp}
                                placeholder="e.g. deposit required"
                                value={opt.notes ?? ""}
                                onChange={e => updateLength(i, "notes", e.target.value)}
                            />
                        </div>
                        <div className={i === 0 ? "mt-5" : ""}>
                            <button
                                type="button"
                                onClick={() => removeLength(i)}
                                disabled={lengths.length === 1}
                                className={`${btnD} disabled:opacity-30`}
                                title="Remove"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {lengthError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{lengthError}
                </p>
            )}
            <button type="button" onClick={addLength} className={`${btnS} mt-2`}>
                + Add length
            </button>
            <Footer onNext={step3Next} />
        </>
    );

    // ─── Step 4: Review ───────────────────────────────────────────────────────
    const validLengths = lengths.filter(l => l.name?.trim() && l.price?.trim());
    const Step4 = () => (
        <>
            <StepHeader
                title="Review before saving"
                hint="Check all details. Nothing has been saved yet — click Save to confirm."
            />
            <ErrorBanner />
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm divide-y divide-neutral-100 dark:divide-neutral-700">
                {/* Name */}
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Size Name</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{name.trim()}</span>
                </div>
                {/* Subcategory */}
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Subcategory</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedSub?.name}</span>
                </div>
                {/* Photos */}
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Photos</span>
                    <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {images.length} photo{images.length !== 1 ? "s" : ""}
                    </span>
                </div>
                {/* Lengths */}
                <div className="px-4 py-3 text-sm">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400 block mb-2">
                        Length Options ({validLengths.length})
                    </span>
                    <div className="space-y-1">
                        {validLengths.map((l, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-sm">
                                <span className="text-neutral-700 dark:text-neutral-300">{l.name}</span>
                                <span className="font-medium text-neutral-900 dark:text-white">{l.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer
                onNext={handleSave}
                nextLabel={saving ? "Saving…" : "Save service item"}
                nextDisabled={saving}
            />
        </>
    );

    // ─── Step 5: Done ─────────────────────────────────────────────────────────
    const Step5 = () => (
        <div className="text-center py-4 space-y-5">
            <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">"{name.trim()}" added</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Saved under <span className="font-medium text-neutral-700 dark:text-neutral-300">{selectedSub?.name}</span> with {validLengths.length} length option{validLengths.length !== 1 ? "s" : ""}.
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button type="button" onClick={onDone} className={btnP}>Done</button>
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
                {step === 4 && <Step4 />}
                {step === 5 && <Step5 />}
            </div>
        </div>
    );
}
