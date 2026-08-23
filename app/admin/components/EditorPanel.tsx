"use client";

import React from "react";
import type { CategoriesData, CategorySummary, SubcategorySummary } from "@/lib/booking-types";
import { RootEditor } from "./RootEditor";
import { CategoryEditor } from "./CategoryEditor";
import { SubcategoryEditor } from "./SubcategoryEditor";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function EditorPanel({ 
    data, 
    selection, 
    setSelection, 
    token, 
    onUpdate,
    categorySummaries,
    subcategoryDetailsCache,
    onLoadSubcategorySummaries,
    onLoadSubcategoryDetail,
    isLoadingSubcategorySummaries,
    isLoadingSubcategoryDetail,
    loadingSubcategorySlug,
    onSubcategoryUpdate,
    onCategoryCreated,
    onCategoryDeleted,
    onCategoryUpdated,
    onCategorySummariesRefresh,
    onSubcategoryCreated,
    onSubcategoryDeleted,
    onSubcategoryUpdated,
    onSubcategorySummariesRefresh,
}: {
    data: CategoriesData;
    selection: Selection;
    setSelection: (s: Selection) => void;
    token: string;
    onUpdate: (data: CategoriesData | any) => void;
    categorySummaries: CategorySummary[];
    subcategoryDetailsCache: Map<string, any>;
    onLoadSubcategorySummaries: (categorySlug: string, token: string) => Promise<SubcategorySummary[]>;
    onLoadSubcategoryDetail: (slug: string, token: string) => Promise<any>;
    isLoadingSubcategorySummaries: boolean;
    isLoadingSubcategoryDetail: boolean;
    loadingSubcategorySlug: string | null;
    onSubcategoryUpdate?: (slug: string) => Promise<any>;
    onCategoryCreated?: (summary: CategorySummary) => void;
    onCategoryDeleted?: (slug: string) => void;
    onCategoryUpdated?: (summary: CategorySummary) => void;
    onCategorySummariesRefresh?: () => Promise<any>;
    onSubcategoryCreated?: (categorySlug: string, summary: SubcategorySummary) => void;
    onSubcategoryDeleted?: (categorySlug: string, subSlug: string) => void;
    onSubcategoryUpdated?: (categorySlug: string, summary: SubcategorySummary) => void;
    onSubcategorySummariesRefresh?: (categorySlug: string) => Promise<any>;
}) {
    const headers = { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}`
    };

    const mutate = async (method: string, path: string, body?: object): Promise<any> => {
        const res = await fetch(`/api/admin/categories${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            cache: "no-store",
        });
        
        if (!res.ok) {
            const payload = await res.json().catch(() => null);
            const nested = typeof payload?.error === "string" && payload.error.trim().startsWith("{")
                ? (() => { try { return JSON.parse(payload.error)?.error; } catch { return null; } })()
                : null;
            throw new Error(nested || payload?.error || payload?.message || `Unable to save changes (${res.status}).`);
        }
        
        const text = await res.text();
        const result = text ? JSON.parse(text) : { success: true };

        // Only update data when a real category tree is returned
        if (result && Array.isArray(result.categories)) {
            onUpdate(result);
        }

        return result;
    };

    const wrapEditor = (node: React.ReactNode, fullWidth = false) => (
        <div className="min-w-0 flex-1">
            <div className={fullWidth
                ? "w-full"
                : "mx-auto max-w-4xl px-4 py-4 sm:px-8 sm:py-6"
            }>{node}</div>
        </div>
    );

    if (selection.type === "root") {
        return wrapEditor(<RootEditor 
            data={data}
            categorySummaries={categorySummaries}
            token={token}
            headers={headers} 
            mutate={mutate} 
            setSelection={setSelection}
            onLoadSubcategoryDetail={onLoadSubcategoryDetail}
            onCategoryCreated={onCategoryCreated}
            onCategoryDeleted={onCategoryDeleted}
            onCategorySummariesRefresh={onCategorySummariesRefresh}
        />, true);
    }

    // Prefer full category data (includes flippingImages) over the lightweight summary.
    const catFromData = data.categories.find(c => c.slug === selection.catSlug);
    const catFromSummary = categorySummaries.find(s => s.slug === selection.catSlug);
    const cat = catFromData
        ? { ...catFromData, subcategories: catFromData.subcategories ?? [] } as any
        : catFromSummary
            ? { ...catFromSummary, subcategories: [], flippingImages: [] } as any
            : null;

    if (!cat) {
        return wrapEditor(<div className="p-4 text-red-600">Category not found. Please go back and try again.</div>);
    }

    if (selection.type === "category") {
        return wrapEditor(<CategoryEditor 
            cat={cat} 
            token={token} 
            headers={headers} 
            mutate={mutate} 
            setSelection={setSelection}
            onLoadSubcategorySummaries={onLoadSubcategorySummaries}
            onLoadSubcategoryDetail={onLoadSubcategoryDetail}
            isLoadingSubcategorySummaries={isLoadingSubcategorySummaries}
            onSubcategoryCreated={onSubcategoryCreated}
            onSubcategoryDeleted={onSubcategoryDeleted}
            onSubcategorySummariesRefresh={onSubcategorySummariesRefresh}
        />, true);
    }

    const sub = subcategoryDetailsCache.get(selection.subSlug);

    if (!sub) {
        if (isLoadingSubcategoryDetail && loadingSubcategorySlug === selection.subSlug) {
            return wrapEditor(
                <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded-sm animate-pulse" />)}
                </div>
            );
        }
        // Don't show "Subcategory not found" error if we're in the middle of a save operation
        // This prevents a brief flash of the error during the save->refresh cycle
        return wrapEditor(<div className="p-4 text-neutral-500">Loading subcategory...</div>);
    }

    return wrapEditor(<SubcategoryEditor cat={cat} sub={sub} token={token} headers={headers} mutate={mutate} setSelection={setSelection} onUpdate={onUpdate} data={data} onSubcategoryUpdate={onSubcategoryUpdate} />, true);
}
