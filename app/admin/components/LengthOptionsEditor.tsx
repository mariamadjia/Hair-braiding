"use client";

import type { LengthOption } from "@/lib/booking-types";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { inp, lbl, btnS } from "../constants";
import { emptyLengthOption } from "../utils";

export function LengthOptionsEditor({ options, onChange }: { options: LengthOption[]; onChange: (opts: LengthOption[]) => void }) {
    const update = (index: number, field: keyof LengthOption, value: string) =>
        onChange(options.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
    const move = (index: number, offset: number) => {
        const target = index + offset;
        if (target < 0 || target >= options.length) return;
        const reordered = [...options];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        onChange(reordered);
    };

    return (
        <fieldset className="space-y-3">
            <legend className={lbl}>Length options</legend>
            {options.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500">No length options. Customers will book using the base price.</p>}
            {options.map((option, index) => (
                <div key={option.id ?? `new-${index}`} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Length {index + 1}</span>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move length ${index + 1} up`} className="rounded p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowUp className="h-4 w-4" /></button>
                            <button type="button" onClick={() => move(index, 1)} disabled={index === options.length - 1} aria-label={`Move length ${index + 1} down`} className="rounded p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowDown className="h-4 w-4" /></button>
                            <button type="button" onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))} aria-label={`Delete length option ${index + 1}`} className="rounded p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label><span className={lbl}>Length name *</span><input className={inp} placeholder="Waist" value={option.name ?? ""} onChange={(event) => update(index, "name", event.target.value)} /></label>
                        <label><span className={lbl}>Price *</span><input className={inp} inputMode="decimal" placeholder="250.00" value={option.price ?? ""} onChange={(event) => update(index, "price", event.target.value)} /></label>
                        <label className="sm:col-span-2"><span className={lbl}>Customer note</span><input className={inp} placeholder="Deposit or preparation note" value={option.notes ?? ""} onChange={(event) => update(index, "notes", event.target.value)} /></label>
                        <label className="sm:col-span-2"><span className={lbl}>Length image URL</span><input className={inp} inputMode="url" placeholder="https://…" value={option.imageUrl ?? ""} onChange={(event) => update(index, "imageUrl", event.target.value)} /></label>
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...options, emptyLengthOption()])} className={`${btnS} inline-flex items-center gap-1.5`}><Plus className="h-3.5 w-3.5" /> Add length option</button>
        </fieldset>
    );
}
