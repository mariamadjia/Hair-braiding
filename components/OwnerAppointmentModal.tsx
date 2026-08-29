"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import ManageAvailabilityPicker, { ManageSlot } from "./ManageAvailabilityPicker";

type Length = { id: number; name: string; price: string };
type Service = { id: number; name: string; style: string; pricingMode: "FIXED" | "BY_LENGTH"; price: string; lengthOptions?: Length[]; hairTextures?: string[]; foundationChoicesEnabled?: boolean };
type AddOn = { id: number; name: string; priceCents: number; pricingMode: string; confirmationRequired: boolean };
type Quote = { quoteToken: string; servicePriceCents: number; depositCents: number; remainingBalanceCents: number; addOns: AddOn[] };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function OwnerAppointmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void }) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", notes: "" });
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [lengthOptionId, setLengthOptionId] = useState<number | null>(null);
  const [foundation, setFoundation] = useState("");
  const [texture, setTexture] = useState("");
  const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
  const [addOnIds, setAddOnIds] = useState<number[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState("");
  const [depositRequired, setDepositRequired] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = services.find(item => item.id === serviceId);
  const selectedLength = selectedService?.lengthOptions?.find(item => item.id === lengthOptionId);
  const headers = () => { const token = getAuthToken(); return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; };
  const read = async (response: Response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || body.message || "The request could not be completed"); return body; };

  useEffect(() => {
    void fetch(`${API_BASE_URL}/api/booking`, { cache: "no-store" }).then(read).then((categories: any[]) => {
      const flattened: Service[] = [];
      categories.forEach(category => {
        (category.items || []).forEach((item: any) => flattened.push({ ...item, style: category.name }));
        (category.subcategories || []).forEach((style: any) => (style.items || []).forEach((item: any) => flattened.push({ ...item, style: style.name })));
      });
      setServices(flattened);
    }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load services"));
  }, []);

  useEffect(() => {
    setAvailableAddOns([]); setAddOnIds([]);
    if (!serviceId || (selectedService?.pricingMode === "BY_LENGTH" && !lengthOptionId)) return;
    void fetch(`${API_BASE_URL}/api/services/${serviceId}/add-ons${lengthOptionId ? `?lengthOptionId=${lengthOptionId}` : ""}`)
      .then(read).then(setAvailableAddOns).catch(() => setAvailableAddOns([]));
  }, [serviceId, lengthOptionId, selectedService?.pricingMode]);

  useEffect(() => {
    setQuote(null);
    if (!serviceId || (selectedService?.pricingMode === "BY_LENGTH" && !lengthOptionId) || (selectedService?.foundationChoicesEnabled && !foundation)) return;
    const controller = new AbortController();
    void fetch(`${API_BASE_URL}/api/booking/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ serviceId, lengthOptionId, foundation: foundation || null, addOnIds }) })
      .then(read).then(setQuote).catch(reason => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Unable to calculate price"); });
    return () => controller.abort();
  }, [serviceId, lengthOptionId, foundation, addOnIds, selectedService?.foundationChoicesEnabled, selectedService?.pricingMode]);

  const detailsValid = details.firstName.trim() && details.lastName.trim() && details.email.includes("@") && details.phoneNumber.trim();
  const serviceValid = Boolean(selectedService && quote);

  const selectSlot = async (slot: ManageSlot) => { setAppointmentDateTime(slot.startTime); setStep(4); };
  const submit = async () => {
    if (!quote || !selectedService || !appointmentDateTime) return;
    setLoading(true); setError(null);
    try {
      await read(await fetch(`${API_BASE_URL}/api/admin/appointments`, { method: "POST", headers: headers(), credentials: "include", body: JSON.stringify({
        ...details, quoteToken: quote.quoteToken, serviceId: selectedService.id,
        lengthOptionId, selectedLength: selectedLength?.name || null, selectedFoundation: foundation || null,
        selectedTexture: texture || null, appointmentDateTime, depositRequired
      }) }));
      await onCreated(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create appointment"); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="create-appointment-title" className="max-h-[96dvh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-[#fffdfb] shadow-2xl sm:rounded-3xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e8ded7] bg-white px-5 py-5 sm:px-8">
        <div><h2 id="create-appointment-title" className="text-2xl font-semibold text-[#241711]">Create appointment</h2><p className="mt-1 text-sm text-neutral-500">Add the customer, service, date and deposit.</p></div>
        <button aria-label="Close" onClick={onClose} disabled={loading}><X /></button>
      </header>
      <ol className="grid grid-cols-4 border-b bg-white px-4 py-4 sm:px-8">{["Customer", "Service", "Date & time", "Deposit & notify"].map((label, index) => <li key={label} className={`flex items-center gap-2 text-xs sm:text-sm ${step === index + 1 ? "font-semibold text-[#8b4e31]" : "text-neutral-500"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${step > index + 1 ? "bg-[#351d12] text-white" : step === index + 1 ? "border-[#a86443] bg-[#a86443] text-white" : "bg-white"}`}>{step > index + 1 ? <Check className="h-4 w-4"/> : index + 1}</span><span className="hidden sm:inline">{label}</span></li>)}</ol>
      {error && <div role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-8">{error}</div>}

      {step === 1 && <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-8">{[
        ["firstName", "First name", "Gloria"], ["lastName", "Last name", "Johnson"], ["email", "Email", "customer@example.com"], ["phoneNumber", "Phone number", "(210) 555-0123"]
      ].map(([key,label,placeholder]) => <label key={key} className="text-sm font-medium">{label}<input required value={(details as any)[key]} onChange={event => setDetails(value => ({ ...value, [key]: event.target.value }))} placeholder={placeholder} className="mt-2 h-12 w-full rounded-xl border border-[#d9cec6] bg-white px-4 outline-none focus:border-[#8b4e31]"/></label>)}<label className="sm:col-span-2 text-sm font-medium">Notes (optional)<textarea maxLength={1000} value={details.notes} onChange={event => setDetails(value => ({ ...value, notes: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-[#d9cec6] bg-white p-4"/></label><p className="sm:col-span-2 rounded-xl bg-[#f5eee8] p-4 text-sm text-[#654a3d]">Confirmation and payment messages are always sent to both the email address and phone number.</p><div className="sm:col-span-2 flex justify-end"><button disabled={!detailsValid} onClick={() => setStep(2)} className="rounded-xl bg-[#351d12] px-6 py-3 text-white disabled:opacity-40">Continue to service</button></div></div>}

      {step === 2 && <div className="space-y-5 p-5 sm:p-8"><label className="block text-sm font-medium">Appointment service<select value={serviceId || ""} onChange={event => { const id = Number(event.target.value); setServiceId(id || null); setLengthOptionId(null); setFoundation(""); setTexture(""); }} className="mt-2 h-12 w-full rounded-xl border border-[#d9cec6] bg-white px-4"><option value="">Choose an existing service</option>{services.map(service => <option key={service.id} value={service.id}>{service.style} — {service.name}</option>)}</select></label>{selectedService?.lengthOptions?.length ? <label className="block text-sm font-medium">Length<select value={lengthOptionId || ""} onChange={event => setLengthOptionId(Number(event.target.value) || null)} className="mt-2 h-12 w-full rounded-xl border border-[#d9cec6] bg-white px-4"><option value="">Choose a length</option>{selectedService.lengthOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> : null}{selectedService?.foundationChoicesEnabled && <label className="block text-sm font-medium">Foundation<select value={foundation} onChange={event => setFoundation(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d9cec6] bg-white px-4"><option value="">Choose a foundation</option><option value="REGULAR">Regular</option><option value="KNOTLESS">Knotless</option></select></label>}{selectedService?.hairTextures?.length ? <label className="block text-sm font-medium">Texture<select value={texture} onChange={event => setTexture(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d9cec6] bg-white px-4"><option value="">Choose a texture</option>{selectedService.hairTextures.map(value => <option key={value}>{value}</option>)}</select></label> : null}{availableAddOns.length > 0 && <fieldset><legend className="text-sm font-medium">Add-ons</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{availableAddOns.map(addOn => <label key={addOn.id} className="flex items-center justify-between rounded-xl border bg-white p-4"><span><b className="block text-sm">{addOn.name}</b><small>{addOn.pricingMode === "STARTING_AT" ? "From " : "+"}{money(addOn.priceCents)}</small></span><input type="checkbox" checked={addOnIds.includes(addOn.id)} onChange={event => setAddOnIds(ids => event.target.checked ? [...ids, addOn.id] : ids.filter(id => id !== addOn.id))}/></label>)}</div></fieldset>}{quote && <div className="rounded-xl border border-[#e2d4c5] bg-[#faf7f3] p-5"><div className="flex justify-between"><span>Service total</span><b>{money(quote.servicePriceCents)}</b></div><div className="mt-2 flex justify-between text-sm"><span>Configured deposit</span><b>{money(quote.depositCents)}</b></div></div>}<div className="flex justify-between"><button onClick={() => setStep(1)} className="rounded-xl border px-5 py-3">Back</button><button disabled={!serviceValid} onClick={() => setStep(3)} className="rounded-xl bg-[#351d12] px-6 py-3 text-white disabled:opacity-40">Continue to date & time</button></div></div>}

      {step === 3 && selectedService && <div className="p-5 sm:p-8"><ManageAvailabilityPicker serviceId={selectedService.id} lengthOptionId={lengthOptionId || undefined} busy={false} title="Choose date and time" confirmLabel="Use this date and time" onClose={() => setStep(2)} onConfirm={selectSlot}/></div>}

      {step === 4 && quote && <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-8"><section className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Require a deposit</h3><p className="mt-1 text-sm text-neutral-500">Uses the configured deposit for this service.</p></div><button type="button" role="switch" aria-checked={depositRequired} onClick={() => setDepositRequired(value => !value)} className={`relative h-7 w-12 rounded-full ${depositRequired ? "bg-[#a86443]" : "bg-neutral-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${depositRequired ? "left-6" : "left-1"}`}/></button></div><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between"><dt>Service total</dt><dd>{money(quote.servicePriceCents)}</dd></div><div className="flex justify-between font-semibold"><dt>{depositRequired ? "Deposit due" : "Deposit"}</dt><dd>{depositRequired ? money(quote.depositCents) : "Waived"}</dd></div><div className="flex justify-between"><dt>Remaining balance</dt><dd>{money(depositRequired ? quote.remainingBalanceCents : quote.servicePriceCents)}</dd></div></dl></section><section className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Review</h3><p className="mt-4 text-lg font-semibold">{details.firstName} {details.lastName}</p><p className="text-sm text-neutral-600">{selectedService?.style} · {selectedService?.name}{selectedLength ? ` · ${selectedLength.name}` : ""}</p><p className="mt-4 border-t pt-4 text-sm">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(`${appointmentDateTime}Z`))} CT</p><p className="mt-4 rounded-xl bg-[#f5eee8] p-3 text-sm">{depositRequired ? "The customer receives the secure deposit link by both email and SMS. The appointment confirms after payment." : "The appointment confirms immediately and the customer receives confirmation by both email and SMS."}</p></section><div className="sm:col-span-2 flex justify-between"><button onClick={() => setStep(3)} className="rounded-xl border px-5 py-3">Back</button><button disabled={loading} onClick={() => void submit()} className="rounded-xl bg-[#9d684f] px-6 py-3 font-semibold text-white disabled:opacity-50">{loading && <Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>}{depositRequired ? "Create & send payment link" : "Create & send confirmation"}</button></div></div>}
    </section>
  </div>;
}
