"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp, DollarSign, History, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import type { BookingCategory, BookingItem, CategoriesData, LengthOption } from "@/lib/booking-types";

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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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
  const [newService, setNewService] = useState({ categoryId: "", subcategoryId: "", name: "", price: "" });

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
    if (!item.id || !confirm(`Delete "${item.name}" from booking? Existing appointments will be kept.`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/services/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to delete service.");
      setSuccess(`${item.name} deleted from booking.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete service."); }
    finally { setSaving(false); }
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
            <div className="flex flex-wrap gap-3 rounded-xl border border-[#e4d8cc] bg-white p-4">
              <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search services or sizes…" className="w-full rounded-lg border border-[#ddd0c4] py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-[#bd7a52]" /></label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border border-[#ddd0c4] bg-white px-4 py-2.5"><option value="all">All categories</option>{data.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
              <button onClick={() => setShowCreate(value => !value)} className="flex items-center gap-2 rounded-lg bg-[#351a10] px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" /> Add size/service</button>
            </div>
            {showCreate && <div className="grid gap-3 rounded-xl border border-[#d9c8b9] bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
              <select value={newService.categoryId} onChange={e => setNewService({ categoryId: e.target.value, subcategoryId: "", name: newService.name, price: newService.price })} className="rounded-lg border px-3 py-2"><option value="">Category</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select value={newService.subcategoryId} onChange={e => setNewService(previous => ({ ...previous, subcategoryId: e.target.value }))} className="rounded-lg border px-3 py-2"><option value="">Style</option>{data.categories.find(category => String(category.id) === newService.categoryId)?.subcategories?.map(subcategory => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select>
              <input value={newService.name} onChange={e => setNewService(previous => ({ ...previous, name: e.target.value }))} placeholder="Size or service name" className="rounded-lg border px-3 py-2" />
              <div className="flex rounded-lg border"><span className="px-3 py-2">$</span><input value={newService.price} inputMode="decimal" onChange={e => setNewService(previous => ({ ...previous, price: e.target.value }))} placeholder="Base price" className="min-w-0 flex-1 rounded-r-lg px-2" /></div>
              <button disabled={saving} onClick={createService} className="rounded-lg bg-[#ad6b45] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Create</button>
            </div>}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e4d8cc] bg-[#fffaf5] p-4">
              <div className="mr-auto"><p className="text-sm font-semibold">Bulk adjustment</p><p className="text-xs text-neutral-500">Applies to the services currently visible below.</p></div>
              <select value={bulkMode} onChange={e => setBulkMode(e.target.value as "fixed" | "percent")} className="rounded-lg border bg-white px-3 py-2"><option value="fixed">Dollar amount</option><option value="percent">Percentage</option></select>
              <div className="flex w-36 rounded-lg border bg-white"><span className="px-3 py-2">{bulkMode === "fixed" ? "$" : "%"}</span><input value={bulkAmount} inputMode="decimal" onChange={e => setBulkAmount(e.target.value)} className="min-w-0 flex-1 rounded-r-lg px-1" /></div>
              <button onClick={applyBulkAdjustment} className="rounded-lg border border-[#ad6b45] px-4 py-2 text-sm font-medium text-[#8d4f31]">Apply for review</button>
            </div>
            {visibleRows.map(({ category, subcategory, item }) => {
              const id = item.id!;
              const isOpen = expanded.has(id);
              return <section key={id} className="overflow-hidden rounded-xl border border-[#e4d8cc] bg-white">
                <div className="flex items-center">
                <button onClick={() => setExpanded(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; })} className="flex min-w-0 flex-1 items-center gap-4 p-5 text-left">
                  <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-[.16em] text-[#ad6b45]">{category.name} / {subcategory.name}</p><h3 className="mt-1 text-lg font-semibold">{item.name}</h3></div>
                  <span className="text-sm text-neutral-500">{item.lengthOptions?.length ? `${item.lengthOptions.length} length prices` : `Base ${money(item.price)}`}</span>
                  {drafts[id] && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Unsaved</span>}
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                <button aria-label={`Delete ${item.name}`} onClick={() => deleteService(item)} className="mr-4 rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                {isOpen && <div className="border-t border-[#eee5dc] bg-[#fdfbf8] p-5">
                  {!item.lengthOptions?.length && <label className="block max-w-xs text-xs font-semibold uppercase tracking-wider text-neutral-500">Base price<div className="mt-2 flex rounded-lg border bg-white"><span className="px-3 py-2">$</span><input inputMode="decimal" value={item.price} onChange={e => updateItem(id, draft => ({ ...draft, price: e.target.value }))} className="min-w-0 flex-1 rounded-r-lg px-2 outline-none" /></div></label>}
                  {!!item.lengthOptions?.length && <div className="space-y-2">{item.lengthOptions.map((option, index) => <div key={option.id ?? index} className="grid grid-cols-[36px_minmax(120px,1fr)_140px_40px] items-center gap-2 rounded-lg border border-[#e7ddd3] bg-white p-2">
                    <div className="flex flex-col"><button aria-label="Move up" disabled={!index} onClick={() => updateItem(id, draft => { const options = [...(draft.lengthOptions ?? [])]; [options[index - 1], options[index]] = [options[index], options[index - 1]]; return { ...draft, lengthOptions: options }; })}><ChevronUp className="h-4 w-4" /></button><button aria-label="Move down" disabled={index === (item.lengthOptions?.length ?? 0) - 1} onClick={() => updateItem(id, draft => { const options = [...(draft.lengthOptions ?? [])]; [options[index + 1], options[index]] = [options[index], options[index + 1]]; return { ...draft, lengthOptions: options }; })}><ChevronDown className="h-4 w-4" /></button></div>
                    <input aria-label="Length name" value={option.name ?? ""} onChange={e => updateItem(id, draft => ({ ...draft, lengthOptions: draft.lengthOptions?.map((current, i) => i === index ? { ...current, name: e.target.value } : current) }))} className="rounded-md border px-3 py-2" />
                    <div className="flex rounded-md border"><span className="px-3 py-2">$</span><input aria-label={`${option.name} price`} inputMode="decimal" value={option.price ?? ""} onChange={e => updateItem(id, draft => ({ ...draft, lengthOptions: draft.lengthOptions?.map((current, i) => i === index ? { ...current, price: e.target.value } : current) }))} className="min-w-0 flex-1 rounded-r-md px-1 outline-none" /></div>
                    <button aria-label={`Delete ${option.name}`} onClick={() => { if (confirm(`Delete ${option.name}?`)) updateItem(id, draft => ({ ...draft, lengthOptions: draft.lengthOptions?.filter((_, i) => i !== index) })); }} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>)}</div>}
                  <button onClick={() => updateItem(id, draft => ({ ...draft, lengthOptions: [...(draft.lengthOptions ?? []), { name: "New length", price: draft.price || "0" } as LengthOption] }))} className="mt-4 flex items-center gap-2 text-sm font-medium text-[#8d4f31]"><Plus className="h-4 w-4" /> Add length price</button>
                </div>}
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

      {dirtyIds.length > 0 && <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#d9c8b9] bg-white/95 p-3 shadow-[0_-10px_30px_rgba(45,24,15,.10)] backdrop-blur md:left-64"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><p className="text-sm"><strong>{dirtyIds.length}</strong> unsaved service{dirtyIds.length === 1 ? "" : "s"}</p><div className="flex gap-2"><button onClick={() => setDrafts({})} className="rounded-lg border px-4 py-2 text-sm">Discard</button><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-lg bg-[#351a10] px-5 py-2 text-sm text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save all changes"}</button></div></div></div>}
    </div>
  );
}
