"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, Phone, TriangleAlert, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";

type Appointment = {
  customerFirstName: string;
  maskedEmail: string;
  serviceName: string;
  selectedSize?: string;
  selectedLength?: string;
  appointmentDateTime: string;
  appointmentEndDateTime?: string;
  status: string;
  depositPaidCents: number;
  changeDeadlineAt: string;
  selfServiceChangesRemaining: number;
  canCancel: boolean;
  canReschedule: boolean;
  lockReason?: string;
};
type Slot = { startTime: string; endTime: string };

const money = (cents = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const dateTime = (value?: string) => {
  const parsed = parseDate(value);
  return parsed
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Chicago" }).format(parsed)
    : "Date unavailable";
};
const time = (value?: string) => {
  const parsed = parseDate(value);
  return parsed
    ? new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/Chicago" }).format(parsed)
    : "Time unavailable";
};

async function read(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || "Something went wrong. Please try again.");
  return body;
}

export default function ManageAppointmentClient({ token }: { token: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [mode, setMode] = useState<"summary" | "reschedule" | "cancel">("summary");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setAppointment(await read(await fetch(`${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}`, { cache: "no-store" })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "This appointment link is unavailable.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const loadSlots = async (nextDate: string) => {
    setDate(nextDate);
    setSelected(null);
    setSlots([]);
    setError(null);
    if (!nextDate) return;
    try {
      setSlots(await read(await fetch(`${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}/slots?date=${nextDate}`, { cache: "no-store" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load times.");
    }
  };

  const reschedule = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await read(await fetch(`${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDateTime: selected.startTime }),
      }));
      setAppointment(updated);
      setMessage("Your appointment was rescheduled successfully.");
      setMode("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reschedule.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!acknowledged) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await read(await fetch(`${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }));
      setAppointment(updated);
      setMessage("Your appointment has been cancelled.");
      setMode("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="min-h-screen grid place-items-center bg-[#fbf7f1] text-[#321a10]">Opening your secure appointment…</main>;
  if (!appointment) return <main className="min-h-screen grid place-items-center bg-[#fbf7f1] p-6"><section className="max-w-lg rounded-3xl border border-[#d7b99d] bg-white p-10 text-center"><LockKeyhole className="mx-auto mb-4"/><h1 className="font-serif text-3xl">Link unavailable</h1><p className="mt-3 text-stone-600">{error}</p></section></main>;

  const cancelled = appointment.status === "CANCELLED" || appointment.status === "DENIED";
  return <main className="min-h-screen bg-[#fbf7f1] px-4 py-8 text-[#321a10] sm:py-14">
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[#d7b99d] bg-[#fffdfa] shadow-xl">
      <header className="border-b border-[#ead9ca] px-6 py-8 text-center sm:px-12">
        <div className="font-serif text-4xl tracking-[.18em]">AH</div><div className="text-[10px] tracking-[.35em]">BRAIDING SALON</div>
        <h1 className="mt-7 font-serif text-4xl">Manage your appointment</h1>
        <p className="mt-2 text-sm text-stone-500"><LockKeyhole className="mr-1 inline h-4 w-4"/>Secure, private appointment link</p>
      </header>
      <div className="space-y-5 p-5 sm:p-10">
        {message && <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="shrink-0"/>{message}</div>}
        {error && <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-red-800"><TriangleAlert className="shrink-0"/>{error}</div>}
        <section className="rounded-2xl border border-[#ead9ca] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-serif text-2xl">{dateTime(appointment.appointmentDateTime)}</p><p className="mt-3 text-lg font-semibold">{appointment.serviceName}</p><p className="text-stone-600">{[appointment.selectedSize, appointment.selectedLength].filter(Boolean).join(" • ")}</p></div><span className="rounded-full bg-[#edf5df] px-3 py-1 text-sm">{appointment.status}</span></div>
          <hr className="my-5 border-[#ead9ca]"/><p>Deposit paid: <strong>{money(appointment.depositPaidCents)}</strong> <span className="text-red-700">• Non-refundable</span></p>
        </section>

        {mode === "summary" && <>
          {!cancelled && <section className="rounded-2xl border border-[#ead9ca] p-5"><div className="flex gap-3"><CalendarDays/><div><h2 className="font-semibold">Appointment changes</h2><p className="mt-1 text-stone-600">You may cancel or reschedule online once, up to 72 hours before your appointment.</p><p className="mt-3 text-sm">Changes available until {dateTime(appointment.changeDeadlineAt)}.</p></div></div></section>}
          {!cancelled && (appointment.canCancel || appointment.canReschedule)
            ? <div className="grid gap-3 sm:grid-cols-2"><button disabled={!appointment.canReschedule} className="rounded-xl bg-[#351d12] px-5 py-4 text-white disabled:opacity-40" onClick={() => { setMode("reschedule"); setError(null); }}>Reschedule appointment</button><button disabled={!appointment.canCancel} className="rounded-xl border border-[#6b3d2a] px-5 py-4 disabled:opacity-40" onClick={() => { setMode("cancel"); setError(null); }}>Cancel appointment</button></div>
            : !cancelled && <section className="rounded-2xl bg-[#f4eadc] p-5"><div className="flex gap-3"><LockKeyhole/><div><h2 className="font-semibold">Online changes are closed</h2><p className="mt-1 text-stone-600">{appointment.lockReason || "Your one self-service change has been used or the 72-hour deadline has passed."}</p></div></div></section>}
        </>}

        {mode === "reschedule" && <section className="space-y-5">
          <button className="flex items-center gap-2 text-sm underline" onClick={() => setMode("summary")}><X className="h-4 w-4"/>Close</button>
          <h2 className="font-serif text-3xl">Choose a new date and time</h2>
          <input aria-label="New appointment date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => void loadSlots(e.target.value)} className="w-full rounded-xl border border-[#d7b99d] bg-white p-4"/>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{slots.map(slot => <button key={slot.startTime} onClick={() => setSelected(slot)} className={`rounded-xl border p-3 ${selected?.startTime === slot.startTime ? "bg-[#351d12] text-white" : "bg-white"}`}><Clock3 className="mr-2 inline h-4 w-4"/>{time(slot.startTime)}</button>)}</div>
          {date && slots.length === 0 && <p className="text-stone-500">No times are available on this date.</p>}
          <div className="rounded-xl bg-[#f4eadc] p-4 text-sm">Your current appointment remains reserved until the new time is confirmed. This uses your one self-service change.</div>
          <button disabled={!selected || busy} onClick={reschedule} className="w-full rounded-xl bg-[#351d12] p-4 text-white disabled:opacity-40">{busy ? "Confirming…" : "Confirm one-time reschedule"}</button>
        </section>}

        {mode === "cancel" && <section className="space-y-5">
          <button className="flex items-center gap-2 text-sm underline" onClick={() => setMode("summary")}><X className="h-4 w-4"/>Close</button>
          <h2 className="font-serif text-3xl">Cancel appointment?</h2>
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">Your {money(appointment.depositPaidCents)} deposit is non-refundable.</div>
          <p>Cancellation is available only up to 72 hours before your appointment. This will use your one self-service change and cannot be undone.</p>
          <label className="block"><span className="text-sm">Reason for cancellation (optional)</span><textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d7b99d] p-3" rows={3}/></label>
          <label className="flex gap-3"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}/><span>I understand my deposit will not be refunded and this action cannot be undone.</span></label>
          <div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl border p-4" onClick={() => setMode("summary")}>Keep appointment</button><button disabled={!acknowledged || busy} onClick={cancel} className="rounded-xl bg-red-700 p-4 text-white disabled:opacity-40">{busy ? "Cancelling…" : "Cancel appointment"}</button></div>
        </section>}

        <section className="rounded-xl bg-[#f8f0e7] p-4 text-sm"><strong>No-Show Policy</strong><p className="mt-1">Missing your appointment without notice will result in a non-refundable fee equal to 60% of the scheduled service price. Your deposit is included in that 60%, and any remaining amount may be charged to your saved card before you can book again.</p></section>
        <a href="tel:+12108128121" className="mx-auto flex w-fit items-center gap-2 underline"><Phone className="h-4 w-4"/>Call or text (210) 812-8121</a>
      </div>
      <footer className="bg-[#351d12] px-6 py-5 text-center text-sm text-white">AH Braiding Salon · (210) 812-8121</footer>
    </div>
  </main>;
}
