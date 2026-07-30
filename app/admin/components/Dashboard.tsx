"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Scissors,
    Users,
} from "lucide-react";
import type { CategorySummary } from "@/lib/booking-types";

type Appointment = {
    id: number;
    customer?: { firstName?: string; lastName?: string };
    service?: { name?: string };
    selectedService?: string;
    appointmentDateTime: string;
    status: string;
    createdAt?: string;
};

type DashboardProps = {
    token: string;
    categorySummaries: CategorySummary[];
    onNavigate: (section: string) => void;
};

const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();

const customerName = (appointment: Appointment) =>
    [appointment.customer?.firstName, appointment.customer?.lastName].filter(Boolean).join(" ") || "Customer";

const serviceName = (appointment: Appointment) =>
    appointment.selectedService || appointment.service?.name || "Service not specified";

const statusLabel = (status: string) => {
    if (status === "APPROVED") return "Approved";
    if (status === "PENDING") return "Needs action";
    if (status === "COMPLETED") return "Completed";
    if (status === "DENIED") return "Denied";
    if (status === "CANCELLED") return "Cancelled";
    return status.charAt(0) + status.slice(1).toLowerCase();
};

const statusClasses = (status: string) => {
    if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
    if (status === "COMPLETED") return "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100";
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200";
};

