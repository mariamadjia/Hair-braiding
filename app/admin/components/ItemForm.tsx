"use client";

import { useEffect, useState } from "react";
import type { BookingItem } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { LengthOptionsEditor } from "./LengthOptionsEditor";
import { toProxyUrl } from "@/lib/utils/image";

export function ItemForm({
  initial,
  token,
  categoryId,
  subcategoryId,
  onSave,
  onCancel,
}: {
  initial: BookingItem;
  token: string;
  categoryId?: number;
  subcategoryId?: number;
  onSave: (item: BookingItem) => void;
  onCancel: () => void;
}) {
    const [item, setItem] = useState<BookingItem>(initial);

    useEffect(() => {
        setItem(initial);
    }, [initial.id, initial.name]);

    const set = (field: keyof BookingItem, val: unknown) => setItem((prev) => ({ ...prev, [field]: val }));

    const rawImages = item.images?.length ? item.images : item.image ? [item.image] : [];
    const displayImages = rawImages.map(toProxyUrl).filter(Boolean);
    const setImages = (urls: string[]) => setItem((prev) => ({ ...prev, images: urls, image: urls[0] ?? "" }));

    return (
        <div className="border border-neutral-200 rounded-sm p-3 space-y-2.5 bg-neutral-50">
            <div><label className={lbl}>Size *</label><input className={inp} value={item.name} onChange={(e) => set("name", e.target.value)} /></div>
            <MultiImageUploader
                images={displayImages}
                token={token}
                categoryId={categoryId}
                subcategoryId={subcategoryId}
                serviceItemId={item.id}
                onChange={setImages}
            />
            <LengthOptionsEditor
                options={item.lengthOptions ?? []}
                onChange={(opts) => set("lengthOptions", opts)}
            />
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
