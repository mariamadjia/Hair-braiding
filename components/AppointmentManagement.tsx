"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    Calendar, CalendarDays, Check, Clock, CreditCard, ExternalLink, List,
    Loader2, Mail, MessageSquare, Phone, RefreshCw, Search, User, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthToken, removeAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";
import CalendarView, { CalendarRange } from "./CalendarView";

export type Appointment = {
    id: number;
    customer: { id: number; firstName: string; lastName: string; email: string; phoneNumber: string };
    service?: { id: number; name: string; description: string };
    selectedService?: string;
    selectedSize?: string;
    selectedLength?: string;
    selectedTexture?: string;
    price?: string;
    appointmentDateTime: string;
    appointmentEndDateTime?: string;
    status: string;
    notes?: string;
    adminNotes?: string;
    approvedByName?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
    paymentStatus?: string;
    paymentIntentId?: string;
    depositAmount?: number;
    durationMinutes?: number;
    paymentMethodBrand?: string;
    paymentMethodLast4?: string;
};

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "DENIED" | "CANCELLED" | "COMPLETED";
type SortChoice = "appointment-asc" | "appointment-desc" | "requested-desc" | "payment";
type ActionKind = "approve" | "deny";

const STATUSES: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "DENIED", "CANCELLED", "COMPLETED"];

const localDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseMoney = (value?: string) => {
    if (!value) return null;
    const amount = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount) : value;
};

