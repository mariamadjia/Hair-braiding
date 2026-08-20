"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment } from "./AppointmentManagement";

export type CalendarRange = { start: Date; end: Date };

type Props = {
    appointments: Appointment[];
    onAppointmentClick: (appointment: Appointment) => void;
    onRangeChange: (range: CalendarRange) => void | Promise<void>;
    view?: "month" | "week" | "day";
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();

export default function CalendarView({ appointments, onAppointmentClick, onRangeChange, view = "month" }: Props) {
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
    const [selectedView, setSelectedView] = useState<"month" | "week" | "day">(view);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    useEffect(() => {
        if (window.matchMedia("(max-width: 639px)").matches) setSelectedView("day");
    }, []);

    const visibleRange = useMemo<CalendarRange>(() => {
        if (selectedView === "month") {
            return { start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) };
        }
        if (selectedView === "week") {
            const start = addDays(currentDate, -currentDate.getDay());
            return { start, end: addDays(start, 7) };
        }
        return { start: startOfDay(currentDate), end: addDays(currentDate, 1) };
    }, [currentDate, selectedView]);

    useEffect(() => { void onRangeChange(visibleRange); }, [onRangeChange, visibleRange]);

    const grouped = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        appointments.forEach(appointment => {
            const [year, month, day] = appointment.appointmentDateTime.slice(0, 10).split("-").map(Number);
            if (!year || !month || !day) return;
            const key = `${year}-${month - 1}-${day}`;
            map.set(key, [...(map.get(key) ?? []), appointment]);
        });
        map.forEach(items => items.sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)));
        return map;
    }, [appointments]);

    const appointmentsFor = (date: Date) => grouped.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? [];
    const operationalStatus = (appointment: Appointment) => {
        if (appointment.notificationStatus?.includes("FAILED")) return "NOTIFICATION ISSUE";
        if (["UNPAID", "PROCESSING", "FAILED"].includes(appointment.noShowFee?.paymentStatus || "")) return "PAYMENT ISSUE";
        if (appointment.paymentStatus?.includes("FAILED")) return "PAYMENT ISSUE";
        if (appointment.status === "PENDING" && appointment.approvedAt) return "CAPTURE PROCESSING";
        if (appointment.status === "PENDING" && appointment.paymentStatus === "AUTHORIZED") return "READY FOR APPROVAL";
        if (appointment.status === "PENDING") return "AWAITING PAYMENT";
        return appointment.status;
    };
    const statusClass = (appointment: Appointment) => {
        const status = operationalStatus(appointment);
        return ({ "AWAITING PAYMENT": "bg-amber-600", "READY FOR APPROVAL": "bg-emerald-700", "CAPTURE PROCESSING": "bg-blue-700", "PAYMENT ISSUE": "bg-red-700", "NOTIFICATION ISSUE": "bg-violet-700", APPROVED: "bg-emerald-700", DENIED: "bg-red-700", CANCELLED: "bg-neutral-500", COMPLETED: "bg-blue-700" }[status] ?? "bg-neutral-600");
    };
    const time = (value: string) => {
        const date = new Date(`${value.replace(/Z$/, "")}Z`);
        return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    };
    const eventTime = (appointment: Appointment) => {
        if (appointment.appointmentEndDateTime) return `${time(appointment.appointmentDateTime)}–${time(appointment.appointmentEndDateTime)}`;
        return time(appointment.appointmentDateTime);
    };

    const title = selectedView === "month"
        ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        : selectedView === "week"
            ? `${visibleRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(visibleRange.end, -1).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const move = (direction: -1 | 1) => {
        setExpandedDay(null);
        if (selectedView === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
        else setCurrentDate(addDays(currentDate, direction * (selectedView === "week" ? 7 : 1)));
    };

    const Event = ({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) => (
        <button type="button" onClick={() => onAppointmentClick(appointment)}
            aria-label={`${appointment.customer.firstName} ${appointment.customer.lastName}, ${eventTime(appointment)} Central Time, ${operationalStatus(appointment)}`}
            className={cn("w-full rounded-sm text-left text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1", compact ? "px-2 py-1 text-xs" : "p-3 text-sm", statusClass(appointment))}>
            <span className="flex items-center gap-1 font-semibold"><Clock className="h-3 w-3 shrink-0" />{eventTime(appointment)}</span>
            <span className="block truncate">{appointment.customer.firstName} {appointment.customer.lastName}</span>
            {!compact && <><span className="mt-1 block truncate text-xs opacity-90">{appointment.selectedService || appointment.service?.name || "Appointment"}</span><span className="mt-1 block text-xs uppercase tracking-wide opacity-80">{operationalStatus(appointment)} · CT</span></>}
        </button>
    );

    const monthCells = useMemo(() => {
        const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const start = addDays(first, -first.getDay());
        return Array.from({ length: 42 }, (_, index) => addDays(start, index));
    }, [currentDate]);

    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(visibleRange.start, index)), [visibleRange]);

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e6ddd6] bg-white" aria-label="Appointment calendar">
            <header className="border-b border-neutral-200 p-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-medium text-neutral-900 sm:text-xl">{title}</h2><Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfDay(new Date()))}>Today</Button></div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                        <div className="flex overflow-hidden rounded-sm border border-neutral-200" role="tablist" aria-label="Calendar period">
                            {(["month", "week", "day"] as const).map(period => <button key={period} type="button" role="tab" aria-selected={selectedView === period} onClick={() => setSelectedView(period)} className={cn("px-3 py-2 text-xs font-medium capitalize", selectedView === period ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50")}>{period}</button>)}
                        </div>
                        <button type="button" aria-label={`Previous ${selectedView}`} onClick={() => move(-1)} className="rounded-sm p-2 hover:bg-neutral-100"><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Next ${selectedView}`} onClick={() => move(1)} className="rounded-sm p-2 hover:bg-neutral-100"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-600" aria-label="Status legend">
                    {[["bg-amber-600", "Awaiting payment"], ["bg-emerald-700", "Ready / approved"], ["bg-blue-700", "Processing / completed"], ["bg-red-700", "Payment attention"], ["bg-violet-700", "Notification attention"], ["bg-neutral-500", "Cancelled"]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><i aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", color)} />{label}</span>)}
                    <span className="ml-auto font-medium">San Antonio Central Time</span>
                </div>
            </header>

            {selectedView === "month" && <div className="overflow-x-auto p-2 sm:p-4"><div className="min-w-[760px]">
                <div className="mb-2 grid grid-cols-7 gap-2">{DAYS.map(day => <div key={day} className="py-2 text-center text-xs font-semibold uppercase text-neutral-500">{day}</div>)}</div>
                <div className="grid grid-cols-7 gap-2">{monthCells.map(date => {
                    const items = appointmentsFor(date);
                    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const inMonth = date.getMonth() === currentDate.getMonth();
                    const expanded = expandedDay === key;
                    const shown = expanded ? items : items.slice(0, 3);
                    return <div key={key} className={cn("min-h-32 rounded-sm border p-2", sameDay(date, new Date()) && "border-blue-400 bg-blue-50", !inMonth && "bg-neutral-50 text-neutral-400")}>
                        <div className="mb-2 text-sm font-semibold">{date.getDate()}</div><div className="space-y-1">{shown.map(item => <Event key={item.id} appointment={item} compact />)}{items.length > 3 && <button type="button" className="px-2 text-xs font-medium text-neutral-600 hover:underline" onClick={() => setExpandedDay(expanded ? null : key)}>{expanded ? "Show less" : `+${items.length - 3} more`}</button>}</div>
                    </div>;
                })}</div>
            </div></div>}

            {selectedView === "week" && <div className="overflow-x-auto p-2 sm:p-4"><div className="min-w-[900px]">
                <div className="grid grid-cols-7 gap-2">{weekDays.map(date => <div key={date.toISOString()} className={cn("rounded-sm border p-2", sameDay(date, new Date()) && "border-blue-400 bg-blue-50")}><div className="mb-3 text-center"><p className="text-xs font-semibold uppercase text-neutral-500">{DAYS[date.getDay()]}</p><p className="text-lg font-semibold">{date.getDate()}</p></div><div className="space-y-2">{appointmentsFor(date).length ? appointmentsFor(date).map(item => <Event key={item.id} appointment={item} />) : <p className="py-6 text-center text-xs text-neutral-400">No appointments</p>}</div></div>)}</div>
            </div></div>}

            {selectedView === "day" && <div className="p-3 sm:p-5"><div className="mx-auto max-w-3xl space-y-3">{appointmentsFor(currentDate).length ? appointmentsFor(currentDate).map(item => <Event key={item.id} appointment={item} />) : <p className="py-16 text-center text-neutral-400">No appointments for this day</p>}</div></div>}
        </section>
    );
}
