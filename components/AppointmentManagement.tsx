"use client";

import { memo, useCallback, useDeferredValue, useEffect, useState } from "react";
import {
    AlertTriangle, Calendar, CalendarDays, Check, ChevronRight, Clock, CreditCard, ExternalLink, List,
    Loader2, Mail, MessageSquare, Phone, RefreshCw, Search, ShieldCheck, User, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthToken, removeAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";
import CalendarView, { CalendarRange } from "./CalendarView";

type NoShowFee = {
    appointmentId: number; scheduledServicePriceCents: number; feeRatePercent: number;
    totalFeeCents: number; depositCreditCents: number; amountToChargeCents: number;
    feeDecision: string; paymentStatus: string; paymentMethodBrand?: string;
    paymentMethodLast4?: string; failureMessage?: string; eligibleAt: string;
    normalDeadlineAt: string; automaticChargeDeadlineAt: string;
    overdueConfirmationRequired: boolean; automaticChargeAllowed: boolean;
    bookingRestricted?: boolean; consentRecordedAt?: string; chargeAttemptCount?: number;
    chargeAttemptedAt?: string; paidAt?: string; adminNote?: string;
};

export type Appointment = {
    id: number;
    customer: { id: number; firstName: string; lastName: string; email: string; phoneNumber: string };
    service?: { id: number; name: string; description: string };
    selectedService?: string;
    selectedSize?: string;
    selectedLength?: string;
    selectedFoundation?: string;
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
    paymentAuthorizationExpiresAt?: string;
    notificationStatus?: string;
    notificationLastAttemptAt?: string;
    cancelledByCustomer?: boolean;
    customerCancellationReason?: string;
    selfServiceChangeCount?: number;
    lastSelfServiceChangeAt?: string;
    rescheduledFromDateTime?: string;
    noShowFee?: NoShowFee;
};

type WorkflowView = "NEEDS_ACTION" | "UPCOMING" | "HISTORY";
type DetailFilter = "ALL" | "READY_FOR_APPROVAL" | "AWAITING_PAYMENT" | "CAPTURE_PROCESSING" | "PAYMENT_ISSUE" | "APPROVED" | "PAST" | "COMPLETED" | "DENIED" | "CANCELLED" | "NO_SHOW";
type SortChoice = "appointment-asc" | "appointment-desc" | "requested-desc" | "payment";
type ActionKind = "approve" | "deny" | "complete" | "cancel" | "no-show";

const WORKFLOW_VIEWS: { value: WorkflowView; label: string; description: string }[] = [
    { value: "NEEDS_ACTION", label: "Needs Action", description: "Requests and payment issues requiring attention" },
    { value: "UPCOMING", label: "Upcoming", description: "Approved appointments and captures in progress" },
    { value: "HISTORY", label: "History", description: "Completed, denied, cancelled, and past appointments" }
];
const DETAIL_OPTIONS: Record<WorkflowView, { value: DetailFilter; label: string }[]> = {
    NEEDS_ACTION: [
        { value: "ALL", label: "All action items" },
        { value: "READY_FOR_APPROVAL", label: "Ready for approval" },
        { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
        { value: "CAPTURE_PROCESSING", label: "Capture processing" },
        { value: "PAYMENT_ISSUE", label: "Payment issue" }
    ],
    UPCOMING: [
        { value: "ALL", label: "All upcoming" },
        { value: "APPROVED", label: "Approved" },
        { value: "CAPTURE_PROCESSING", label: "Capture processing" }
    ],
    HISTORY: [
        { value: "ALL", label: "All history" },
        { value: "PAST", label: "Past" },
        { value: "COMPLETED", label: "Completed" },
        { value: "DENIED", label: "Denied" },
        { value: "CANCELLED", label: "Cancelled" },
        { value: "NO_SHOW", label: "No-show" }
    ]
};

const localDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseMoney = (value?: string) => {
    if (!value) return null;
    const amount = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount) : value;
};

const matchesWorkflow = (appointment: Appointment, workflow: WorkflowView, detail: DetailFilter) => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const appointmentTime = new Date(appointment.appointmentDateTime);
    const captureProcessing = appointment.status === "PENDING" && Boolean(appointment.approvedAt);
    const paymentIssue = ["CAPTURE_FAILED", "CANCELLATION_FAILED", "FAILED"].includes(appointment.paymentStatus || "")
        || ["UNPAID", "PROCESSING", "FAILED"].includes(appointment.noShowFee?.paymentStatus || "");
    const viewMatch = workflow === "NEEDS_ACTION"
        ? appointment.status === "PENDING" || paymentIssue
        : workflow === "UPCOMING"
            ? captureProcessing || (appointment.status === "APPROVED" && appointmentTime >= now)
            : ["DENIED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)
                || (appointment.status === "APPROVED" && appointmentTime < now);
    if (!viewMatch || detail === "ALL") return viewMatch;
    return {
        READY_FOR_APPROVAL: appointment.status === "PENDING" && !appointment.approvedAt && appointment.paymentStatus === "AUTHORIZED" && appointmentTime > now,
        AWAITING_PAYMENT: appointment.status === "PENDING" && !appointment.approvedAt && ["PENDING", "CANCELLED"].includes(appointment.paymentStatus || ""),
        CAPTURE_PROCESSING: captureProcessing,
        PAYMENT_ISSUE: paymentIssue,
        APPROVED: appointment.status === "APPROVED",
        PAST: appointmentTime < now,
        COMPLETED: appointment.status === "COMPLETED",
        DENIED: appointment.status === "DENIED",
        CANCELLED: appointment.status === "CANCELLED",
        NO_SHOW: appointment.status === "NO_SHOW"
    }[detail];
};

function AppointmentManagement() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [workflow, setWorkflow] = useState<WorkflowView>("NEEDS_ACTION");
    const [detail, setDetail] = useState<DetailFilter>("ALL");
    const [workflowCounts, setWorkflowCounts] = useState<Record<WorkflowView, number>>({ NEEDS_ACTION: 0, UPCOMING: 0, HISTORY: 0 });
    const [sort, setSort] = useState<SortChoice>("appointment-asc");
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [action, setAction] = useState<{ kind: ActionKind; appointment: Appointment } | null>(null);
    const [actionNotes, setActionNotes] = useState("");
    const [confirmOverdue, setConfirmOverdue] = useState(false);
    const [noShowDecision, setNoShowDecision] = useState<"ACTIVE" | "ADJUSTED" | "WAIVED">("ACTIVE");
    const [adjustedFee, setAdjustedFee] = useState("");
    const [noShowResult, setNoShowResult] = useState<NoShowFee | null>(null);
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

    const fetchAppointments = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        if (!quiet) setError(null);
        try {
            const sortBy = sort === "requested-desc" ? "createdAt" : sort === "payment" ? "paymentStatus" : "appointmentDateTime";
            const sortDir = sort === "appointment-asc" ? "asc" : "desc";
            const params = new URLSearchParams({
                view: workflow, detail, q: deferredQuery.trim(), page: String(page), size: "20", sortBy, sortDir
            });
            const url = `${API_BASE_URL}/api/appointments/workflow?${params}`;
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
            const counts = await readResponse(await fetch(`${API_BASE_URL}/api/appointments/workflow-counts`, {
                headers: authHeaders(), cache: "no-store"
            }));
            setWorkflowCounts(counts);
            setLastUpdated(new Date());
        } catch (err) {
            if (!quiet) setError(err instanceof Error ? err.message : "Failed to load appointments");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [authHeaders, deferredQuery, detail, page, readResponse, sort, workflow]);

    useEffect(() => { void fetchAppointments(); }, [fetchAppointments]);

    const fetchCalendarRange = useCallback(async ({ start, end }: CalendarRange, quiet = false) => {
        if (!quiet) setCalendarLoading(true);
        if (!quiet) setError(null);
        try {
            const params = new URLSearchParams({ startDate: localDateTime(start), endDate: localDateTime(end) });
            const data: Appointment[] = await readResponse(await fetch(
                `${API_BASE_URL}/api/appointments/date-range?${params}`,
                { headers: authHeaders(), cache: "no-store" }
            ));
            setCalendarAppointments(data.filter(item => matchesWorkflow(item, workflow, detail)));
            setLastUpdated(new Date());
        } catch (err) {
            if (!quiet) setError(err instanceof Error ? err.message : "Failed to load the calendar");
        } finally {
            if (!quiet) setCalendarLoading(false);
        }
    }, [authHeaders, detail, readResponse, workflow]);

    const handleCalendarRange = useCallback(async (range: CalendarRange) => {
        setActiveCalendarRange(range);
        await fetchCalendarRange(range);
    }, [fetchCalendarRange]);

    const refreshCurrentView = useCallback(async () => {
        if (viewMode === "calendar" && activeCalendarRange) await fetchCalendarRange(activeCalendarRange);
        else await fetchAppointments();
    }, [activeCalendarRange, fetchAppointments, fetchCalendarRange, viewMode]);

    useEffect(() => {
        const refreshQuietly = () => {
            if (document.visibilityState !== "visible") return;
            if (viewMode === "calendar" && activeCalendarRange) void fetchCalendarRange(activeCalendarRange, true);
            else void fetchAppointments(true);
        };
        const timer = window.setInterval(refreshQuietly, 15_000);
        window.addEventListener("focus", refreshQuietly);
        document.addEventListener("visibilitychange", refreshQuietly);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", refreshQuietly);
            document.removeEventListener("visibilitychange", refreshQuietly);
        };
    }, [activeCalendarRange, fetchAppointments, fetchCalendarRange, viewMode]);

    const changeWorkflow = (next: WorkflowView) => {
        setWorkflow(next);
        setDetail("ALL");
        setPage(0);
        setSelectedAppointment(null);
    };

    const centralNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const isPast = (appointment: Appointment) => new Date(appointment.appointmentDateTime).getTime() <= centralNow().getTime();
    const canApprove = (appointment: Appointment) => appointment.status === "PENDING"
        && !appointment.approvedAt
        && appointment.paymentStatus === "AUTHORIZED"
        && !isPast(appointment);

    const openNoShow = (appointment: Appointment) => {
        const savedDecision = appointment.noShowFee?.feeDecision;
        const initialDecision = savedDecision === "ACTIVE" || savedDecision === "ADJUSTED" || savedDecision === "WAIVED"
            ? savedDecision : appointment.noShowFee?.automaticChargeAllowed ? "ACTIVE" : "WAIVED";
        setAction({ kind: "no-show", appointment });
        setActionNotes(appointment.noShowFee?.adminNote || "");
        setConfirmOverdue(false);
        setNoShowDecision(initialDecision);
        setAdjustedFee(appointment.noShowFee?.feeDecision === "ADJUSTED"
            ? (appointment.noShowFee.totalFeeCents / 100).toFixed(2) : "");
        setNoShowResult(appointment.status === "NO_SHOW" && appointment.noShowFee ? appointment.noShowFee : null);
        setError(null);
    };

    const submitAction = async () => {
        if (!action) return;
        const notes = actionNotes.trim();
        if ((action.kind === "deny" || action.kind === "cancel") && !notes) {
            setError(`A ${action.kind === "deny" ? "denial" : "cancellation"} reason is required.`);
            return;
        }
        setActionLoading(action.appointment.id);
        setError(null);
        setNotice(null);
        try {
            const noShow = action.kind === "no-show";
            const retryNoShow = noShow && action.appointment.status === "NO_SHOW"
                && action.appointment.noShowFee?.paymentStatus === "FAILED";
            const adjustedCents = noShowDecision === "ADJUSTED" ? Math.round(Number(adjustedFee) * 100) : undefined;
            if (noShowDecision === "ADJUSTED" && (!Number.isFinite(adjustedCents) || adjustedCents === undefined)) {
                throw new Error("Enter a valid adjusted total fee");
            }
            const result = await readResponse(await fetch(retryNoShow
                ? `${API_BASE_URL}/api/appointments/${action.appointment.id}/no-show/retry`
                : `${API_BASE_URL}/api/appointments/${action.appointment.id}/${action.kind}`, {
                method: noShow ? "POST" : "PUT",
                headers: authHeaders(),
                ...(retryNoShow ? { body: JSON.stringify({ confirmOverdue }) } : { body: JSON.stringify(noShow
                    ? { adminNote: notes, confirmOverdue, feeDecision: noShowDecision, adjustedTotalFeeCents: adjustedCents }
                    : { adminNotes: notes }) })
            }));
            setNotice({
                approve: "Approval is processing while the authorized deposit is captured.",
                deny: "Appointment denied. Payment authorization release is processing when applicable.",
                complete: "Appointment marked complete.",
                cancel: "Appointment cancelled by the salon. Any authorization release is processing.",
                "no-show": result.paymentStatus === "PAID"
                    ? `No-show recorded and ${(result.amountToChargeCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} charged.`
                    : `No-show recorded. Card charge status: ${String(result.paymentStatus).toLowerCase()}.`
            }[action.kind]);
            if (noShow) {
                setNoShowResult(result as NoShowFee);
                setAction(current => current ? { ...current, appointment: { ...current.appointment, status: "NO_SHOW", noShowFee: result as NoShowFee } } : null);
            } else {
                setAction(null);
                setActionNotes("");
                setConfirmOverdue(false);
                setSelectedAppointment(null);
            }
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

    const retryNotification = async (appointment: Appointment) => {
        setActionLoading(appointment.id);
        setError(null);
        try {
            await readResponse(await fetch(`${API_BASE_URL}/api/appointments/${appointment.id}/retry-notification`, {
                method: "POST", headers: authHeaders()
            }));
            setNotice("Customer notification retried.");
            await fetchAppointments();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Notification retry failed");
        } finally {
            setActionLoading(null);
        }
    };

    const visibleAppointments = appointments;

    const formatDateTime = (value?: string) => value ? `${new Date(`${value.replace(/Z$/, "")}Z`).toLocaleString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        timeZone: "UTC"
    })} CT` : "—";

    useEffect(() => {
        const captureInProgress = appointments.some(item => item.status === "PENDING" && Boolean(item.approvedAt));
        if (!captureInProgress) return;
        const timer = window.setInterval(() => void fetchAppointments(), 3000);
        return () => window.clearInterval(timer);
    }, [appointments, fetchAppointments]);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const statusClass = (status: string) => ({
        PENDING: "bg-amber-100 text-amber-900 border-amber-300",
        APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-300",
        DENIED: "bg-red-100 text-red-900 border-red-300",
        CANCELLED: "bg-neutral-100 text-neutral-700 border-neutral-300",
        COMPLETED: "bg-blue-100 text-blue-900 border-blue-300",
        NO_SHOW: "bg-red-100 text-red-900 border-red-300"
    }[status] ?? "bg-neutral-100 text-neutral-700 border-neutral-300");

    const paymentClass = (status?: string) => {
        if (!status) return "bg-neutral-100 text-neutral-700";
        if (status.includes("FAILED")) return "bg-red-100 text-red-800";
        if (status === "AUTHORIZED") return "bg-emerald-100 text-emerald-800";
        if (status === "CAPTURED") return "bg-green-100 text-green-800";
        if (status === "PENDING") return "bg-amber-100 text-amber-800";
        return "bg-neutral-100 text-neutral-700";
    };

    const noShowPreview = action?.kind === "no-show" ? action.appointment.noShowFee : undefined;
    const chosenNoShowTotal = noShowDecision === "WAIVED" ? 0
        : noShowDecision === "ADJUSTED" && Number.isFinite(Number(adjustedFee))
            ? Math.round(Number(adjustedFee) * 100)
            : noShowPreview?.totalFeeCents || 0;
    const chosenDepositCredit = Math.min(chosenNoShowTotal, noShowPreview?.depositCreditCents || 0);
    const chosenCharge = Math.max(0, chosenNoShowTotal - chosenDepositCredit);

    return (
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
            <header className="mb-7 flex flex-col gap-5 border-b border-[#e8dfd8] pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6d50]">Bookings</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#241711] sm:text-3xl">Appointment Management</h1>
                    <p className="mt-2 text-sm text-neutral-600">Review requests, resolve payment issues, and manage upcoming clients.</p>
                    {lastUpdated && <p className="mt-1 text-xs text-neutral-400">Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void refreshCurrentView()} disabled={loading || calendarLoading}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", (loading || calendarLoading) && "animate-spin")} /> Refresh
                    </Button>
                    <div className="flex overflow-hidden rounded-xl border border-[#ded3cb] bg-white p-1" role="group" aria-label="Appointment view">
                        {(["list", "calendar"] as const).map(mode => (
                            <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}
                                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium capitalize transition", viewMode === mode ? "bg-[#2f1b12] text-white shadow-sm" : "bg-white text-neutral-600 hover:bg-[#f7f2ee]")}>
                                {mode === "list" ? <List className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{mode}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <section className="mb-6 overflow-hidden rounded-2xl border border-[#e6ddd6] bg-white shadow-[0_8px_30px_rgba(53,29,18,0.05)]">
                <div className="overflow-x-auto border-b border-[#eee5df] px-3 pt-2 sm:px-5" role="tablist" aria-label="Appointment workflow">
                    <div className="flex min-w-max gap-2">
                    {WORKFLOW_VIEWS.map(item => (
                        <button key={item.value} type="button" role="tab" aria-selected={workflow === item.value} onClick={() => changeWorkflow(item.value)}
                            title={item.description}
                            className={cn("border-b-2 px-3 py-4 text-sm font-semibold transition sm:px-5", workflow === item.value ? "border-[#351d12] text-[#351d12]" : "border-transparent text-neutral-500 hover:text-[#351d12]")}>
                            {item.label} <span className={cn("ml-1 rounded-full px-2 py-0.5 text-xs", workflow === item.value ? "bg-[#efe3d9] text-[#6b3d27]" : "bg-neutral-100")}>{workflowCounts[item.value] ?? 0}</span>
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="appointment-detail-filter">Show</label>
                    <select id="appointment-detail-filter" value={detail} onChange={event => { setDetail(event.target.value as DetailFilter); setPage(0); }}
                        className="h-9 rounded-sm border border-neutral-300 bg-white px-3 text-sm focus:border-neutral-700 focus:ring-2 focus:ring-neutral-200">
                        {DETAIL_OPTIONS[workflow].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <span className="hidden text-xs text-neutral-500 sm:inline">{WORKFLOW_VIEWS.find(item => item.value === workflow)?.description}</span>
                    </div>
                    {viewMode === "list" && <p className="text-xs font-medium text-neutral-500">{totalElements} {totalElements === 1 ? "appointment" : "appointments"}</p>}
                </div>
            </section>

            {viewMode === "list" && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-[#e6ddd6] bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="relative block">
                        <span className="sr-only">Search appointments</span>
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or phone"
                            className="h-11 w-full rounded-xl border border-transparent bg-[#f8f5f2] pl-10 pr-3 text-sm outline-none focus:border-[#b99782] focus:bg-white focus:ring-2 focus:ring-[#eadbd0]" />
                    </label>
                    <label>
                        <span className="sr-only">Sort appointments</span>
                        <select value={sort} onChange={event => { setSort(event.target.value as SortChoice); setPage(0); }}
                            className="h-11 w-full rounded-xl border border-[#ded3cb] bg-white px-3 text-sm">
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
                <div className="overflow-hidden rounded-2xl border border-[#e6ddd6] bg-white shadow-[0_10px_35px_rgba(53,29,18,0.05)]">
                    {visibleAppointments.map(appointment => {
                        const overdue = appointment.status === "PENDING" && isPast(appointment);
                        const captureProcessing = appointment.status === "PENDING" && Boolean(appointment.approvedAt);
                        const expiryHours = appointment.paymentAuthorizationExpiresAt
                            ? (new Date(appointment.paymentAuthorizationExpiresAt).getTime() - centralNow().getTime()) / 3_600_000
                            : null;
                        const paymentIssue = appointment.paymentStatus?.includes("FAILED");
                        const operationalLabel = paymentIssue ? "PAYMENT ISSUE"
                            : captureProcessing ? "CAPTURE PROCESSING"
                                : canApprove(appointment) ? "READY FOR APPROVAL"
                                    : appointment.status === "PENDING" ? "AWAITING PAYMENT"
                                        : appointment.status;
                        return (
                            <article key={appointment.id} className={cn("group relative border-b border-[#eee7e1] p-4 transition last:border-b-0 hover:bg-[#fcfaf8] sm:p-6", (overdue || paymentIssue) && "bg-red-50/30")}>
                                <div className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", paymentIssue || overdue ? "bg-red-500" : canApprove(appointment) ? "bg-amber-500" : appointment.status === "APPROVED" ? "bg-emerald-500" : "bg-neutral-300")} />
                                <div className="grid gap-5 pl-2 lg:grid-cols-[minmax(230px,0.85fr)_minmax(300px,1.2fr)_auto] lg:items-center">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <h2 className="text-base font-semibold text-[#241711]">{appointment.customer.firstName} {appointment.customer.lastName}</h2>
                                            <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusClass(appointment.status))}>{operationalLabel}</span>
                                            {appointment.cancelledByCustomer && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">CANCELLED BY CUSTOMER</span>}
                                            {!appointment.cancelledByCustomer && appointment.rescheduledFromDateTime && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">RESCHEDULED BY CUSTOMER</span>}
                                            {overdue && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">OVERDUE</span>}
                                            {appointment.paymentStatus && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", paymentClass(appointment.paymentStatus))}>PAYMENT: {appointment.paymentStatus.replaceAll("_", " ")}</span>}
                                        </div>
                                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-700"><Calendar className="h-4 w-4 shrink-0 text-[#9a6d50]" />{formatDateTime(appointment.appointmentDateTime)}</p>
                                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                                            <a className="truncate hover:text-[#351d12] hover:underline" href={`mailto:${appointment.customer.email}`}>{appointment.customer.email}</a>
                                            <span>•</span><a className="hover:text-[#351d12] hover:underline" href={`tel:${appointment.customer.phoneNumber}`}>{appointment.customer.phoneNumber}</a>
                                        </div>
                                    </div>
                                    <div className="min-w-0 border-y border-[#f0e9e4] py-4 lg:border-x lg:border-y-0 lg:px-6 lg:py-0">
                                            <p className="font-semibold text-[#241711]">{appointment.selectedService || appointment.service?.name || "Service not specified"}</p>
                                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                                                {appointment.selectedSize && <span><b>Size:</b> {appointment.selectedSize}</span>}
                                                {appointment.selectedLength && <span><b>Length:</b> {appointment.selectedLength}</span>}
                                                {appointment.selectedFoundation && <span><b>Foundation:</b> {appointment.selectedFoundation === "KNOTLESS" ? "Knotless" : "Regular"}</span>}
                                                {parseMoney(appointment.price) && <span className="font-bold text-[#241711]">{parseMoney(appointment.price)}</span>}
                                            </div>
                                        {appointment.paymentAuthorizationExpiresAt && appointment.paymentStatus === "AUTHORIZED" && <p className={cn("mt-2 flex items-center gap-1.5 text-xs font-medium", expiryHours !== null && expiryHours < 24 ? "text-red-700" : "text-amber-700")}><Clock className="h-3.5 w-3.5" />Authorization {expiryHours !== null && expiryHours < 24 ? "expires in less than 24 hours" : `expires ${formatDateTime(appointment.paymentAuthorizationExpiresAt)}`}</p>}
                                        {captureProcessing && <p className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Capturing authorized deposit</p>}
                                        {appointment.rescheduledFromDateTime && <p className="mt-2 text-xs font-medium text-blue-700">Customer rescheduled from {formatDateTime(appointment.rescheduledFromDateTime)}</p>}
                                        {appointment.cancelledByCustomer && <p className="mt-2 text-xs font-medium text-violet-700">Cancelled by customer{appointment.customerCancellationReason ? `: ${appointment.customerCancellationReason}` : ""}</p>}
                                        <p className="mt-2 text-xs text-neutral-400">Requested {formatDateTime(appointment.createdAt)}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
                                        <Button variant="outline" size="sm" className="border-[#d7c6bb]" onClick={() => setSelectedAppointment(appointment)}>Review <ChevronRight className="ml-1 h-4 w-4" /></Button>
                                        {appointment.status === "PENDING" && !captureProcessing && <>
                                            <Button size="sm" className="bg-[#351d12] text-white hover:bg-[#4b2a1b]" disabled={!canApprove(appointment) || actionLoading === appointment.id}
                                                title={overdue ? "Past appointments cannot be approved" : appointment.paymentStatus !== "AUTHORIZED" ? "Payment authorization is required" : undefined}
                                                onClick={() => { setAction({ kind: "approve", appointment }); setActionNotes(""); }}><Check className="mr-1 h-4 w-4" />Approve</Button>
                                            <Button size="sm" variant="outline" className="text-red-700" disabled={actionLoading === appointment.id} onClick={() => { setAction({ kind: "deny", appointment }); setActionNotes(""); }}>Deny</Button>
                                        </>}
                                        {appointment.paymentStatus === "CAPTURE_FAILED" && <Button size="sm" disabled={actionLoading === appointment.id} onClick={() => void retryPayment(appointment, "capture")}><CreditCard className="mr-1 h-4 w-4" />Retry capture</Button>}
                                        {appointment.paymentStatus === "CANCELLATION_FAILED" && <Button size="sm" variant="outline" disabled={actionLoading === appointment.id} onClick={() => void retryPayment(appointment, "release")}>Retry release</Button>}
                                        {appointment.notificationStatus?.includes("FAILED") && <Button size="sm" variant="outline" disabled={actionLoading === appointment.id} onClick={() => void retryNotification(appointment)}><Mail className="mr-1 h-4 w-4" />Retry notification</Button>}
                                        {appointment.status === "APPROVED" && isPast(appointment) && <>
                                            <Button size="sm" onClick={() => { setAction({ kind: "complete", appointment }); setActionNotes(""); }}>Mark complete</Button>
                                            {appointment.noShowFee && <Button size="sm" variant="destructive" disabled={new Date(appointment.noShowFee.eligibleAt) > centralNow()} title={new Date(appointment.noShowFee.eligibleAt) > centralNow() ? `Available after ${formatDateTime(appointment.noShowFee.eligibleAt)}` : undefined} onClick={() => openNoShow(appointment)}>Mark no-show</Button>}
                                        </>}
                                        {appointment.status === "NO_SHOW" && appointment.noShowFee?.paymentStatus === "FAILED" && <Button size="sm" variant="destructive" onClick={() => openNoShow(appointment)}>Retry no-show charge</Button>}
                                        {(appointment.status === "PENDING" || appointment.status === "APPROVED") && !captureProcessing && <Button size="sm" variant="outline" className="text-red-700" onClick={() => { setAction({ kind: "cancel", appointment }); setActionNotes(""); }}>Cancel appointment</Button>}
                                    </div>
                                </div>
                                {appointment.status === "PENDING" && !captureProcessing && !canApprove(appointment) && !overdue && <p className="mt-3 pl-2 text-xs font-medium text-amber-700">Approval is unavailable until payment is authorized.</p>}
                            </article>
                        );
                    })}
                </div>
            )}

            {viewMode === "list" && !loading && totalPages > 1 && <nav aria-label="Appointment pages" className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
                <p className="text-sm text-neutral-600">Page {page + 1} of {totalPages} · {totalElements} appointments</p>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(value => Math.min(totalPages - 1, value + 1))}>Next</Button></div>
            </nav>}

            {selectedAppointment && <AppointmentDialog appointment={selectedAppointment} formatDateTime={formatDateTime} onClose={() => setSelectedAppointment(null)} onApprove={canApprove(selectedAppointment) ? () => { setAction({ kind: "approve", appointment: selectedAppointment }); setActionNotes(""); } : undefined} onDeny={selectedAppointment.status === "PENDING" && !selectedAppointment.approvedAt ? () => { setAction({ kind: "deny", appointment: selectedAppointment }); setActionNotes(""); } : undefined} />}

            {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAction(null); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="appointment-action-title" className={cn("max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl", action.kind === "no-show" ? "max-w-3xl" : "max-w-lg")}>
                    <div className="flex items-start justify-between gap-4"><div><h2 id="appointment-action-title" className="text-xl font-semibold capitalize">{action.kind} appointment</h2><p className="mt-1 text-sm text-neutral-600">{action.appointment.customer.firstName} {action.appointment.customer.lastName} · {formatDateTime(action.appointment.appointmentDateTime)}</p></div><button aria-label="Close dialog" className="p-1 text-neutral-500 hover:text-neutral-900" onClick={() => setAction(null)}><X className="h-5 w-5" /></button></div>
                    {action.kind === "approve" && <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The customer’s authorized deposit will be captured after approval.</div>}
                    {action.kind === "cancel" && action.appointment.paymentStatus === "CAPTURED" && <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The deposit has already been captured. Cancelling here does not automatically refund it; manage any refund in Stripe.</div>}
                    {action.kind === "no-show" && noShowPreview && <div className="mt-5 space-y-4">
                        <section className="rounded-xl border border-[#e5d5c7] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">No-show fee calculation</h3><p className="mt-1 text-xs text-neutral-500">Scheduled service price ${(noShowPreview.scheduledServicePriceCents / 100).toFixed(2)}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-semibold", noShowResult?.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : noShowResult?.paymentStatus === "FAILED" ? "bg-red-100 text-red-800" : noShowResult?.paymentStatus === "PROCESSING" ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-700")}>{noShowResult?.paymentStatus || "UNPAID"}</span></div>
                            <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>{noShowDecision === "ADJUSTED" ? "Adjusted no-show fee" : noShowDecision === "WAIVED" ? "No-show fee waived" : "60% of scheduled service price"}</dt><dd>${(chosenNoShowTotal / 100).toFixed(2)}</dd></div><div className="flex justify-between"><dt>Deposit already paid</dt><dd>− ${(chosenDepositCredit / 100).toFixed(2)}</dd></div><div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>Remaining balance</dt><dd>${(chosenCharge / 100).toFixed(2)}</dd></div></dl>
                            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">The deposit is included in the total no-show fee—it is not added on top.</p>
                        </section>

                        {!noShowResult && <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Fee decision</h3><div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border">{(["ACTIVE", "ADJUSTED", "WAIVED"] as const).map(decision => <button type="button" key={decision} disabled={decision !== "WAIVED" && !noShowPreview.automaticChargeAllowed} onClick={() => setNoShowDecision(decision)} className={cn("px-2 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40", noShowDecision === decision ? "bg-[#351d12] text-white" : "bg-white text-neutral-700 hover:bg-neutral-50")}>{decision.charAt(0) + decision.slice(1).toLowerCase()}</button>)}</div>{!noShowPreview.automaticChargeAllowed && <p className="mt-2 text-xs text-red-700">Automatic charging is unavailable. The appointment can still be recorded with the fee waived.</p>}{noShowDecision === "ADJUSTED" && <label className="mt-3 block text-xs font-medium">Adjusted total fee ($)<input inputMode="decimal" value={adjustedFee} onChange={event => setAdjustedFee(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="130.00" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"/></label>}</div><div className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Payment status</h3><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">● Unpaid</span><span className="rounded-lg border px-3 py-2 text-neutral-500">● Processing</span><span className="rounded-lg border px-3 py-2 text-neutral-500">● Paid</span><span className="rounded-lg border px-3 py-2 text-neutral-500">● Failed</span></div></div></section>}

                        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Saved {noShowPreview.paymentMethodBrand || "card"} ending in {noShowPreview.paymentMethodLast4 || "••••"}</p><p className="mt-1">{noShowPreview.consentRecordedAt ? `Customer off-session consent recorded ${formatDateTime(noShowPreview.consentRecordedAt)}.` : "Customer consent record is unavailable."}</p><p className="mt-2 font-medium">{noShowDecision === "WAIVED" ? "No card charge will be submitted." : `After confirmation, $${(chosenCharge / 100).toFixed(2)} will be submitted immediately.`}</p></section>

                        {noShowDecision !== "WAIVED" && noShowPreview.overdueConfirmationRequired && (!noShowResult || noShowResult.paymentStatus === "FAILED") && <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><input type="checkbox" className="mt-1" checked={confirmOverdue} onChange={event => setConfirmOverdue(event.target.checked)} /><span><b>Charge overdue—review required.</b> This is outside the normal 24-hour processing period. I confirmed the customer missed the appointment and no cancellation was received.</span></label>}

                        {noShowResult && <section className={cn("rounded-xl border p-5", noShowResult.paymentStatus === "PAID" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : noShowResult.paymentStatus === "FAILED" ? "border-red-300 bg-red-50 text-red-950" : "border-amber-300 bg-amber-50 text-amber-950")}><h3 className="text-lg font-semibold">{noShowResult.feeDecision === "WAIVED" ? "Fee waived" : noShowResult.paymentStatus === "PAID" ? "Charge successful" : noShowResult.paymentStatus === "FAILED" ? "Charge failed" : "Charge processing"}</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt>Amount {noShowResult.paymentStatus === "PAID" ? "charged" : "attempted"}</dt><dd>${(noShowResult.amountToChargeCents / 100).toFixed(2)}</dd></div><div className="flex justify-between"><dt>Booking restriction</dt><dd className="font-semibold">{noShowResult.bookingRestricted ? "Active" : "Removed"}</dd></div><div className="flex justify-between"><dt>Charge attempts</dt><dd>{noShowResult.chargeAttemptCount || 0}</dd></div></dl>{noShowResult.failureMessage && <p className="mt-4 rounded-lg bg-white/70 p-3 text-sm">{noShowResult.failureMessage}</p>}{noShowResult.paymentStatus === "PAID" && <p className="mt-4 text-sm">Receipt and no-show notice queued for email delivery.</p>}</section>}
                        <p className="text-xs text-neutral-500">Automatic charging closes {formatDateTime(noShowPreview.automaticChargeDeadlineAt)}.</p>
                    </div>}
                    {!(action.kind === "no-show" && noShowResult) && <label className="mt-4 block text-sm font-medium text-neutral-800">{
                        action.kind === "deny" ? "Denial reason (required)"
                            : action.kind === "cancel" ? "Cancellation reason (required)"
                                : action.kind === "complete" ? "Completion notes (optional)"
                                    : action.kind === "no-show" ? "Internal no-show note (optional)"
                                    : "Approval notes (optional)"
                    }<textarea autoFocus value={actionNotes} maxLength={500} rows={4} onChange={event => setActionNotes(event.target.value)} className="mt-2 w-full rounded-sm border border-neutral-300 p-3 font-normal outline-none focus:border-neutral-700 focus:ring-2 focus:ring-neutral-200" /></label>}
                    {!(action.kind === "no-show" && noShowResult) && <p className="text-right text-xs text-neutral-400">{actionNotes.length}/500</p>}
                    <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => { setAction(null); setNoShowResult(null); }}>{noShowResult ? "Close" : "Back"}</Button>{!(action.kind === "no-show" && noShowResult?.paymentStatus === "PAID") && !(action.kind === "no-show" && noShowResult?.paymentStatus === "PROCESSING") && <Button variant={action.kind === "deny" || action.kind === "cancel" || action.kind === "no-show" ? "destructive" : "default"} disabled={actionLoading === action.appointment.id || ((action.kind === "deny" || action.kind === "cancel") && !actionNotes.trim()) || (action.kind === "no-show" && noShowDecision !== "WAIVED" && Boolean(action.appointment.noShowFee?.overdueConfirmationRequired) && !confirmOverdue)} onClick={() => void submitAction()}>{actionLoading === action.appointment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{action.kind === "no-show" ? noShowResult?.paymentStatus === "FAILED" ? `Retry charge $${(noShowResult.amountToChargeCents / 100).toFixed(2)}` : noShowDecision === "WAIVED" ? "Mark no-show & waive fee" : `Mark no-show & charge $${(chosenCharge / 100).toFixed(2)}` : `Confirm ${action.kind}`}</Button>}</div>
                </section>
            </div>}
        </div>
    );
}

function AppointmentDialog({ appointment, formatDateTime, onClose, onApprove, onDeny }: { appointment: Appointment; formatDateTime: (value?: string) => string; onClose: () => void; onApprove?: () => void; onDeny?: () => void }) {
    const [events, setEvents] = useState<{ id: number; eventType: string; appointmentStatus: string; paymentStatus?: string; actorName?: string; reason?: string; createdAt: string }[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setEventsLoading(true);
            setEventsError("");
            try {
                const token = getAuthToken();
                const response = await fetch(`${API_BASE_URL}/api/appointments/${appointment.id}/events`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    cache: "no-store",
                    signal: controller.signal
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) throw new Error(body?.error || "Activity could not be loaded");
                setEvents(Array.isArray(body) ? body : []);
            } catch (error) {
                if (!controller.signal.aborted) setEventsError(error instanceof Error ? error.message : "Activity could not be loaded");
            } finally {
                if (!controller.signal.aborted) setEventsLoading(false);
            }
        };
        void load();
        return () => controller.abort();
    }, [appointment.id]);

    return <div className="fixed inset-0 z-40 flex justify-end bg-[#1e120d]/55 backdrop-blur-[2px]" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title" className="flex h-full w-full max-w-2xl flex-col bg-[#fcfaf8] shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e8ddd5] bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6d50]">Appointment #{appointment.id}</p><h2 id="appointment-detail-title" className="mt-1 text-2xl font-semibold text-[#241711]">{appointment.customer.firstName} {appointment.customer.lastName}</h2><p className="mt-1 flex items-center gap-2 text-sm text-neutral-600"><Calendar className="h-4 w-4 text-[#9a6d50]" />{formatDateTime(appointment.appointmentDateTime)}</p></div><button aria-label="Close details" onClick={onClose} className="rounded-full border border-[#e4d9d1] p-2 text-neutral-500 transition hover:bg-[#f6efea] hover:text-[#351d12]"><X className="h-5 w-5" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#e7ddd6] bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Status</p><p className="mt-2 font-semibold text-[#241711]">{appointment.status.replaceAll("_", " ")}</p></div>
                <div className="rounded-xl border border-[#e7ddd6] bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Payment</p><p className="mt-2 font-semibold text-[#241711]">{appointment.paymentStatus?.replaceAll("_", " ") || "Unknown"}</p></div>
                <div className="rounded-xl border border-[#e7ddd6] bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Deposit</p><p className="mt-2 font-semibold text-[#241711]">{appointment.depositAmount != null ? `$${Number(appointment.depositAmount).toFixed(2)}` : "—"}</p></div>
            </section>
            <section className="mt-5 rounded-2xl border border-[#e7ddd6] bg-white p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7a513b]">Service details</h3>
                <p className="mt-4 text-lg font-semibold text-[#241711]">{appointment.selectedService || appointment.service?.name || "Service not specified"}</p>
                <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-neutral-500">Starts</dt><dd className="mt-1 font-medium">{formatDateTime(appointment.appointmentDateTime)}</dd></div>
                    <div><dt className="text-neutral-500">Ends</dt><dd className="mt-1 font-medium">{formatDateTime(appointment.appointmentEndDateTime)}</dd></div>
                    <div><dt className="text-neutral-500">Size</dt><dd className="mt-1 font-medium">{appointment.selectedSize || "—"}</dd></div>
                    <div><dt className="text-neutral-500">Length</dt><dd className="mt-1 font-medium">{appointment.selectedLength || "—"}</dd></div>
                    <div><dt className="text-neutral-500">Foundation</dt><dd className="mt-1 font-medium">{appointment.selectedFoundation ? (appointment.selectedFoundation === "KNOTLESS" ? "Knotless" : "Regular") : "—"}</dd></div>
                    <div><dt className="text-neutral-500">Hair texture</dt><dd className="mt-1 font-medium">{appointment.selectedTexture || "—"}</dd></div>
                </dl>
            </section>
            <section className="mt-5 rounded-2xl border border-[#e7ddd6] bg-white p-5 text-sm"><div className="flex items-center justify-between gap-4"><h3 className="font-semibold text-[#241711]">Customer</h3><span className="rounded-full bg-[#f2e8e1] px-3 py-1 text-xs font-medium text-[#6b3d27]">{appointment.selfServiceChangeCount ?? 0} of 1 changes used</span></div><p className="mt-4 flex items-center gap-2"><User className="h-4 w-4 text-[#9a6d50]" />{appointment.customer.firstName} {appointment.customer.lastName}</p><a href={`mailto:${appointment.customer.email}`} className="mt-3 flex items-center gap-2 hover:underline"><Mail className="h-4 w-4 text-[#9a6d50]" />{appointment.customer.email}</a><a href={`tel:${appointment.customer.phoneNumber}`} className="mt-3 flex items-center gap-2 hover:underline"><Phone className="h-4 w-4 text-[#9a6d50]" />{appointment.customer.phoneNumber}</a>{appointment.lastSelfServiceChangeAt && <p className="mt-3 text-xs text-neutral-500">Last customer change: {formatDateTime(appointment.lastSelfServiceChangeAt)}</p>}</section>
            {appointment.rescheduledFromDateTime && <div className="mt-6 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><h3 className="font-semibold">Rescheduled by customer</h3><p className="mt-2">Previous: {formatDateTime(appointment.rescheduledFromDateTime)}</p><p>Current: {formatDateTime(appointment.appointmentDateTime)}</p></div>}
            {appointment.cancelledByCustomer && <div className="mt-6 border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900"><h3 className="font-semibold">Cancelled by customer</h3><p className="mt-2">Reason: {appointment.customerCancellationReason || "No reason provided"}</p></div>}
            {appointment.notes && <div className="mt-6 border-t pt-5 text-sm"><h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />Customer notes</h3><p className="mt-2 whitespace-pre-wrap text-neutral-700">{appointment.notes}</p></div>}
            {appointment.adminNotes && <div className="mt-6 border-t pt-5 text-sm"><h3 className="font-semibold">Admin notes</h3><p className="mt-2 whitespace-pre-wrap text-neutral-700">{appointment.adminNotes}</p></div>}
            <div className="mt-6 border-t pt-5 text-sm"><h3 className="font-semibold">Appointment activity</h3>{eventsLoading ? <p className="mt-3 flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Loading activity…</p> : eventsError ? <p className="mt-3 text-red-700">{eventsError}</p> : events.length === 0 ? <p className="mt-3 text-neutral-500">No activity recorded.</p> : <ol className="mt-4 space-y-4 border-l border-neutral-200 pl-5">{events.map(event => <li key={event.id} className="relative"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-neutral-700"/><p className="font-medium">{event.eventType.replaceAll("_", " ").toLowerCase().replace(/^./, value => value.toUpperCase())}</p><p className="text-xs text-neutral-500">{formatDateTime(event.createdAt)}{event.actorName ? ` · ${event.actorName}` : " · Customer/system"}</p>{event.reason && <p className="mt-1 whitespace-pre-wrap text-neutral-700">{event.reason}</p>}</li>)}</ol>}</div>
            </div>
            {(onApprove || onDeny) && <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ddd5] bg-white px-5 py-4 sm:px-7"><p className="flex items-center gap-2 text-xs text-neutral-500"><ShieldCheck className="h-4 w-4 text-emerald-700" />Actions use the current payment authorization.</p><div className="flex gap-2">{onDeny && <Button variant="outline" className="text-red-700" onClick={onDeny}>Deny request</Button>}{onApprove && <Button className="bg-[#351d12] hover:bg-[#4b2a1b]" onClick={onApprove}>Approve and capture deposit</Button>}</div></footer>}
        </aside>
    </div>;
}

export default memo(AppointmentManagement);
