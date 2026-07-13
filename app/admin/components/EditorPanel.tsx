"use client";

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
        "x-admin-token": token,
        "Authorization": `Bearer ${token}`
    };

    const mutate = async (method: string, path: string, body?: object): Promise<any> => {
        console.log(`[MUTATE] ${method} /api/admin/categories${path}`, body);
        const res = await fetch(`/api/admin/categories${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            cache: "no-store",
        });
        console.log(`[MUTATE] Response status: ${res.status}`);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[MUTATE] Error: ${res.status} - ${errorText}`);
            throw new Error(`Failed to ${method} ${path}: ${res.status} ${errorText}`);
        }
        
        const text = await res.text();
        const result = text ? JSON.parse(text) : { success: true };
        console.log(`[MUTATE] Success`);

        // Only update data when a real category tree is returned
        if (result && Array.isArray(result.categories)) {
            onUpdate(result);
        }

        return result;
    };

    if (selection.type === "root") {
        return <RootEditor 
            categorySummaries={categorySummaries} 
            headers={headers} 
            mutate={mutate} 
            setSelection={setSelection}
            onCategoryCreated={onCategoryCreated}
            onCategoryDeleted={onCategoryDeleted}
            onCategorySummariesRefresh={onCategorySummariesRefresh}
        />;
    }

    const catFromSummary = categorySummaries.find(s => s.slug === selection.catSlug);
    // Category selection renders immediately from the lightweight summary.
    const cat = catFromSummary ? { ...catFromSummary, subcategories: [], flippingImages: [] } as any : null;

    if (!cat) {
        return <div className="p-4 text-red-600">Category not found. Please go back and try again.</div>;
    }

    if (selection.type === "category") {
        return <CategoryEditor 
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
        />;
    }

    const sub = subcategoryDetailsCache.get(selection.subSlug);

    if (!sub) {
        if (isLoadingSubcategoryDetail && loadingSubcategorySlug === selection.subSlug) {
            return <div className="p-4 text-neutral-500">Loading subcategory details...</div>;
        }
        return <div className="p-4 text-red-600">Subcategory not found. Please go back and try again.</div>;
    }

    return <SubcategoryEditor cat={cat} sub={sub} token={token} headers={headers} mutate={mutate} setSelection={setSelection} onUpdate={onUpdate} data={data} onSubcategoryUpdate={onSubcategoryUpdate} />;
}
