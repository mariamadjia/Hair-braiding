"use client";

import { useState } from "react";
import type { LengthOption } from "@/lib/booking-types";
import { inp, lbl, btnS, btnD } from "../constants";
import { emptyLengthOption } from "../utils";
import { toProxyUrl } from "@/lib/utils/image";

export function LengthOptionsEditor({ options, onChange }: { options: LengthOption[]; onChange: (opts: LengthOption[]) => void }) {
    const update = (i: number, field: keyof LengthOption, val: string) =>
        onChange(options.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));

    const handleImageUpload = (i: number, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            update(i, "imageUrl", e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-2">
            <p className={lbl}>Length Options</p>
            {options.map((opt, i) => (
                <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-2 bg-white dark:bg-neutral-900">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                        <input className={inp} placeholder="Name" value={opt.name ?? ""} onChange={(e) => update(i, "name", e.target.value)} />
                        <input className={inp} placeholder="Price" value={opt.price ?? ""} onChange={(e) => update(i, "price", e.target.value)} />
                        <input className={inp} placeholder="Notes" value={opt.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} />
                        <button type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))} className={btnD}>×</button>
                    </div>
                    <div className="flex items-center gap-3">
                        {opt.imageUrl && (
                            <img src={toProxyUrl(opt.imageUrl)} alt={opt.name || "Length option"} className="w-12 h-12 rounded object-cover border border-neutral-200 dark:border-neutral-700" />
                        )}
                        <label className="cursor-pointer text-xs text-violet-600 dark:text-violet-400 hover:underline">
                            {opt.imageUrl ? "Change image" : "Add image"}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(i, file);
                                }}
                            />
                        </label>
                        {opt.imageUrl && (
                            <button
                                type="button"
                                onClick={() => update(i, "imageUrl", "")}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                                Remove image
                            </button>
                        )}
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...options, emptyLengthOption()])} className={btnS}>+ Length option</button>
        </div>
    );
}