function AppointmentManagement() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [filter, setFilter] = useState<StatusFilter>("PENDING");
    const [sort, setSort] = useState<SortChoice>("appointment-asc");
    const [query, setQuery] = useState("");
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [action, setAction] = useState<{ kind: ActionKind; appointment: Appointment } | null>(null);
    const [actionNotes, setActionNotes] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeCalendarRange, setActiveCalendarRange] = useState<CalendarRange | null>(null);

    const authHeaders = useCallback((): HeadersInit => {
        const token = getAuthToken();
        return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    }, []);

    const readResponse = useCallback(async (response: Response) => {
        if (response.ok) return response.json();
        const body = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
            removeAuthToken();
            throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error(body.error || body.message || "The request could not be completed");
    }, []);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sortBy = sort === "requested-desc" ? "createdAt" : sort === "payment" ? "paymentStatus" : "appointmentDateTime";
            const sortDir = sort === "appointment-asc" ? "asc" : "desc";
            let url = filter === "ALL"
                ? `${API_BASE_URL}/api/appointments?page=${page}&size=20&sortBy=${sortBy}&sortDir=${sortDir}`
                : filter === "PENDING"
                    ? `${API_BASE_URL}/api/appointments/pending?page=${page}&size=20&sortBy=${sortBy}&sortDir=${sortDir}`
                    : `${API_BASE_URL}/api/appointments/status/${filter}?page=${page}&size=20&sortBy=${sortBy}&sortDir=${sortDir}`;
            const data = await readResponse(await fetch(url, { headers: authHeaders(), cache: "no-store" }));
            if (Array.isArray(data)) {
                setAppointments(data);
                setTotalPages(1);
                setTotalElements(data.length);
            } else {
                setAppointments(data.content ?? []);
                setTotalPages(data.totalPages ?? 0);
                setTotalElements(data.totalElements ?? 0);
            }
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load appointments");
        } finally {
            setLoading(false);
        }
    }, [authHeaders, filter, page, readResponse, sort]);

    useEffect(() => { void fetchAppointments(); }, [fetchAppointments]);

    const fetchCalendarRange = useCallback(async ({ start, end }: CalendarRange) => {
        setCalendarLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ startDate: localDateTime(start), endDate: localDateTime(end) });
            const data: Appointment[] = await readResponse(await fetch(
                `${API_BASE_URL}/api/appointments/date-range?${params}`,
                { headers: authHeaders(), cache: "no-store" }
            ));
            setCalendarAppointments(filter === "ALL" ? data : data.filter(item => item.status === filter));
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load the calendar");
        } finally {
            setCalendarLoading(false);
        }
    }, [authHeaders, filter, readResponse]);

    const handleCalendarRange = useCallback(async (range: CalendarRange) => {
        setActiveCalendarRange(range);
        await fetchCalendarRange(range);
    }, [fetchCalendarRange]);

    const refreshCurrentView = useCallback(async () => {
        if (viewMode === "calendar" && activeCalendarRange) await fetchCalendarRange(activeCalendarRange);
        else await fetchAppointments();
    }, [activeCalendarRange, fetchAppointments, fetchCalendarRange, viewMode]);

    const changeFilter = (status: StatusFilter) => {
        setFilter(status);
        setPage(0);
        setSelectedAppointment(null);
    };

    const isPast = (appointment: Appointment) => new Date(appointment.appointmentDateTime).getTime() <= Date.now();
    const canApprove = (appointment: Appointment) => appointment.status === "PENDING" && appointment.paymentStatus === "AUTHORIZED" && !isPast(appointment);

    const submitAction = async () => {
        if (!action) return;
        const notes = actionNotes.trim();
        if (action.kind === "deny" && !notes) {
            setError("A denial reason is required.");
            return;
        }
        setActionLoading(action.appointment.id);
        setError(null);
        setNotice(null);
        try {
            await readResponse(await fetch(`${API_BASE_URL}/api/appointments/${action.appointment.id}/${action.kind}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ adminNotes: notes })
            }));
            setNotice(action.kind === "approve"
                ? "Appointment approved. Payment capture is processing."
                : "Appointment denied. Payment authorization release is processing when applicable.");
            setAction(null);
            setActionNotes("");
            setSelectedAppointment(null);
            await fetchAppointments();
            if (activeCalendarRange) await fetchCalendarRange(activeCalendarRange);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action.kind} appointment`);
        } finally {
            setActionLoading(null);
        }
    };

    const retryPayment = async (appointment: Appointment, kind: "capture" | "release") => {
        if (!appointment.paymentIntentId) return;
        setActionLoading(appointment.id);
        setError(null);
        try {
            const url = kind === "capture"
                ? `${API_BASE_URL}/api/payments/capture`
                : `${API_BASE_URL}/api/payments/cancel/${appointment.paymentIntentId}`;
            await readResponse(await fetch(url, {
                method: "POST",
                headers: authHeaders(),
                ...(kind === "capture" ? { body: JSON.stringify({ paymentIntentId: appointment.paymentIntentId }) } : {})
            }));
            setNotice(kind === "capture" ? "Payment captured successfully." : "Payment authorization released.");
            await fetchAppointments();
            if (activeCalendarRange) await fetchCalendarRange(activeCalendarRange);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Payment action failed");
        } finally {
            setActionLoading(null);
        }
    };

    const visibleAppointments = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return appointments;
        return appointments.filter(({ customer }) =>
            `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phoneNumber}`.toLowerCase().includes(needle));
    }, [appointments, query]);

    const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        timeZoneName: "short"
    }) : "—";

    const statusClass = (status: string) => ({
        PENDING: "bg-amber-100 text-amber-900 border-amber-300",
        APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-300",
        DENIED: "bg-red-100 text-red-900 border-red-300",
        CANCELLED: "bg-neutral-100 text-neutral-700 border-neutral-300",
        COMPLETED: "bg-blue-100 text-blue-900 border-blue-300"
    }[status] ?? "bg-neutral-100 text-neutral-700 border-neutral-300");

    const paymentClass = (status?: string) => {
        if (!status) return "bg-neutral-100 text-neutral-700";
        if (status.includes("FAILED")) return "bg-red-100 text-red-800";
        if (status === "AUTHORIZED") return "bg-emerald-100 text-emerald-800";
        if (status === "CAPTURED") return "bg-green-100 text-green-800";
        if (status === "PENDING") return "bg-amber-100 text-amber-800";
        return "bg-neutral-100 text-neutral-700";
    };

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-wide text-neutral-900 sm:text-3xl">Appointment Management</h1>
                    <p className="mt-1 text-neutral-600">Review and manage customer appointment requests</p>
                    {lastUpdated && <p className="mt-1 text-xs text-neutral-400">Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void refreshCurrentView()} disabled={loading || calendarLoading}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", (loading || calendarLoading) && "animate-spin")} /> Refresh
                    </Button>
                    <div className="flex overflow-hidden rounded-sm border border-neutral-200" role="group" aria-label="Appointment view">
                        {(["list", "calendar"] as const).map(mode => (
                            <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}
                                className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium capitalize", viewMode === mode ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50")}>
                                {mode === "list" ? <List className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{mode}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="mb-5 overflow-x-auto border-b border-neutral-200" role="tablist" aria-label="Appointment status">
                <div className="flex min-w-max gap-1">
                    {STATUSES.map(status => (
                        <button key={status} type="button" role="tab" aria-selected={filter === status} onClick={() => changeFilter(status)}
                            className={cn("border-b-2 px-3 py-2 text-sm font-medium", filter === status ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800")}>
                            {status}{status === filter && totalElements > 0 ? ` (${totalElements})` : ""}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === "list" && (
                <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="relative block">
                        <span className="sr-only">Search appointments</span>
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or phone"
                            className="h-10 w-full rounded-sm border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-neutral-700 focus:ring-2 focus:ring-neutral-200" />
                    </label>
                    <label>
                        <span className="sr-only">Sort appointments</span>
                        <select value={sort} onChange={event => { setSort(event.target.value as SortChoice); setPage(0); }}
                            className="h-10 w-full rounded-sm border border-neutral-300 bg-white px-3 text-sm">
                            <option value="appointment-asc">Appointment: soonest</option>
                            <option value="appointment-desc">Appointment: latest</option>
                            <option value="requested-desc">Request: newest</option>
                            <option value="payment">Payment status</option>
                        </select>
                    </label>
                </div>
            )}

            {error && <div role="alert" className="mb-5 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-800"><X className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            {notice && <div role="status" className="mb-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}

            {viewMode === "calendar" ? (
                <div className="relative">
                    {calendarLoading && <div className="absolute inset-x-0 top-2 z-10 flex justify-center"><span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs shadow"><Loader2 className="h-3 w-3 animate-spin" />Loading calendar</span></div>}
                    <CalendarView appointments={calendarAppointments} onAppointmentClick={setSelectedAppointment} onRangeChange={handleCalendarRange} />
                </div>
            ) : loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-neutral-400" /><span className="sr-only">Loading appointments</span></div>
            ) : visibleAppointments.length === 0 ? (
                <div className="py-16 text-center"><Calendar className="mx-auto mb-3 h-10 w-10 text-neutral-300" /><p className="text-neutral-500">No matching appointments found</p></div>
            ) : (
                <div className="space-y-4">
                    {visibleAppointments.map(appointment => {
                        const overdue = appointment.status === "PENDING" && isPast(appointment);
                        return (
                            <article key={appointment.id} className={cn("rounded-sm border bg-white p-4 transition hover:shadow-sm sm:p-6", overdue ? "border-red-300" : "border-neutral-200")}>
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold text-neutral-900">{appointment.customer.firstName} {appointment.customer.lastName}</h2>
                                            <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusClass(appointment.status))}>{appointment.status}</span>
                                            {overdue && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">OVERDUE</span>}
                                            {appointment.paymentStatus && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", paymentClass(appointment.paymentStatus))}>PAYMENT: {appointment.paymentStatus.replaceAll("_", " ")}</span>}
                                        </div>
                                        <div className="grid gap-2 text-sm text-neutral-600 md:grid-cols-2">
                                            <p className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />{formatDateTime(appointment.appointmentDateTime)}</p>
                                            <a className="flex min-w-0 items-center gap-2 hover:text-neutral-900 hover:underline" href={`mailto:${appointment.customer.email}`}><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{appointment.customer.email}</span></a>
                                            <a className="flex items-center gap-2 hover:text-neutral-900 hover:underline" href={`tel:${appointment.customer.phoneNumber}`}><Phone className="h-4 w-4 shrink-0" />{appointment.customer.phoneNumber}</a>
                                            {appointment.selectedTexture && <p>Texture: {appointment.selectedTexture}</p>}
                                        </div>
                                        <div className="mt-4 rounded-sm border border-neutral-200 bg-neutral-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Appointment summary</p>
                                            <p className="mt-2 font-semibold text-neutral-900">{appointment.selectedService || appointment.service?.name || "Service not specified"}</p>
                                            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
                                                {appointment.selectedSize && <span><b>Size:</b> {appointment.selectedSize}</span>}
                                                {appointment.selectedLength && <span><b>Length:</b> {appointment.selectedLength}</span>}
                                                {parseMoney(appointment.price) && <span className="font-bold text-neutral-900">{parseMoney(appointment.price)}</span>}
                                            </div>
                                        </div>
                                        {(appointment.notes || appointment.adminNotes) && <div className="mt-3 space-y-2 text-sm">
                                            {appointment.notes && <p><b>Customer notes:</b> {appointment.notes}</p>}
                                            {appointment.adminNotes && <p><b>Admin notes:</b> {appointment.adminNotes}</p>}
                                        </div>}
                                        <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-400">Requested {formatDateTime(appointment.createdAt)}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[240px] xl:justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}><ExternalLink className="mr-1 h-4 w-4" />Details</Button>
                                        {appointment.status === "PENDING" && <>
                                            <Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={!canApprove(appointment) || actionLoading === appointment.id}
                                                title={overdue ? "Past appointments cannot be approved" : appointment.paymentStatus !== "AUTHORIZED" ? "Payment authorization is required" : undefined}
                                                onClick={() => { setAction({ kind: "approve", appointment }); setActionNotes(""); }}><Check className="mr-1 h-4 w-4" />Approve</Button>
                                            <Button size="sm" variant="destructive" disabled={actionLoading === appointment.id}
                                                onClick={() => { setAction({ kind: "deny", appointment }); setActionNotes(""); }}><X className="mr-1 h-4 w-4" />Deny</Button>
                                        </>}
                                        {appointment.paymentStatus === "CAPTURE_FAILED" && <Button size="sm" disabled={actionLoading === appointment.id} onClick={() => void retryPayment(appointment, "capture")}><CreditCard className="mr-1 h-4 w-4" />Retry capture</Button>}
                                        {appointment.paymentStatus === "CANCELLATION_FAILED" && <Button size="sm" variant="outline" disabled={actionLoading === appointment.id} onClick={() => void retryPayment(appointment, "release")}>Retry release</Button>}
                                    </div>
                                </div>
                                {appointment.status === "PENDING" && !canApprove(appointment) && !overdue && <p className="mt-3 text-xs font-medium text-amber-700">Approval is unavailable until payment is authorized.</p>}
                            </article>
                        );
                    })}
                </div>
            )}

            {viewMode === "list" && !loading && totalPages > 1 && <nav aria-label="Appointment pages" className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
                <p className="text-sm text-neutral-600">Page {page + 1} of {totalPages} · {totalElements} appointments</p>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(value => Math.min(totalPages - 1, value + 1))}>Next</Button></div>
            </nav>}

            {selectedAppointment && <AppointmentDialog appointment={selectedAppointment} formatDateTime={formatDateTime} onClose={() => setSelectedAppointment(null)} onApprove={canApprove(selectedAppointment) ? () => { setAction({ kind: "approve", appointment: selectedAppointment }); setActionNotes(""); } : undefined} onDeny={selectedAppointment.status === "PENDING" ? () => { setAction({ kind: "deny", appointment: selectedAppointment }); setActionNotes(""); } : undefined} />}

            {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAction(null); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="appointment-action-title" className="w-full max-w-lg rounded-sm bg-white p-6 shadow-xl">
                    <div className="flex items-start justify-between gap-4"><div><h2 id="appointment-action-title" className="text-xl font-semibold capitalize">{action.kind} appointment</h2><p className="mt-1 text-sm text-neutral-600">{action.appointment.customer.firstName} {action.appointment.customer.lastName} · {formatDateTime(action.appointment.appointmentDateTime)}</p></div><button aria-label="Close dialog" className="p-1 text-neutral-500 hover:text-neutral-900" onClick={() => setAction(null)}><X className="h-5 w-5" /></button></div>
                    {action.kind === "approve" && <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The customer’s authorized deposit will be captured after approval.</div>}
                    <label className="mt-4 block text-sm font-medium text-neutral-800">{action.kind === "deny" ? "Denial reason (required)" : "Approval notes (optional)"}<textarea autoFocus value={actionNotes} maxLength={500} rows={4} onChange={event => setActionNotes(event.target.value)} className="mt-2 w-full rounded-sm border border-neutral-300 p-3 font-normal outline-none focus:border-neutral-700 focus:ring-2 focus:ring-neutral-200" /></label>
                    <p className="text-right text-xs text-neutral-400">{actionNotes.length}/500</p>
                    <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button variant={action.kind === "deny" ? "destructive" : "default"} disabled={actionLoading === action.appointment.id || (action.kind === "deny" && !actionNotes.trim())} onClick={() => void submitAction()}>{actionLoading === action.appointment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm {action.kind}</Button></div>
                </section>
            </div>}
        </div>
    );
}

function AppointmentDialog({ appointment, formatDateTime, onClose, onApprove, onDeny }: { appointment: Appointment; formatDateTime: (value?: string) => string; onClose: () => void; onApprove?: () => void; onDeny?: () => void }) {
    return <div className="fixed inset-0 z-40 flex justify-end bg-black/40" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title" className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-neutral-500">Appointment #{appointment.id}</p><h2 id="appointment-detail-title" className="mt-1 text-2xl font-semibold">{appointment.customer.firstName} {appointment.customer.lastName}</h2></div><button aria-label="Close details" onClick={onClose} className="p-2"><X className="h-5 w-5" /></button></div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-neutral-500">Appointment</dt><dd className="font-medium">{formatDateTime(appointment.appointmentDateTime)}</dd></div>
                <div><dt className="text-neutral-500">Ends</dt><dd className="font-medium">{formatDateTime(appointment.appointmentEndDateTime)}</dd></div>
                <div><dt className="text-neutral-500">Status</dt><dd className="font-medium">{appointment.status}</dd></div>
                <div><dt className="text-neutral-500">Payment</dt><dd className="font-medium">{appointment.paymentStatus?.replaceAll("_", " ") || "Unknown"}</dd></div>
                <div><dt className="text-neutral-500">Service</dt><dd className="font-medium">{appointment.selectedService || appointment.service?.name || "—"}</dd></div>
                <div><dt className="text-neutral-500">Hair texture</dt><dd className="font-medium">{appointment.selectedTexture || "—"}</dd></div>
                <div><dt className="text-neutral-500">Size</dt><dd className="font-medium">{appointment.selectedSize || "—"}</dd></div>
                <div><dt className="text-neutral-500">Length</dt><dd className="font-medium">{appointment.selectedLength || "—"}</dd></div>
            </dl>
            <div className="mt-6 border-t pt-5 text-sm"><h3 className="font-semibold">Customer</h3><p className="mt-2 flex items-center gap-2"><User className="h-4 w-4" />{appointment.customer.firstName} {appointment.customer.lastName}</p><a href={`mailto:${appointment.customer.email}`} className="mt-2 flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" />{appointment.customer.email}</a><a href={`tel:${appointment.customer.phoneNumber}`} className="mt-2 flex items-center gap-2 hover:underline"><Phone className="h-4 w-4" />{appointment.customer.phoneNumber}</a></div>
            {appointment.notes && <div className="mt-6 border-t pt-5 text-sm"><h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />Customer notes</h3><p className="mt-2 whitespace-pre-wrap text-neutral-700">{appointment.notes}</p></div>}
            {appointment.adminNotes && <div className="mt-6 border-t pt-5 text-sm"><h3 className="font-semibold">Admin notes</h3><p className="mt-2 whitespace-pre-wrap text-neutral-700">{appointment.adminNotes}</p></div>}
            {(onApprove || onDeny) && <div className="mt-8 flex flex-wrap justify-end gap-2 border-t pt-5">{onDeny && <Button variant="destructive" onClick={onDeny}>Deny</Button>}{onApprove && <Button onClick={onApprove}>Approve and capture deposit</Button>}</div>}
        </aside>
    </div>;
}

export default memo(AppointmentManagement);
