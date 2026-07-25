"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp, Copy, DollarSign, History, Pencil, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import type { BookingCategory, BookingItem, CategoriesData } from "@/lib/booking-types";

type Tab = "overview" | "matrix" | "deposits" | "history";
type Row = { category: BookingCategory; subcategory: NonNullable<BookingCategory["subcategories"]>[number]; item: BookingItem };
type Change = { id: number; createdAt: string; serviceName: string; action: string; summary: string };

const money = (value?: string) => {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? `$${amount.toFixed(0)}` : "—";
};

export function PricingManagement({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<CategoriesData | null>(null);
  const [drafts, setDrafts] = useState<Record<number, BookingItem>>({});
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState<Change[]>([]);
  const [defaultDepositCents, setDefaultDepositCents] = useState(5000);
  const [depositOverrides, setDepositOverrides] = useState<Record<number, number | null>>({});
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMode, setBulkMode] = useState<"fixed" | "percent">("fixed");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [newService, setNewService] = useState({ categoryId: "", subcategoryId: "", name: "", price: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ row: Row; lengthName?: string } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [catalogResponse, depositResponse, historyResponse] = await Promise.all([
        fetch("/api/admin/categories", { headers, cache: "no-store" }),
        fetch("/api/admin/pricing/deposits", { headers, cache: "no-store" }),
        fetch("/api/admin/pricing/history", { headers, cache: "no-store" }),
      ]);
      const payload = await catalogResponse.json().catch(() => ({}));
      if (!catalogResponse.ok) throw new Error(payload.error || "Unable to load pricing.");
      setData(payload);
      if (depositResponse.ok) {
        const depositPayload = await depositResponse.json();
        setDefaultDepositCents(depositPayload.defaultDepositCents ?? 5000);
        setDepositOverrides(Object.fromEntries((depositPayload.overrides ?? []).map((entry: { serviceId: number; depositCents: number }) => [entry.serviceId, entry.depositCents])));
      }
      if (historyResponse.ok) setHistory(await historyResponse.json());
      setDrafts({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load pricing.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const rows = useMemo<Row[]>(() => (data?.categories ?? []).flatMap(category =>
    (category.subcategories ?? []).flatMap(subcategory =>
      (subcategory.items ?? []).map(item => ({ category, subcategory, item: drafts[item.id ?? -1] ?? item }))
    )
  ), [data, drafts]);

  const visibleRows = rows.filter(({ category, subcategory, item }) => {
    const haystack = `${category.name} ${subcategory.name} ${item.name}`.toLowerCase();
    return (categoryFilter === "all" || category.slug === categoryFilter) && haystack.includes(query.toLowerCase());
  });
  const dirtyIds = Object.keys(drafts).map(Number);
  const allPrices = rows.flatMap(({ item }) => item.lengthOptions?.length
    ? item.lengthOptions.map(option => Number(option.price))
    : [Number(item.price)]).filter(Number.isFinite);

  const updateItem = (id: number, recipe: (item: BookingItem) => BookingItem) => {
    const source = rows.find(row => row.item.id === id)?.item;
    if (source) setDrafts(previous => ({ ...previous, [id]: recipe(structuredClone(source)) }));
  };

  const save = async () => {
    if (!dirtyIds.length) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      for (const id of dirtyIds) {
        const row = rows.find(entry => entry.item.id === id);
        const item = drafts[id];
        if (!row || !item) continue;
        const response = await fetch(`/api/admin/services/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...item,
            category: { id: row.category.id },
            subcategory: { id: row.subcategory.id },
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Unable to save ${item.name}.`);
      }
      setSuccess(`${dirtyIds.length} service${dirtyIds.length === 1 ? "" : "s"} updated everywhere.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save pricing.");
    } finally { setSaving(false); }
  };

  const applyBulkAdjustment = () => {
    const adjustment = Number(bulkAmount);
    if (!Number.isFinite(adjustment) || adjustment === 0) return setError("Enter a valid non-zero adjustment.");
    const targetRows = visibleRows;
    targetRows.forEach(({ item }) => updateItem(item.id!, draft => {
      const adjust = (value?: string) => {
        const current = Number(value || 0);
        const next = bulkMode === "percent" ? current * (1 + adjustment / 100) : current + adjustment;
        return Math.max(0, Math.round(next * 100) / 100).toFixed(2);
      };
      return draft.lengthOptions?.length
        ? { ...draft, lengthOptions: draft.lengthOptions.map(option => ({ ...option, price: adjust(option.price) })) }
        : { ...draft, price: adjust(draft.price) };
    }));
    setSuccess(`Applied ${bulkMode === "percent" ? `${adjustment}%` : money(String(adjustment))} to ${targetRows.length} visible services. Review, then save.`);
  };

  const createService = async () => {
    const category = data?.categories.find(entry => String(entry.id) === newService.categoryId);
    const subcategory = category?.subcategories?.find(entry => String(entry.id) === newService.subcategoryId);
    if (!category || !subcategory || !newService.name.trim() || !newService.price) return setError("Choose a category and style, then enter a name and price.");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newService.name.trim(), price: newService.price, description: "", notes: "", image: "", link: "",
          objectPosition: "center center", images: [], sizePhotos: [], availableSizes: [], hairTextures: [],
          lengthOptions: [], category: { id: category.id }, subcategory: { id: subcategory.id },
          foundationChoicesEnabled: false, knotlessPriceAdjustment: "0",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to add size/service.");
      setShowCreate(false); setNewService({ categoryId: "", subcategoryId: "", name: "", price: "" });
      setSuccess("Size/service created and published.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add size/service."); }
    finally { setSaving(false); }
  };

  const deleteService = async (item: BookingItem) => {
    if (!item.id) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/services/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to delete service.");
      setSuccess(`${item.name} deleted from booking.`);
      setDeleteTarget(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete service."); }
    finally { setSaving(false); }
  };

  const duplicateService = async (row: Row) => {
    const item = row.item;
    setSaving(true); setError("");
    try {
      const { id: _id, ...copy } = item;
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...copy,
          name: `${item.name} Copy`,
          lengthOptions: (item.lengthOptions ?? []).map(({ id: _optionId, ...option }) => option),
          category: { id: row.category.id },
          subcategory: { id: row.subcategory.id },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to duplicate service.");
      setSuccess(`${item.name} duplicated.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to duplicate service."); }
    finally { setSaving(false); }
  };

  const reorderService = async (row: Row, offset: number) => {
    const siblings = rows.filter(entry => entry.subcategory.id === row.subcategory.id);
    const index = siblings.findIndex(entry => entry.item.id === row.item.id);
    const target = index + offset;
    if (target < 0 || target >= siblings.length) return;
    const ordered = [...siblings];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/services/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceIds: ordered.map(entry => entry.item.id) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to reorder sizes.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to reorder sizes."); }
    finally { setSaving(false); }
  };

  const addLengthColumn = (subcategoryId?: number) => {
    if (!subcategoryId) return;
    const name = prompt("Length name");
    if (!name?.trim()) return;
    rows.filter(row => row.subcategory.id === subcategoryId).forEach(({ item }) =>
      updateItem(item.id!, draft => ({
        ...draft,
        lengthOptions: [...(draft.lengthOptions ?? []), { name: name.trim(), price: draft.price || "0" }],
      })));
  };

  const saveDeposits = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const overrides = Object.entries(depositOverrides)
        .filter(([, cents]) => cents != null && cents > 0)
        .map(([serviceId, depositCents]) => ({ serviceId: Number(serviceId), depositCents }));
      const response = await fetch("/api/admin/pricing/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ defaultDepositCents, overrides }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to save deposits.");
      setSuccess("Deposit settings saved and applied to checkout.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save deposits."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 space-y-4"><div className="h-9 w-64 animate-pulse rounded bg-neutral-200" /><div className="h-72 animate-pulse rounded-xl bg-neutral-100" /></div>;
  if (!data) return <div className="m-8 rounded-xl border border-red-200 bg-red-50 p-6"><p className="text-red-800">{error || "Pricing data could not be loaded."}</p><button onClick={load} className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm text-white">Retry</button></div>;

  return (
    <div className="min-h-full bg-[#f8f5ef] text-[#2d180f]">
      <div className="mx-auto max-w-7xl p-5 pb-28 sm:p-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.26em] text-[#ad6b45]">Revenue controls</p><h2 className="mt-2 font-serif text-4xl">Pricing</h2><p className="mt-2 text-sm text-neutral-600">One source of truth for Services, booking, and checkout.</p></div>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-[#d9c8b9] bg-white px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#e3d8cc] bg-white p-1.5">
          {(["overview", "matrix", "deposits", "history"] as Tab[]).map(value => (
            <button key={value} onClick={() => setTab(value)} className={`min-w-max rounded-lg px-5 py-2.5 text-sm capitalize ${tab === value ? "bg-[#351a10] text-white shadow" : "text-neutral-600 hover:bg-[#f8f3ed]"}`}>{value === "matrix" ? "Price Matrix" : value}</button>
          ))}
        </div>

        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" />{success}</div>}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[["Active services", rows.length], ["Length prices", rows.reduce((n, row) => n + (row.item.lengthOptions?.length ?? 0), 0)], ["Price range", allPrices.length ? `${money(String(Math.min(...allPrices)))}–${money(String(Math.max(...allPrices)))}` : "—"], ["Standard deposit", money(String(defaultDepositCents / 100))]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#e4d8cc] bg-white p-5 shadow-[0_12px_30px_rgba(73,45,28,.05)]"><p className="text-xs uppercase tracking-[.16em] text-neutral-500">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#e4d8cc] bg-white p-6">
              <h3 className="font-serif text-2xl">Catalog overview</h3>
              <div className="mt-5 divide-y divide-[#eee5dc]">
                {data.categories.map(category => {
                  const categoryRows = rows.filter(row => row.category.slug === category.slug);
                  const prices = categoryRows.flatMap(row => row.item.lengthOptions?.map(o => Number(o.price)) ?? [Number(row.item.price)]).filter(Number.isFinite);
                  return <div key={category.slug} className="grid grid-cols-[1fr_auto_auto] gap-6 py-4 text-sm"><span className="font-medium">{category.name}</span><span className="text-neutral-500">{categoryRows.length} services</span><span>{prices.length ? `${money(String(Math.min(...prices)))}–${money(String(Math.max(...prices)))}` : "—"}</span></div>;
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "matrix" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search services or sizes…" className="w-full rounded-lg border border-[#ddd0c4] py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-[#bd7a52]" /></label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border border-[#ddd0c4] bg-white px-4 py-2.5"><option value="all">All categories</option>{data.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
              <button onClick={() => setShowBulk(value => !value)} className="rounded-lg border border-[#351a10] bg-white px-4 py-2 text-sm">Bulk adjust prices</button>
              <button onClick={() => setShowCreate(value => !value)} className="flex items-center gap-2 rounded-lg bg-[#351a10] px-4 py-2 text-sm text-white shadow-lg"><Plus className="h-4 w-4" /> Add pricing option</button>
            </div>
            {showCreate && <div className="grid gap-3 rounded-xl border border-[#d9c8b9] bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
              <select value={newService.categoryId} onChange={e => setNewService({ categoryId: e.target.value, subcategoryId: "", name: newService.name, price: newService.price })} className="rounded-lg border px-3 py-2"><option value="">Category</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select value={newService.subcategoryId} onChange={e => setNewService(previous => ({ ...previous, subcategoryId: e.target.value }))} className="rounded-lg border px-3 py-2"><option value="">Style</option>{data.categories.find(category => String(category.id) === newService.categoryId)?.subcategories?.map(subcategory => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select>
              <input value={newService.name} onChange={e => setNewService(previous => ({ ...previous, name: e.target.value }))} placeholder="Size or service name" className="rounded-lg border px-3 py-2" />
              <div className="flex rounded-lg border"><span className="px-3 py-2">$</span><input value={newService.price} inputMode="decimal" onChange={e => setNewService(previous => ({ ...previous, price: e.target.value }))} placeholder="Base price" className="min-w-0 flex-1 rounded-r-lg px-2" /></div>
              <button disabled={saving} onClick={createService} className="rounded-lg bg-[#ad6b45] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Create</button>
            </div>}
            {showBulk && <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e4d8cc] bg-[#fffaf5] p-4">
              <div className="mr-auto"><p className="text-sm font-semibold">Bulk adjustment</p><p className="text-xs text-neutral-500">Applies to the services currently visible below.</p></div>
              <select value={bulkMode} onChange={e => setBulkMode(e.target.value as "fixed" | "percent")} className="rounded-lg border bg-white px-3 py-2"><option value="fixed">Dollar amount</option><option value="percent">Percentage</option></select>
              <div className="flex w-36 rounded-lg border bg-white"><span className="px-3 py-2">{bulkMode === "fixed" ? "$" : "%"}</span><input value={bulkAmount} inputMode="decimal" onChange={e => setBulkAmount(e.target.value)} className="min-w-0 flex-1 rounded-r-lg px-1" /></div>
              <button onClick={applyBulkAdjustment} className="rounded-lg border border-[#ad6b45] px-4 py-2 text-sm font-medium text-[#8d4f31]">Apply for review</button>
            </div>}
            {data.categories.filter(category => visibleRows.some(row => row.category.slug === category.slug)).map(category => {
              const categoryClosed = collapsedCategories.has(category.slug);
              return <section key={category.slug} className="overflow-hidden rounded-xl border border-[#dfd2c5] bg-white shadow-[0_8px_25px_rgba(66,38,22,.05)]">
                <button onClick={() => setCollapsedCategories(previous => { const next = new Set(previous); next.has(category.slug) ? next.delete(category.slug) : next.add(category.slug); return next; })} className="flex w-full items-center gap-3 bg-[#f6f0e8] px-5 py-4 text-left">
                  {categoryClosed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}<span className="font-serif text-xl">{category.name}</span>
                </button>
                {!categoryClosed && (category.subcategories ?? []).filter(subcategory => visibleRows.some(row => row.subcategory.id === subcategory.id)).map(subcategory => {
                  const subRows = visibleRows.filter(row => row.subcategory.id === subcategory.id);
                  const subKey = `${category.slug}:${subcategory.slug}`;
                  const subClosed = collapsedSubcategories.has(subKey);
                  const lengthNames = Array.from(new Set(subRows.flatMap(row => row.item.lengthOptions?.map(option => option.name || "") ?? []))).filter(Boolean);
                  const hasBaseOnly = subRows.some(row => !row.item.lengthOptions?.length);
                  const columns = hasBaseOnly ? ["Base price", ...lengthNames] : lengthNames;
                  const hasKnotless = subRows.some(row => row.item.foundationChoicesEnabled);
                  return <div key={subcategory.slug} className="border-t border-[#e7ddd3]">
                    <div className="flex items-center border-b border-[#e7ddd3] px-6 py-3">
                      <button onClick={() => setCollapsedSubcategories(previous => { const next = new Set(previous); next.has(subKey) ? next.delete(subKey) : next.add(subKey); return next; })} className="flex flex-1 items-center gap-3 text-left font-medium">{subClosed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}{subcategory.name}</button>
                      <button onClick={() => addLengthColumn(subcategory.id)} className="flex items-center gap-2 text-sm font-medium text-[#ad6b45]"><Plus className="h-4 w-4 rounded-full border border-current" /> Add length column</button>
                    </div>
                    {!subClosed && <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-sm">
                        <thead><tr className="bg-[#fbf8f3]">{["Size", ...columns, ...(hasKnotless ? ["Knotless"] : []), "Actions"].map(column => <th key={column} className="border-b border-r border-[#e7ddd3] px-4 py-3 text-center font-medium last:border-r-0">{column}</th>)}</tr></thead>
                        <tbody>{subRows.map((row, rowIndex) => {
                          const item = row.item;
                          return <tr key={item.id} className={drafts[item.id!] ? "bg-[#fff9f1]" : "hover:bg-[#fdfaf6]"}>
                            <td className="border-b border-r border-[#e7ddd3] px-5 py-4 font-medium">{item.name}</td>
                            {columns.map(column => {
                              const isBase = column === "Base price";
                              const optionIndex = isBase ? -1 : (item.lengthOptions ?? []).findIndex(option => option.name === column);
                              const value = isBase ? (!item.lengthOptions?.length ? item.price : "") : (optionIndex >= 0 ? item.lengthOptions?.[optionIndex]?.price : "");
                              return <td key={column} className="group border-b border-r border-[#e7ddd3] px-2 py-2">
                                <div className="flex items-center rounded-md border border-transparent focus-within:border-[#bd7a52] focus-within:bg-white">
                                  <span className="pl-2 text-neutral-500">$</span>
                                  <input aria-label={`${item.name} ${column} price`} inputMode="decimal" value={value ?? ""} placeholder="—" onChange={e => updateItem(item.id!, draft => {
                                    if (isBase) return { ...draft, price: e.target.value };
                                    const options = [...(draft.lengthOptions ?? [])];
                                    const index = options.findIndex(option => option.name === column);
                                    if (index >= 0) options[index] = { ...options[index], price: e.target.value };
                                    else options.push({ name: column, price: e.target.value });
                                    return { ...draft, lengthOptions: options };
                                  })} className="w-20 min-w-0 flex-1 bg-transparent px-1 py-2 text-center outline-none" />
                                  {!isBase && optionIndex >= 0 && <button aria-label={`Remove ${column} from ${item.name}`} onClick={() => setDeleteTarget({ row, lengthName: column })} className="invisible mr-1 rounded p-1 text-red-600 group-hover:visible focus:visible"><Trash2 className="h-3.5 w-3.5" /></button>}
                                </div>
                              </td>;
                            })}
                            {hasKnotless && <td className="border-b border-r border-[#e7ddd3] px-4 py-3 text-center">{item.foundationChoicesEnabled ? `+${money(item.knotlessPriceAdjustment)}` : "—"}</td>}
                            <td className="border-b border-[#e7ddd3] px-3 py-3"><div className="flex items-center justify-center gap-1">
                              <button title="Edit row" onClick={() => document.querySelector<HTMLInputElement>(`[aria-label="${item.name} ${columns[0]} price"]`)?.focus()} className="rounded p-1.5 hover:bg-[#f0e7dc]"><Pencil className="h-4 w-4" /></button>
                              <button title="Duplicate row" onClick={() => duplicateService(row)} className="rounded p-1.5 hover:bg-[#f0e7dc]"><Copy className="h-4 w-4" /></button>
                              <button title="Move up" disabled={!rowIndex} onClick={() => reorderService(row, -1)} className="rounded p-1.5 hover:bg-[#f0e7dc] disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
                              <button title="Move down" disabled={rowIndex === subRows.length - 1} onClick={() => reorderService(row, 1)} className="rounded p-1.5 hover:bg-[#f0e7dc] disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
                              <button title="Delete row" onClick={() => setDeleteTarget({ row })} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                            </div></td>
                          </tr>;
                        })}</tbody>
                      </table>
                      <button onClick={() => { setNewService(previous => ({ ...previous, categoryId: String(category.id), subcategoryId: String(subcategory.id) })); setShowCreate(true); }} className="flex w-full items-center gap-3 border-t border-dashed border-[#d9c8b9] px-8 py-5 text-sm font-medium text-[#ad6b45]"><Plus className="h-5 w-5 rounded-full border border-current p-0.5" /> Add size</button>
                    </div>}
                  </div>;
                })}
              </section>;
            })}
          </div>
        )}

        {tab === "deposits" && <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div className="rounded-2xl border border-[#e4d8cc] bg-white p-6"><DollarSign className="h-8 w-8 text-[#ad6b45]" /><h3 className="mt-4 font-serif text-2xl">Standard deposit</h3><p className="mt-2 text-sm text-neutral-600">Used unless a service-specific amount is entered below. Checkout never authorizes more than the full service price.</p><div className="mt-6 flex max-w-xs rounded-lg border border-[#ddd0c4] bg-[#fbf7f2]"><span className="px-4 py-3">$</span><input inputMode="decimal" value={(defaultDepositCents / 100).toFixed(2)} onChange={e => setDefaultDepositCents(Math.max(1, Math.round(Number(e.target.value || 0) * 100)))} className="min-w-0 flex-1 bg-transparent px-2 font-semibold outline-none" /></div></div><div className="rounded-2xl border border-[#e4d8cc] bg-white p-6"><h3 className="font-serif text-2xl">How deposits behave</h3><div className="mt-5 space-y-4 text-sm">{["Customer card details remain with Stripe—not your database.","The service price is recalculated from this catalog before payment.","Existing appointments keep their booked price snapshot.","A lower-priced service authorizes only its full price."].map(text => <div key={text} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 text-[#ad6b45]" /><span>{text}</span></div>)}</div></div></div>
          <div className="rounded-2xl border border-[#e4d8cc] bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-serif text-2xl">Service overrides</h3><p className="text-sm text-neutral-500">Leave blank to use the standard deposit.</p></div><button disabled={saving} onClick={saveDeposits} className="flex items-center gap-2 rounded-lg bg-[#351a10] px-5 py-2.5 text-sm text-white"><Save className="h-4 w-4" /> Save deposits</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{rows.map(({ subcategory, item }) => <label key={item.id} className="flex items-center gap-3 rounded-lg border border-[#e7ddd3] p-3"><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.name}</strong><span className="text-xs text-neutral-500">{subcategory.name}</span></span><div className="flex w-32 rounded-md border bg-[#fbf7f2]"><span className="px-2 py-2">$</span><input aria-label={`${item.name} deposit override`} inputMode="decimal" value={depositOverrides[item.id!] == null ? "" : (depositOverrides[item.id!]! / 100).toFixed(2)} placeholder={(defaultDepositCents / 100).toFixed(2)} onChange={e => setDepositOverrides(previous => ({ ...previous, [item.id!]: e.target.value === "" ? null : Math.max(1, Math.round(Number(e.target.value) * 100)) }))} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" /></div></label>)}</div></div>
        </div>}

        {tab === "history" && <div className="rounded-2xl border border-[#e4d8cc] bg-white p-6"><div className="flex items-center gap-3"><History className="h-5 w-5 text-[#ad6b45]" /><h3 className="font-serif text-2xl">Pricing activity</h3></div>{history.length ? <div className="mt-5 divide-y">{history.map(entry => <div key={entry.id} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr_1.5fr]"><span className="text-xs text-neutral-500">{new Date(entry.createdAt).toLocaleString()}</span><span><strong className="block text-sm">{entry.serviceName}</strong><span className="text-[10px] uppercase tracking-wider text-[#ad6b45]">{entry.action.replaceAll("_", " ")}</span></span><span className="text-sm text-neutral-600">{entry.summary}</span></div>)}</div> : <div className="py-14 text-center text-sm text-neutral-500">No pricing changes have been recorded yet.</div>}</div>}
      </div>

      {deleteTarget && <div className="fixed inset-0 z-50 flex justify-end bg-black/15" onMouseDown={event => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="delete-pricing-title" className="flex h-full w-full max-w-sm flex-col border-l border-[#d9c8b9] bg-[#fffdf9] p-7 shadow-2xl">
          <div className="flex items-start justify-between"><div className="rounded-full bg-[#f4eadc] p-4 text-[#8d4f31]"><Trash2 className="h-5 w-5" /></div><button aria-label="Close confirmation" onClick={() => setDeleteTarget(null)} className="text-2xl">×</button></div>
          <h3 id="delete-pricing-title" className="mt-8 font-serif text-3xl">{deleteTarget.lengthName ? `Remove ${deleteTarget.lengthName} price?` : `Delete ${deleteTarget.row.item.name}?`}</h3>
          <p className="mt-4 text-sm leading-7 text-neutral-600">{deleteTarget.lengthName
            ? `This removes ${deleteTarget.lengthName} from ${deleteTarget.row.item.name} ${deleteTarget.row.subcategory.name} on the customer booking page.`
            : `This removes ${deleteTarget.row.item.name} from customer booking. Existing appointments will remain unchanged.`}</p>
          <div className="mt-auto space-y-3">
            <button onClick={() => setDeleteTarget(null)} className="w-full rounded-lg border border-[#6b5548] px-4 py-3 text-sm font-medium">Keep option</button>
            <button onClick={() => {
              if (deleteTarget.lengthName) {
                const { row, lengthName } = deleteTarget;
                updateItem(row.item.id!, draft => ({ ...draft, lengthOptions: draft.lengthOptions?.filter(option => option.name !== lengthName) }));
                setDeleteTarget(null);
              } else void deleteService(deleteTarget.row.item);
            }} className="w-full rounded-lg bg-[#351a10] px-4 py-3 text-sm font-medium text-white">{deleteTarget.lengthName ? "Delete option" : "Delete size/service"}</button>
          </div>
        </aside>
      </div>}

      {dirtyIds.length > 0 && <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#d9c8b9] bg-white/95 p-3 shadow-[0_-10px_30px_rgba(45,24,15,.10)] backdrop-blur md:left-64"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><p className="text-sm"><strong>{dirtyIds.length}</strong> unsaved service{dirtyIds.length === 1 ? "" : "s"}</p><div className="flex gap-2"><button onClick={() => setDrafts({})} className="rounded-lg border px-4 py-2 text-sm">Discard</button><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-lg bg-[#351a10] px-5 py-2 text-sm text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save all changes"}</button></div></div></div>}
    </div>
  );
}
