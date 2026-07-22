"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Ban, CalendarDays, ChevronDown, ChevronUp, Clock, Copy, Loader2, Minus, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";

type SavedSlot = { startTime: string; endTime: string; capacity: number };
type AvailabilityWindow = { id: string; startTime: string; endTime: string };
type DayAvailability = {
    dayOfWeek: string;
    enabled: boolean;
    windows: AvailabilityWindow[];
    capacities: Record<string, number>;
};
type ExistingAppointment = { id: number; appointmentDateTime: string; status: string; selectedService?: string; customer?: { firstName?: string; lastName?: string } };
type BlockedDate = { id: number; startDateTime: string; endDateTime: string; reason: string; isRecurring: boolean; recurrencePattern?: string };
type TemplateChoice = { name: string; description: string; schedule: Record<string, AvailabilityWindow[]> };

const DAYS = [
    { key: "MONDAY", label: "Monday" }, { key: "TUESDAY", label: "Tuesday" },
    { key: "WEDNESDAY", label: "Wednesday" }, { key: "THURSDAY", label: "Thursday" },
    { key: "FRIDAY", label: "Friday" }, { key: "SATURDAY", label: "Saturday" },
    { key: "SUNDAY", label: "Sunday" }
];

const windowId = () => `window-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const minutes = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
};
const timeValue = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const displayTime = (time: string) => {
    const [hourText, minute] = time.split(":");
    const hour = Number(hourText);
    return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};

const startsForWindow = (window: AvailabilityWindow, gap: number) => {
    const starts: string[] = [];
    for (let value = minutes(window.startTime); value < minutes(window.endTime); value += gap) starts.push(timeValue(value));
    return starts;
};

const windowsFromSlots = (slots: SavedSlot[]): AvailabilityWindow[] => {
    if (!slots.length) return [];
    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const windows: AvailabilityWindow[] = [];
    let start = sorted[0].startTime;
    let end = sorted[0].endTime;
    for (const slot of sorted.slice(1)) {
        if (slot.startTime === end) end = slot.endTime;
        else {
            windows.push({ id: windowId(), startTime: start, endTime: end });
            start = slot.startTime;
            end = slot.endTime;
        }
    }
    windows.push({ id: windowId(), startTime: start, endTime: end });
    return windows;
};

const TEMPLATES: TemplateChoice[] = [
    { name: "Weekday studio", description: "Monday–Friday, 9 AM–5 PM", schedule: Object.fromEntries(DAYS.map(day => [day.key, ["SATURDAY", "SUNDAY"].includes(day.key) ? [] : [{ id: windowId(), startTime: "09:00", endTime: "17:00" }]])) },
    { name: "Salon week", description: "Tuesday–Saturday with extended evenings", schedule: Object.fromEntries(DAYS.map(day => [day.key, ["SUNDAY", "MONDAY"].includes(day.key) ? [] : [{ id: windowId(), startTime: "09:00", endTime: day.key === "SATURDAY" ? "17:00" : "19:00" }]])) },
    { name: "Split day", description: "9 AM–1 PM and 2 PM–6 PM, Monday–Saturday", schedule: Object.fromEntries(DAYS.map(day => [day.key, day.key === "SUNDAY" ? [] : [{ id: windowId(), startTime: "09:00", endTime: "13:00" }, { id: windowId(), startTime: "14:00", endTime: "18:00" }]])) }
];

export default function AvailabilitySchedule() {
    const [schedule, setSchedule] = useState<DayAvailability[]>([]);
    const [slotGap, setSlotGap] = useState(60);
    const [defaultCapacity, setDefaultCapacity] = useState(1);
    const [expandedDay, setExpandedDay] = useState<string | null>("MONDAY");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [appointments, setAppointments] = useState<ExistingAppointment[]>([]);
    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
    const [removalWarnings, setRemovalWarnings] = useState<ExistingAppointment[]>([]);
    const [templatePreview, setTemplatePreview] = useState<TemplateChoice | null>(null);
    const scheduleRef = useRef(schedule);
    const slotGapRef = useRef(slotGap);
    const defaultCapacityRef = useRef(defaultCapacity);
    const appointmentsRef = useRef(appointments);
    scheduleRef.current = schedule;
    slotGapRef.current = slotGap;
    defaultCapacityRef.current = defaultCapacity;
    appointmentsRef.current = appointments;

    const markChanged = () => {
        setSuccess(false);
        window.dispatchEvent(new CustomEvent("unsavedChanges", { detail: { hasChanges: true } }));
    };

    useEffect(() => {
        void loadSchedule();
        const save = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.tab === "hours") void saveSchedule();
        };
        window.addEventListener("triggerSave", save);
        return () => window.removeEventListener("triggerSave", save);
    }, []);

    const loadSchedule = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Your admin session has expired. Please sign in again.");
            const headers = { Authorization: `Bearer ${token}` };
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);
            const range = new URLSearchParams({
                startDate: `${startDate.toISOString().slice(0, 10)}T00:00:00`,
                endDate: `${endDate.toISOString().slice(0, 10)}T23:59:59`
            });
            const [settingsResponse, hoursResponse, appointmentsResponse, blockedResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/appointments/settings`, { headers, cache: "no-store" }),
                fetch(`${API_BASE_URL}/api/availability/business-hours`, { cache: "no-store" }),
                fetch(`${API_BASE_URL}/api/appointments/upcoming`, { headers, cache: "no-store" }),
                fetch(`${API_BASE_URL}/api/availability/blocked-times?${range}`, { headers, cache: "no-store" })
            ]);
            if (!settingsResponse.ok || !hoursResponse.ok || !appointmentsResponse.ok || !blockedResponse.ok) throw new Error("Could not load the complete availability data.");
            const settings = await settingsResponse.json();
            const hours = await hoursResponse.json();
            const gap = settings.slotDurationMinutes || 60;
            const capacity = settings.maxAppointmentsPerSlot || 1;
            setSlotGap(gap);
            setDefaultCapacity(capacity);
            setAppointments(await appointmentsResponse.json());
            setBlockedDates(await blockedResponse.json());

            const loaded = await Promise.all(DAYS.map(async day => {
                const businessDay = hours.find((item: any) => item.dayOfWeek === day.key);
                if (!businessDay?.isOpen) return { dayOfWeek: day.key, enabled: false, windows: [], capacities: {} };
                const response = await fetch(`${API_BASE_URL}/api/time-slots/${day.key}`, { headers, cache: "no-store" });
                if (!response.ok) throw new Error(`Could not load ${day.label}. Please refresh and sign in again.`);
                const slots: SavedSlot[] = await response.json();
                const fallback = [{
                    id: windowId(),
                    startTime: businessDay.openTime?.slice(0, 5) || "09:00",
                    endTime: businessDay.closeTime?.slice(0, 5) || "17:00"
                }];
                return {
                    dayOfWeek: day.key,
                    enabled: true,
                    windows: slots.length ? windowsFromSlots(slots) : fallback,
                    capacities: Object.fromEntries(slots.map(slot => [slot.startTime.slice(0, 5), slot.capacity || capacity]))
                };
            }));
            setSchedule(loaded);
        } catch (caught) {
            setSchedule([]);
            setError(caught instanceof Error ? caught.message : "Could not load availability.");
        } finally {
            setLoading(false);
        }
    };

    const updateDay = (key: string, updater: (day: DayAvailability) => DayAvailability) => {
        setSchedule(previous => previous.map(day => day.dayOfWeek === key ? updater(day) : day));
        markChanged();
    };

    const updateWindow = (dayKey: string, id: string, field: "startTime" | "endTime", value: string) =>
        updateDay(dayKey, day => ({ ...day, windows: day.windows.map(window => window.id === id ? { ...window, [field]: value } : window) }));

    const generatedStarts = (day: DayAvailability) => day.windows.flatMap(window => startsForWindow(window, slotGap));

    const validate = (days: DayAvailability[]) => {
        for (const day of days) {
            if (!day.enabled) continue;
            if (!day.windows.length) throw new Error(`${day.dayOfWeek} needs at least one availability window.`);
            const sorted = [...day.windows].sort((a, b) => a.startTime.localeCompare(b.startTime));
            for (const [index, window] of sorted.entries()) {
                if (minutes(window.endTime) <= minutes(window.startTime)) throw new Error(`${day.dayOfWeek}: available-until time must be after available-from time.`);
                if (index && minutes(window.startTime) < minutes(sorted[index - 1].endTime)) throw new Error(`${day.dayOfWeek}: availability windows cannot overlap.`);
            }
        }
    };

    const appointmentsRemovedBy = (days: DayAvailability[]) => appointmentsRef.current.filter(appointment => {
        if (["DENIED", "CANCELLED"].includes(appointment.status)) return false;
        const [datePart, timePart] = appointment.appointmentDateTime.split("T");
        const appointmentDate = new Date(`${datePart}T12:00:00`);
        const dayKey = DAYS[(appointmentDate.getDay() + 6) % 7]?.key;
        const day = days.find(item => item.dayOfWeek === dayKey);
        const starts = day?.windows.flatMap(window => startsForWindow(window, slotGapRef.current)) || [];
        return !day?.enabled || !starts.includes(timePart.slice(0, 5));
    });

    const saveSchedule = async (confirmed = false) => {
        const current = scheduleRef.current;
        const currentGap = slotGapRef.current;
        const currentDefaultCapacity = defaultCapacityRef.current;
        try {
            validate(current);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Invalid availability.");
            return;
        }
        const removed = appointmentsRemovedBy(current);
        if (!confirmed && removed.length) {
            setRemovalWarnings(removed);
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: true } }));
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Your admin session has expired. Please sign in again.");
            const payload = { days: current.map(day => ({
                dayOfWeek: day.dayOfWeek,
                isAvailable: day.enabled,
                timeSlots: day.enabled ? day.windows.flatMap(window => startsForWindow(window, currentGap).map(start => ({
                    dayOfWeek: day.dayOfWeek,
                    startTime: start,
                    endTime: timeValue(Math.min(minutes(start) + currentGap, minutes(window.endTime))),
                    capacity: day.capacities[start] || currentDefaultCapacity
                }))) : []
            })) };
            const response = await fetch(`${API_BASE_URL}/api/availability/schedule`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || "Could not save availability.");
            }
            setSuccess(true);
            setRemovalWarnings([]);
            window.dispatchEvent(new CustomEvent("unsavedChanges", { detail: { hasChanges: false } }));
            window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: false, success: true } }));
        } catch (caught) {
            const message = caught instanceof DOMException && caught.name === "AbortError"
                ? "Saving took longer than 20 seconds. Nothing was confirmed—please try again."
                : caught instanceof Error ? caught.message : "Could not save availability.";
            setError(message);
            window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: false, error: message } }));
        } finally {
            window.clearTimeout(timeout);
            setSaving(false);
        }
    };

    const copyMonday = () => {
        const monday = schedule.find(day => day.dayOfWeek === "MONDAY");
        if (!monday) return;
        setSchedule(previous => previous.map(day => day.dayOfWeek === "MONDAY" ? day : ({
            ...day, enabled: monday.enabled,
            windows: monday.windows.map(window => ({ ...window, id: windowId() })),
            capacities: { ...monday.capacities }
        })));
        markChanged();
    };

    const applyTemplate = (template: TemplateChoice) => {
        setSchedule(previous => previous.map(day => {
            const windows = template.schedule[day.dayOfWeek] || [];
            return { ...day, enabled: windows.length > 0, windows: windows.map(window => ({ ...window, id: windowId() })), capacities: {} };
        }));
        setTemplatePreview(null);
        markChanged();
    };

    const applyCapacityToDay = (dayKey: string, capacity: number) => updateDay(dayKey, day => ({
        ...day,
        capacities: Object.fromEntries(generatedStarts(day).map(start => [start, capacity]))
    }));

    const upcomingBlockedOccurrences = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return Array.from({ length: 14 }, (_, offset) => {
            const date = new Date(today); date.setDate(today.getDate() + offset);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const blocks = blockedDates.filter(block => {
                const blockDate = block.startDateTime.slice(0, 10);
                if (!block.isRecurring) return blockDate <= key && block.endDateTime.slice(0, 10) >= key;
                const origin = new Date(`${blockDate}T12:00:00`);
                if (key < blockDate) return false;
                if (block.recurrencePattern === "DAILY") return true;
                if (block.recurrencePattern === "WEEKLY") return origin.getDay() === date.getDay();
                return block.recurrencePattern === "MONTHLY" && origin.getDate() === date.getDate();
            });
            return { date, blocks };
        });
    }, [blockedDates]);

    const totalStarts = useMemo(() => schedule.reduce((sum, day) => sum + (day.enabled ? generatedStarts(day).length : 0), 0), [schedule, slotGap]);

    if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-neutral-400" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h2 className="text-lg font-medium">Weekly availability</h2></div>
                    <p className="mt-1 text-sm text-neutral-500">Set working windows. Customer start times are generated every {slotGap} minutes.</p>
                    <p className="mt-1 text-xs font-medium text-neutral-500">San Antonio Central Time · {totalStarts} customer start{totalStarts === 1 ? "" : "s"} per week</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={copyMonday} disabled={!schedule.length}><Copy className="mr-2 h-4 w-4" />Copy Monday to week</Button>
                </div>
            </div>

            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} {!schedule.length && <button onClick={loadSchedule} className="ml-2 font-semibold underline">Try again</button>}</div>}
            {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Availability saved. The customer calendar has been refreshed.</div>}

            <section aria-labelledby="weekly-preview-title" className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><h3 id="weekly-preview-title" className="font-medium text-neutral-900">Customer-facing weekly preview</h3><p className="text-xs text-neutral-500">Use Left and Right Arrow keys to move between days. Select a day to edit it.</p></div>
                    <div className="flex flex-wrap gap-2">{TEMPLATES.map(template => <button key={template.name} type="button" onClick={() => setTemplatePreview(template)} className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900">Preview {template.name}</button>)}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{schedule.map((day, index) => {
                    const starts = day.enabled ? generatedStarts(day) : [];
                    const label = DAYS[index]?.label || day.dayOfWeek;
                    return <button key={day.dayOfWeek} type="button" data-day-preview onClick={() => { setExpandedDay(day.dayOfWeek); document.getElementById(`day-${day.dayOfWeek}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} onKeyDown={event => {
                        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                        event.preventDefault();
                        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-day-preview]"));
                        const next = event.key === "ArrowRight" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
                        buttons[next]?.focus();
                    }} className={`min-h-36 rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-neutral-900 ${day.enabled ? "border-emerald-200 bg-white hover:border-emerald-400" : "border-neutral-200 bg-neutral-100 text-neutral-400"}`}>
                        <span className="text-xs font-semibold uppercase tracking-wide">{label.slice(0, 3)}</span>
                        {day.enabled ? <><span className="mt-2 block text-[11px] text-neutral-500">Business window</span><span className="block text-xs font-medium text-neutral-800">{day.windows.map(window => `${displayTime(window.startTime)}–${displayTime(window.endTime)}`).join(", ")}</span><span className="mt-2 block text-[11px] text-neutral-500">Customer starts</span><span className="mt-1 flex flex-wrap gap-1">{starts.slice(0, 4).map(start => <span key={start} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800">{displayTime(start).replace(":00", "")}</span>)}{starts.length > 4 && <span className="text-[10px] text-neutral-500">+{starts.length - 4}</span>}</span></> : <span className="mt-4 block text-xs">Closed</span>}
                    </button>;
                })}</div>
            </section>

            <section aria-labelledby="blocked-preview-title" className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2"><Ban className="h-4 w-4 text-red-500" /><div><h3 id="blocked-preview-title" className="text-sm font-medium">Blocked-date preview</h3><p className="text-xs text-neutral-500">The next 14 days in Central Time</p></div></div>
                <div className="grid grid-cols-7 gap-2">{upcomingBlockedOccurrences.map(({ date, blocks }) => <div key={date.toISOString()} title={blocks.map(block => block.reason).join(", ")} className={`min-h-16 rounded-lg border p-2 text-center ${blocks.length ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-600"}`}><span className="block text-[10px] uppercase">{date.toLocaleDateString("en-US", { weekday: "short" })}</span><span className="block text-sm font-semibold">{date.getDate()}</span>{blocks.length > 0 && <span className="mt-1 block truncate text-[9px]">{blocks[0].reason}</span>}</div>)}</div>
            </section>

            <div className="space-y-3">
                {schedule.map(day => {
                    const label = DAYS.find(item => item.key === day.dayOfWeek)?.label || day.dayOfWeek;
                    const starts = day.enabled ? generatedStarts(day) : [];
                    const expanded = expandedDay === day.dayOfWeek;
                    return (
                        <section id={`day-${day.dayOfWeek}`} key={day.dayOfWeek} className="scroll-mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
                                <button type="button" role="switch" aria-checked={day.enabled} aria-label={`${label} availability`} onClick={() => updateDay(day.dayOfWeek, current => ({
                                    ...current,
                                    enabled: !current.enabled,
                                    windows: !current.enabled && !current.windows.length ? [{ id: windowId(), startTime: "09:00", endTime: "17:00" }] : current.windows
                                }))} className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${day.enabled ? "bg-emerald-600" : "bg-neutral-300"}`}>
                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${day.enabled ? "left-6" : "left-1"}`} />
                                </button>
                                <div className="min-w-0 flex-1"><h3 className="font-medium text-neutral-900">{label}</h3><p className="truncate text-xs text-neutral-500">{day.enabled ? `${day.windows.length} window${day.windows.length === 1 ? "" : "s"} · ${starts.length} customer starts` : "Unavailable"}</p></div>
                                {day.enabled && <button type="button" onClick={() => setExpandedDay(expanded ? null : day.dayOfWeek)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-neutral-600 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900">Edit {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>}
                            </div>

                            {day.enabled && expanded && <div className="space-y-5 border-t border-neutral-200 bg-neutral-50/50 p-4 sm:p-5">
                                <div className="space-y-3">
                                    {day.windows.map((window, index) => <div key={window.id} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                        <label className="text-xs font-medium text-neutral-600">Available from<input type="time" value={window.startTime} onChange={event => updateWindow(day.dayOfWeek, window.id, "startTime", event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm" /></label>
                                        <label className="text-xs font-medium text-neutral-600">Available until<input type="time" value={window.endTime} onChange={event => updateWindow(day.dayOfWeek, window.id, "endTime", event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm" /></label>
                                        <button type="button" disabled={day.windows.length === 1} aria-label={`Remove window ${index + 1}`} onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, windows: current.windows.filter(item => item.id !== window.id) }))} className="flex min-h-11 items-center justify-center rounded-md border border-neutral-200 px-3 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                    </div>)}
                                    <button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, windows: [...current.windows, { id: windowId(), startTime: "14:00", endTime: "18:00" }] }))} className="flex min-h-11 items-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 text-sm font-medium text-neutral-600 hover:border-neutral-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"><Plus className="h-4 w-4" />Add another window</button>
                                </div>

                                <div>
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h4 className="text-sm font-medium text-neutral-900">Customer booking starts</h4><p className="text-xs text-neutral-500">Customers will see {starts.length} start{starts.length === 1 ? "" : "s"}{starts.length ? `: ${displayTime(starts[0])}–${displayTime(starts[starts.length - 1])}` : ""}. Adjust capacity for any start.</p></div><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">Default: {defaultCapacity}</span><button type="button" onClick={() => applyCapacityToDay(day.dayOfWeek, defaultCapacity)} className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900">Apply {defaultCapacity} to all</button></div></div>
                                    {starts.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{starts.map(start => {
                                        const capacity = day.capacities[start] || defaultCapacity;
                                        return <div key={start} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5"><div><p className="text-sm font-medium">{displayTime(start)}</p><p className="text-[11px] text-neutral-500">appointment start</p></div><div className="flex items-center gap-1" aria-label={`${capacity} booking spots`}><button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.max(1, capacity - 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900" aria-label={`Decrease ${displayTime(start)} capacity`}><Minus className="h-3.5 w-3.5" /></button><span className="flex min-w-12 items-center justify-center gap-1 text-sm font-semibold"><Users className="h-3.5 w-3.5" />{capacity}</span><button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.min(10, capacity + 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900" aria-label={`Increase ${displayTime(start)} capacity`}><Plus className="h-3.5 w-3.5" /></button></div></div>;
                                    })}</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This window does not produce any customer start times. Check its from/until values.</div>}
                                </div>
                            </div>}
                        </section>
                    );
                })}
            </div>

            {templatePreview && <div role="dialog" aria-modal="true" aria-labelledby="template-preview-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h3 id="template-preview-title" className="text-lg font-medium">Preview: {templatePreview.name}</h3><p className="text-sm text-neutral-500">{templatePreview.description}. Nothing changes until you apply it.</p></div><CalendarDays className="h-5 w-5 text-neutral-400" /></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{DAYS.map(day => { const windows = templatePreview.schedule[day.key] || []; const count = windows.flatMap(window => startsForWindow(window, slotGap)).length; return <div key={day.key} className={`rounded-lg border p-3 ${windows.length ? "border-blue-200 bg-blue-50" : "border-neutral-200 bg-neutral-50"}`}><p className="text-xs font-semibold">{day.label.slice(0, 3)}</p><p className="mt-2 text-xs">{windows.length ? windows.map(window => `${displayTime(window.startTime)}–${displayTime(window.endTime)}`).join(", ") : "Closed"}</p><p className="mt-1 text-[10px] text-neutral-500">{count} starts</p></div>; })}</div><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setTemplatePreview(null)}>Cancel</Button><Button type="button" onClick={() => applyTemplate(templatePreview)}>Apply template</Button></div></div></div>}

            {removalWarnings.length > 0 && <div role="alertdialog" aria-modal="true" aria-labelledby="removal-warning-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="flex gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" /><div><h3 id="removal-warning-title" className="text-lg font-medium">Existing appointments would lose their start</h3><p className="mt-1 text-sm text-neutral-600">These appointments are already booked at times excluded by the new weekly availability.</p></div></div><div className="mt-4 max-h-52 space-y-2 overflow-y-auto">{removalWarnings.map(appointment => <div key={appointment.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-medium">{appointment.appointmentDateTime.replace("T", " · ").slice(0, 18)}</p><p className="text-xs text-neutral-600">{appointment.customer?.firstName} {appointment.customer?.lastName} · {appointment.selectedService || "Appointment"}</p></div>)}</div><p className="mt-4 text-xs text-neutral-500">Saving will not cancel these appointments, but the affected start times will no longer appear for new customers.</p><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setRemovalWarnings([])}>Review schedule</Button><Button type="button" onClick={() => void saveSchedule(true)} className="bg-amber-600 hover:bg-amber-700">Save anyway</Button></div></div></div>}
        </div>
    );
}
