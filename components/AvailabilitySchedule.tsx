"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Ban, CalendarDays, CheckCircle2, ChevronRight, Clock, Copy, LayoutTemplate, Loader2, Minus, Plus, Trash2 } from "lucide-react";
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

export default function AvailabilitySchedule({ onManageBlockedDates }: { onManageBlockedDates?: () => void }) {
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

    const selectedDay = schedule.find(day => day.dayOfWeek === expandedDay) || schedule[0];
    const selectedDayLabel = DAYS.find(day => day.key === selectedDay?.dayOfWeek)?.label || selectedDay?.dayOfWeek;
    const selectedStarts = selectedDay?.enabled ? generatedStarts(selectedDay) : [];
    const blockedOccurrenceCount = upcomingBlockedOccurrences.filter(item => item.blocks.length > 0).length;

    if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-neutral-400" /></div>;

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="font-serif text-3xl text-[#2f1b12] sm:text-4xl">Weekly availability</h2>
                    <p className="mt-1 text-sm text-neutral-600">Set the times customers can book.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#e4d3c2] bg-[#f8f0e6] px-3 text-xs font-medium text-[#4a2b1d]"><Clock className="h-3.5 w-3.5" />San Antonio Central Time</span>
                    <label className="relative">
                        <span className="sr-only">Preview a schedule template</span>
                        <LayoutTemplate className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a2b1d]" />
                        <select defaultValue="" onChange={event => { const template = TEMPLATES.find(item => item.name === event.target.value); if (template) setTemplatePreview(template); event.target.value = ""; }} className="min-h-10 appearance-none rounded-md border border-[#d9c3ae] bg-white pl-10 pr-9 text-sm font-medium text-[#3a241a] focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]">
                            <option value="" disabled>Templates</option>
                            {TEMPLATES.map(template => <option key={template.name} value={template.name}>{template.name}</option>)}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-neutral-500" />
                    </label>
                    <Button type="button" variant="outline" onClick={copyMonday} disabled={!schedule.length} className="min-h-10 border-[#d9c3ae] bg-white text-[#3a241a] hover:bg-[#fbf6f0]"><Copy className="mr-2 h-4 w-4" />Copy Monday to week</Button>
                </div>
            </header>

            {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} {!schedule.length && <button onClick={loadSchedule} className="ml-2 font-semibold underline">Try again</button>}</div>}
            {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Availability saved. The customer calendar has been refreshed.</div>}

            <section aria-labelledby="weekly-preview-title" className="rounded-xl border border-[#e8ddd2] bg-white p-4 shadow-[0_8px_25px_rgba(57,32,18,0.04)]">
                <div className="mb-3"><h3 id="weekly-preview-title" className="font-serif text-xl text-[#352016]">Weekly overview</h3><p className="text-xs text-neutral-500">Business windows and customer starts per day</p></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">{schedule.map((day, index) => {
                    const starts = day.enabled ? generatedStarts(day) : [];
                    const label = DAYS[index]?.label || day.dayOfWeek;
                    return <button key={day.dayOfWeek} type="button" data-day-preview onClick={() => setExpandedDay(day.dayOfWeek)} onKeyDown={event => {
                        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                        event.preventDefault();
                        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-day-preview]"));
                        const next = event.key === "ArrowRight" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
                        buttons[next]?.focus();
                    }} className={`min-h-20 rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-700 ${expandedDay === day.dayOfWeek ? "border-[#83b99e] bg-[#f2faf5] shadow-sm" : day.enabled ? "border-[#e8ddd2] bg-white hover:border-[#a8cdb8]" : "border-neutral-200 bg-neutral-50 text-neutral-400"}`}>
                        <span className="text-xs font-semibold uppercase tracking-wide">{label.slice(0, 3)}</span>
                        {day.enabled ? <><span className="mt-2 block text-xs font-medium text-neutral-800">{day.windows.map(window => `${displayTime(window.startTime)}–${displayTime(window.endTime)}`).join(", ")}</span><span className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500"><span className="h-2 w-2 rounded-full bg-emerald-600" />{starts.length} starts</span></> : <span className="mt-3 block text-xs">Closed</span>}
                    </button>;
                })}</div>
                <div className="mt-4 border-t border-[#eee4da] pt-3">
                    <button type="button" onClick={onManageBlockedDates} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-[#fbf7f2] focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fbf1e6] text-[#8a4e2d]"><Ban className="h-4 w-4" /></span>
                        <span className="flex-1"><span className="block text-sm font-medium text-[#352016]">Blocked dates</span><span className="block text-xs text-neutral-500">Next 14 days · {blockedOccurrenceCount} blocked</span></span>
                        <span className="text-sm font-medium text-[#7a4227]">Manage</span><ChevronRight className="h-4 w-4 text-[#7a4227]" />
                    </button>
                </div>
            </section>

            {selectedDay && <section className="grid overflow-hidden rounded-xl border border-[#e8ddd2] bg-white shadow-[0_10px_30px_rgba(57,32,18,0.05)] lg:grid-cols-[310px_minmax(0,1fr)]">
                <nav aria-label="Choose a day to edit" className="border-b border-[#e8ddd2] bg-[#fffdfa] p-3 lg:border-b-0 lg:border-r">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{schedule.map(day => {
                        const label = DAYS.find(item => item.key === day.dayOfWeek)?.label || day.dayOfWeek;
                        const starts = day.enabled ? generatedStarts(day) : [];
                        const selected = day.dayOfWeek === selectedDay.dayOfWeek;
                        return <div key={day.dayOfWeek} className={`flex min-h-[70px] items-center gap-3 rounded-lg border px-3 transition ${selected ? "border-emerald-500 bg-emerald-50/70" : "border-transparent hover:border-[#e8ddd2] hover:bg-white"}`}>
                            <button type="button" role="switch" aria-checked={day.enabled} aria-label={`${label} availability`} onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, enabled: !current.enabled, windows: !current.enabled && !current.windows.length ? [{ id: windowId(), startTime: "09:00", endTime: "17:00" }] : current.windows }))} className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${day.enabled ? "bg-emerald-600" : "bg-neutral-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${day.enabled ? "left-6" : "left-1"}`} /></button>
                            <button type="button" onClick={() => setExpandedDay(day.dayOfWeek)} className="flex min-w-0 flex-1 items-center text-left focus:outline-none focus:ring-2 focus:ring-emerald-700">
                                <span className="min-w-0 flex-1"><span className="block font-medium text-[#352016]">{label}</span><span className="block truncate text-xs text-neutral-500">{day.enabled ? `${day.windows.map(window => `${displayTime(window.startTime)}–${displayTime(window.endTime)}`).join(", ")} · ${starts.length} starts` : "Unavailable"}</span></span><ChevronRight className="h-4 w-4 text-neutral-500" />
                            </button>
                        </div>;
                    })}</div>
                </nav>

                <div className="min-w-0 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="font-serif text-3xl text-[#352016]">{selectedDayLabel}</h3>
                        <span className={`inline-flex items-center gap-2 text-sm font-medium ${selectedDay.enabled ? "text-emerald-800" : "text-neutral-500"}`}><span className={`h-2.5 w-2.5 rounded-full ${selectedDay.enabled ? "bg-emerald-600" : "bg-neutral-300"}`} />{selectedDay.enabled ? "Available" : "Unavailable"}</span>
                    </div>

                    {selectedDay.enabled ? <div className="mt-5 space-y-5">
                        <div className="space-y-3">
                            {selectedDay.windows.map((window, index) => <div key={window.id} className="grid gap-3 rounded-lg border border-[#e8ddd2] bg-[#fffdfa] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                <label className="text-xs font-medium text-neutral-600">Available from<input type="time" value={window.startTime} onChange={event => updateWindow(selectedDay.dayOfWeek, window.id, "startTime", event.target.value)} className="mt-1.5 min-h-12 w-full rounded-md border border-[#d9cabe] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" /></label>
                                <label className="text-xs font-medium text-neutral-600">Available until<input type="time" value={window.endTime} onChange={event => updateWindow(selectedDay.dayOfWeek, window.id, "endTime", event.target.value)} className="mt-1.5 min-h-12 w-full rounded-md border border-[#d9cabe] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" /></label>
                                <button type="button" disabled={selectedDay.windows.length === 1} aria-label={`Remove window ${index + 1}`} onClick={() => updateDay(selectedDay.dayOfWeek, current => ({ ...current, windows: current.windows.filter(item => item.id !== window.id) }))} className="flex min-h-12 items-center justify-center rounded-md border border-[#e8ddd2] px-3 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                            </div>)}
                            <button type="button" onClick={() => updateDay(selectedDay.dayOfWeek, current => ({ ...current, windows: [...current.windows, { id: windowId(), startTime: "14:00", endTime: "18:00" }] }))} className="flex min-h-11 items-center gap-2 rounded-md border border-dashed border-[#d9cabe] px-4 text-sm font-medium text-[#68402c] hover:bg-[#fbf6f0] focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]"><Plus className="h-4 w-4" />Add another window</button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-[#e8ddd2] bg-white p-3"><span className="block text-xs text-neutral-500">Booking gap</span><span className="mt-1 block text-sm font-medium text-[#352016]">Every {slotGap} minutes</span></div>
                            <div className="rounded-lg border border-[#e8ddd2] bg-white p-3"><span className="block text-xs text-neutral-500">Default capacity</span><span className="mt-1 block text-sm font-medium text-[#352016]">{defaultCapacity} customer{defaultCapacity === 1 ? "" : "s"} per start</span></div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><span>Customers will see <strong>{selectedStarts.length} starts</strong>{selectedStarts.length ? ` · ${displayTime(selectedStarts[0])}–${displayTime(selectedStarts[selectedStarts.length - 1])}` : ""}</span></div>

                        <div>
                            <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-serif text-xl text-[#352016]">Customer booking starts</h4><p className="text-xs text-neutral-500">Adjust how many customers can book each time.</p></div><button type="button" onClick={() => applyCapacityToDay(selectedDay.dayOfWeek, defaultCapacity)} className="min-h-10 text-sm font-medium text-[#7a4227] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]">Apply capacity to all</button></div>
                            {selectedStarts.length ? <div className="grid overflow-hidden rounded-lg border border-[#e8ddd2] sm:grid-cols-2 sm:gap-x-8">{selectedStarts.map(start => {
                                const capacity = selectedDay.capacities[start] || defaultCapacity;
                                return <div key={start} className="flex min-h-12 items-center justify-between border-b border-[#eee6de] px-4 last:border-b-0"><span className="text-sm font-medium text-[#352016]">{displayTime(start)}</span><div className="flex items-center gap-1" aria-label={`${capacity} booking spots`}><button type="button" onClick={() => updateDay(selectedDay.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.max(1, capacity - 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#f8f1ea] focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]" aria-label={`Decrease ${displayTime(start)} capacity`}><Minus className="h-3.5 w-3.5" /></button><span className="min-w-8 text-center text-sm font-semibold">{capacity}</span><button type="button" onClick={() => updateDay(selectedDay.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.min(10, capacity + 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#f8f1ea] focus:outline-none focus:ring-2 focus:ring-[#7f4b2e]" aria-label={`Increase ${displayTime(start)} capacity`}><Plus className="h-3.5 w-3.5" /></button></div></div>;
                            })}</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This window does not produce any customer start times. Check its from/until values.</div>}
                        </div>
                    </div> : <div className="mt-5 rounded-lg border border-dashed border-[#d9cabe] bg-[#fffdfa] p-8 text-center"><p className="text-sm text-neutral-600">{selectedDayLabel} is unavailable.</p><button type="button" onClick={() => updateDay(selectedDay.dayOfWeek, current => ({ ...current, enabled: true, windows: current.windows.length ? current.windows : [{ id: windowId(), startTime: "09:00", endTime: "17:00" }] }))} className="mt-3 rounded-md bg-[#3b2115] px-4 py-2 text-sm font-medium text-white hover:bg-[#4c2c1d]">Make this day available</button></div>}
                </div>
            </section>}

            {templatePreview && <div role="dialog" aria-modal="true" aria-labelledby="template-preview-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h3 id="template-preview-title" className="text-lg font-medium">Preview: {templatePreview.name}</h3><p className="text-sm text-neutral-500">{templatePreview.description}. Nothing changes until you apply it.</p></div><CalendarDays className="h-5 w-5 text-neutral-400" /></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{DAYS.map(day => { const windows = templatePreview.schedule[day.key] || []; const count = windows.flatMap(window => startsForWindow(window, slotGap)).length; return <div key={day.key} className={`rounded-lg border p-3 ${windows.length ? "border-blue-200 bg-blue-50" : "border-neutral-200 bg-neutral-50"}`}><p className="text-xs font-semibold">{day.label.slice(0, 3)}</p><p className="mt-2 text-xs">{windows.length ? windows.map(window => `${displayTime(window.startTime)}–${displayTime(window.endTime)}`).join(", ") : "Closed"}</p><p className="mt-1 text-[10px] text-neutral-500">{count} starts</p></div>; })}</div><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setTemplatePreview(null)}>Cancel</Button><Button type="button" onClick={() => applyTemplate(templatePreview)}>Apply template</Button></div></div></div>}

            {removalWarnings.length > 0 && <div role="alertdialog" aria-modal="true" aria-labelledby="removal-warning-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="flex gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" /><div><h3 id="removal-warning-title" className="text-lg font-medium">Existing appointments would lose their start</h3><p className="mt-1 text-sm text-neutral-600">These appointments are already booked at times excluded by the new weekly availability.</p></div></div><div className="mt-4 max-h-52 space-y-2 overflow-y-auto">{removalWarnings.map(appointment => <div key={appointment.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-medium">{appointment.appointmentDateTime.replace("T", " · ").slice(0, 18)}</p><p className="text-xs text-neutral-600">{appointment.customer?.firstName} {appointment.customer?.lastName} · {appointment.selectedService || "Appointment"}</p></div>)}</div><p className="mt-4 text-xs text-neutral-500">Saving will not cancel these appointments, but the affected start times will no longer appear for new customers.</p><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setRemovalWarnings([])}>Review schedule</Button><Button type="button" onClick={() => void saveSchedule(true)} className="bg-amber-600 hover:bg-amber-700">Save anyway</Button></div></div></div>}
        </div>
    );
}
