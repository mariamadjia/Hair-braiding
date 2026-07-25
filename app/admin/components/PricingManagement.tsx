"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BriefcaseBusiness, Check, ChevronDown, ChevronRight, ChevronUp, Clock3, Copy, CreditCard, DollarSign, Download, History, MoreVertical, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { BookingCategory, BookingItem, CategoriesData } from "@/lib/booking-types";

type Tab = "overview" | "matrix" | "deposits" | "history";
type Row = { category: BookingCategory; subcategory: NonNullable<BookingCategory["subcategories"]>[number]; item: BookingItem };
type Change = { id: number; createdAt: string; serviceName: string; action: string; summary: string };

const money = (value?: string) => {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? `$${amount.toFixed(0)}` : "—";
};

const parsePrice = (value?: string) => Number(String(value ?? "").trim().replace(/[^0-9.-]/g, ""));
const hasValidPrice = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  const amount = parsePrice(value);
  return Number.isFinite(amount) && amount > 0;
};
const hasValidAdjustment = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  return trimmed !== "" && Number.isFinite(parsePrice(value));
};

type PricingIssue = { category: BookingCategory; subcategory: NonNullable<BookingCategory["subcategories"]>[number]; item: BookingItem; option?: string };

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
  const [depositQuery, setDepositQuery] = useState("");
  const [depositCategory, setDepositCategory] = useState("all");
  const [openRowMenu, setOpenRowMenu] = useState<number | null>(null);

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
  const dirtyPriceCount = useMemo(() => Object.entries(drafts).reduce((total, [id, draft]) => {
    const original = (data?.categories ?? [])
      .flatMap(category => category.subcategories ?? [])
      .flatMap(subcategory => subcategory.items ?? [])
      .find(item => item.id === Number(id));

    if (!original) return total + 1;

    let changed = String(original.price ?? "") !== String(draft.price ?? "") ? 1 : 0;
    const originalOptions = new Map((original.lengthOptions ?? []).map(option => [option.name, String(option.price ?? "")]));
    const draftOptions = new Map((draft.lengthOptions ?? []).map(option => [option.name, String(option.price ?? "")]));
    const optionNames = new Set([...originalOptions.keys(), ...draftOptions.keys()]);
    optionNames.forEach(name => {
      if (originalOptions.get(name) !== draftOptions.get(name)) changed += 1;
    });

    if (String(original.knotlessPriceAdjustment ?? "") !== String(draft.knotlessPriceAdjustment ?? "")) changed += 1;
    return total + changed;
  }, 0), [data, drafts]);
  const allPrices = rows.flatMap(({ item }) => item.lengthOptions?.length
    ? item.lengthOptions.map(option => Number(option.price))
    : [Number(item.price)]).filter(Number.isFinite);
  const depositRows = rows.filter(({ category, subcategory, item }) => {
    const matchesCategory = depositCategory === "all" || category.slug === depositCategory;
    const matchesSearch = `${item.name} ${subcategory.name}`.toLowerCase().includes(depositQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const pricingIssues = rows.flatMap<PricingIssue>(({ category, subcategory, item }) => {
    const issues: PricingIssue[] = [];
    if (item.lengthOptions?.length) {
      item.lengthOptions.forEach(option => {
        if (!hasValidPrice(option.price)) issues.push({ category, subcategory, item, option: option.name || "Unnamed length" });
      });
    } else if (!hasValidPrice(item.price)) {
      issues.push({ category, subcategory, item });
    }
    if (item.foundationChoicesEnabled && !hasValidAdjustment(item.knotlessPriceAdjustment)) {
      issues.push({ category, subcategory, item, option: "Knotless adjustment" });
    }
    return issues;
  });

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

  const exportPriceList = () => {
    const lines = [["Category", "Style", "Size / Service", "Length", "Price", "Knotless adjustment", "Deposit override"]];
    rows.forEach(({ category, subcategory, item }) => {
      const options = item.lengthOptions?.length ? item.lengthOptions : [{ name: "Base", price: item.price }];
      options.forEach(option => lines.push([
        category.name,
        subcategory.name,
        item.name,
        option.name || "Base",
        option.price || "",
        item.foundationChoicesEnabled ? item.knotlessPriceAdjustment || "0" : "",
        depositOverrides[item.id!] == null ? "" : String(depositOverrides[item.id!]! / 100),
      ]));
    });
    const csv = lines.map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `braiding-prices-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 space-y-4"><div className="h-9 w-64 animate-pulse rounded bg-neutral-200" /><div className="h-72 animate-pulse rounded-xl bg-neutral-100" /></div>;
  if (!data) return <div className="m-8 rounded-xl border border-red-200 bg-red-50 p-6"><p className="text-red-800">{error || "Pricing data could not be loaded."}</p><button onClick={load} className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm text-white">Retry</button></div>;

  return (
    <div className="min-h-full bg-[#f8f5ef] text-[#2d180f]">
      <div className="mx-auto max-w-7xl p-5 pb-28 sm:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-serif text-5xl">Pricing</h2><p className="mt-2 text-sm text-neutral-600">Review and manage pricing across your service catalog.</p></div>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-[#d9c8b9] bg-white px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          {[
            { label: "Services Priced", value: rows.length, icon: BriefcaseBusiness },
            { label: "Price Range", value: allPrices.length ? `${money(String(Math.min(...allPrices)))}–${money(String(Math.max(...allPrices)))}` : "—", icon: DollarSign },
            { label: "Default Deposit", value: money(String(defaultDepositCents / 100)), icon: CreditCard },
            { label: "Pricing Issues", value: pricingIssues.length, icon: AlertCircle },
          ].map(card => <div key={card.label} className="flex items-center gap-5 rounded-xl border border-[#ded2c7] bg-white px-5 py-5 shadow-[0_5px_16px_rgba(56,35,21,.04)]">
            <div className="rounded-full border border-[#d9c8b9] bg-[#f6f0e7] p-4"><card.icon className="h-5 w-5" /></div>
            <div><p className="text-sm text-neutral-600">{card.label}</p><p className="mt-1 font-serif text-3xl">{card.value}</p></div>
          </div>)}
        </div>

        {pricingIssues.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-900"><AlertCircle className="h-4 w-4" /><h3 className="font-serif text-xl">Missing prices</h3></div>
            <p className="mt-1 text-sm text-amber-800">These active options can be selected by customers but don&apos;t have a valid price yet.</p>
            <ul className="mt-3 space-y-2">
              {pricingIssues.map((issue, index) => (
                <li key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-4 py-2 text-sm">
                  <span>{issue.category.name} → {issue.subcategory.name} → {issue.item.name}{issue.option ? ` → ${issue.option}` : " (base price)"}</span>
                  <button onClick={() => { setTab("matrix"); setQuery(issue.item.name); }} className="text-xs font-medium text-[#8d4f31] underline underline-offset-4">Fix in matrix</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6 flex gap-7 overflow-x-auto border-b border-[#d8cabc]">
          {(["overview", "matrix", "deposits", "history"] as Tab[]).map(value => (
            <button key={value} onClick={() => setTab(value)} className={`min-w-max border-b-2 px-1 py-3 text-sm capitalize ${tab === value ? "border-[#7b482d] font-semibold text-[#351a10]" : "border-transparent text-neutral-600 hover:text-[#351a10]"}`}>{value === "matrix" ? "Price Matrix" : value}</button>
          ))}
        </div>

        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" />{success}</div>}

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <section className="rounded-xl border border-[#ded2c7] bg-white p-6">
                <h3 className="font-serif text-2xl">Catalog health</h3>
                <div className="mt-7 grid grid-cols-3 divide-x divide-[#decfc1] text-center">
                  <div><p className="font-serif text-4xl">{rows.length}</p><p className="mt-1 text-sm text-neutral-600">priced services</p></div>
                  <div><p className="font-serif text-4xl">{rows.reduce((total, row) => total + (row.item.lengthOptions?.length || 1), 0)}</p><p className="mt-1 text-sm text-neutral-600">price options</p></div>
                  <div><p className="font-serif text-4xl">{data.categories.length}</p><p className="mt-1 text-sm text-neutral-600">service categories</p></div>
                </div>
                <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#eee7de]"><div className="h-full w-full rounded-full bg-[#351a10]" /></div>
                <p className="mt-3 text-right text-xs font-medium text-neutral-500">Catalog pricing is synchronized</p>
              </section>
              <section className="rounded-xl border border-[#ded2c7] bg-white p-6">
                <div className="flex items-center justify-between"><h3 className="font-serif text-2xl">Recent changes</h3><button onClick={() => setTab("history")} className="flex items-center gap-1 text-sm underline">View history <ChevronRight className="h-4 w-4" /></button></div>
                {history.length ? <div className="mt-4 divide-y divide-[#e7ddd3]">{history.slice(0, 4).map(entry => <div key={entry.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-3">
                  <div className="rounded-full bg-[#f3eadf] p-2"><Clock3 className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{entry.serviceName}</p><p className="truncate text-xs text-neutral-500">{entry.summary}</p></div>
                  <time className="text-xs text-neutral-500">{new Date(entry.createdAt).toLocaleDateString()}</time>
                </div>)}</div> : <div className="flex h-40 items-center justify-center text-sm text-neutral-500">No pricing changes recorded yet.</div>}
              </section>
            </div>
            <section className="rounded-xl border border-[#ded2c7] bg-white p-5">
              <div className="flex items-center justify-between"><h3 className="font-serif text-2xl">Pricing by category</h3><button onClick={() => setTab("matrix")} className="flex items-center gap-1 text-sm underline">View price matrix <ChevronRight className="h-4 w-4" /></button></div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-[#e2d7cd]">
                <table className="w-full min-w-[600px] text-sm"><thead><tr className="bg-[#f6f1ea] text-left"><th className="px-4 py-3">Category</th><th className="px-4 py-3">Services</th><th className="px-4 py-3">Price Range</th><th className="px-4 py-3">Deposit</th></tr></thead><tbody>
                {data.categories.map(category => {
                  const categoryRows = rows.filter(row => row.category.slug === category.slug);
                  const prices = categoryRows.flatMap(row => row.item.lengthOptions?.map(o => Number(o.price)) ?? [Number(row.item.price)]).filter(Number.isFinite);
                  return <tr key={category.slug} className="border-t border-[#e7ddd3]"><td className="px-4 py-3 font-medium">{category.name}</td><td className="px-4 py-3">{categoryRows.length}</td><td className="px-4 py-3">{prices.length ? `${money(String(Math.min(...prices)))}–${money(String(Math.max(...prices)))}` : "—"}</td><td className="px-4 py-3">{money(String(defaultDepositCents / 100))} default</td></tr>;
                })}
                </tbody></table>
              </div>
            </section>
            <section className="flex flex-wrap items-center gap-5 rounded-xl border border-[#ded2c7] bg-white p-5">
              <div className="rounded-full bg-[#f3eadf] p-4"><ShieldCheck className="h-7 w-7" /></div>
              <div className="mr-auto"><h3 className="font-serif text-xl">Keep your pricing accurate</h3><p className="mt-1 text-sm text-neutral-600">Export a current copy of every service, length, price, and deposit override.</p></div>
              <button onClick={exportPriceList} className="flex items-center gap-2 rounded-lg border border-[#7b482d] px-5 py-3 text-sm font-medium"><Download className="h-4 w-4" /> Export price list</button>
            </section>
          </div>
        )}

        {tab === "matrix" && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#e2d7cc] bg-white shadow-[0_10px_35px_rgba(55,32,18,.045)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-[#eee5dc] p-4 sm:p-5">
                <label className="relative min-w-[260px] flex-1 lg:max-w-xl">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search styles, sizes, lengths…"
                    className="w-full rounded-xl border border-[#e0d4c8] bg-[#fffdfa] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7734d] focus:bg-white focus:ring-4 focus:ring-[#b7734d]/10"
                  />
                </label>

                <select
                  value={categoryFilter}
                  onChange={event => setCategoryFilter(event.target.value)}
                  className="min-w-44 rounded-xl border border-[#e0d4c8] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#b7734d]"
                >
                  <option value="all">All categories</option>
                  {data.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>

                <button
                  onClick={() => setShowBulk(value => !value)}
                  className="flex items-center gap-2 rounded-xl border border-[#d9cabd] bg-white px-4 py-3 text-sm font-medium text-[#4b2a1c] transition hover:bg-[#fbf7f2]"
                >
                  <Pencil className="h-4 w-4" /> Bulk Edit
                </button>

                <button
                  onClick={() => setShowCreate(value => !value)}
                  className="flex items-center gap-2 rounded-xl bg-[#351a10] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(53,26,16,.16)] transition hover:bg-[#472317]"
                >
                  <Plus className="h-4 w-4" /> Add Service
                </button>

                <span className="ml-auto whitespace-nowrap text-xs text-neutral-500">
                  Showing {visibleRows.length} of {rows.length} services
                </span>
              </div>

              {showCreate && (
                <div className="grid gap-3 border-b border-[#eee5dc] bg-[#fdf9f4] p-5 sm:grid-cols-2 lg:grid-cols-5">
                  <select value={newService.categoryId} onChange={event => setNewService({ categoryId: event.target.value, subcategoryId: "", name: newService.name, price: newService.price })} className="rounded-xl border border-[#ded1c5] bg-white px-3 py-2.5 text-sm">
                    <option value="">Category</option>
                    {data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <select value={newService.subcategoryId} onChange={event => setNewService(previous => ({ ...previous, subcategoryId: event.target.value }))} className="rounded-xl border border-[#ded1c5] bg-white px-3 py-2.5 text-sm">
                    <option value="">Style</option>
                    {data.categories.find(category => String(category.id) === newService.categoryId)?.subcategories?.map(subcategory => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
                  </select>
                  <input value={newService.name} onChange={event => setNewService(previous => ({ ...previous, name: event.target.value }))} placeholder="Size or service name" className="rounded-xl border border-[#ded1c5] bg-white px-3 py-2.5 text-sm" />
                  <div className="flex overflow-hidden rounded-xl border border-[#ded1c5] bg-white"><span className="border-r border-[#eee5dc] px-3 py-2.5 text-neutral-500">$</span><input value={newService.price} inputMode="decimal" onChange={event => setNewService(previous => ({ ...previous, price: event.target.value }))} placeholder="Base price" className="min-w-0 flex-1 px-3 text-sm outline-none" /></div>
                  <button disabled={saving} onClick={createService} className="rounded-xl bg-[#ad6b45] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">Create service</button>
                </div>
              )}

              {showBulk && (
                <div className="flex flex-wrap items-end gap-3 border-b border-[#eee5dc] bg-[#fffaf5] p-5">
                  <div className="mr-auto">
                    <p className="text-sm font-semibold text-[#351a10]">Bulk price adjustment</p>
                    <p className="mt-1 text-xs text-neutral-500">Applies to the services currently visible below.</p>
                  </div>
                  <select value={bulkMode} onChange={event => setBulkMode(event.target.value as "fixed" | "percent")} className="rounded-xl border border-[#ded1c5] bg-white px-3 py-2.5 text-sm"><option value="fixed">Dollar amount</option><option value="percent">Percentage</option></select>
                  <div className="flex w-36 overflow-hidden rounded-xl border border-[#ded1c5] bg-white"><span className="border-r border-[#eee5dc] px-3 py-2.5 text-neutral-500">{bulkMode === "fixed" ? "$" : "%"}</span><input value={bulkAmount} inputMode="decimal" onChange={event => setBulkAmount(event.target.value)} className="min-w-0 flex-1 px-2 text-sm outline-none" /></div>
                  <button onClick={applyBulkAdjustment} className="rounded-xl border border-[#ad6b45] bg-white px-4 py-2.5 text-sm font-medium text-[#8d4f31] hover:bg-[#fff5ed]">Apply for review</button>
                </div>
              )}

              {!visibleRows.length && (
                <div className="p-12 text-center">
                  <Search className="mx-auto h-6 w-6 text-neutral-400" />
                  <p className="mt-3 text-sm font-medium">No services match your filters</p>
                  <p className="mt-1 text-sm text-neutral-500">Try a different search term or switch category to &quot;All categories&quot;.</p>
                  {(query || categoryFilter !== "all") && <button onClick={() => { setQuery(""); setCategoryFilter("all"); }} className="mt-4 text-sm font-medium text-[#8d4f31] underline underline-offset-4">Clear filters</button>}
                </div>
              )}

              <div className="divide-y divide-[#eee5dc]">
                {data.categories.filter(category => visibleRows.some(row => row.category.slug === category.slug)).map(category => {
                  const categoryClosed = collapsedCategories.has(category.slug);
                  const categoryRows = visibleRows.filter(row => row.category.slug === category.slug);
                  const categoryKnotless = categoryRows.filter(row => row.item.foundationChoicesEnabled);
                  const knotlessAdjustments = Array.from(new Set(categoryKnotless.map(row => row.item.knotlessPriceAdjustment).filter(hasValidAdjustment)));

                  return (
                    <section key={category.slug}>
                      <div className="flex flex-wrap items-center gap-3 bg-[#fcfaf7] px-5 py-4 sm:px-6">
                        <button
                          onClick={() => setCollapsedCategories(previous => { const next = new Set(previous); next.has(category.slug) ? next.delete(category.slug) : next.add(category.slug); return next; })}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3e8da] text-[#7b482d]">
                            {categoryClosed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </span>
                          <span className="font-serif text-xl tracking-[.03em] text-[#2d180f] sm:text-2xl">{category.name.toUpperCase()}</span>
                          <span className="text-xs text-neutral-500">{categoryRows.length} service{categoryRows.length === 1 ? "" : "s"}</span>
                        </button>

                        {knotlessAdjustments.length === 1 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8eddf] px-3 py-1.5 text-xs font-medium text-[#704027]">
                            <Sparkles className="h-3.5 w-3.5" /> Knotless +{money(knotlessAdjustments[0])}
                          </span>
                        )}
                      </div>

                      {!categoryClosed && (
                        <div className="space-y-4 bg-white p-4 sm:p-5">
                          {(category.subcategories ?? []).filter(subcategory => visibleRows.some(row => row.subcategory.id === subcategory.id)).map(subcategory => {
                            const subRows = visibleRows.filter(row => row.subcategory.id === subcategory.id);
                            const subKey = `${category.slug}:${subcategory.slug}`;
                            const subClosed = collapsedSubcategories.has(subKey);
                            const lengthNames = Array.from(new Set(subRows.flatMap(row => row.item.lengthOptions?.map(option => option.name || "") ?? []))).filter(Boolean);
                            const hasBaseOnly = subRows.some(row => !row.item.lengthOptions?.length);
                            const columns = hasBaseOnly ? ["Base price", ...lengthNames] : lengthNames;
                            const hasKnotless = subRows.some(row => row.item.foundationChoicesEnabled);
                            const subPrices = subRows.flatMap(row => row.item.lengthOptions?.length ? row.item.lengthOptions.map(option => Number(option.price)) : [Number(row.item.price)]).filter(Number.isFinite);
                            const subPriceRange = subPrices.length ? `${money(String(Math.min(...subPrices)))}–${money(String(Math.max(...subPrices)))}` : "—";

                            return (
                              <div key={subcategory.slug} className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white">
                                <div className="flex flex-wrap items-center gap-4 border-b border-[#eee5dc] px-5 py-4">
                                  <button
                                    onClick={() => setCollapsedSubcategories(previous => { const next = new Set(previous); next.has(subKey) ? next.delete(subKey) : next.add(subKey); return next; })}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="font-serif text-2xl text-[#2d180f]">{subcategory.name}</span>
                                      {subClosed ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
                                    </span>
                                    <span className="mt-1 block text-xs text-neutral-500">{subRows.length} size{subRows.length === 1 ? "" : "s"} · {columns.length} length{columns.length === 1 ? "" : "s"} · {subPriceRange}</span>
                                  </button>

                                  <button onClick={() => addLengthColumn(subcategory.id)} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#9a5835] transition hover:bg-[#fbf1e8]">
                                    <Plus className="h-4 w-4" /> Add length
                                  </button>
                                </div>

                                {!subClosed && (
                                  <>
                                    <div className="overflow-x-auto">
                                      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                                        <thead className="bg-[#fffdfa]">
                                          <tr>
                                            <th className="sticky left-0 z-30 min-w-[150px] border-b border-[#eee5dc] bg-[#fffdfa] px-5 py-3.5 text-left text-xs font-medium text-neutral-600">Size</th>
                                            {columns.map(column => (
                                              <th key={column} className="min-w-[112px] border-b border-[#eee5dc] px-3 py-3.5 text-center text-xs font-medium text-neutral-600">{column}</th>
                                            ))}
                                            {hasKnotless && <th className="min-w-[105px] border-b border-[#eee5dc] px-3 py-3.5 text-center text-xs font-medium text-neutral-600">Knotless</th>}
                                            <th className="sticky right-0 z-30 w-14 border-b border-[#eee5dc] bg-[#fffdfa] px-2 py-3.5"><span className="sr-only">Actions</span></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {subRows.map((row, rowIndex) => {
                                            const item = row.item;
                                            const isDirty = !!drafts[item.id!];
                                            const knotlessInvalid = item.foundationChoicesEnabled && !hasValidAdjustment(item.knotlessPriceAdjustment);

                                            return (
                                              <tr key={item.id} className="group transition hover:bg-[#fdfaf6]">
                                                <td className="sticky left-0 z-20 border-b border-[#f0e8e0] bg-white px-5 py-3.5 group-hover:bg-[#fdfaf6]">
                                                  <span className="block font-medium text-[#321d14]">{item.name}</span>
                                                  {isDirty && <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#a6613d]"><span className="h-1.5 w-1.5 rounded-full bg-[#b7734d]" />Modified</span>}
                                                </td>

                                                {columns.map(column => {
                                                  const isBase = column === "Base price";
                                                  const optionIndex = isBase ? -1 : (item.lengthOptions ?? []).findIndex(option => option.name === column);
                                                  const optionExists = isBase ? !item.lengthOptions?.length : optionIndex >= 0;
                                                  const value = isBase ? (!item.lengthOptions?.length ? item.price : "") : (optionIndex >= 0 ? item.lengthOptions?.[optionIndex]?.price : "");
                                                  const invalid = optionExists && !hasValidPrice(value);

                                                  return (
                                                    <td key={column} className="border-b border-[#f0e8e0] px-2.5 py-2.5 text-center">
                                                      <div title={invalid ? "Missing or invalid price" : undefined} className={`mx-auto flex w-[94px] items-center rounded-lg border bg-[#fffdfa] transition focus-within:bg-white focus-within:ring-3 ${invalid ? "border-amber-300 focus-within:border-amber-400 focus-within:ring-amber-100" : "border-[#eee5dd] hover:border-[#d8c7b9] focus-within:border-[#b7734d] focus-within:ring-[#b7734d]/10"}`}>
                                                        <span className={`pl-2.5 text-xs ${invalid ? "text-amber-600" : "text-neutral-400"}`}>$</span>
                                                        <input
                                                          aria-label={`${item.name} ${column} price`}
                                                          inputMode="decimal"
                                                          value={value ?? ""}
                                                          placeholder="—"
                                                          onFocus={event => event.currentTarget.select()}
                                                          onChange={event => updateItem(item.id!, draft => {
                                                            if (isBase) return { ...draft, price: event.target.value };
                                                            const options = [...(draft.lengthOptions ?? [])];
                                                            const index = options.findIndex(option => option.name === column);
                                                            if (index >= 0) options[index] = { ...options[index], price: event.target.value };
                                                            else options.push({ name: column, price: event.target.value });
                                                            return { ...draft, lengthOptions: options };
                                                          })}
                                                          className={`w-full min-w-0 bg-transparent py-2 pr-2 text-center text-sm font-medium outline-none ${invalid ? "text-amber-800" : "text-[#3a241a]"}`}
                                                        />
                                                        {invalid && <AlertCircle className="mr-2 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                                                      </div>
                                                    </td>
                                                  );
                                                })}

                                                {hasKnotless && (
                                                  <td className="border-b border-[#f0e8e0] px-3 py-2.5 text-center">
                                                    {item.foundationChoicesEnabled ? (
                                                      knotlessInvalid
                                                        ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700"><AlertCircle className="h-3.5 w-3.5" /> Missing</span>
                                                        : <span className="inline-flex rounded-full bg-[#f8eddf] px-2.5 py-1 text-xs font-medium text-[#704027]">+{money(item.knotlessPriceAdjustment)}</span>
                                                    ) : <span className="text-neutral-300">—</span>}
                                                  </td>
                                                )}

                                                <td className="sticky right-0 z-20 border-b border-[#f0e8e0] bg-white px-2 py-2.5 text-center group-hover:bg-[#fdfaf6]">
                                                  <div className="relative">
                                                    <button
                                                      aria-label={`Actions for ${item.name}`}
                                                      aria-expanded={openRowMenu === item.id}
                                                      onClick={() => setOpenRowMenu(current => current === item.id ? null : item.id!)}
                                                      className="rounded-lg p-2 text-neutral-500 transition hover:bg-[#f2e8df] hover:text-[#351a10]"
                                                    >
                                                      <MoreVertical className="h-4 w-4" />
                                                    </button>

                                                    {openRowMenu === item.id && (
                                                      <div className="absolute right-1 top-10 z-50 w-44 overflow-hidden rounded-xl border border-[#e2d5ca] bg-white py-1.5 text-left shadow-[0_14px_35px_rgba(45,24,15,.16)]">
                                                        <button onClick={() => { setOpenRowMenu(null); document.querySelector<HTMLInputElement>(`[aria-label="${item.name} ${columns[0]} price"]`)?.focus(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#fbf6f1]"><Pencil className="h-4 w-4" /> Edit prices</button>
                                                        <button onClick={() => { setOpenRowMenu(null); void duplicateService(row); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#fbf6f1]"><Copy className="h-4 w-4" /> Duplicate</button>
                                                        <div className="my-1 border-t border-[#eee5dc]" />
                                                        <button disabled={!rowIndex} onClick={() => { setOpenRowMenu(null); void reorderService(row, -1); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#fbf6f1] disabled:cursor-not-allowed disabled:opacity-35"><ChevronUp className="h-4 w-4" /> Move up</button>
                                                        <button disabled={rowIndex === subRows.length - 1} onClick={() => { setOpenRowMenu(null); void reorderService(row, 1); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#fbf6f1] disabled:cursor-not-allowed disabled:opacity-35"><ChevronDown className="h-4 w-4" /> Move down</button>
                                                        <div className="my-1 border-t border-[#eee5dc]" />
                                                        <button onClick={() => { setOpenRowMenu(null); setDeleteTarget({ row }); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete size</button>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    <button
                                      onClick={() => { setNewService(previous => ({ ...previous, categoryId: String(category.id), subcategoryId: String(subcategory.id) })); setShowCreate(true); }}
                                      className="flex w-full items-center gap-2 border-t border-dashed border-[#e6d9cd] px-5 py-4 text-sm font-medium text-[#9a5835] transition hover:bg-[#fffaf5]"
                                    >
                                      <Plus className="h-4 w-4" /> Add size
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "deposits" && <div className="space-y-5">
          <div>
            <h2 className="font-serif text-3xl text-[#2f1a12]">Deposit settings</h2>
            <p className="mt-1 text-sm text-neutral-600">Control the authorization amount collected when customers request an appointment.</p>
          </div>

          <section className="rounded-xl border border-[#e1d5c9] bg-white p-5 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_1px_1fr]">
              <div className="flex flex-col justify-center">
                <label htmlFor="default-deposit" className="text-base font-semibold">Default deposit</label>
                <div className="mt-3 flex max-w-md rounded-md border border-[#bdaea1] bg-white focus-within:ring-2 focus-within:ring-[#bd7953]/25">
                  <span className="border-r border-[#ded3c8] px-4 py-3">$</span>
                  <input id="default-deposit" inputMode="decimal" value={(defaultDepositCents / 100).toFixed(2)} onFocus={event => event.currentTarget.select()} onChange={event => setDefaultDepositCents(Math.max(1, Math.round(Number(event.target.value || 0) * 100)))} className="min-w-0 flex-1 bg-transparent px-4 font-medium outline-none" />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Applied to every service unless a service-specific override is set.</p>
                <button disabled={saving} onClick={saveDeposits} className="mt-5 flex w-fit items-center gap-2 rounded-md bg-[#351a10] px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60">
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save deposit settings"}
                </button>
              </div>
              <div className="hidden bg-[#e5dad0] lg:block" />
              <div className="rounded-lg border border-[#e5d9cf] bg-[#fdfaf6] p-5">
                <p className="text-sm font-medium">Customer sees</p>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#ddd0c5] pt-4">
                  <strong className="text-base">Deposit Today</strong>
                  <span className="font-serif text-3xl text-[#351a10]">${(defaultDepositCents / 100).toFixed(2)}</span>
                </div>
                <p className="mt-4 text-xs text-neutral-500">Remaining balance is calculated from the selected service price.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="overflow-hidden rounded-xl border border-[#e1d5c9] bg-white shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4 p-5">
                <div>
                  <h3 className="font-serif text-2xl text-[#2f1a12]">Service-specific overrides</h3>
                  <p className="mt-1 text-xs text-neutral-500">Leave a deposit blank to use the default amount.</p>
                </div>
                <button onClick={() => document.querySelector<HTMLInputElement>("[data-deposit-input]")?.focus()} className="flex items-center gap-2 rounded-md border border-[#a46645] px-4 py-2 text-sm font-medium text-[#6b3824]">
                  <Plus className="h-4 w-4" /> Add override
                </button>
              </div>
              <div className="flex flex-wrap gap-3 border-y border-[#eadfd5] bg-[#fdfbf8] p-4">
                <label className="relative min-w-56 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input value={depositQuery} onChange={event => setDepositQuery(event.target.value)} placeholder="Search services" className="w-full rounded-md border border-[#ddd0c4] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#bd7953]/20" />
                </label>
                <select value={depositCategory} onChange={event => setDepositCategory(event.target.value)} className="min-w-48 rounded-md border border-[#ddd0c4] bg-white px-3 py-2.5 text-sm outline-none">
                  <option value="all">All categories</option>
                  {data?.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[#f7f1ea] text-xs text-neutral-600"><tr>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Service</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Standard price range</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Deposit</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Status</th>
                    <th className="border-b border-[#e2d7cc] px-4 py-3 font-medium">Actions</th>
                  </tr></thead>
                  <tbody>{depositRows.map(({ subcategory, item }) => {
                    const itemPrices = (item.lengthOptions?.length ? item.lengthOptions.map(option => Number(option.price)) : [Number(item.price)]).filter(Number.isFinite);
                    const minimumPriceCents = Math.round(Math.min(...itemPrices) * 100);
                    const maximumPriceCents = Math.round(Math.max(...itemPrices) * 100);
                    const configuredDeposit = depositOverrides[item.id!] ?? defaultDepositCents;
                    const effectiveDeposit = Math.min(configuredDeposit, minimumPriceCents);
                    const isLimited = configuredDeposit > minimumPriceCents;
                    const hasOverride = depositOverrides[item.id!] != null;
                    return <tr key={item.id} className="hover:bg-[#fdfaf6]">
                      <td className="border-b border-r border-[#ece3da] px-4 py-3"><strong className="block">{item.name}</strong><span className="text-xs text-neutral-500">{subcategory.name}</span></td>
                      <td className="border-b border-r border-[#ece3da] px-4 py-3">{minimumPriceCents === maximumPriceCents ? money(String(minimumPriceCents / 100)) : `${money(String(minimumPriceCents / 100))}–${money(String(maximumPriceCents / 100))}`}</td>
                      <td className="border-b border-r border-[#ece3da] px-3 py-2">
                        <div className="flex w-28 rounded-md border border-[#d8cabd] bg-white focus-within:ring-2 focus-within:ring-[#bd7953]/20">
                          <span className="px-2 py-2">$</span>
                          <input data-deposit-input aria-label={`${item.name} deposit override`} inputMode="decimal" value={hasOverride ? (depositOverrides[item.id!]! / 100).toFixed(2) : ""} placeholder={(defaultDepositCents / 100).toFixed(2)} onFocus={event => event.currentTarget.select()} onChange={event => setDepositOverrides(previous => ({ ...previous, [item.id!]: event.target.value === "" ? null : Math.max(1, Math.round(Number(event.target.value) * 100)) }))} className="min-w-0 flex-1 bg-transparent py-2 pr-2 outline-none" />
                        </div>
                      </td>
                      <td className="border-b border-r border-[#ece3da] px-4 py-3 text-xs">{isLimited ? "Limited to service price" : hasOverride ? "Custom override" : "Uses default"}</td>
                      <td className="border-b border-[#ece3da] px-4 py-3">
                        <button onClick={() => document.querySelector<HTMLInputElement>(`[aria-label="${item.name} deposit override"]`)?.focus()} className="font-medium text-[#6f3b27] underline underline-offset-4">Edit</button>
                        {hasOverride && <><span className="mx-2 text-neutral-300">·</span><button onClick={() => setDepositOverrides(previous => ({ ...previous, [item.id!]: null }))} className="font-medium text-[#6f3b27] underline underline-offset-4">Remove</button></>}
                        <span className="sr-only">Effective deposit ${(effectiveDeposit / 100).toFixed(2)}</span>
                      </td>
                    </tr>;
                  })}</tbody>
                </table>
                {!depositRows.length && <div className="p-10 text-center text-sm text-neutral-500">No services match these filters.</div>}
              </div>
              <div className="m-4 flex gap-3 rounded-md border border-[#e1b36a] bg-[#fff8e9] px-4 py-3 text-sm text-[#6d4a20]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> A deposit can never exceed the selected appointment price.
              </div>
            </section>

            <aside className="h-fit rounded-xl border border-[#e1d5c9] bg-white p-5 shadow-sm">
              <h3 className="font-serif text-2xl text-[#2f1a12]">Authorization behavior</h3>
              <div className="mt-6 space-y-5">
                {["Authorize now, capture after admin approval", "Release authorization when denied", "Warn when authorization is close to expiring"].map(text => <div key={text} className="flex gap-3 text-sm leading-5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#351a10] text-white"><Check className="h-4 w-4" /></span><span>{text}</span>
                </div>)}
              </div>
            </aside>
          </div>
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

      {dirtyIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e4d8cc] bg-[#fffdf9]/95 px-4 py-3 shadow-[0_-12px_35px_rgba(45,24,15,.10)] backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d6b999] bg-white font-serif text-xl text-[#351a10]">{dirtyPriceCount || dirtyIds.length}</span>
              <div>
                <p className="text-sm font-semibold text-[#351a10]">{dirtyPriceCount || dirtyIds.length} price{(dirtyPriceCount || dirtyIds.length) === 1 ? "" : "s"} changed</p>
                <p className="mt-0.5 text-xs text-neutral-500">Review your changes before saving.</p>
              </div>
            </div>
            <button onClick={() => setDrafts({})} className="rounded-xl border border-[#d9cabd] bg-white px-6 py-2.5 text-sm font-medium text-[#351a10] hover:bg-[#fbf7f2]">Discard</button>
            <button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#351a10] px-6 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(53,26,16,.16)] disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving…" : `Save ${dirtyPriceCount || dirtyIds.length} change${(dirtyPriceCount || dirtyIds.length) === 1 ? "" : "s"}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}