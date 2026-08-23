"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Image as ImageIcon, Link2, Loader2, LockKeyhole } from "lucide-react";
import type { BookingCategory, CategorySummary } from "@/lib/booking-types";
import { toProxyUrl } from "@/lib/utils/image";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";

const WORD_LIMIT = 100;

const countWords = (value: string) => value.trim() ? value.trim().split(/\s+/).length : 0;
const limitWords = (value: string) => {
    const words = value.match(/\S+\s*/g);
    return words && words.length > WORD_LIMIT ? words.slice(0, WORD_LIMIT).join("").trimEnd() : value;
};

const coverFor = (category?: BookingCategory | null) => {
    const source = category?.flippingImages?.[0] || category?.image;
    return source ? toProxyUrl(source) : "";
};

export function ServicesPageContentEditor({ categorySummaries, token, onEditCategory, onCategoriesRefresh }: {
    categorySummaries: CategorySummary[];
    token: string;
    onEditCategory: (slug: string) => void;
    onCategoriesRefresh?: () => Promise<unknown>;
}) {
    const ordered = useMemo(() => [...categorySummaries].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)), [categorySummaries]);
    const [categories, setCategories] = useState(ordered);
    const [selectedSlug, setSelectedSlug] = useState(ordered[0]?.slug ?? "");
    const [details, setDetails] = useState<Record<string, BookingCategory>>({});
    const [tagline, setTagline] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        setCategories(ordered);
        if (!selectedSlug && ordered[0]?.slug) setSelectedSlug(ordered[0].slug);
    }, [ordered, selectedSlug]);

    useEffect(() => {
        const missing = ordered.filter(category => !details[category.slug]);
        if (!missing.length) return;
        let active = true;
        Promise.all(missing.map(async category => {
            const response = await fetch(`/api/admin/categories/${category.slug}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            if (!response.ok) return null;
            return response.json() as Promise<BookingCategory>;
        })).then(results => {
            if (!active) return;
            setDetails(current => results.reduce((next, category) => category ? { ...next, [category.slug]: category } : next, current));
        }).catch(() => undefined);
        return () => { active = false; };
    }, [ordered, token]);

    useEffect(() => {
        if (!selectedSlug) return;
        const cached = details[selectedSlug];
        if (cached) {
            setTagline(cached.serviceTagline ?? "");
            setDescription(cached.serviceDescription ?? "");
            setDirty(false);
            return;
        }

        let active = true;
        setLoading(true);
        fetch(`/api/admin/categories/${selectedSlug}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
        })
            .then(async response => {
                if (!response.ok) throw new Error("Unable to load this category.");
                return response.json();
            })
            .then((category: BookingCategory) => {
                if (!active) return;
                setDetails(current => ({ ...current, [selectedSlug]: category }));
                setTagline(category.serviceTagline ?? "");
                setDescription(category.serviceDescription ?? "");
                setDirty(false);
            })
            .catch(error => active && setMessage({ tone: "error", text: error instanceof Error ? error.message : "Unable to load this category." }))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [selectedSlug, token]);

    const selectCategory = (slug: string) => {
        if (slug === selectedSlug) return;
        if (dirty && !window.confirm("Discard unsaved Services page changes?")) return;
        setSelectedSlug(slug);
        setMessage(null);
    };

    const save = async () => {
        const selected = details[selectedSlug];
        if (!selected || saving) return;
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch(`/api/admin/categories/${selectedSlug}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ name: selected.name, serviceTagline: tagline, serviceDescription: description }),
            });
            if (!response.ok) throw new Error("Services page content could not be saved.");
            setDetails(current => ({ ...current, [selectedSlug]: { ...selected, serviceTagline: tagline, serviceDescription: description } }));
            setDirty(false);
            setMessage({ tone: "success", text: "Services page content saved." });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ tone: "error", text: error instanceof Error ? error.message : "Services page content could not be saved." });
        } finally {
            setSaving(false);
        }
    };

    const cancel = () => {
        const selected = details[selectedSlug];
        setTagline(selected?.serviceTagline ?? "");
        setDescription(selected?.serviceDescription ?? "");
        setDirty(false);
        setMessage(null);
    };

    const reorderCategories = async (next: CategorySummary[]) => {
        const previous = categories;
        setCategories(next.map((category, displayOrder) => ({ ...category, displayOrder })));
        setMessage(null);
        try {
            const ids = next.map(category => category.id).filter((id): id is number => typeof id === "number");
            if (ids.length !== next.length) throw new Error("A category is missing its ID.");
            const response = await fetch("/api/admin/categories/reorder", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(ids),
            });
            if (!response.ok) throw new Error("Category order could not be saved.");
            await onCategoriesRefresh?.();
            setMessage({ tone: "success", text: "Services page order updated." });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setCategories(previous);
            setMessage({ tone: "error", text: error instanceof Error ? error.message : "Category order could not be saved." });
        }
    };

    const selectedSummary = ordered.find(category => category.slug === selectedSlug);
    const selected = details[selectedSlug] ?? (selectedSummary ? { ...selectedSummary } as BookingCategory : null);
    const cover = coverFor(selected);

    return (
        <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">Services page content</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Edit how your existing categories appear on the public Services page.</p>
                </div>
                <div className="flex gap-2">
                    <a href="/services" target="_blank" rel="noreferrer" className="admin-button admin-button-secondary"><Eye className="h-4 w-4" />View live page</a>
                    <button type="button" onClick={() => void save()} disabled={!dirty || saving || loading} className="admin-button admin-button-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save changes"}</button>
                </div>
            </header>

            <div className="flex items-center gap-3 rounded-xl border border-[#eadcca] bg-[#fffaf4] px-4 py-3 text-sm text-[#7a4a28] dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-200">
                <Link2 className="h-4 w-4 shrink-0" /><span>Connected to Categories. Names, cover images, and order stay synchronized automatically.</span>
            </div>

            {message && <div role={message.tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{message.text}</div>}

            <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.5fr)]">
                <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">Service categories</h3>
                    <p className="mt-1 text-xs text-neutral-500">Select a category to edit its public content.</p>
                    <div className="mt-5 space-y-2.5">
                        <SortableList items={categories} getId={category => category.id ?? category.slug} getLabel={category => category.name} onReorder={next => void reorderCategories(next)} ariaLabel="Services page category order" className="space-y-2.5">
                        {category => {
                            const detail = details[category.slug];
                            const image = coverFor(detail);
                            const published = Boolean(detail?.serviceTagline?.trim() && detail?.serviceDescription?.trim());
                            return <div className={`grid w-full grid-cols-[auto_3rem_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 text-left transition ${selectedSlug === category.slug ? "border-[#a96835] bg-[#fcf7f1] dark:border-amber-300 dark:bg-neutral-800" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}>
                                <SortableHandle className="flex h-10 w-7 items-center justify-center" />
                                {image ? <img src={image} alt="" className="h-14 w-12 rounded-lg object-cover" /> : <span className="grid h-14 w-12 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><ImageIcon className="h-4 w-4 text-neutral-400" /></span>}
                                <button type="button" onClick={() => selectCategory(category.slug)} className="min-w-0 text-left"><span className="block truncate text-sm font-semibold text-neutral-950 dark:text-white">{category.name}</span><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${published ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>{published ? "Published" : detail ? "Draft" : "Loading…"}</span></button>
                            </div>;
                        }}
                        </SortableList>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="p-5 sm:p-6">
                        <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">Edit public content</h3>
                        {loading ? <div className="mt-6 space-y-4"><div className="h-44 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" /><div className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" /></div> : selected ? <div className="mt-5 space-y-5">
                            <div>
                                <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Live preview</p>
                                <div className="grid gap-4 rounded-xl border border-[#e7d8c7] bg-[#fffcf8] p-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center dark:border-neutral-700 dark:bg-neutral-800">
                                    {cover ? <img src={cover} alt="" className="h-32 w-full rounded-lg object-cover grayscale" /> : <span className="grid h-32 place-items-center rounded-lg bg-neutral-100"><ImageIcon className="h-6 w-6 text-neutral-400" /></span>}
                                    <div className="min-w-0"><h4 className="font-serif text-2xl text-[#2c1810] dark:text-white">{selected.name}</h4><p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-[#b46f3e]">{tagline || "YOUR TAGLINE"}</p><p className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-300">{description || "Your service description will appear here."}</p></div>
                                    <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#351b10] px-5 text-xs font-semibold tracking-[0.16em] text-white">SELECT →</span>
                                </div>
                            </div>

                            <div className="grid gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 sm:grid-cols-2">
                                <div><p className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">Category name <LockKeyhole className="h-3.5 w-3.5 text-neutral-400" /></p><div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{selected.name}</div><p className="mt-1.5 text-xs text-neutral-500">Managed in Category details</p></div>
                                <div><p className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">Cover image <LockKeyhole className="h-3.5 w-3.5 text-neutral-400" /></p><div className="mt-2 flex items-center gap-3">{cover ? <img src={cover} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-neutral-100"><ImageIcon className="h-4 w-4" /></span>}<span className="min-w-0 flex-1 text-xs text-neutral-500">Uses category cover</span><button type="button" onClick={() => onEditCategory(selectedSlug)} className="admin-button admin-button-secondary min-h-10 px-3 text-xs">Change in category</button></div></div>
                            </div>

                            <label className="block"><span className="admin-label">Tagline</span><input className="admin-input" value={tagline} onChange={event => { setTagline(limitWords(event.target.value)); setDirty(true); setMessage(null); }} /><span className="mt-1.5 block text-right text-xs tabular-nums text-neutral-500">{countWords(tagline)}/100 words</span></label>
                            <label className="block"><span className="admin-label">Description</span><textarea className="admin-input min-h-24 resize-y" value={description} onChange={event => { setDescription(limitWords(event.target.value)); setDirty(true); setMessage(null); }} /><span className="mt-1.5 block text-right text-xs tabular-nums text-neutral-500">{countWords(description)}/100 words</span></label>
                        </div> : <p className="mt-6 text-sm text-neutral-500">No category selected.</p>}
                    </div>
                    <footer className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <span className={`text-xs font-semibold ${dirty ? "text-amber-700 dark:text-amber-300" : "text-neutral-500"}`}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
                        <div className="flex gap-2"><button type="button" onClick={cancel} disabled={!dirty || saving} className="admin-button admin-button-secondary">Cancel</button><button type="button" onClick={() => void save()} disabled={!dirty || saving || loading} className="admin-button admin-button-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save content"}</button></div>
                    </footer>
                </section>
            </div>
        </main>
    );
}
