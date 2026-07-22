"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Copy, Loader2, Minus, Plus, Trash2, Users } from "lucide-react";
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

export default function AvailabilitySchedule() {
    const [schedule, setSchedule] = useState<DayAvailability[]>([]);
    const [slotGap, setSlotGap] = useState(60);
    const [defaultCapacity, setDefaultCapacity] = useState(1);
    const [expandedDay, setExpandedDay] = useState<string | null>("MONDAY");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const scheduleRef = useRef(schedule);
    const slotGapRef = useRef(slotGap);
    const defaultCapacityRef = useRef(defaultCapacity);
    scheduleRef.current = schedule;
    slotGapRef.current = slotGap;
    defaultCapacityRef.current = defaultCapacity;

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
            const [settingsResponse, hoursResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/appointments/settings`, { headers, cache: "no-store" }),
                fetch(`${API_BASE_URL}/api/availability/business-hours`, { cache: "no-store" })
            ]);
            if (!settingsResponse.ok || !hoursResponse.ok) throw new Error("Could not load the saved availability settings.");
            const settings = await settingsResponse.json();
            const hours = await hoursResponse.json();
            const gap = settings.slotDurationMinutes || 60;
            const capacity = settings.maxAppointmentsPerSlot || 1;
            setSlotGap(gap);
            setDefaultCapacity(capacity);

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

    const saveSchedule = async () => {
        const current = scheduleRef.current;
        const currentGap = slotGapRef.current;
        const currentDefaultCapacity = defaultCapacityRef.current;
        setSaving(true);
        setError(null);
        setSuccess(false);
        window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: true } }));
        try {
            validate(current);
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
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || "Could not save availability.");
            }
            setSuccess(true);
            window.dispatchEvent(new CustomEvent("unsavedChanges", { detail: { hasChanges: false } }));
            window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: false, success: true } }));
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : "Could not save availability.";
            setError(message);
            window.dispatchEvent(new CustomEvent("saveStatus", { detail: { saving: false, error: message } }));
        } finally {
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

            <div className="space-y-3">
                {schedule.map(day => {
                    const label = DAYS.find(item => item.key === day.dayOfWeek)?.label || day.dayOfWeek;
                    const starts = day.enabled ? generatedStarts(day) : [];
                    const expanded = expandedDay === day.dayOfWeek;
                    return (
                        <section key={day.dayOfWeek} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
                                <button type="button" role="switch" aria-checked={day.enabled} aria-label={`${label} availability`} onClick={() => updateDay(day.dayOfWeek, current => ({
                                    ...current,
                                    enabled: !current.enabled,
                                    windows: !current.enabled && !current.windows.length ? [{ id: windowId(), startTime: "09:00", endTime: "17:00" }] : current.windows
                                }))} className={`relative h-6 w-11 shrink-0 rounded-full transition ${day.enabled ? "bg-emerald-600" : "bg-neutral-300"}`}>
                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${day.enabled ? "left-6" : "left-1"}`} />
                                </button>
                                <div className="min-w-0 flex-1"><h3 className="font-medium text-neutral-900">{label}</h3><p className="truncate text-xs text-neutral-500">{day.enabled ? `${day.windows.length} window${day.windows.length === 1 ? "" : "s"} · ${starts.length} customer starts` : "Unavailable"}</p></div>
                                {day.enabled && <button type="button" onClick={() => setExpandedDay(expanded ? null : day.dayOfWeek)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-neutral-600 hover:bg-neutral-50">Edit {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>}
                            </div>

                            {day.enabled && expanded && <div className="space-y-5 border-t border-neutral-200 bg-neutral-50/50 p-4 sm:p-5">
                                <div className="space-y-3">
                                    {day.windows.map((window, index) => <div key={window.id} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                        <label className="text-xs font-medium text-neutral-600">Available from<input type="time" value={window.startTime} onChange={event => updateWindow(day.dayOfWeek, window.id, "startTime", event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm" /></label>
                                        <label className="text-xs font-medium text-neutral-600">Available until<input type="time" value={window.endTime} onChange={event => updateWindow(day.dayOfWeek, window.id, "endTime", event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm" /></label>
                                        <button type="button" disabled={day.windows.length === 1} aria-label={`Remove window ${index + 1}`} onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, windows: current.windows.filter(item => item.id !== window.id) }))} className="flex min-h-11 items-center justify-center rounded-md border border-neutral-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                    </div>)}
                                    <button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, windows: [...current.windows, { id: windowId(), startTime: "14:00", endTime: "18:00" }] }))} className="flex min-h-11 items-center gap-2 rounded-md border border-dashed border-neutral-300 px-4 text-sm font-medium text-neutral-600 hover:border-neutral-500 hover:bg-white"><Plus className="h-4 w-4" />Add another window</button>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-medium text-neutral-900">Customer booking starts</h4><p className="text-xs text-neutral-500">Adjust capacity for any individual start time.</p></div><span className="text-xs text-neutral-500">Default capacity: {defaultCapacity}</span></div>
                                    {starts.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{starts.map(start => {
                                        const capacity = day.capacities[start] || defaultCapacity;
                                        return <div key={start} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5"><div><p className="text-sm font-medium">{displayTime(start)}</p><p className="text-[11px] text-neutral-500">appointment start</p></div><div className="flex items-center gap-1" aria-label={`${capacity} booking spots`}><button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.max(1, capacity - 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100" aria-label={`Decrease ${displayTime(start)} capacity`}><Minus className="h-3.5 w-3.5" /></button><span className="flex min-w-12 items-center justify-center gap-1 text-sm font-semibold"><Users className="h-3.5 w-3.5" />{capacity}</span><button type="button" onClick={() => updateDay(day.dayOfWeek, current => ({ ...current, capacities: { ...current.capacities, [start]: Math.min(10, capacity + 1) } }))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100" aria-label={`Increase ${displayTime(start)} capacity`}><Plus className="h-3.5 w-3.5" /></button></div></div>;
                                    })}</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This window does not produce any customer start times. Check its from/until values.</div>}
                                </div>
                            </div>}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
