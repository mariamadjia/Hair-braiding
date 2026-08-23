"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ImageIcon, Loader2, Pencil, Plus, Search, Settings2 } from "lucide-react";
import type { BookingCategory, BookingItem, BookingSubcategory, CategoriesData, CategorySummary } from "@/lib/booking-types";
import { toProxyUrl } from "@/lib/utils/image";
import { NewCategoryWizard } from "./NewCategoryWizard";

type Selection =
    | { type: "root" }
    | { type: "category"; catSlug: string }
    | { type: "subcategory"; catSlug: string; subSlug: string };

type MatrixRow = {
    category: BookingCategory;
    subcategory: BookingSubcategory;
    item: BookingItem;
};

const durationOptions = [30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540, 600, 660, 720];

const durationLabel = (minutes = 60) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
};

const itemPhotos = (item: BookingItem) => item.sizePhotos?.length ? item.sizePhotos : (item.images ?? []);

export function ServicesMatrixEditor({
    token,
    categorySummaries,
    setSelection,
    mutate,
    onCategoryCreated,
    onCategorySummariesRefresh,
}: {
    token: string;
    categorySummaries: CategorySummary[];
    setSelection: (selection: Selection) => void;
    mutate: (method: string, path: string, body?: object) => Promise<any>;
    onCategoryCreated?: (summary: CategorySummary) => void;
    onCategorySummariesRefresh?: () => Promise<any>;
}) {
    const [data, setData] = useState<CategoriesData | null>(null);
    const [drafts, setDrafts] = useState<Record<number, BookingItem>>({});
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [collapsedStyles, setCollapsedStyles] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingCategory, setAddingCategory] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [defaultDepositCents, setDefaultDepositCents] = useState(5000);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [catalogResponse, depositResponse] = await Promise.all([
                fetch("/api/admin/categories", { headers, cache: "no-store" }),
                fetch("/api/admin/pricing/deposits", { headers, cache: "no-store" }),
            ]);
            const catalog = await catalogResponse.json().catch(() => ({}));
            if (!catalogResponse.ok) throw new Error(catalog.error || "Unable to load services.");
            setData(catalog);
            if (depositResponse.ok) {
                const deposits = await depositResponse.json();
                setDefaultDepositCents(deposits.defaultDepositCents ?? 5000);
            }
            setDrafts({});
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to load services.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [token]);

    const rows = useMemo<MatrixRow[]>(() => (data?.categories ?? []).flatMap(category =>
        (category.subcategories ?? []).flatMap(subcategory =>
            (subcategory.items ?? []).filter(item => item.id != null).map(item => ({
                category,
                subcategory,
                item: drafts[item.id!] ?? item,
            }))
        )
    ), [data, drafts]);

    const visibleRows = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return rows.filter(row =>
            (categoryFilter === "all" || row.category.slug === categoryFilter)
            && `${row.category.name} ${row.subcategory.name} ${row.item.name}`.toLowerCase().includes(needle)
        );
    }, [rows, query, categoryFilter]);

    const visibleCategories = (data?.categories ?? []).filter(category =>
        visibleRows.some(row => row.category.slug === category.slug)
    );
    const dirtyIds = Object.keys(drafts).map(Number);

    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!dirtyIds.length) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [dirtyIds.length]);

    useEffect(() => {
        document.documentElement.dataset.servicesDirty = dirtyIds.length ? "true" : "false";
        return () => { delete document.documentElement.dataset.servicesDirty; };
    }, [dirtyIds.length]);

    const updateItem = <K extends keyof BookingItem>(row: MatrixRow, key: K, value: BookingItem[K]) => {
        if (!row.item.id) return;
        setDrafts(previous => ({
            ...previous,
            [row.item.id!]: { ...row.item, [key]: value },
        }));
        setSuccess("");
        setError("");
    };

    const updateRow = (row: MatrixRow, recipe: (item: BookingItem) => BookingItem) => {
        if (!row.item.id) return;
        setDrafts(previous => ({ ...previous, [row.item.id!]: recipe(structuredClone(row.item)) }));
        setSuccess("");
        setError("");
    };

    const openDetails = (selection: Selection) => {
        if (dirtyIds.length && !window.confirm("Discard the unsaved matrix changes and open service details?")) return;
        setSelection(selection);
    };

    const discard = () => {
        if (dirtyIds.length && !window.confirm("Discard all unsaved service changes?")) return;
        setDrafts({});
        setError("");
    };

    const saveAll = async () => {
        if (!dirtyIds.length || saving) return;
        const invalid = dirtyIds.map(id => drafts[id]).find(item => !item.name.trim() || !item.durationMinutes || item.durationMinutes < 1);
        if (invalid) return setError("Every modified service needs a name and appointment duration.");
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            for (const id of dirtyIds) {
                const row = rows.find(entry => entry.item.id === id);
                if (!row) continue;
                const response = await fetch(`/api/admin/categories/${row.category.slug}/subcategories/${row.subcategory.slug}/items`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ item: drafts[id], itemId: id, subcategoryId: row.subcategory.id }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(payload.error || `Unable to save ${drafts[id].name}.`);
            }
            const count = dirtyIds.length;
            await load();
            setSuccess(`${count} service${count === 1 ? "" : "s"} saved and published.`);
            window.setTimeout(() => setSuccess(""), 4000);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to save all service changes.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAll = () => {
        const allExpanded = collapsedCategories.size === 0 && collapsedStyles.size === 0;
        if (allExpanded) {
            setCollapsedCategories(new Set((data?.categories ?? []).map(category => category.slug)));
        } else {
            setCollapsedCategories(new Set());
            setCollapsedStyles(new Set());
        }
    };

    if (loading) return <div className="space-y-4 p-6 lg:p-10">{[1, 2, 3].map(value => <div key={value} className="h-32 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />)}</div>;

    return (
        <div className="min-h-full bg-[#f7f5f2] px-4 py-5 dark:bg-neutral-900 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-28">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="font-serif text-4xl text-[#2f1a11] dark:text-white">Services</h2>
                        <p className="mt-1 text-sm text-neutral-500">Manage categories, styles, sizes, and booking settings.</p>
                    </div>
                    <button type="button" onClick={() => setAddingCategory(true)} className="admin-button admin-button-primary"><Plus className="h-4 w-4" />Add category</button>
                </header>

                {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
                {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{success}</div>}

                {addingCategory && <NewCategoryWizard token={token} mutate={mutate} onDone={summary => { onCategoryCreated?.(summary); setAddingCategory(false); void load(); }} onCancel={() => setAddingCategory(false)} onCategorySummariesRefresh={onCategorySummariesRefresh} />}

                <div className="flex flex-col gap-3 rounded-xl border border-[#e7ddd3] bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 lg:flex-row">
                    <label className="relative flex-1"><span className="sr-only">Search services</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search services…" className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#5b321f] dark:border-neutral-600 dark:bg-neutral-900" /></label>
                    <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm dark:border-neutral-600 dark:bg-neutral-900"><option value="all">All categories</option>{(data?.categories ?? []).map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
                    <button type="button" onClick={toggleAll} className="admin-button admin-button-secondary"><Settings2 className="h-4 w-4" />{collapsedCategories.size || collapsedStyles.size ? "Expand all" : "Collapse all"}</button>
                </div>

                {!visibleCategories.length && <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-500">No services match your search.</div>}

                {visibleCategories.map(category => {
                    const categoryRows = visibleRows.filter(row => row.category.slug === category.slug);
                    const categoryClosed = collapsedCategories.has(category.slug);
                    const styles = (category.subcategories ?? []).filter(style => categoryRows.some(row => row.subcategory.slug === style.slug));
                    return <section key={category.slug} className="overflow-hidden rounded-2xl border border-[#e4d8cd] bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                        <div className="flex items-center gap-3 border-b border-[#eee5dc] px-5 py-4 sm:px-6">
                            <button type="button" onClick={() => setCollapsedCategories(previous => { const next = new Set(previous); next.has(category.slug) ? next.delete(category.slug) : next.add(category.slug); return next; })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <span className="font-serif text-xl text-[#351d13] dark:text-white sm:text-2xl">{category.name.toUpperCase()}</span>
                                <span className="rounded-full bg-[#faf2e8] px-2.5 py-1 text-xs text-[#875333]">{styles.length} style{styles.length === 1 ? "" : "s"}</span>
                                {categoryClosed ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronUp className="ml-auto h-4 w-4" />}
                            </button>
                            <button type="button" onClick={() => openDetails({ type: "category", catSlug: category.slug })} className="admin-button admin-button-secondary"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Category details</span></button>
                        </div>
                        {!categoryClosed && <div className="space-y-3 p-3 sm:p-4">{styles.map(style => {
                            const styleKey = `${category.slug}:${style.slug}`;
                            const styleRows = categoryRows.filter(row => row.subcategory.slug === style.slug);
                            const styleClosed = collapsedStyles.has(styleKey);
                            const styleDirty = styleRows.some(row => row.item.id && drafts[row.item.id]);
                            return <div key={style.slug} className="overflow-hidden rounded-xl border border-[#eadfd5]">
                                <div className="flex items-center gap-3 bg-[#fdfbf8] px-4 py-3.5 sm:px-5">
                                    <button type="button" onClick={() => setCollapsedStyles(previous => { const next = new Set(previous); next.has(styleKey) ? next.delete(styleKey) : next.add(styleKey); return next; })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="truncate text-lg font-semibold text-[#321d14] dark:text-white">{style.name}</span>
                                        {styleDirty && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Modified</span>}
                                        {styleClosed ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronUp className="ml-auto h-4 w-4" />}
                                    </button>
                                    <button type="button" onClick={() => openDetails({ type: "subcategory", catSlug: category.slug, subSlug: style.slug })} className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300" aria-label={`Edit ${style.name}`}><Pencil className="h-4 w-4" /></button>
                                </div>
                                {!styleClosed && <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-sm">
                                    <thead className="border-y border-[#eee5dc] bg-[#fffdfa] text-left text-xs text-neutral-500"><tr><th className="px-4 py-3">Service or size</th><th className="px-3 py-3">Duration</th><th className="px-3 py-3">Pricing</th><th className="px-3 py-3">Deposit</th><th className="px-3 py-3">Foundation</th><th className="px-3 py-3">Photos</th><th className="px-3 py-3 text-center">Details</th></tr></thead>
                                    <tbody className="divide-y divide-[#f0e8e0]">{styleRows.map(row => {
                                        const item = row.item;
                                        const photos = itemPhotos(item);
                                        const modified = !!(item.id && drafts[item.id]);
                                        return <tr key={item.id} className={modified ? "bg-amber-50/40" : "hover:bg-[#fdfaf6]"}>
                                            <td className="px-4 py-3"><div className="relative"><input value={item.name} maxLength={100} onChange={event => updateItem(row, "name", event.target.value)} className="h-10 w-full min-w-40 rounded-lg border border-neutral-300 bg-white px-3 pr-7 outline-none focus:border-[#6d3d26] dark:border-neutral-600 dark:bg-neutral-900" />{modified && <span className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-500" />}</div></td>
                                            <td className="px-3 py-3"><select value={item.durationMinutes ?? 60} onChange={event => updateItem(row, "durationMinutes", Number(event.target.value))} className="h-10 min-w-32 rounded-lg border border-neutral-300 bg-white px-3 dark:border-neutral-600 dark:bg-neutral-900">{durationOptions.map(minutes => <option key={minutes} value={minutes}>{durationLabel(minutes)}</option>)}</select></td>
                                            <td className="px-3 py-3"><button type="button" onClick={() => openDetails({ type: "subcategory", catSlug: category.slug, subSlug: style.slug })} className="h-10 min-w-36 rounded-lg border border-neutral-300 bg-white px-3 text-left dark:border-neutral-600 dark:bg-neutral-900">{item.pricingMode === "BY_LENGTH" || item.lengthOptions?.length ? `By length · ${item.lengthOptions?.length ?? 0} prices` : `Fixed · $${item.price || "0"}`}</button></td>
                                            <td className="px-3 py-3"><div className="flex min-w-44 items-center overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"><select aria-label={`${item.name} deposit type`} value={item.depositOverrideCents == null ? "default" : "custom"} onChange={event => updateItem(row, "depositOverrideCents", event.target.value === "default" ? null : defaultDepositCents)} className="h-10 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"><option value="default">Default ${(defaultDepositCents / 100).toFixed(0)}</option><option value="custom">Custom</option></select>{item.depositOverrideCents != null && <label className="flex h-10 w-20 items-center border-l border-neutral-200 dark:border-neutral-700"><span className="pl-2 text-neutral-400">$</span><input aria-label={`${item.name} custom deposit`} inputMode="decimal" value={(item.depositOverrideCents / 100).toFixed(2)} onChange={event => { const amount = Number(event.target.value); updateItem(row, "depositOverrideCents", Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0); }} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" /></label>}</div></td>
                                            <td className="px-3 py-3"><select value={item.foundationChoicesEnabled ? "both" : "none"} onChange={event => updateRow(row, current => ({ ...current, foundationChoicesEnabled: event.target.value === "both", knotlessPriceAdjustment: event.target.value === "both" && !current.knotlessPriceAdjustment ? "0" : current.knotlessPriceAdjustment }))} className="h-10 min-w-40 rounded-lg border border-neutral-300 bg-white px-3 dark:border-neutral-600 dark:bg-neutral-900"><option value="none">No foundation choice</option><option value="both">Regular + Knotless</option></select></td>
                                            <td className="px-3 py-3"><button type="button" onClick={() => openDetails({ type: "subcategory", catSlug: category.slug, subSlug: style.slug })} className="flex h-10 min-w-28 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 dark:border-neutral-600 dark:bg-neutral-900">{photos[0] ? <img src={toProxyUrl(photos[0])} alt="" className="h-7 w-7 rounded object-cover" /> : <ImageIcon className="h-4 w-4 text-neutral-400" />}<span>{photos.length} photo{photos.length === 1 ? "" : "s"}</span></button></td>
                                            <td className="px-3 py-3 text-center"><button type="button" onClick={() => openDetails({ type: "subcategory", catSlug: category.slug, subSlug: style.slug })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-600" aria-label={`Open advanced settings for ${item.name}`}><Pencil className="h-4 w-4" /></button></td>
                                        </tr>;
                                    })}</tbody>
                                </table></div>}
                            </div>;
                        })}</div>}
                    </section>;
                })}
            </div>

            {dirtyIds.length > 0 && <div className="fixed bottom-0 right-0 z-40 w-full border-t border-[#dccbbb] bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(42,25,15,0.12)] backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 lg:w-[calc(100%-18rem)] sm:px-6 lg:px-10">
                <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /><div><p className="text-sm font-semibold text-neutral-900 dark:text-white">{dirtyIds.length} unsaved service change{dirtyIds.length === 1 ? "" : "s"}</p><p className="text-xs text-neutral-500">Review your changes, then publish them together.</p></div></div>
                    <div className="flex gap-3"><button type="button" onClick={discard} disabled={saving} className="admin-button admin-button-secondary">Discard changes</button><button type="button" onClick={() => void saveAll()} disabled={saving} className="admin-button admin-button-primary min-w-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Save all changes"}</button></div>
                </div>
            </div>}
        </div>
    );
}
