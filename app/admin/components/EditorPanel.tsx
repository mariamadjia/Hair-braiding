"use client";

import type { CategoriesData } from "@/lib/booking-types";
import { RootEditor } from "./RootEditor";
import { CategoryEditor } from "./CategoryEditor";
import { SubcategoryEditor } from "./SubcategoryEditor";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function EditorPanel({ data, selection, setSelection, token, onUpdate }: {
    data: CategoriesData;
    selection: Selection;
    setSelection: (s: Selection) => void;
    token: string;
    onUpdate: (data: CategoriesData) => void;
}) {
    const headers = { 
        "Content-Type": "application/json", 
        "x-admin-token": token,
        "Authorization": `Bearer ${token}`
    };

    const mutate = async (method: string, path: string, body?: object) => {
        console.log(`[MUTATE] ${method} /api/admin/categories${path}`, body);
        const res = await fetch(`/api/admin/categories${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
        console.log(`[MUTATE] Response status: ${res.status}`);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[MUTATE] Error: ${res.status} - ${errorText}`);
            throw new Error(`Failed to ${method} ${path}: ${res.status} ${errorText}`);
        }
        
        const updated: CategoriesData = await res.json();
        console.log(`[MUTATE] Success, categories updated`);
        onUpdate(updated);
        return updated;
    };

    if (selection.type === "root") {
        return <RootEditor data={data} headers={headers} mutate={mutate} setSelection={setSelection} />;
    }

    const cat = data.categories.find((c) => c.slug === selection.catSlug)!;

    if (selection.type === "category") {
        return <CategoryEditor cat={cat} token={token} headers={headers} mutate={mutate} setSelection={setSelection} />;
    }

    const sub = (cat.subcategories ?? []).find((s) => s.slug === selection.subSlug)!;
    return <SubcategoryEditor cat={cat} sub={sub} token={token} headers={headers} mutate={mutate} setSelection={setSelection} onUpdate={onUpdate} />;
}
