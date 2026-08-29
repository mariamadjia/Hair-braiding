"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2, TriangleAlert } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";

export type ManageSlot = { startTime: string; endTime: string; isAvailable?: boolean; availableSpots?: number };
type DateStatus = "loading" | "available" | "unavailable" | "error";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const centralTodayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const localParts = (value: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? { year: +match[1], month: +match[2], day: +match[3], hour: +match[4], minute: +match[5] } : null;
};
const slotTime = (value: string) => {
  const parts = localParts(value);
  if (!parts) return "Time unavailable";
  const suffix = parts.hour >= 12 ? "PM" : "AM";
  return `${parts.hour % 12 || 12}:${String(parts.minute).padStart(2, "0")} ${suffix}`;
};
const fullDateTime = (value: string) => {
  const parts = localParts(value);
  if (!parts) return "Date unavailable";
  const preserved = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(preserved) + " CT";
};

export default function ManageAvailabilityPicker({ token, serviceId, lengthOptionId, currentAppointmentDateTime, busy, onClose, onConfirm, title = "Choose a new date and time", confirmLabel = "Confirm one-time reschedule", compact = false }: {
  token?: string;
  serviceId?: number;
  lengthOptionId?: number;
  currentAppointmentDateTime?: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (slot: ManageSlot) => Promise<void>;
  title?: string;
  confirmLabel?: string;
  compact?: boolean;
}) {
  const todayKey = useMemo(centralTodayKey, []);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const [month, setMonth] = useState(() => new Date(todayYear, todayMonth - 1, 1));
  const [statuses, setStatuses] = useState<Record<string, DateStatus>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<ManageSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ManageSlot | null>(null);
  const [step, setStep] = useState<"date" | "time" | "review">("date");
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, ManageSlot[]>());
  const monthRequest = useRef<AbortController | null>(null);
  const timesRequest = useRef<AbortController | null>(null);

  const days = useMemo(() => {
    const leading = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);

  const requestSlots = async (key: string, signal?: AbortSignal) => {
    const url = token
      ? `${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}/slots?date=${key}`
      : `${API_BASE_URL}/api/availability/slots?date=${key}&timezone=America%2FChicago&serviceId=${serviceId}${lengthOptionId ? `&lengthOptionId=${lengthOptionId}` : ""}`;
    const response = await fetch(url, { cache: "no-store", signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || body.message || "Unable to load available times.");
    return Array.isArray(body) ? body as ManageSlot[] : [];
  };

  useEffect(() => {
    monthRequest.current?.abort();
    const controller = new AbortController();
    monthRequest.current = controller;
    const keys = days.filter((day): day is number => day !== null)
      .map(day => dateKey(new Date(month.getFullYear(), month.getMonth(), day)))
      .filter(key => key >= todayKey && !cache.current.has(key));
    setStatuses(previous => ({ ...previous, ...Object.fromEntries(keys.map(key => [key, "loading"])) }));
    void (async () => {
      for (let index = 0; index < keys.length && !controller.signal.aborted; index += 4) {
        await Promise.all(keys.slice(index, index + 4).map(async key => {
          try {
            const result = await requestSlots(key, controller.signal);
            cache.current.set(key, result);
            setStatuses(previous => ({ ...previous, [key]: result.length ? "available" : "unavailable" }));
          } catch (requestError) {
            if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
              setStatuses(previous => ({ ...previous, [key]: "error" }));
            }
          }
        }));
      }
    })();
    return () => controller.abort();
  }, [days, month, todayKey, token]);

  useEffect(() => () => { monthRequest.current?.abort(); timesRequest.current?.abort(); }, []);

  const selectDate = async (key: string) => {
    if (statuses[key] !== "available") return;
    setSelectedDate(key); setSelectedSlot(null); setError(null); setStep("time");
    const cached = cache.current.get(key);
    if (cached) { setSlots(cached); return; }
    timesRequest.current?.abort();
    const controller = new AbortController();
    timesRequest.current = controller;
    setLoadingTimes(true); setSlots([]);
    try {
      const result = await requestSlots(key, controller.signal);
      cache.current.set(key, result); setSlots(result);
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Unable to load available times.");
    } finally { if (timesRequest.current === controller) { setLoadingTimes(false); timesRequest.current = null; } }
  };

  const groups = [
    { label: "Morning", slots: slots.filter(slot => (localParts(slot.startTime)?.hour ?? 24) < 12) },
    { label: "Afternoon", slots: slots.filter(slot => { const hour = localParts(slot.startTime)?.hour ?? -1; return hour >= 12 && hour < 17; }) },
    { label: "Evening", slots: slots.filter(slot => (localParts(slot.startTime)?.hour ?? -1) >= 17) },
  ].filter(group => group.slots.length);
  const canGoPrevious = month.getFullYear() > todayYear || month.getMonth() > todayMonth - 1;

  return <section className="overflow-hidden rounded-xl border border-[#e2d4c5] bg-white">
    <div className={`flex items-center justify-between border-b border-[#eadfd5] ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
      <div><h2 className={`font-serif ${compact ? "text-xl" : "text-2xl"}`}>{title}</h2><p className="mt-1 text-xs text-[#76675e]"><Clock3 className="mr-1 inline h-3.5 w-3.5"/>San Antonio Central Time</p></div>
      <button onClick={onClose} className="text-sm underline">Close</button>
    </div>

    {step === "date" && <div className={compact ? "mx-auto max-w-xl p-4" : "p-5 sm:p-7"}>
      <div className={`${compact ? "mb-3" : "mb-5"} flex items-center justify-between`}><button aria-label="Previous month" disabled={!canGoPrevious} onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-[#f8efe7] disabled:opacity-25"><ChevronLeft className={compact ? "h-5 w-5" : ""}/></button><h3 className={`font-serif ${compact ? "text-xl" : "text-2xl"}`}>{MONTHS[month.getMonth()]} {month.getFullYear()}</h3><button aria-label="Next month" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-[#f8efe7]"><ChevronRight className={compact ? "h-5 w-5" : ""}/></button></div>
      <div className={`grid grid-cols-7 ${compact ? "gap-1" : "gap-1.5 sm:gap-2"}`}>{DAYS.map(day => <div key={day} className={`${compact ? "py-1" : "py-2"} text-center text-[10px] font-semibold uppercase tracking-wider text-[#76675e]`}>{day}</div>)}{days.map((day, index) => {
        if (!day) return <span key={`empty-${index}`}/>;
        const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
        const status = key < todayKey ? "unavailable" : statuses[key];
        const enabled = status === "available";
        return <button key={key} disabled={!enabled} onClick={() => void selectDate(key)} aria-label={`${MONTHS[month.getMonth()]} ${day}${enabled ? ", appointments available" : ", unavailable"}`} className={`relative aspect-square ${compact ? "min-h-8 rounded-md text-xs" : "min-h-10 rounded-lg text-sm"} border transition ${enabled ? "border-[#ddc9b8] bg-[#fffdf9] hover:border-[#9c5c3b] hover:bg-[#f8efe7]" : "border-[#f0e9e2] bg-[#fbf8f4] text-stone-300"}`}>{day}{status === "loading" && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 animate-pulse rounded-full bg-stone-300"/>}{enabled && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#b7602e]"/>}</button>;
      })}</div>
      <div className={`${compact ? "mt-3 pt-3" : "mt-5 pt-4"} flex gap-5 border-t border-[#eee3da] text-xs text-[#76675e]`}><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#b7602e]"/>Available</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ded7d0]"/>Closed or fully booked</span></div>
    </div>}

    {step === "time" && <div className={compact ? "mx-auto min-h-[280px] max-w-2xl p-4" : "min-h-[360px] p-5 sm:p-7"}><button onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); }} className="mb-5 flex items-center text-xs uppercase tracking-wider text-[#8b735f]"><ChevronLeft className="mr-1 h-4 w-4"/>Back to dates</button><h3 className="mb-5 font-serif text-xl">{selectedDate ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`)) : "Selected date"}</h3>{loadingTimes ? <div className="space-y-4"><p className="text-sm text-[#76675e]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Loading available times…</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[1,2,3,4,5,6].map(value => <div key={value} className="h-11 animate-pulse rounded border bg-[#fbf7f2]"/>)}</div></div> : error ? <div className="rounded-lg bg-red-50 p-4 text-red-800"><TriangleAlert className="mr-2 inline h-4 w-4"/>{error}</div> : !slots.length ? <p>No available times. Please choose another date.</p> : <div className="space-y-6">{groups.map(group => <fieldset key={group.label}><legend className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-[#b0633e]">{group.label}</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{group.slots.map(slot => <button key={slot.startTime} aria-pressed={selectedSlot?.startTime === slot.startTime} aria-label={`${slotTime(slot.startTime)} available`} onClick={() => setSelectedSlot(slot)} className={`rounded border px-4 py-3 text-sm ${selectedSlot?.startTime === slot.startTime ? "border-[#2c1810] bg-[#2c1810] text-white" : "border-[#d9c4b3] bg-[#fffdf9] hover:bg-[#f8efe7]"}`}>{slotTime(slot.startTime)}</button>)}</div></fieldset>)}</div>}<button disabled={!selectedSlot} onClick={() => setStep("review")} className="mt-7 w-full rounded-lg bg-[#351d12] p-4 text-white disabled:opacity-40">Review new appointment</button></div>}

    {step === "review" && selectedSlot && <div className={compact ? "mx-auto max-w-2xl space-y-4 p-4" : "space-y-5 p-5 sm:p-7"}><button onClick={() => setStep("time")} className="flex items-center text-xs uppercase tracking-wider text-[#8b735f]"><ChevronLeft className="mr-1 h-4 w-4"/>Back to times</button><div className={`grid gap-4 ${currentAppointmentDateTime ? "sm:grid-cols-2" : ""}`}>{currentAppointmentDateTime && <div className="rounded-lg border border-[#e2d4c5] bg-[#faf7f3] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Current appointment</p><p className="mt-2 font-serif text-lg">{fullDateTime(currentAppointmentDateTime)}</p></div>}<div className="rounded-lg border-2 border-[#7a4832] bg-[#fffaf5] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#9b5837]">{currentAppointmentDateTime ? "New appointment" : "Selected appointment"}</p><p className="mt-2 font-serif text-lg">{fullDateTime(selectedSlot.startTime)}</p></div></div>{currentAppointmentDateTime && <div className="rounded-lg bg-[#f4eadc] p-4 text-sm">Your current appointment stays reserved until you confirm. Confirming uses your one self-service change and cannot be undone online.</div>}<button disabled={busy} onClick={() => void onConfirm(selectedSlot)} className="w-full rounded-lg bg-[#351d12] p-4 text-white disabled:opacity-50">{busy ? "Saving…" : confirmLabel}</button></div>}
  </section>;
}
