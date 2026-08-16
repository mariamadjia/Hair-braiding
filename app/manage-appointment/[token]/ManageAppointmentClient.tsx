"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Info, LockKeyhole, Phone, TriangleAlert, UserRound, X } from "lucide-react";
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
  const changesOpen = !cancelled && (appointment.canCancel || appointment.canReschedule);
  return <main className="min-h-screen bg-[#fbf7f1] px-3 py-4 text-[#2f1b12] sm:px-6 sm:py-8 lg:py-12">
    <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[20px] border border-[#cdb79f] bg-[#fffdfa] shadow-[0_18px_55px_rgba(62,38,25,.12)]">
      <header className="relative px-5 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-8 lg:px-14">
        <div className="flex items-start justify-between gap-4">
          <Image src="/logo/logo2.PNG" alt="AH Braiding Salon" width={132} height={80} className="h-auto w-[105px] object-contain sm:w-[132px]" priority/>
          <div className="text-right text-xs text-stone-600 sm:text-sm"><p><LockKeyhole className="mr-1 inline h-4 w-4"/>Secure link</p><p className="mt-1">{appointment.maskedEmail}</p></div>
        </div>
        <div className="mt-5 text-center sm:mt-0"><h1 className="font-serif text-[2rem] leading-tight sm:text-5xl">Manage your appointment</h1><div className="mx-auto mt-4 flex w-40 items-center gap-3 text-[#c8a982]"><span className="h-px flex-1 bg-[#decbb5]"/><span>⌘</span><span className="h-px flex-1 bg-[#decbb5]"/></div></div>
      </header>
      <div className="grid gap-7 px-5 pb-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_285px] lg:px-14 lg:pb-10">
        <div className="space-y-4">
          <p className="font-serif text-xl">Hi {appointment.customerFirstName},</p>
        {message && <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="shrink-0"/>{message}</div>}
        {error && <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-red-800"><TriangleAlert className="shrink-0"/>{error}</div>}
        <section className="rounded-xl border border-[#e2d4c5] p-5 sm:p-7">
          <div className="flex items-start gap-4 sm:gap-6"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#3c2418] text-[#ead6bc] sm:h-20 sm:w-20"><UserRound className="h-9 w-9 sm:h-11 sm:w-11"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-serif text-xl leading-snug sm:text-2xl">{dateTime(appointment.appointmentDateTime)}</p><span className="rounded-md bg-[#e5efd7] px-2.5 py-1 text-xs text-[#355326]">{appointment.status === "APPROVED" ? "Confirmed" : appointment.status}</span></div><p className="mt-3 font-serif text-xl">{appointment.serviceName}</p><p className="text-stone-600">{[appointment.selectedSize, appointment.selectedLength].filter(Boolean).join(" • ")}</p></div></div>
          <hr className="my-5 border-[#ead9ca]"/><p>Deposit paid: <strong>{money(appointment.depositPaidCents)}</strong> <span className="text-red-700">• Non-refundable</span></p>
        </section>

        {mode === "summary" && <>
          {!cancelled && <section className={`rounded-xl border p-5 sm:p-6 ${changesOpen ? "border-[#e2d4c5]" : "border-[#e7d8c7] bg-[#fdfaf6]"}`}><div className="flex gap-4">{changesOpen ? <CalendarDays className="mt-1 shrink-0"/> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f3e7d6]"><LockKeyhole className="h-7 w-7"/></div>}<div><div className="flex flex-wrap items-center gap-3"><h2 className="font-serif text-2xl">{changesOpen ? "Appointment changes" : "Online changes are closed"}</h2>{!changesOpen && <span className="rounded-md bg-[#f2dfbe] px-2.5 py-1 text-xs">72-hour deadline passed</span>}</div>{changesOpen ? <><p className="mt-2 text-stone-600">You may cancel or reschedule online once, up to 72 hours before your appointment.</p><p className="mt-3 text-sm">Changes available until {dateTime(appointment.changeDeadlineAt)}.</p></> : <><p className="mt-2 text-stone-600">Your appointment is still confirmed. The deadline to cancel or reschedule online was {dateTime(appointment.changeDeadlineAt)}.</p><p className="mt-4 border-t border-[#ead9ca] pt-4">For assistance, call or text (210) 812-8121.<br/><span className="text-stone-500">Approval is not guaranteed.</span></p></>}</div></div></section>}
          {changesOpen
            ? <div className="grid gap-3 sm:grid-cols-2"><button disabled={!appointment.canReschedule} className="rounded-xl bg-[#351d12] px-5 py-4 text-white disabled:opacity-40" onClick={() => { setMode("reschedule"); setError(null); }}>Reschedule appointment</button><button disabled={!appointment.canCancel} className="rounded-xl border border-[#6b3d2a] px-5 py-4 disabled:opacity-40" onClick={() => { setMode("cancel"); setError(null); }}>Cancel appointment</button></div>
            : !cancelled && <><div className="grid gap-3 sm:grid-cols-2"><button disabled className="rounded-xl bg-stone-100 px-5 py-4 text-stone-400"><LockKeyhole className="mr-2 inline h-4 w-4"/>Reschedule appointment</button><button disabled className="rounded-xl bg-stone-100 px-5 py-4 text-stone-400"><LockKeyhole className="mr-2 inline h-4 w-4"/>Cancel appointment</button></div><p className="text-center text-sm text-stone-500">Online cancellation and rescheduling are no longer available.</p></>}
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

        {!changesOpen && !cancelled && <a href="tel:+12108128121" className="mx-auto flex w-full max-w-[330px] items-center justify-center gap-3 rounded-xl bg-[#351d12] px-5 py-3 text-center text-white"><Phone className="h-5 w-5"/><span>Call or text<br/>(210) 812-8121</span></a>}
        <section className="flex gap-3 rounded-xl bg-[#faf4ec] p-4 text-sm"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[#b98354]"/><div><strong>No-Show Policy</strong><p className="mt-1">Missing your appointment without notice will result in a non-refundable fee equal to 60% of the scheduled service price. This fee must be paid before you can book another appointment.</p></div></section>
        </div>

        <aside className="h-fit rounded-xl border border-[#e2d4c5] p-6 lg:mt-[44px]">
          <h2 className="font-serif text-2xl">Why can’t I make changes?</h2>
          <div className="mt-7 space-y-7 text-sm text-stone-700"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6ead8]"><Clock3/></div><p className="pt-1">Changes require at least 72 hours’ notice.</p></div><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6ead8]"><UserRound/></div><p className="pt-1">Only one self-service cancellation or reschedule is allowed.</p></div><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6ead8]"><CircleDollarSign/></div><p className="pt-1">Your {money(appointment.depositPaidCents)} deposit remains non-refundable.</p></div></div>
        </aside>
      </div>
      <footer className="bg-gradient-to-r from-[#3a2114] to-[#2a160d] px-6 py-5 text-center text-sm text-white">AH Braiding Salon · (210) 812-8121</footer>
    </div>
  </main>;
}
