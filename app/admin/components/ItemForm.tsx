"use client";

import { useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { LengthOptionsEditor } from "./LengthOptionsEditor";

export function ItemForm({ initial, token, onSave, onCancel }: { initial: BookingItem; token: string; onSave: (item: BookingItem) => void; onCancel: () => void }) {
    const [item, setItem] = useState<BookingItem>(initial);
    const set = (field: keyof BookingItem, val: unknown) => setItem((prev) => ({ ...prev, [field]: val }));

    const allImages = item.images?.length ? item.images : item.image ? [item.image] : [];
    const setImages = (urls: string[]) => setItem((prev) => ({ ...prev, images: urls, image: urls[0] ?? "" }));

    return (
        <div className="border border-neutral-200 rounded-sm p-3 space-y-2.5 bg-neutral-50">
            <div><label className={lbl}>Size *</label><input className={inp} value={item.name} onChange={(e) => set("name", e.target.value)} /></div>
            <MultiImageUploader images={allImages} token={token} onChange={setImages} />
            <LengthOptionsEditor options={item.lengthOptions ?? []} onChange={(opts) => set("lengthOptions", opts)} />
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => {
                    console.log("Saving item:", item);
                    onSave(item);
                }} className={btnP} disabled={!item.name.trim()}>Save</button>
                <button type="button" onClick={onCancel} className={btnS}>Cancel</button>
            </div>
        </div>
    );
}
