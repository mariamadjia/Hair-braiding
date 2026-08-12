"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import type { BookingAddOn, BookingItem, BookingSubcategory, CategoriesData } from "@/lib/booking-types";

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
  const [dragged, setDragged] = useState<number | null>(null);
  const allStyles = useMemo(() => data.categories.flatMap(category => category.subcategories ?? []).filter(style => style.id), [data]);
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

  const showCreate = () => { setEditing(null); setForm(emptyForm(sub.id)); setOpen(true); };
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
  const reorder = async (from: number, to: number) => {
    if (from === to || !sub.id) return;
    const next = [...addOns]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setAddOns(next);
    const response = await fetch(`${API_BASE_URL}/api/admin/add-ons/subcategory/${sub.id}/reorder`, { method: "POST", headers: authHeaders, body: JSON.stringify(next.map(item => item.assignmentId)) });
    if (!response.ok) { await load(); onError("Unable to reorder add-ons."); }
  };

  return <>
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-6">
        <div><div className="flex items-center gap-2"><h3 className="text-base font-semibold text-neutral-950 dark:text-white">Add-ons</h3><span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{addOns.length}</span></div><p className="mt-1 text-xs text-neutral-500">Optional extras customers can select after choosing a length.</p></div>
        <button onClick={showCreate} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white dark:bg-white dark:text-neutral-950"><Plus className="h-4 w-4" />Add add-on</button>
      </div>
      <div className="p-3 sm:p-4">{loading ? <div className="flex justify-center py-7"><Loader2 className="h-5 w-5 animate-spin" /></div> : !addOns.length ? <button onClick={showCreate} className="w-full rounded-lg border border-dashed border-neutral-300 py-8 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">No add-ons yet. Add the first optional extra.</button> : <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">{addOns.map((item, index) => <div key={item.assignmentId} draggable onDragStart={() => setDragged(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragged !== null) void reorder(dragged, index); setDragged(null); }} className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"><GripVertical className="h-4 w-4 cursor-grab text-neutral-400" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{item.name}</span><span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800">{item.pricingMode === "STARTING_AT" ? "From " : ""}{money(item.priceCents)}</span>{!item.active && <span className="text-[10px] font-medium text-neutral-400">Hidden</span>}</div><p className="mt-0.5 truncate text-xs text-neutral-500">{item.allSizes ? "All sizes" : `${item.serviceItemIds.length} sizes`} · {item.allLengths ? "All lengths" : `${item.lengthOptionIds.length} lengths`}</p></div><div className="flex gap-1.5"><button onClick={() => showEdit(item)} aria-label={`Edit ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700"><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(item)} aria-label={`Remove ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</div>
    </section>
    {open && <div className="fixed inset-0 z-[100] flex justify-end bg-black/35" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><aside role="dialog" aria-modal="true" aria-label={editing ? "Edit add-on" : "Add add-on"} className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-neutral-950 sm:p-8"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">{editing ? "Edit add-on" : "Add add-on"}</h2><p className="mt-1 text-sm text-neutral-500">Set the price and where customers can choose it.</p></div><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700"><X className="h-5 w-5" /></button></div>
      <div className="mt-7 space-y-5"><label className="block text-sm font-medium">Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g., Boho curls" className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900" /></label><label className="block text-sm font-medium">Customer description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900" /></label>
      <fieldset><legend className="text-sm font-medium">Pricing</legend><div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"><button onClick={() => setForm({ ...form, pricingMode: "FIXED" })} className={`min-h-11 ${form.pricingMode === "FIXED" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Fixed price</button><button onClick={() => setForm({ ...form, pricingMode: "STARTING_AT" })} className={`min-h-11 border-l border-neutral-300 dark:border-neutral-700 ${form.pricingMode === "STARTING_AT" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Starting at</button></div></fieldset><label className="block text-sm font-medium">{form.pricingMode === "FIXED" ? "Price" : "Starting price"}<div className="mt-1.5 flex rounded-lg border border-neutral-300 dark:border-neutral-700"><span className="border-r border-neutral-200 px-3 py-2.5 text-neutral-500 dark:border-neutral-700">$</span><input inputMode="decimal" value={form.price} onChange={event => setForm({ ...form, price: event.target.value.replace(/[^0-9.]/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 outline-none" /></div>{form.pricingMode === "STARTING_AT" && <span className="mt-1 block text-xs text-neutral-500">Shown to customers, but not charged until you confirm the final amount.</span>}</label>
      <fieldset><legend className="text-sm font-medium">Deposit</legend><div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"><button onClick={() => setForm({ ...form, depositBehavior: "NO_CHANGE", deposit: "" })} className={`min-h-11 text-sm ${form.depositBehavior === "NO_CHANGE" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>No change</button><button onClick={() => setForm({ ...form, depositBehavior: "ADD_FIXED" })} className={`min-h-11 border-l border-neutral-300 text-sm dark:border-neutral-700 ${form.depositBehavior === "ADD_FIXED" ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : ""}`}>Increase deposit</button></div>{form.depositBehavior === "ADD_FIXED" && <label className="mt-3 block text-xs text-neutral-500">Additional deposit<div className="mt-1 flex rounded-lg border border-neutral-300 dark:border-neutral-700"><span className="border-r border-neutral-200 px-3 py-2.5 dark:border-neutral-700">$</span><input inputMode="decimal" value={form.deposit} onChange={event => setForm({ ...form, deposit: event.target.value.replace(/[^0-9.]/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-sm text-neutral-900 outline-none dark:text-white" /></div></label>}</fieldset>
      {!editing && <fieldset><legend className="text-sm font-medium">Available on styles</legend><div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{allStyles.map(style => <label key={style.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.styleIds.includes(style.id!)} onChange={event => setForm({ ...form, styleIds: event.target.checked ? [...form.styleIds, style.id!] : form.styleIds.filter(id => id !== style.id) })} />{style.name}</label>)}</div>{form.styleIds.length > 1 && <p className="mt-2 text-xs text-neutral-500">When shared across styles, the add-on is available for all sizes and lengths. You can refine each style afterward.</p>}</fieldset>}
      <fieldset><legend className="text-sm font-medium">Size availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allSizes} onChange={event => setForm({ ...form, allSizes: event.target.checked, serviceItemIds: event.target.checked ? [] : form.serviceItemIds })} />All sizes</label>{!form.allSizes && <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{items.filter(item => item.id).map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.serviceItemIds.includes(item.id!)} onChange={event => setForm({ ...form, serviceItemIds: event.target.checked ? [...form.serviceItemIds, item.id!] : form.serviceItemIds.filter(id => id !== item.id) })} />{item.name}</label>)}</div>}</fieldset>
      <fieldset><legend className="text-sm font-medium">Length availability</legend><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allLengths} onChange={event => setForm({ ...form, allLengths: event.target.checked, lengthOptionIds: event.target.checked ? [] : form.lengthOptionIds })} />All lengths</label>{!form.allLengths && <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">{lengths.map(length => <label key={length.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.lengthOptionIds.includes(length.id!)} onChange={event => setForm({ ...form, lengthOptionIds: event.target.checked ? [...form.lengthOptionIds, length.id!] : form.lengthOptionIds.filter(id => id !== length.id) })} /><span>{length.name}<small className="block text-neutral-400">{length.size}</small></span></label>)}</div>}</fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Available to customers</label></div>
      <div className="sticky bottom-0 mt-8 flex justify-end gap-3 border-t border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-950"><button onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-neutral-300 px-5 text-sm font-semibold dark:border-neutral-700">Cancel</button><button disabled={saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-950">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Save changes" : "Create add-on"}</button></div></aside></div>}
  </>;
}
