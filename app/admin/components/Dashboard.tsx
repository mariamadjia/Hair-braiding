"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    RefreshCw,
    Scissors,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle,
} from "lucide-react";
import type { CategorySummary } from "@/lib/booking-types";
import { AdminButton, AdminCard, AdminPage, AdminPageHeader } from "@/components/admin/AdminUI";

type Appointment = {
    id: number;
    customer?: { id?: number; firstName?: string; lastName?: string };
    service?: { name?: string };
    styleName?: string;
    selectedService?: string;
    appointmentDateTime: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
    cancelledByCustomer?: boolean;
    lastSelfServiceChangeAt?: string;
    rescheduledFromDateTime?: string;
    depositAmount?: number;
    paymentStatus?: string;
};

type DashboardProps = {
    token: string;
    categorySummaries: CategorySummary[];
    onNavigate: (section: string) => void;
};

const SALON_TIME_ZONE = "America/Chicago";
const salonDateParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: SALON_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
    return { year: value("year"), month: value("month"), day: value("day") };
};
const localDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const parseSalonDateTime = (value: string) => new Date(`${value.replace(/Z$/, "")}Z`);
const salonDayKey = (value: string) => value.slice(0, 10);
const dateKey = ({ year, month, day }: ReturnType<typeof salonDateParts>) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const customerName = (appointment: Appointment) =>
    [appointment.customer?.firstName, appointment.customer?.lastName].filter(Boolean).join(" ") || "Customer";
const serviceName = (appointment: Appointment) =>
    appointment.styleName || appointment.selectedService || appointment.service?.name || "Service not specified";
const percentChange = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

const statusName = (status: string) => {
    if (status === "APPROVED") return "Confirmed";
    if (status === "PENDING") return "Pending";
    if (status === "COMPLETED") return "Completed";
    if (status === "CANCELLED" || status === "DENIED") return "Cancelled";
    return status.charAt(0) + status.slice(1).toLowerCase();
};

const statusStyle = (status: string) => {
    if (status === "APPROVED") return "text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-200";
    if (status === "PENDING") return "text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-200";
    if (status === "COMPLETED") return "text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-200";
    return "text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-200";
};

