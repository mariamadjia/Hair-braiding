"use client";

import { useState } from "react";
import type { CategoriesData, BookingCategory } from "@/lib/booking-types";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { slugify } from "../utils";
import { GripVertical, FolderTree, FileText, Image as ImageIcon } from "lucide-react";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

export function RootEditor({ data, headers, mutate, setSelection }: {
    data: CategoriesData;
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<CategoriesData>;
    setSelection: (s: Selection) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const add = async () => {
        if (!name.trim()) return;
        await mutate("POST", "", { name: name.trim(), slug: slugify(name), subcategories: [] });
        setName(""); setAdding(false);
    };

    const del = async (slug: string, catName: string) => {
        if (!confirm(`Delete "${catName}" and all its content?`)) return;
        await mutate("DELETE", `/${slug}`);
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

        const reorderedCategories = [...data.categories];
        const [draggedItem] = reorderedCategories.splice(draggedIndex, 1);
        reorderedCategories.splice(dropIndex, 0, draggedItem);

        // Update display order for each category
        try {
            // Get category IDs in the new order
            const categoryIds = reorderedCategories
                .map(cat => cat.id)
                .filter((id): id is number => id !== undefined);
            
            if (categoryIds.length === 0) {
                // Fallback: update each category individually by slug
                for (let i = 0; i < reorderedCategories.length; i++) {
                    const cat = reorderedCategories[i];
                    const response = await fetch(`/api/admin/categories/${cat.slug}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ displayOrder: i })
                    });
                    
                    if (!response.ok) {
                        console.error(`Failed to update ${cat.name}:`, await response.text());
                    }
                }
            } else {
                // Use the reorder endpoint
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
                const response = await fetch(`${API_URL}/api/categories/reorder`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoryIds)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to reorder categories');
                }
            }
            
            // Refresh the data
            await mutate("GET", "");
        } catch (error) {
            console.error('Failed to reorder categories:', error);
            alert('Failed to reorder categories. Please try again.');
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
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Categories</h2>
                <button type="button" onClick={() => setAdding(true)} className={btnP}>+ Add</button>
            </div>

            {adding && (
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-3 space-y-2 bg-neutral-50 dark:bg-neutral-800">
                    <div><label className={lbl}>Name *</label><input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Box Braids" /></div>
                    <div className="flex gap-2">
                        <button type="button" onClick={add} className={btnP} disabled={!name.trim()}>Add</button>
                        <button type="button" onClick={() => setAdding(false)} className={btnS}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {data.categories.map((cat, index) => {
                    const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
                    const totalServices = hasSubcategories 
                        ? cat.subcategories!.reduce((acc, sub) => acc + (sub.items?.length || 0), 0)
                        : (cat.items?.length || 0);
                    const hasImage = !!cat.image;
                    
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
                                {hasSubcategories ? (
                                    <FolderTree className="w-5 h-5 text-blue-500" />
                                ) : (
                                    <FileText className="w-5 h-5 text-green-500" />
                                )}
                            </div>
                            
                            {/* Category Info */}
                            <button 
                                type="button" 
                                onClick={() => setSelection({ type: "category", catSlug: cat.slug })} 
                                className="flex-1 text-left min-w-0"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                        {cat.name}
                                    </span>
                                    {hasImage && (
                                        <ImageIcon className="w-3 h-3 text-neutral-400" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                    {hasSubcategories ? (
                                        <>
                                            <span>{cat.subcategories!.length} subcategories</span>
                                            <span>•</span>
                                        </>
                                    ) : null}
                                    <span>{totalServices} services</span>
                                </div>
                            </button>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button type="button" onClick={() => setSelection({ type: "category", catSlug: cat.slug })} className={btnS}>Edit</button>
                                <button type="button" onClick={() => del(cat.slug, cat.name)} className={btnD}>×</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
