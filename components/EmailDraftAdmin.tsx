"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, Loader2, RotateCcw, Save } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type EmailDraft = {
  templateKey: string;
  displayName: string;
  description: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
  customized: boolean;
  enabled: boolean;
  version: number;
  updatedBy?: string;
  updatedAt?: string;
  availableVariables: string[];
};

const samples: Record<string, string> = {
  customerFirstName: "Sariah", customerFullName: "Sariah Yable", serviceName: "Bohemian Box Braids",
  appointmentDate: "Saturday, November 14, 2026", appointmentTime: "9:30 AM CT", appointmentShortDate: "November 14",
  depositAmount: "$50.00", remainingBalance: "$130.00", managementUrl: "https://ahbraiding.com/manage-appointment/example",
  paymentUrl: "https://ahbraiding.com/pay-deposit/example", salonName: "AH Braiding Salon", salonPhone: "(210) 812-8121",
  salonEmail: "adjiashairbraiding@gmail.com", website: "https://ahbraiding.com", reason: "Scheduling availability",
  feeAmount: "$108.00", paymentReference: "pi_example",
  customerEmail: "sariah@example.com", customerPhone: "(210) 555-0123",
  adminBookingsUrl: "https://ahbraiding.com/admin?section=bookings", customerCancellationReason: "Schedule changed",
};

const renderSample = (value: string) => value.replace(/\{\{([A-Za-z][A-Za-z0-9]*)}}/g, (_, key: string) => samples[key] ?? "");