export function Dashboard({ token, categorySummaries, onNavigate }: DashboardProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/appointments", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(body?.error || "Dashboard data could not be loaded.");
            }
            setAppointments(Array.isArray(body) ? body : body?.content ?? []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Dashboard data could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const now = new Date();
    const todaySchedule = useMemo(
        () => appointments
            .filter((appointment) => isSameDay(new Date(appointment.appointmentDateTime), now))
            .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()),
        [appointments],
    );
    const upcomingApproved = appointments.filter(
        (appointment) => appointment.status === "APPROVED" && new Date(appointment.appointmentDateTime) >= now,
    ).length;
    const needsAction = appointments.filter((appointment) => appointment.status === "PENDING").length;
    const serviceOptions = categorySummaries.reduce((total, category) => total + (category.styleCount ?? 0), 0);

    const statusCounts = useMemo(() => {
        const counts = new Map<string, number>();
        appointments.forEach((appointment) => counts.set(appointment.status, (counts.get(appointment.status) ?? 0) + 1));
        return ["PENDING", "APPROVED", "COMPLETED", "CANCELLED", "DENIED"]
            .map((status) => ({ status, count: counts.get(status) ?? 0 }))
            .filter((item) => item.count > 0);
    }, [appointments]);

    const popularServices = useMemo(() => {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const counts = new Map<string, number>();
        appointments
            .filter((appointment) => new Date(appointment.appointmentDateTime) >= startOfMonth)
            .forEach((appointment) => {
                const name = serviceName(appointment);
                counts.set(name, (counts.get(name) ?? 0) + 1);
            });
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [appointments]);

    const recentActivity = useMemo(
        () => [...appointments]
            .filter((appointment) => appointment.createdAt)
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
            .slice(0, 5),
        [appointments],
    );

    const metricCards = [
        { label: "Appointments today", value: todaySchedule.length, icon: Calendar, action: "bookings" },
        { label: "Upcoming approved", value: upcomingApproved, icon: CheckCircle2, action: "bookings" },
        { label: "Requests needing action", value: needsAction, icon: Clock3, action: "bookings" },
        { label: "Service options", value: serviceOptions, icon: Scissors, action: "categories" },
    ];

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8" aria-label="Dashboard overview" aria-busy={loading}>
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Today</h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    {lastUpdated && (
                        <p className="mt-1 text-xs text-neutral-400" role="status" aria-live="polite">
                            Last updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    disabled={loading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                    {loading ? "Refreshing…" : "Refresh"}
                </button>
            </header>

            {error && (
                <div role="alert" className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
                    <button type="button" onClick={() => void loadDashboard()} className="font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">Retry</button>
                </div>
            )}

            <section aria-label="Key metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map(({ label, value, icon: Icon, action }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onNavigate(action)}
                        className="group rounded-lg border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{loading ? "—" : value}</p>
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{label}</p>
                            </div>
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200">
                                <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                        </div>
                    </button>
                ))}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-2" aria-labelledby="schedule-title">
                    <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5 dark:border-neutral-700">
                        <div>
                            <h2 id="schedule-title" className="font-semibold text-neutral-900 dark:text-white">Today’s schedule</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{todaySchedule.length} appointment{todaySchedule.length === 1 ? "" : "s"}</p>
                        </div>
                        <button type="button" onClick={() => onNavigate("bookings")} className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-200">View all</button>
                    </div>
                    {loading ? (
                        <div role="status" className="space-y-3 p-5">
                            <span className="sr-only">Loading today’s schedule</span>
                            {[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />)}
                        </div>
                    ) : todaySchedule.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <Calendar className="mx-auto h-8 w-8 text-neutral-300" aria-hidden="true" />
                            <p className="mt-3 font-medium text-neutral-800 dark:text-neutral-100">No appointments today</p>
                            <p className="mt-1 text-sm text-neutral-500">Your next appointments remain available in Bookings.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {todaySchedule.map((appointment) => {
                                const date = new Date(appointment.appointmentDateTime);
                                return (
                                    <li key={appointment.id}>
                                        <button type="button" onClick={() => onNavigate("bookings")} className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:hover:bg-neutral-700/60 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-4">
                                                <time dateTime={appointment.appointmentDateTime} className="w-20 shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                                                    {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                                </time>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{customerName(appointment)}</p>
                                                    <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{serviceName(appointment)}</p>
                                                </div>
                                            </div>
                                            <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby="status-title">
                    <div className="border-b border-neutral-200 p-5 dark:border-neutral-700">
                        <h2 id="status-title" className="font-semibold text-neutral-900 dark:text-white">Appointment status</h2>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">All loaded appointments</p>
                    </div>
                    <dl className="divide-y divide-neutral-100 px-5 dark:divide-neutral-700">
                        {!loading && statusCounts.length === 0 ? (
                            <div className="py-10 text-center text-sm text-neutral-500">No appointment data yet.</div>
                        ) : statusCounts.map(({ status, count }) => (
                            <div key={status} className="flex items-center justify-between py-4">
                                <dt className="text-sm text-neutral-600 dark:text-neutral-300">{statusLabel(status)}</dt>
                                <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{count}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby="popular-title">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 id="popular-title" className="font-semibold text-neutral-900 dark:text-white">Most requested this month</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Based on appointment volume</p>
                        </div>
                        <button type="button" onClick={() => onNavigate("categories")} className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-200">Services</button>
                    </div>
                    {popularServices.length === 0 ? (
                        <p className="py-10 text-center text-sm text-neutral-500">No service requests recorded this month.</p>
                    ) : (
                        <ol className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-700">
                            {popularServices.map(([name, count], index) => (
                                <li key={name} className="flex items-center justify-between gap-4 py-3">
                                    <span className="min-w-0 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{index + 1}. {name}</span>
                                    <span className="shrink-0 text-sm tabular-nums text-neutral-500">{count} request{count === 1 ? "" : "s"}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby="activity-title">
                    <h2 id="activity-title" className="font-semibold text-neutral-900 dark:text-white">Recent requests</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Newest appointment requests</p>
                    {recentActivity.length === 0 ? (
                        <p className="py-10 text-center text-sm text-neutral-500">No recent requests.</p>
                    ) : (
                        <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-700">
                            {recentActivity.map((appointment) => (
                                <li key={appointment.id} className="flex items-start justify-between gap-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{customerName(appointment)}</p>
                                        <p className="truncate text-sm text-neutral-500">{serviceName(appointment)}</p>
                                    </div>
                                    <time dateTime={appointment.createdAt} className="shrink-0 text-xs text-neutral-500">
                                        {new Date(appointment.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby="quick-actions-title">
                <h2 id="quick-actions-title" className="font-semibold text-neutral-900 dark:text-white">Quick actions</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ["Appointments", "bookings", Calendar],
                        ["Customers", "customers", Users],
                        ["Services", "categories", Scissors],
                        ["Availability", "availability", Clock3],
                    ].map(([label, section, Icon]) => (
                        <button key={String(label)} type="button" onClick={() => onNavigate(String(section))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {String(label)}
                        </button>
                    ))}
                </div>
            </section>
        </main>
    );
}
