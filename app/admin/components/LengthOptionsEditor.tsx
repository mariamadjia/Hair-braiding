"use client";

import type { LengthOption } from "@/lib/booking-types";
import { inp, lbl, btnS, btnD } from "../constants";
import { emptyLengthOption } from "../utils";

export function LengthOptionsEditor({
    options,
    onChange,
    priceField = "price",
    title = "Length Options",
    contextLabel,
    editStructure = true,
}: {
    options: LengthOption[];
    onChange: (opts: LengthOption[]) => void;
    priceField?: "price" | "knotlessPrice";
    title?: string;
    contextLabel?: string;
    editStructure?: boolean;
}) {
    const update = (i: number, field: keyof LengthOption, val: string) =>
        onChange(options.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
                <p className={lbl}>{title}</p>
                {contextLabel?.trim() && <p className="max-w-[45%] truncate font-serif text-base font-semibold text-[#5d2f1d] sm:text-lg dark:text-amber-200">{contextLabel}</p>}
            </div>
            <div className="hidden grid-cols-[1fr_1fr_auto] gap-1.5 px-3 text-xs font-semibold text-neutral-500 sm:grid">
                <span>Length</span><span>Price</span><span className="w-9" />
            </div>
            {options.map((opt, i) => (
                <div key={opt.id ?? `new-${i}`} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-2 bg-white dark:bg-neutral-900">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                        <input aria-label={`Length option ${i + 1} name`} className={inp} placeholder="Name" value={opt.name ?? ""} readOnly={!editStructure} onChange={(e) => update(i, "name", e.target.value)} />
                        <input aria-label={`Length option ${i + 1} ${priceField === "price" ? "Regular" : "Knotless"} price`} inputMode="decimal" className={inp} placeholder="$Price" value={`$${(opt[priceField] ?? "").replace(/^\$+/, "")}`} onChange={(e) => update(i, priceField, e.target.value.replace(/^\$+/, ""))} />
                        {editStructure ? <button aria-label={`Delete length option ${i + 1}`} type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))} className={btnD}>×</button> : <span className="w-9" />}
                    </div>
                </div>
            ))}
            {editStructure && <button type="button" onClick={() => onChange([...options, emptyLengthOption()])} className={btnS}>+ Length option</button>}
        </div>
    );
}