export default function EmailDraftAdmin() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = drafts.find(item => item.templateKey === selectedKey) ?? null;
  const dirty = Boolean(selected && (subject !== selected.subjectTemplate || body !== selected.bodyTemplate));
  const headers = () => {
    const token = getAuthToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/email-templates`, { headers: headers(), cache: "no-store" });
      const payload = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(payload.message || payload.error || "Email drafts could not be loaded.");
      const next = payload as EmailDraft[];
      setDrafts(next);
      setSelectedKey(current => current || next[0]?.templateKey || "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Email drafts could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subjectTemplate); setBody(selected.bodyTemplate); setSaved(false); setPreview(false);
  }, [selectedKey, selected?.version]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const grouped = useMemo(() => drafts.reduce<Record<string, EmailDraft[]>>((result, item) => {
    (result[item.category] ??= []).push(item); return result;
  }, {}), [drafts]);

  const choose = (key: string) => {
    if (key === selectedKey) return;
    if (dirty && !window.confirm("Discard your unsaved changes and open another email draft?")) return;
    setSelectedKey(key);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/email-templates/${selected.templateKey}`, {
        method: "PUT", headers: headers(), body: JSON.stringify({ subjectTemplate: subject, bodyTemplate: body, enabled: true, version: selected.version }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "The email draft could not be saved.");
      setDrafts(items => items.map(item => item.templateKey === payload.templateKey ? payload : item));
      setSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The email draft could not be saved."); }
    finally { setSaving(false); }
  };

  const restore = async () => {
    if (!selected || !window.confirm("Restore the original wording for this email draft?")) return;
    setRestoring(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/email-templates/${selected.templateKey}/restore-default`, { method: "POST", headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "The original draft could not be restored.");
      setDrafts(items => items.map(item => item.templateKey === payload.templateKey ? payload : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The original draft could not be restored."); }
    finally { setRestoring(false); }
  };

  const insertVariable = (variable: string) => {
    const textarea = bodyRef.current;
    const token = `{{${variable}}}`;
    if (!textarea) { setBody(value => `${value}${token}`); return; }
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    setBody(value => `${value.slice(0, start)}${token}${value.slice(end)}`);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + token.length, start + token.length); });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!selected) return <div className="p-10 text-center text-sm text-neutral-500">No email drafts are configured.</div>;

  return <div className="grid min-h-[680px] overflow-hidden rounded-2xl border bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:grid-cols-[310px_minmax(0,1fr)]">
    <aside className="border-b bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 lg:border-b-0 lg:border-r">
      <div className="border-b p-5 dark:border-neutral-700"><h3 className="font-semibold">All email drafts</h3><p className="mt-1 text-xs text-neutral-500">Choose a draft to review or edit.</p></div>
      <div className="max-h-[620px] overflow-y-auto p-2">{Object.entries(grouped).map(([category, items]) => <div key={category} className="mb-4"><p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{category}</p>{items.map(item => <button key={item.templateKey} type="button" onClick={() => choose(item.templateKey)} className={`mb-1 w-full rounded-lg px-3 py-3 text-left transition ${selectedKey === item.templateKey ? "bg-[#2C1810] text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}><span className="block text-sm font-medium">{item.displayName}</span>{item.customized && <span className={`mt-1 block text-[11px] ${selectedKey === item.templateKey ? "text-[#E8CDBD]" : "text-[#8B4D30]"}`}>Edited</span>}</button>)}</div>)}</div>
    </aside>

    <section className="min-w-0 p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b pb-5 dark:border-neutral-700 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A5A3A]">{selected.category}</p><h3 className="mt-1 font-serif text-3xl">{selected.displayName}</h3><p className="mt-2 max-w-2xl text-sm text-neutral-500">{selected.description}</p></div><div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => setPreview(value => !value)}><Eye className="mr-2 h-4 w-4" />{preview ? "Edit" : "Preview"}</Button><Button onClick={() => void save()} disabled={!dirty || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{saved && !dirty ? "Saved" : "Save"}</Button></div></div>
      {error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {preview ? <div className="mx-auto mt-7 max-w-2xl rounded-xl border bg-[#f6f3ef] p-4 sm:p-8"><div className="rounded-xl border bg-white px-6 py-8 shadow-sm sm:px-10"><div className="text-center font-serif text-2xl tracking-[0.2em] text-[#4a2115]">AH BRAIDING</div><div className="my-6 h-px bg-[#c78b2d]"/><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Subject</p><h4 className="mt-2 font-serif text-2xl text-[#4a2115]">{renderSample(subject)}</h4><div className="mt-7 whitespace-pre-wrap text-[15px] leading-7 text-neutral-800">{renderSample(body)}</div><div className="mt-7 rounded-lg border border-[#ead9c7] bg-[#fbf7f1] p-4 text-sm"><b>Appointment details</b><br/>Saturday, November 14, 2026 at 9:30 AM CT<br/>Bohemian Box Braids</div></div></div> : <div className="mt-6 space-y-5">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email subject</span><input value={subject} maxLength={255} onChange={event => { setSubject(event.target.value); setSaved(false); }} className="h-12 w-full rounded-lg border bg-white px-4 outline-none focus:border-[#9A5A3A] focus:ring-2 focus:ring-[#9A5A3A]/15 dark:border-neutral-600 dark:bg-neutral-900" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email message</span><textarea ref={bodyRef} value={body} maxLength={12000} onChange={event => { setBody(event.target.value); setSaved(false); }} rows={14} className="w-full resize-y rounded-lg border bg-white p-4 text-sm leading-6 outline-none focus:border-[#9A5A3A] focus:ring-2 focus:ring-[#9A5A3A]/15 dark:border-neutral-600 dark:bg-neutral-900" /></label>
        <div><p className="text-sm font-semibold">Insert appointment information</p><p className="mt-1 text-xs text-neutral-500">Click a variable to insert it into the message.</p><div className="mt-3 flex flex-wrap gap-2">{selected.availableVariables.map(variable => <button type="button" key={variable} onClick={() => insertVariable(variable)} className="rounded-full border px-3 py-1.5 text-xs font-medium hover:border-[#9A5A3A] hover:text-[#7A4028]">{`{{${variable}}}`}</button>)}</div></div>
      </div>}

      <div className="mt-7 flex flex-col gap-3 border-t pt-5 text-sm dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between"><div className="text-neutral-500">{selected.customized ? `Edited${selected.updatedBy ? ` by ${selected.updatedBy}` : ""}` : "Using the original draft"}</div><Button variant="outline" onClick={() => void restore()} disabled={restoring || !selected.customized}>{restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<RotateCcw className="mr-2 h-4 w-4" />Restore original</Button></div>
    </section>
  </div>;
}

