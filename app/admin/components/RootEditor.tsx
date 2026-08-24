"use client";

import { useMemo, useState } from "react";
import type { CategoriesData, CategorySummary, BookingItem } from "@/lib/booking-types";
import { btnP } from "../constants";
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, Clock3, EllipsisVertical, Image as ImageIcon, Pencil, Scissors, Search } from "lucide-react";
import { NewCategoryWizard } from "./NewCategoryWizard";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";
import { toProxyUrl } from "@/lib/utils/image";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

const relativeTime = (value?: string) => {
    if (!value) return "Updated recently";

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Updated recently";

    const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
    if (elapsedDays === 0) return "Updated today";
    if (elapsedDays === 1) return "Updated 1 day ago";
    if (elapsedDays < 7) return `Updated ${elapsedDays} days ago`;

    const weeks = Math.floor(elapsedDays / 7);
    if (weeks < 5) return `Updated ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;

    const months = Math.floor(elapsedDays / 30);
    if (months < 12) return `Updated ${months} ${months === 1 ? "month" : "months"} ago`;

    const years = Math.floor(elapsedDays / 365);
    return `Updated ${years} ${years === 1 ? "year" : "years"} ago`;
};

const mobilePriceRange = (items: BookingItem[]) => {
    const prices = items.flatMap(item => item.lengthOptions?.length ? item.lengthOptions.map(option => Number(String(option.price ?? "").replace(/[^0-9.]/g, ""))) : [Number(String(item.price ?? "").replace(/[^0-9.]/g, ""))]).filter(value => Number.isFinite(value) && value > 0);
    if (!prices.length) return null;
    const low = Math.min(...prices); const high = Math.max(...prices);
    return low === high ? `$${low.toFixed(0)}` : `$${low.toFixed(0)} – $${high.toFixed(0)}`;
};

export function RootEditor({ data, categorySummaries, headers, mutate, setSelection, onLoadSubcategoryDetail, onCategoryCreated, onCategoryDeleted, onCategorySummariesRefresh, token }: {
    data: CategoriesData;
    categorySummaries: CategorySummary[];
    headers: Record<string, string>;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    setSelection: (s: Selection) => void;
    onLoadSubcategoryDetail: (slug: string, token: string) => Promise<any>;
    onCategoryCreated?: (summary: CategorySummary) => void;
    onCategoryDeleted?: (slug: string) => void;
    onCategorySummariesRefresh?: () => Promise<any>;
    token: string;
}) {
    const [adding, setAdding] = useState(false);
    const [draggedSlug, setDraggedSlug] = useState<string | null>(null);
    const [dragOverSlug, setDragOverSlug] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [mobileCategoryFilter, setMobileCategoryFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState<"custom" | "newest" | "oldest" | "name">("custom");
    const [openMenuSlug, setOpenMenuSlug] = useState<string | null>(null);
    const [reorderStatus, setReorderStatus] = useState<string | null>(null);
    const [expandedMobileCategories, setExpandedMobileCategories] = useState<Set<string>>(() => new Set(categorySummaries[0]?.slug ? [categorySummaries[0].slug] : []));

    const visibleCategories = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const categoryFiltered = mobileCategoryFilter === "all" ? categorySummaries : categorySummaries.filter(category => category.slug === mobileCategoryFilter);
        const filtered = normalizedQuery ? categoryFiltered.filter((category) => {
            const full = data.categories.find(entry => entry.slug === category.slug);
            return `${category.name} ${(full?.subcategories ?? []).map(style => style.name).join(" ")}`.toLocaleLowerCase().includes(normalizedQuery);
        }) : [...categoryFiltered];

        return filtered.sort((left, right) => {
            if (sortOrder === "name") return left.name.localeCompare(right.name);
            if (sortOrder === "newest") {
                return new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
            }
            if (sortOrder === "oldest") {
                return new Date(left.updatedAt ?? 0).getTime() - new Date(right.updatedAt ?? 0).getTime();
            }
            return (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
        });
    }, [categorySummaries, data.categories, mobileCategoryFilter, query, sortOrder]);

    const handleWizardDone = (summary: CategorySummary) => {
        onCategoryCreated?.(summary);
        setAdding(false);
        setSelection({ type: "root" });
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

    const handleDragStart = (e: React.DragEvent, slug: string) => {
        if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) {
            e.preventDefault();
            return;
        }
        setDraggedSlug(slug);
        e.dataTransfer.setData("text/plain", slug);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, slug: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverSlug(slug);
    };

    const handleDragLeave = () => {
        setDragOverSlug(null);
    };

    const persistCategoryOrder = async (reorderedSummaries: CategorySummary[]) => {
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
            // Reload the shared category summaries so Services immediately
            // reflects the same order consumed by Gallery and booking.
            if (onCategorySummariesRefresh) {
                await onCategorySummariesRefresh();
            } else {
                await mutate("GET", "");
            }
            setReorderStatus("Category order updated.");
            setTimeout(() => setReorderStatus(null), 3000);
        } catch (error) {
            console.error('Failed to reorder categories:', error);
            setErrorMsg('Failed to reorder categories. Please try again.');
        }
    };

    const handleDrop = async (e: React.DragEvent, dropSlug: string) => {
        e.preventDefault();

        if (!draggedSlug || draggedSlug === dropSlug) {
            setDraggedSlug(null);
            setDragOverSlug(null);
            return;
        }

        const draggedIndex = categorySummaries.findIndex((category) => category.slug === draggedSlug);
        const dropIndex = categorySummaries.findIndex((category) => category.slug === dropSlug);
        if (draggedIndex < 0 || dropIndex < 0) return;

        const reorderedSummaries = [...categorySummaries];
        const [draggedItem] = reorderedSummaries.splice(draggedIndex, 1);
        reorderedSummaries.splice(dropIndex, 0, draggedItem);
        await persistCategoryOrder(reorderedSummaries);

        setDraggedSlug(null);
        setDragOverSlug(null);
    };

    const moveCategory = async (slug: string, offset: number) => {
        const reorderedSummaries = [...categorySummaries].sort((left, right) =>
            (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
        );
        const index = reorderedSummaries.findIndex(category => category.slug === slug);
        const target = index + offset;
        if (index < 0 || target < 0 || target >= reorderedSummaries.length) return;
        [reorderedSummaries[index], reorderedSummaries[target]] = [reorderedSummaries[target], reorderedSummaries[index]];
        await persistCategoryOrder(reorderedSummaries);
    };

    const handleDragEnd = () => {
        setDraggedSlug(null);
        setDragOverSlug(null);
    };

    return (
        <div className="w-full min-w-0 bg-[#f7f5f2] px-3 py-3 pb-24 sm:px-6 sm:py-5 md:pb-5 lg:px-10 lg:py-8 dark:bg-neutral-900">
            <div className="space-y-4 rounded-xl border border-[#e8e3dc] bg-[#fcfbf9] p-3 shadow-sm sm:space-y-5 sm:rounded-2xl sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
            {errorMsg && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg(null)} className="text-neutral-500 hover:text-neutral-950 dark:hover:text-white">×</button>
                </div>
            )}
            {reorderStatus && (
                <div role="status" aria-live="polite" className="sr-only">{reorderStatus}</div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl dark:text-white">Service categories</h2>
                    <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">Organize and manage your braiding service categories.</p>
                </div>
                {!adding && (
                    <div className="hidden md:block">
                        <button type="button" onClick={() => setAdding(true)} className={`${btnP} min-h-11 rounded-lg px-5 py-2.5 text-sm normal-case tracking-normal`}>+ Add category</button>
                    </div>
                )}
            </div>

            {adding && (
                <NewCategoryWizard
                    token={token}
                    mutate={mutate}
                    onDone={handleWizardDone}
                    onCancel={() => setAdding(false)}
                    onCategorySummariesRefresh={onCategorySummariesRefresh}
                />
            )}

            <div className="space-y-4">
                    <div className="flex flex-col gap-3 border-b border-[#e8e3dc] pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-neutral-700">
                        <label className="relative block w-full max-w-md">
                            <span className="sr-only">Search categories</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search categories…"
                                className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
                            />
                        </label>
                        <div className="hidden w-full items-center gap-3 md:flex lg:w-auto">
                            <label className="sr-only" htmlFor="category-sort">Sort categories</label>
                            <select
                                id="category-sort"
                                value={sortOrder}
                                onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
                                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-800 outline-none transition focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus-visible:ring-white lg:w-auto"
                            >
                                <option value="custom">Custom order</option>
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="name">Name A–Z</option>
                            </select>
                        </div>
                        <div className="flex w-full items-center justify-between gap-3 md:hidden">
                            <label className="sr-only" htmlFor="mobile-category-filter">Filter categories</label>
                            <select id="mobile-category-filter" value={mobileCategoryFilter} onChange={event => setMobileCategoryFilter(event.target.value)} className="h-11 min-w-0 max-w-[70%] rounded-full border border-[#dfd2c5] bg-white px-4 text-sm text-[#351a10] outline-none focus-visible:ring-2 focus-visible:ring-[#7a4a28] dark:border-neutral-600 dark:bg-neutral-900 dark:text-white">
                                <option value="all">All categories</option>
                                {categorySummaries.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                            </select>
                            {!adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#351a10] px-4 text-sm font-semibold text-white shadow-sm">+ Add</button>}
                        </div>
                    </div>
                    <p className="hidden text-xs font-medium text-neutral-500 md:block dark:text-neutral-400">
                        {sortOrder === "custom" ? "Drag to reorder" : "Choose Custom order to reorder categories"}
                    </p>
                    <div className="space-y-3 md:hidden">
                        {visibleCategories.map(category => {
                            const fullCategory = data.categories.find(entry => entry.slug === category.slug);
                            const styles = fullCategory?.subcategories ?? [];
                            const expanded = expandedMobileCategories.has(category.slug);
                            return <section key={category.slug} className="overflow-hidden rounded-xl border border-[#e7e3dd] bg-white dark:border-neutral-700 dark:bg-neutral-900">
                                <div className="flex min-h-16 items-center gap-3 px-3 py-2.5">
                                    <button type="button" onClick={() => setExpandedMobileCategories(previous => { const next = new Set(previous); next.has(category.slug) ? next.delete(category.slug) : next.add(category.slug); return next; })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f7ecdf] text-[#8b552f]"><Scissors className="h-4 w-4" /></span>
                                        <span className="min-w-0 flex-1"><span className="block truncate font-serif text-base font-semibold text-[#351a10] dark:text-white">{category.name}</span><span className="text-xs text-neutral-500">{styles.length || category.styleCount || 0} {(styles.length || category.styleCount || 0) === 1 ? "subcategory" : "subcategories"}</span></span>
                                        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                                    </button>
                                    <button type="button" onClick={() => setSelection({ type: "category", catSlug: category.slug })} aria-label={`Edit ${category.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-600"><Pencil className="h-4 w-4" /></button>
                                </div>
                                {expanded && <div className="divide-y divide-[#eee5dc] border-t border-[#eee5dc] dark:divide-neutral-700 dark:border-neutral-700">
                                    {styles.map(style => {
                                        const photos = style.galleryImages?.map(image => image.imageUrl) ?? style.images ?? [];
                                        const price = mobilePriceRange(style.items ?? []);
                                        return <button key={style.slug} type="button" onClick={async () => { await onLoadSubcategoryDetail(style.slug, token); setSelection({ type: "subcategory", catSlug: category.slug, subSlug: style.slug }); }} className="grid min-h-24 w-full grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fdfaf6]">
                                            {photos[0] || style.image ? <img src={toProxyUrl(photos[0] || style.image!)} alt="" className="h-[4.75rem] w-[4.75rem] rounded-lg object-cover" /> : <span className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><ImageIcon className="h-5 w-5 text-neutral-400" /></span>}
                                            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-neutral-950 dark:text-white">{style.name}</span><span className="mt-1 block text-xs text-neutral-500">{style.items?.length ?? 0} {(style.items?.length ?? 0) === 1 ? "size" : "sizes"}</span>{price && <span className="mt-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">{price}</span>}</span>
                                            <ChevronRight className="h-5 w-5 text-neutral-500" />
                                        </button>;
                                    })}
                                    {!styles.length && <button type="button" onClick={() => setSelection({ type: "category", catSlug: category.slug })} className="w-full px-4 py-8 text-center text-sm text-neutral-500">No subcategories yet</button>}
                                </div>}
                            </section>;
                        })}
                    </div>
                    <div className="hidden md:block">
                    <SortableList items={visibleCategories} getId={cat => cat.slug} getLabel={cat => cat.name} onReorder={(next) => { if (sortOrder === "custom") void persistCategoryOrder(next); }} disabled={sortOrder !== "custom"} ariaLabel="Service category order" className="space-y-2" itemClassName="group relative flex min-h-20 min-w-0 items-center gap-2 rounded-xl border border-[#e7e3dd] bg-white px-2.5 py-3 shadow-[0_2px_8px_rgba(35,28,22,0.04)] transition-all hover:border-neutral-300 hover:shadow-[0_5px_16px_rgba(35,28,22,0.07)] sm:gap-3 sm:px-4 dark:border-neutral-700 dark:bg-neutral-900/20">
                {(cat, index) => {
                    return (
                        <div 
                            className="contents"
                        >
                            {sortOrder === "custom" && (
                                <>
                                    <SortableHandle className="flex h-10 w-8 shrink-0 items-center justify-center" />
                                    <span className="hidden w-8 shrink-0 text-sm tabular-nums text-neutral-500 sm:block" aria-hidden="true">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </>
                            )}
                            
                            {/* Category Info */}
                            <button 
                                type="button" 
                                onClick={() => {
                                    // Do not load the full category tree here. CategoryEditor will
                                    // load only lightweight subcategory summaries.
                                    setSelection({ type: "category", catSlug: cat.slug });
                                }} 
                                className="min-w-0 flex-1 text-left"
                            >
                                <span className="block truncate text-base font-semibold text-neutral-950 dark:text-white">{cat.name}</span>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                                        {cat.styleCount ?? 0} {(cat.styleCount ?? 0) === 1 ? "subcategory" : "subcategories"}
                                    </span>
                                    <span aria-hidden="true">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                        {relativeTime(cat.updatedAt)}
                                    </span>
                                </div>
                            </button>
                            
                            {/* Actions */}
                            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button" 
                                    data-no-drag="true"
                                    onClick={() => setSelection({ type: "category", catSlug: cat.slug })} 
                                    className="hidden h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-100 sm:flex dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-white dark:hover:bg-neutral-700"
                                    aria-label={`Edit ${cat.name}`}
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <div className="relative">
                                    <button
                                        type="button"
                                        data-no-drag="true"
                                        onClick={() => setOpenMenuSlug((current) => current === cat.slug ? null : cat.slug)}
                                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-white dark:hover:bg-neutral-700"
                                        aria-label={`More actions for ${cat.name}`}
                                        aria-expanded={openMenuSlug === cat.slug}
                                    >
                                        <EllipsisVertical className="h-4 w-4" />
                                    </button>
                                    {openMenuSlug === cat.slug && (
                                        <div className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-600 dark:bg-neutral-800">
                                            <button
                                                type="button"
                                                data-no-drag="true"
                                                onClick={() => {
                                                    setOpenMenuSlug(null);
                                                    void del(cat.slug, cat.name);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
                                            >
                                                <EllipsisVertical className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }}
                    </SortableList>
                    </div>
                    {visibleCategories.length === 0 && (
                        query.trim() ? (
                            <div className="rounded-xl border border-neutral-200 px-4 py-10 text-center dark:border-neutral-700">
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No categories match “{query}”.</p>
                                <button type="button" onClick={() => setQuery("")} className="mt-3 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-950 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800">Clear search</button>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-12 text-center dark:border-neutral-700">
                                <p className="text-base font-semibold text-neutral-900 dark:text-white">No categories yet</p>
                                <p className="mt-1 text-sm text-neutral-500">Create your first category to start organizing services.</p>
                                <button type="button" onClick={() => setAdding(true)} className={`${btnP} mt-4 min-h-10 rounded-lg px-4 py-2 text-sm normal-case tracking-normal`}>+ Add category</button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