export function Dashboard({ token, categorySummaries, onNavigate }: DashboardProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadDashboard = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        if (!quiet) setError("");
        try {
            const today = salonDateParts();
            const anchor = new Date(today.year, today.month - 1, today.day);
            const rangeStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
            const rangeEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 2, 1);
            const params = new URLSearchParams({
                dateRange: "true",
                startDate: localDateTime(rangeStart),
                endDate: localDateTime(rangeEnd),
                size: "200",
            });
            const response = await fetch(`/api/appointments?${params}`, {
                cache: "no-store",
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) throw new Error(body?.error || "Dashboard data could not be loaded.");
            setAppointments(Array.isArray(body) ? body : body?.content ?? []);
            setLastUpdated(new Date());
        } catch (err) {
            if (!quiet) setError(err instanceof Error ? err.message : "Dashboard data could not be loaded.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadDashboard();
        const refresh = () => { if (document.visibilityState === "visible") void loadDashboard(true); };
        const timer = window.setInterval(refresh, 15_000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [loadDashboard]);

    const dashboard = useMemo(() => {
        const now = new Date();
        const salonToday = salonDateParts(now);
        const todayKey = dateKey(salonToday);
        const calendarAnchor = new Date(salonToday.year, salonToday.month - 1, salonToday.day);
        const yesterday = new Date(calendarAnchor); yesterday.setDate(yesterday.getDate() - 1);
        const weekStart = new Date(calendarAnchor); weekStart.setDate(weekStart.getDate() - 6);
        const previousWeekStart = new Date(weekStart); previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        const monthStart = new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1);
        const previousMonthStart = new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() - 1, 1);
        const yesterdayKey = localDateTime(yesterday).slice(0, 10);
        const weekStartKey = localDateTime(weekStart).slice(0, 10);
        const previousWeekStartKey = localDateTime(previousWeekStart).slice(0, 10);
        const monthStartKey = localDateTime(monthStart).slice(0, 10);
        const previousMonthStartKey = localDateTime(previousMonthStart).slice(0, 10);

        const scheduleStatuses = ["PENDING", "APPROVED", "COMPLETED"];
        const todaySchedule = appointments
            .filter((item) => salonDayKey(item.appointmentDateTime) === todayKey && scheduleStatuses.includes(item.status))
            .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime));
        const yesterdayBookings = appointments.filter((item) =>
            salonDayKey(item.appointmentDateTime) === yesterdayKey && scheduleStatuses.includes(item.status)
        ).length;
        const captured = (item: Appointment) =>
            item.paymentStatus === "CAPTURED" || item.paymentStatus === "SUCCEEDED" || item.status === "COMPLETED";
        const depositDollars = (item: Appointment) => (item.depositAmount ?? 0) / 100;
        const weekRevenue = appointments
            .filter((item) => salonDayKey(item.appointmentDateTime) >= weekStartKey && captured(item))
            .reduce((sum, item) => sum + depositDollars(item), 0);
        const previousWeekRevenue = appointments
            .filter((item) => {
                const key = salonDayKey(item.appointmentDateTime);
                return key >= previousWeekStartKey && key < weekStartKey && captured(item);
            })
            .reduce((sum, item) => sum + depositDollars(item), 0);
        const monthAppointments = appointments.filter((item) => salonDayKey(item.appointmentDateTime) >= monthStartKey);
        const previousMonthAppointments = appointments.filter((item) => {
            const key = salonDayKey(item.appointmentDateTime);
            return key >= previousMonthStartKey && key < monthStartKey;
        });
        const uniqueCustomers = (items: Appointment[]) =>
            new Set(items.map((item) => item.customer?.id ?? customerName(item))).size;

        const statusRaw = {
            confirmed: appointments.filter((item) => item.status === "APPROVED").length,
            pending: appointments.filter((item) => item.status === "PENDING").length,
            completed: appointments.filter((item) => item.status === "COMPLETED").length,
            cancelled: appointments.filter((item) => item.status === "CANCELLED" || item.status === "DENIED").length,
        };
        const statusTotal = Object.values(statusRaw).reduce((sum, count) => sum + count, 0);
        const statusPercent = (count: number) => statusTotal ? Math.round((count / statusTotal) * 100) : 0;

        const popularCounts = new Map<string, { bookings: number; capturedDeposits: number }>();
        monthAppointments.forEach((item) => {
            const name = serviceName(item);
            const current = popularCounts.get(name) ?? { bookings: 0, capturedDeposits: 0 };
            current.bookings += 1;
            if (captured(item)) current.capturedDeposits += depositDollars(item);
            popularCounts.set(name, current);
        });

        return {
            now,
            todaySchedule,
            stats: {
                todayBookings: todaySchedule.length,
                weekRevenue,
                monthCustomers: uniqueCustomers(monthAppointments),
                totalServices: categorySummaries.reduce((sum, item) => sum + (item.styleCount ?? 0), 0),
                trends: {
                    bookings: percentChange(todaySchedule.length, yesterdayBookings),
                    revenue: percentChange(weekRevenue, previousWeekRevenue),
                    customers: percentChange(uniqueCustomers(monthAppointments), uniqueCustomers(previousMonthAppointments)),
                },
            },
            bookingStatus: {
                confirmed: statusPercent(statusRaw.confirmed),
                pending: statusPercent(statusRaw.pending),
                completed: statusPercent(statusRaw.completed),
                cancelled: statusPercent(statusRaw.cancelled),
            },
            popularServices: Array.from(popularCounts.entries())
                .map(([name, values]) => ({ name, ...values }))
                .sort((a, b) => b.bookings - a.bookings)
                .slice(0, 5),
            recentActivity: [...appointments]
                .filter((item) => item.updatedAt || item.createdAt)
                .sort((a, b) => new Date(b.updatedAt || b.createdAt!).getTime() - new Date(a.updatedAt || a.createdAt!).getTime())
                .slice(0, 5),
        };
    }, [appointments, categorySummaries]);

    const Trend = ({ value, comparison }: { value: number; comparison: string }) => (
        <span className={`flex items-center gap-1 text-xs ${value >= 0 ? "text-green-600" : "text-red-600"}`} aria-label={`${value >= 0 ? "Up" : "Down"} ${Math.abs(value)} percent ${comparison}`}>
            {value >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
            {Math.abs(value)}%
            <span className="sr-only">{comparison}</span>
        </span>
    );

    const statusRows = [
        ["Confirmed", dashboard.bookingStatus.confirmed, "bg-green-500"],
        ["Pending", dashboard.bookingStatus.pending, "bg-yellow-500"],
        ["Completed", dashboard.bookingStatus.completed, "bg-blue-500"],
        ["Cancelled", dashboard.bookingStatus.cancelled, "bg-red-500"],
    ] as const;

    return (
        <AdminPage className="space-y-6" aria-label="Dashboard overview" aria-busy={loading}>
            <AdminPageHeader title="Dashboard" description="Welcome back! Here’s what’s happening today." actions={
                <AdminButton type="button" onClick={() => void loadDashboard()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                    {loading ? "Refreshing…" : "Refresh"}
                </AdminButton>
            } />
            {lastUpdated && <p role="status" aria-live="polite" className="-mt-5 text-xs text-neutral-400">Last updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}

            {error && (
                <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
                    <button type="button" onClick={() => void loadDashboard()} className="font-semibold underline underline-offset-4">Retry</button>
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Dashboard statistics">
                <button type="button" onClick={() => onNavigate("bookings")} className="rounded-lg border border-neutral-200 bg-white p-6 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950"><Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" /></span>
                        <Trend value={dashboard.stats.trends.bookings} comparison="compared with yesterday" />
                    </div>
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{loading ? "—" : dashboard.stats.todayBookings}</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Today&apos;s Bookings</p>
                </button>
                <button type="button" onClick={() => onNavigate("pricing")} className="rounded-lg border border-neutral-200 bg-white p-6 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-950"><DollarSign className="h-5 w-5 text-green-600 dark:text-green-300" /></span>
                        <Trend value={dashboard.stats.trends.revenue} comparison="compared with the previous week" />
                    </div>
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">${loading ? "—" : dashboard.stats.weekRevenue.toLocaleString()}</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Captured Deposits This Week</p>
                </button>
                <button type="button" onClick={() => onNavigate("customers")} className="rounded-lg border border-neutral-200 bg-white p-6 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950"><Users className="h-5 w-5 text-purple-600 dark:text-purple-300" /></span>
                        <Trend value={dashboard.stats.trends.customers} comparison="compared with last month" />
                    </div>
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{loading ? "—" : dashboard.stats.monthCustomers}</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Customers This Month</p>
                </button>
                <button type="button" onClick={() => onNavigate("categories")} className="rounded-lg border border-neutral-200 bg-white p-6 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950"><Scissors className="h-5 w-5 text-orange-600 dark:text-orange-300" /></span>
                    </div>
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{dashboard.stats.totalServices}</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Total Services</p>
                </button>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <AdminCard className="lg:col-span-2" aria-labelledby="schedule-heading">
                    <div className="border-b border-neutral-200 p-6 dark:border-neutral-700">
                        <h2 id="schedule-heading" className="text-lg font-semibold text-neutral-900 dark:text-white">Today&apos;s Schedule</h2>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{dashboard.todaySchedule.length} appointments scheduled</p>
                    </div>
                    {loading ? <div role="status" className="space-y-3 p-6"><span className="sr-only">Loading schedule</span>{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded bg-neutral-100 dark:bg-neutral-700" />)}</div>
                        : dashboard.todaySchedule.length === 0 ? <div className="p-12 text-center text-sm text-neutral-500">No appointments scheduled today.</div>
                        : <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {dashboard.todaySchedule.map((appointment) => {
                                const date = parseSalonDateTime(appointment.appointmentDateTime);
                                return <button type="button" key={appointment.id} onClick={() => onNavigate("bookings")} className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:hover:bg-neutral-700 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 text-center"><p className="text-sm font-medium text-neutral-900 dark:text-white">{date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}</p></div>
                                        <div><p className="text-sm font-medium text-neutral-900 dark:text-white">{customerName(appointment)}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{serviceName(appointment)}</p></div>
                                    </div>
                                    <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyle(appointment.status)}`}>
                                        {appointment.status === "PENDING" ? <Clock className="h-3 w-3" /> : appointment.status === "CANCELLED" || appointment.status === "DENIED" ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                        {statusName(appointment.status)}
                                    </span>
                                </button>;
                            })}
                        </div>}
                </AdminCard>

                <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby="status-heading">
                    <div className="border-b border-neutral-200 p-6 dark:border-neutral-700"><h2 id="status-heading" className="text-lg font-semibold text-neutral-900 dark:text-white">Booking Status</h2><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Current breakdown</p></div>
                    <div className="space-y-4 p-6">
                        {statusRows.map(([label, value, color]) => <div key={label}>
                            <div className="mb-2 flex items-center justify-between"><span className="text-sm text-neutral-600 dark:text-neutral-300">{label}</span><span className="text-sm font-medium text-neutral-900 dark:text-white">{value}%</span></div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700" role="progressbar" aria-label={`${label} appointments`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
                        </div>)}
                        {!loading && appointments.length === 0 && <p className="pt-2 text-center text-sm text-neutral-500">No appointment data yet.</p>}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="border-b border-neutral-200 p-6 dark:border-neutral-700"><h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Popular Services</h2><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Top requested services this month</p></div>
                    <div className="p-6">
                        {dashboard.popularServices.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">No service requests this month.</p> : <div className="space-y-4">{dashboard.popularServices.map((service, index) => <div key={service.name} className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{service.name}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{service.bookings} bookings</p></div></div>
                            <div className="text-right"><p className="text-sm font-medium text-neutral-900 dark:text-white">${service.capturedDeposits.toLocaleString()}</p><p className="text-xs text-neutral-500">captured</p></div>
                        </div>)}</div>}
                    </div>
                </section>

                <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="border-b border-neutral-200 p-6 dark:border-neutral-700"><h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Activity</h2><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Latest appointment requests</p></div>
                    <div className="p-6">
                        {dashboard.recentActivity.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">No recent activity.</p> : <div className="space-y-4">{dashboard.recentActivity.map((appointment) => <button type="button" key={appointment.id} onClick={() => onNavigate("bookings")} className="flex w-full items-start gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950"><Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" /></span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">{customerName(appointment)} requested {serviceName(appointment)}</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{new Date(appointment.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></span>
                        </button>)}</div>}
                    </div>
                </section>
            </div>

            <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <button type="button" onClick={() => onNavigate("bookings")} className="flex min-h-11 items-center justify-center gap-2 rounded-sm bg-neutral-900 px-4 py-3 text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"><Calendar className="h-4 w-4" /><span className="text-sm font-medium">Appointments</span></button>
                    <button type="button" onClick={() => onNavigate("customers")} className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-neutral-300 px-4 py-3 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"><Users className="h-4 w-4" /><span className="text-sm font-medium">Customers</span></button>
                    <button type="button" onClick={() => onNavigate("availability")} className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-neutral-300 px-4 py-3 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"><Calendar className="h-4 w-4" /><span className="text-sm font-medium">View Calendar</span></button>
                    <button type="button" onClick={() => onNavigate("pricing")} className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-neutral-300 px-4 py-3 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"><DollarSign className="h-4 w-4" /><span className="text-sm font-medium">Pricing</span></button>
                </div>
            </section>
        </AdminPage>
    );
}
