"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import type { BookingAddOn, BookingItem, BookingSubcategory, CategoriesData } from "@/lib/booking-types";
import { SortableHandle, SortableList } from "@/components/sortable/SortableList";
import { ServicesSaveBar } from "@/app/admin/components/ServicesSaveBar";

type Props = { sub: BookingSubcategory; items: BookingItem[]; data: CategoriesData; token: string; onError: (message: string) => void; onSuccess: (message: string) => void };
type Form = { name: string; description: string; pricingMode: "FIXED" | "STARTING_AT"; price: string; depositBehavior: "NO_CHANGE" | "ADD_FIXED"; deposit: string; active: boolean; styleIds: number[]; allSizes: boolean; allLengths: boolean; serviceItemIds: number[]; lengthOptionIds: number[] };

const emptyForm = (subId?: number): Form => ({ name: "", description: "", pricingMode: "FIXED", price: "", depositBehavior: "NO_CHANGE", deposit: "", active: true, styleIds: subId ? [subId] : [], allSizes: true, allLengths: true, serviceItemIds: [], lengthOptionIds: [] });
const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export function AddOnsManager({ sub, items, data, token, onError, onSuccess }: Props) {
  const [addOns, setAddOns] = useState<BookingAddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BookingAddOn | null>(null);
  const [form, setForm] = useState<Form>(emptyForm(sub.id));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<BookingAddOn[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [chosenExisting, setChosenExisting] = useState<BookingAddOn | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ allSizes: true, allLengths: true, serviceItemIds: [] as number[], lengthOptionIds: [] as number[], active: true });
  const [availableStyles, setAvailableStyles] = useState<BookingSubcategory[]>(sub.id ? [sub] : []);
  const nestedStyles = useMemo(() => data.categories.flatMap(category => category.subcategories ?? []).filter(style => style.id), [data]);
  const allStyles = useMemo(() => {
    const byId = new Map<number, BookingSubcategory>();
    [...availableStyles, ...nestedStyles, sub].forEach(style => { if (style.id) byId.set(style.id, style); });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStyles, nestedStyles, sub]);
  const lengths = useMemo(() => items.flatMap(item => (item.lengthOptions ?? []).map(length => ({ ...length, size: item.name }))).filter(length => length.id), [items]);
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    if (!sub.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/subcategory/${sub.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to load add-ons.");
      setAddOns(await response.json());
    } catch (error) { onError(error instanceof Error ? error.message : "Unable to load add-ons."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [sub.id, token]);
  useEffect(() => {
    let active = true;
    const loadStyles = async () => {
      try {
        const groups = await Promise.all(data.categories.map(async category => {
          if (category.subcategories?.length) return category.subcategories;
          const response = await fetch(`/api/admin/categories/${category.slug}/subcategories`, {
            headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
          });
          return response.ok ? await response.json() as BookingSubcategory[] : [];
        }));
        if (active) setAvailableStyles(groups.flat());
      } catch {
        if (active && sub.id) setAvailableStyles([sub]);
      }
    };
    void loadStyles();
    return () => { active = false; };
  }, [data.categories, sub, token]);

  const showCreate = () => { setEditing(null); setForm(emptyForm(sub.id)); setOpen(true); };
  const showLibrary = async () => {
    setLibraryOpen(true); setChosenExisting(null); setLibrarySearch("");
    setAssignmentForm({ allSizes: true, allLengths: true, serviceItemIds: [], lengthOptionIds: [], active: true });
    setLibraryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/add-ons`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to load existing add-ons.");
      const result: BookingAddOn[] = await response.json();
      const assignedIds = new Set(addOns.map(item => item.id));
      setLibrary(result.filter(item => !assignedIds.has(item.id)));
    } catch (error) { onError(error instanceof Error ? error.message : "Unable to load existing add-ons."); setLibraryOpen(false); }
    finally { setLibraryLoading(false); }
  };
  const assignExisting = async () => {
    if (!chosenExisting || !sub.id) return;
    if (!assignmentForm.allSizes && !assignmentForm.serviceItemIds.length) return onError("Choose at least one size.");
    if (!assignmentForm.allLengths && !assignmentForm.lengthOptionIds.length) return onError("Choose at least one length.");
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/subcategory/${sub.id}/${chosenExisting.id}`, { method: "POST", headers: authHeaders, body: JSON.stringify(assignmentForm) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Unable to assign add-on.");
      setLibraryOpen(false); await load(); onSuccess(`${chosenExisting.name} added to ${sub.name}.`);
    } catch (error) { onError(error instanceof Error ? error.message : "Unable to assign add-on."); }
    finally { setSaving(false); }
  };
  const showEdit = (item: BookingAddOn) => {
    setEditing(item); setForm({ name: item.name, description: item.description ?? "", pricingMode: item.pricingMode, price: String(item.priceCents / 100), depositBehavior: item.depositBehavior, deposit: String(item.depositAdjustmentCents / 100), active: item.active, styleIds: [item.subcategoryId], allSizes: item.allSizes, allLengths: item.allLengths, serviceItemIds: item.serviceItemIds, lengthOptionIds: item.lengthOptionIds }); setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !sub.id) return onError("Add-on name is required.");
    const priceCents = Math.round(Number(form.price || 0) * 100);
    if (!Number.isFinite(priceCents) || (form.pricingMode === "FIXED" && priceCents <= 0)) return onError("Enter an add-on price greater than $0.");
    if (!form.allSizes && !form.serviceItemIds.length) return onError("Choose at least one size.");
    if (!form.allLengths && !form.lengthOptionIds.length) return onError("Choose at least one length.");
    setSaving(true);
    try {
      const sharedAcrossStyles = !editing && form.styleIds.length > 1;
      const definition = { name: form.name.trim(), description: form.description.trim(), pricingMode: form.pricingMode, priceCents, depositBehavior: form.depositBehavior, depositAdjustmentCents: Math.round(Number(form.deposit || 0) * 100), active: form.active, subcategoryIds: form.styleIds, allSizes: sharedAcrossStyles || form.allSizes, allLengths: sharedAcrossStyles || form.allLengths, serviceItemIds: sharedAcrossStyles ? [] : form.serviceItemIds, lengthOptionIds: sharedAcrossStyles ? [] : form.lengthOptionIds };
      if (editing) {
        const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/${editing.id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(definition) });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Unable to update add-on.");
        const assignment = await fetch(`${API_BASE_URL}/api/admin/add-ons/assignments/${editing.assignmentId}`, { method: "PUT", headers: authHeaders, body: JSON.stringify({ active: form.active, allSizes: form.allSizes, allLengths: form.allLengths, serviceItemIds: form.serviceItemIds, lengthOptionIds: form.lengthOptionIds }) });
        if (!assignment.ok) throw new Error("Add-on saved, but its availability could not be updated.");
      } else {
        if (!form.styleIds.length) throw new Error("Choose at least one style.");
        const response = await fetch(`${API_BASE_URL}/api/admin/add-ons`, { method: "POST", headers: authHeaders, body: JSON.stringify(definition) });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Unable to create add-on.");
      }
      setOpen(false); await load(); onSuccess(editing ? "Add-on updated." : "Add-on created.");
    } catch (error) { onError(error instanceof Error ? error.message : "Unable to save add-on."); }
    finally { setSaving(false); }
  };
  const remove = async (item: BookingAddOn) => {
    if (!confirm(`Remove “${item.name}” from this style?`)) return;
    const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/assignments/${item.assignmentId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return onError("Unable to remove add-on.");
    setAddOns(current => current.filter(addOn => addOn.assignmentId !== item.assignmentId)); onSuccess("Add-on removed from this style.");
  };
  const reorder = async (next: BookingAddOn[]) => {
    if (!sub.id) return;
    const previous = addOns;
    setAddOns(next);
    const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/subcategory/${sub.id}/reorder`, { method: "POST", headers: authHeaders, body: JSON.stringify(next.map(item => item.assignmentId)) });
    if (!response.ok) { setAddOns(previous); onError("Unable to reorder add-ons. Your previous order was restored."); }
  };

  return <>
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-6">
        <div><div className="flex items-center gap-2"><h3 className="text-base font-semibold text-neutral-950 dark:text-white">Add-ons</h3><span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{addOns.length}</span></div><p className="mt-1 text-xs text-neutral-500">Optional extras customers can select after choosing a length.</p></div>
        <div className="flex flex-wrap justify-end gap-2"><button onClick={() => void showLibrary()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"><Library className="h-4 w-4" />Add existing</button><button onClick={showCreate} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#5b3219] px-4 text-xs font-semibold text-white transition hover:bg-[#442412] dark:bg-white dark:text-neutral-950"><Plus className="h-4 w-4" />Create new</button></div>
      </div>
      <div className="p-3 sm:p-4">{loading ? <div className="flex justify-center py-7"><Loader2 className="h-5 w-5 animate-spin" /></div> : !addOns.length ? <button onClick={showCreate} className="w-full rounded-lg border border-dashed border-neutral-300 py-8 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">No add-ons yet. Add the first optional extra.</button> : <SortableList items={addOns} getId={item => item.assignmentId} getLabel={item => item.name} onReorder={reorder} ariaLabel="Add-ons order" className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700" itemClassName="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">{(item) => <><SortableHandle className="flex h-10 w-9 items-center justify-center" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{item.name}</span><span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800">{item.pricingMode === "STARTING_AT" ? "From " : ""}{money(item.priceCents)}</span>{!item.active && <span className="text-[10px] font-medium text-neutral-400">Hidden</span>}</div><p className="mt-0.5 truncate text-xs text-neutral-500">{item.allSizes ? "All sizes" : `${item.serviceItemIds.length} sizes`} · {item.allLengths ? "All lengths" : `${item.lengthOptionIds.length} lengths`}</p></div><div className="flex gap-1.5"><button onClick={() => showEdit(item)} aria-label={`Edit ${item.name}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700"><Pencil className="h-4 w-4" />Edit</button><button onClick={() => void remove(item)} aria-label={`Remove ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button></div></>}</SortableList>}</div>
    </section>
    {libraryOpen && <div className="fixed inset-0 z-[100] flex justify-end bg-black/35" onMouseDown={event => { if (event.target === event.currentTarget) setLibraryOpen(false); }}><aside role="dialog" aria-modal="true" aria-label="Choose existing add-on" className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-neutral-950 sm:p-8"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">Choose existing add-on</h2><p className="mt-1 text-sm text-neutral-500">Reuse an add-on already created for another style.</p></div><button onClick={() => setLibraryOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700"><X className="h-5 w-5" /></button></div>
      <label className="mt-6 flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-950 dark:border-neutral-700"><Search className="h-4 w-4 text-neutral-400" /><input value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search add-ons…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <div className="mt-4 space-y-2">{libraryLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : library.filter(item => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(librarySearch.toLowerCase())).map(item => <button key={item.id} onClick={() => setChosenExisting(item)} className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition ${chosenExisting?.id === item.id ? "border-2 border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-900" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700"}`}><span className="min-w-0"><span className="block text-sm font-semibold">{item.name}</span><span className="mt-0.5 block truncate text-xs text-neutral-500">{item.description || "No description"}</span></span><span className="ml-4 shrink-0 text-sm font-semibold">{item.pricingMode === "STARTING_AT" ? "From " : ""}{money(item.priceCents)}</span></button>)}{!libraryLoading && !library.length && <div className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">Every existing add-on is already attached to this style.</div>}</div>
      {chosenExisting && <div className="mt-6 space-y-5 border-t border-neutral-200 pt-6 dark:border-neutral-800"><div><h3 className="text-sm font-semibold">Availability for {sub.name}</h3><p className="mt-1 text-xs text-neutral-500">The shared name and default price stay unchanged.</p></div><fieldset><legend className="text-sm font-medium">Size availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.allSizes} onChange={event => setAssignmentForm({ ...assignmentForm, allSizes: event.target.checked, serviceItemIds: event.target.checked ? [] : assignmentForm.serviceItemIds })} />All sizes</label>{!assignmentForm.allSizes && <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{items.filter(item => item.id).map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.serviceItemIds.includes(item.id!)} onChange={event => setAssignmentForm({ ...assignmentForm, serviceItemIds: event.target.checked ? [...assignmentForm.serviceItemIds, item.id!] : assignmentForm.serviceItemIds.filter(id => id !== item.id) })} />{item.name}</label>)}</div>}</fieldset><fieldset><legend className="text-sm font-medium">Length availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.allLengths} onChange={event => setAssignmentForm({ ...assignmentForm, allLengths: event.target.checked, lengthOptionIds: event.target.checked ? [] : assignmentForm.lengthOptionIds })} />All lengths</label>{!assignmentForm.allLengths && <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{lengths.map(length => <label key={length.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.lengthOptionIds.includes(length.id!)} onChange={event => setAssignmentForm({ ...assignmentForm, lengthOptionIds: event.target.checked ? [...assignmentForm.lengthOptionIds, length.id!] : assignmentForm.lengthOptionIds.filter(id => id !== length.id) })} /><span>{length.name}<small className="block text-neutral-400">{length.size}</small></span></label>)}</div>}</fieldset><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.active} onChange={event => setAssignmentForm({ ...assignmentForm, active: event.target.checked })} />Available to customers</label></div>}
      <div className="sticky bottom-0 mt-8 flex justify-end gap-3 border-t border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-950"><button onClick={() => setLibraryOpen(false)} className="min-h-11 rounded-lg border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700">Cancel</button><button disabled={!chosenExisting || saving} onClick={() => void assignExisting()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-950">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Add to this style</button></div></aside></div>}
    {open && <div className="fixed inset-0 z-[100] flex justify-end bg-black/35" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><aside role="dialog" aria-modal="true" aria-label={editing ? "Edit add-on" : "Add add-on"} className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-neutral-950 sm:p-8"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">{editing ? "Edit add-on" : "Add add-on"}</h2><p className="mt-1 text-sm text-neutral-500">Set the price and where customers can choose it.</p></div><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700"><X className="h-5 w-5" /></button></div>
      <div className="mt-7 space-y-5"><label className="block text-sm font-medium">Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g., Boho curls" className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900" /></label><label className="block text-sm font-medium">Customer description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900" /></label>
      <fieldset><legend className="text-sm font-medium">Pricing</legend><div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"><button onClick={() => setForm({ ...form, pricingMode: "FIXED" })} className={`min-h-11 ${form.pricingMode === "FIXED" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Fixed price</button><button onClick={() => setForm({ ...form, pricingMode: "STARTING_AT" })} className={`min-h-11 border-l border-neutral-300 dark:border-neutral-700 ${form.pricingMode === "STARTING_AT" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Starting at</button></div></fieldset><label className="block text-sm font-medium">{form.pricingMode === "FIXED" ? "Price" : "Starting price"}<div className="mt-1.5 flex rounded-lg border border-neutral-300 dark:border-neutral-700"><span className="border-r border-neutral-200 px-3 py-2.5 text-neutral-500 dark:border-neutral-700">$</span><input inputMode="decimal" value={form.price} onChange={event => setForm({ ...form, price: event.target.value.replace(/[^0-9.]/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 outline-none" /></div>{form.pricingMode === "STARTING_AT" && <span className="mt-1 block text-xs text-neutral-500">Shown to customers, but not charged until you confirm the final amount.</span>}</label>
      <fieldset><legend className="text-sm font-medium">Deposit</legend><div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"><button onClick={() => setForm({ ...form, depositBehavior: "NO_CHANGE", deposit: "" })} className={`min-h-11 text-sm ${form.depositBehavior === "NO_CHANGE" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>No change</button><button onClick={() => setForm({ ...form, depositBehavior: "ADD_FIXED" })} className={`min-h-11 border-l border-neutral-300 text-sm dark:border-neutral-700 ${form.depositBehavior === "ADD_FIXED" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Increase deposit</button></div>{form.depositBehavior === "ADD_FIXED" && <label className="mt-3 block text-xs text-neutral-500">Additional deposit<div className="mt-1 flex rounded-lg border border-neutral-300 dark:border-neutral-700"><span className="border-r border-neutral-200 px-3 py-2.5 dark:border-neutral-700">$</span><input inputMode="decimal" value={form.deposit} onChange={event => setForm({ ...form, deposit: event.target.value.replace(/[^0-9.]/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-sm text-neutral-900 outline-none dark:text-white" /></div></label>}</fieldset>
      {!editing && <fieldset><legend className="text-sm font-medium">Available on styles</legend><div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{allStyles.map(style => <label key={style.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.styleIds.includes(style.id!)} onChange={event => setForm({ ...form, styleIds: event.target.checked ? [...form.styleIds, style.id!] : form.styleIds.filter(id => id !== style.id) })} />{style.name}{style.id === sub.id && <span className="text-xs text-neutral-400">Current</span>}</label>)}</div>{form.styleIds.length > 1 && <p className="mt-2 text-xs text-neutral-500">When shared across styles, the add-on is available for all sizes and lengths. You can refine each style afterward.</p>}</fieldset>}
      <fieldset><legend className="text-sm font-medium">Size availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allSizes} onChange={event => setForm({ ...form, allSizes: event.target.checked, serviceItemIds: event.target.checked ? [] : form.serviceItemIds })} />All sizes</label>{!form.allSizes && <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{items.filter(item => item.id).map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.serviceItemIds.includes(item.id!)} onChange={event => setForm({ ...form, serviceItemIds: event.target.checked ? [...form.serviceItemIds, item.id!] : form.serviceItemIds.filter(id => id !== item.id) })} />{item.name}</label>)}</div>}</fieldset>
      <fieldset><legend className="text-sm font-medium">Length availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allLengths} onChange={event => setForm({ ...form, allLengths: event.target.checked, lengthOptionIds: event.target.checked ? [] : form.lengthOptionIds })} />All lengths</label>{!form.allLengths && <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{lengths.map(length => <label key={length.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.lengthOptionIds.includes(length.id!)} onChange={event => setForm({ ...form, lengthOptionIds: event.target.checked ? [...form.lengthOptionIds, length.id!] : form.lengthOptionIds.filter(id => id !== length.id) })} /><span>{length.name}<small className="block text-neutral-400">{length.size}</small></span></label>)}</div>}</fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Available to customers</label></div>
      <ServicesSaveBar visible={true} saving={saving} onSave={() => void save()} onDiscard={() => setOpen(false)} mode="dialog" saveLabel={editing ? "Save changes" : "Create add-on"} statusLabel={editing ? "Review add-on changes" : "New add-on"} /></aside></div>}
  </>;
}
