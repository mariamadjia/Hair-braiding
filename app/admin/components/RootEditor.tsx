"use client";

import { useState } from "react";
import type { CategorySummary } from "@/lib/booking-types";
import { btnP, btnS, btnD } from "../constants";
import { GripVertical, FolderTree, Trash2, AlertCircle } from "lucide-react";
import { NewCategoryWizard } from "./NewCategoryWizard";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function RootEditor({ categorySummaries, headers, mutate, setSelection, onCategoryCreated, onCategoryDeleted, onCategorySummariesRefresh, token }: {
    categorySummaries: CategorySummary[];
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    setSelection: (s: Selection) => void;
    onCategoryCreated?: (summary: CategorySummary) => void;
    onCategoryDeleted?: (slug: string) => void;
    onCategorySummariesRefresh?: () => Promise<any>;
    token: string;
}) {
    const [adding, setAdding] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleWizardDone = (summary: CategorySummary) => {
        onCategoryCreated?.(summary);
        setAdding(false);
        setSelection({ type: "category", catSlug: summary.slug });
    };

    const del = async (slug: string, catName: string) => {
        if (!confirm(`Delete "${catName}" and all its content? This cannot be undone.`)) return;
        try {
            await mutate("DELETE", `/${slug}`);
            onCategoryDeleted?.(slug);
        } catch {
            setErrorMsg(`Failed to delete "${catName}". Please try again.`);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const reorderedSummaries = [...categorySummaries];
        const [draggedItem] = reorderedSummaries.splice(draggedIndex, 1);
        reorderedSummaries.splice(dropIndex, 0, draggedItem);

        // Update display order for each category
        try {
            const categoryIds = reorderedSummaries
                .map(cat => cat.id)
                .filter((id): id is number => id !== undefined);
            
            if (categoryIds.length === 0) {
                for (let i = 0; i < reorderedSummaries.length; i++) {
                    const cat = reorderedSummaries[i];
                    await fetch(`/api/admin/categories/${cat.slug}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ displayOrder: i })
                    });
                }
            } else {
                const response = await fetch(`/api/admin/categories/reorder`, {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryIds)
                });
                if (!response.ok) throw new Error('Failed to reorder categories');
            }
            await mutate("GET", "");
        } catch (error) {
            console.error('Failed to reorder categories:', error);
            setErrorMsg('Failed to reorder categories. Please try again.');
        }

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="space-y-4">
            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">×</button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Categories</h2>
                {!adding && (
                    <button type="button" onClick={() => setAdding(true)} className={btnP}>+ Add</button>
                )}
            </div>

            {adding && (
                <NewCategoryWizard
                    token={token}
                    headers={headers}
                    mutate={mutate}
                    onDone={handleWizardDone}
                    onCancel={() => setAdding(false)}
                    onCategorySummariesRefresh={onCategorySummariesRefresh}
                />
            )}

            <div className="space-y-2">
                {categorySummaries.map((cat, index) => {
                    return (
                        <div 
                            key={cat.slug} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-3 rounded-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 group cursor-move transition-all ${
                                draggedIndex === index ? 'opacity-50' : ''
                            } ${
                                dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-blue-400' : ''
                            }`}
                        >
                            <GripVertical className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            
                            {/* Category Icon */}
                            <div className="flex-shrink-0">
                                <FolderTree className="w-5 h-5 text-blue-500" />
                            </div>
                            
                            {/* Category Info */}
                            <button 
                                type="button" 
                                onClick={() => {
                                    // Do not load the full category tree here. CategoryEditor will
                                    // load only lightweight subcategory summaries.
                                    setSelection({ type: "category", catSlug: cat.slug });
                                }} 
                                className="flex-1 text-left min-w-0"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                        {cat.name}
                                    </span>
                                </div>
                            </button>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setSelection({ type: "category", catSlug: cat.slug })} 
                                    className={btnS}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => del(cat.slug, cat.name)}
                                    className={btnD}
                                    title={`Delete ${cat.name}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
