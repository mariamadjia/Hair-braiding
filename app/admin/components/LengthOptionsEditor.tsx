"use client";

import type { LengthOption } from "@/lib/booking-types";
import { inp, lbl, btnS, btnD } from "../constants";
import { emptyLengthOption } from "../utils";

export function LengthOptionsEditor({ options, onChange }: { options: LengthOption[]; onChange: (opts: LengthOption[]) => void }) {
    const update = (i: number, field: keyof LengthOption, val: string) =>
        onChange(options.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));
    return (
        <div className="space-y-2">
            <p className={lbl}>Length Options</p>
            {options.map((opt, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <input className={inp} placeholder="Name" value={opt.name ?? ""} onChange={(e) => update(i, "name", e.target.value)} />
                    <input className={inp} placeholder="Price" value={opt.price ?? ""} onChange={(e) => update(i, "price", e.target.value)} />
                    <input className={inp} placeholder="Notes" value={opt.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} />
                    <button type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))} className={btnD}>×</button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...options, emptyLengthOption()])} className={btnS}>+ Length option</button>
        </div>
    );
}
