"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    Bell,
    Calendar,
    Check,
    CreditCard,
    Loader2,
    MailWarning,
    X,
    XCircle,
} from "lucide-react";

type Appointment = {
    id: number;
    customer?: { firstName?: string; lastName?: string };
    styleName?: string;
    selectedService?: string;
    service?: { name?: string };
    appointmentDateTime: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
    paymentStatus?: string;
    depositAmount?: number;
    paymentAuthorizationExpiresAt?: string;
    notificationStatus?: string;
    cancelledByCustomer?: boolean;
    customerCancellationReason?: string;
    lastSelfServiceChangeAt?: string;
    rescheduledFromDateTime?: string;
};

type Notice = {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    actionLabel: string;
    icon: typeof Bell;
    tone: "neutral" | "success" | "warning" | "danger";
};

const READ_KEY = "admin_notification_read_ids";
const DISMISSED_KEY = "admin_notification_dismissed_ids";

const loadIds = (key: string) => {
    try {
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        return new Set<string>(Array.isArray(stored) ? stored : []);
    } catch {
        return new Set<string>();
    }
};

const saveIds = (key: string, values: Set<string>) => {
    localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-500)));
};

const person = (appointment: Appointment) =>
    [appointment.customer?.firstName, appointment.customer?.lastName].filter(Boolean).join(" ") || "A customer";

const style = (appointment: Appointment) =>
    appointment.styleName || appointment.selectedService || appointment.service?.name || "a service";

const money = (cents?: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);

const relativeTime = (value: string) => {
    const milliseconds = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return "Just now";
    const minutes = Math.floor(milliseconds / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const noticeTone = {
    neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
    danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
} as const;

function noticesFromAppointments(appointments: Appointment[]): Notice[] {
    const notices: Notice[] = [];
    const now = Date.now();

    appointments.forEach((appointment) => {
        const created = appointment.createdAt || appointment.updatedAt || appointment.appointmentDateTime;
        const updated = appointment.updatedAt || created;
        const appointmentLabel = new Date(appointment.appointmentDateTime).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });

        if (appointment.status === "PENDING") {
            notices.push({
                id: `request-${appointment.id}`,
                title: "New appointment request",
                description: `${person(appointment)} requested ${style(appointment)} for ${appointmentLabel}.`,
                timestamp: created,
                actionLabel: "Review request",
                icon: Calendar,
                tone: "neutral",
            });
        }

        if (appointment.paymentStatus === "AUTHORIZED") {
            notices.push({
                id: `authorized-${appointment.id}`,
                title: "Payment authorized",
                description: `${person(appointment)} authorized ${money(appointment.depositAmount)} for ${style(appointment)}.`,
                timestamp: updated,
                actionLabel: "Review and approve",
                icon: CreditCard,
                tone: "success",
            });
        }

        const authorizationExpired = appointment.paymentAuthorizationExpiresAt
            && new Date(appointment.paymentAuthorizationExpiresAt).getTime() < now
            && appointment.paymentStatus === "AUTHORIZED";
        if (["FAILED", "PAYMENT_FAILED", "EXPIRED"].includes(appointment.paymentStatus || "") || authorizationExpired) {
            notices.push({
                id: `payment-issue-${appointment.id}`,
                title: authorizationExpired ? "Payment authorization expired" : "Payment problem",
                description: `${person(appointment)}’s payment for ${style(appointment)} needs attention.`,
                timestamp: updated,
                actionLabel: "Review payment",
                icon: AlertCircle,
                tone: "warning",
            });
        }

        if (appointment.status === "CANCELLED" || appointment.status === "DENIED") {
            notices.push({
                id: `cancelled-${appointment.id}-${appointment.lastSelfServiceChangeAt || updated}`,
                title: appointment.status === "DENIED" ? "Appointment request denied" : appointment.cancelledByCustomer ? "Customer cancelled appointment" : "Appointment cancelled",
                description: appointment.cancelledByCustomer
                    ? `${person(appointment)} cancelled ${style(appointment)}${appointment.customerCancellationReason ? `: ${appointment.customerCancellationReason}` : "."}`
                    : `${person(appointment)} · ${style(appointment)} · ${appointmentLabel}.`,
                timestamp: appointment.lastSelfServiceChangeAt || updated,
                actionLabel: "View appointment",
                icon: XCircle,
                tone: "danger",
            });
        }

        if (appointment.rescheduledFromDateTime && !appointment.cancelledByCustomer && appointment.lastSelfServiceChangeAt) {
            const previousLabel = new Date(appointment.rescheduledFromDateTime).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
            });
            notices.push({
                id: `rescheduled-${appointment.id}-${appointment.lastSelfServiceChangeAt}`,
                title: "Customer rescheduled appointment",
                description: `${person(appointment)} moved ${style(appointment)} from ${previousLabel} to ${appointmentLabel}.`,
                timestamp: appointment.lastSelfServiceChangeAt,
                actionLabel: "View appointment",
                icon: Calendar,
                tone: "neutral",
            });
        }

        if (appointment.notificationStatus === "FAILED") {
            notices.push({
                id: `delivery-failed-${appointment.id}`,
                title: "Customer notification failed",
                description: `The latest update could not be delivered to ${person(appointment)}.`,
                timestamp: updated,
                actionLabel: "Review appointment",
                icon: MailWarning,
                tone: "warning",
            });
        }
    });

    return notices.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export function NotificationBell({ token, onNavigate }: { token: string; onNavigate: (section: string) => void }) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setReadIds(loadIds(READ_KEY));
        setDismissedIds(loadIds(DISMISSED_KEY));
    }, []);

    const loadNotifications = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/appointments", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) throw new Error(body?.error || "Notifications could not be loaded.");
            setAppointments(Array.isArray(body) ? body : body?.content ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Notifications could not be loaded.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadNotifications();
        const refresh = () => { if (document.visibilityState === "visible") void loadNotifications(true); };
        const interval = window.setInterval(refresh, 15_000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [loadNotifications]);

    useEffect(() => {
        if (!open) return;
        const handlePointer = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handlePointer);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handlePointer);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    const notices = useMemo(
        () => noticesFromAppointments(appointments).filter((notice) => !dismissedIds.has(notice.id)),
        [appointments, dismissedIds],
    );
    const unreadCount = notices.filter((notice) => !readIds.has(notice.id)).length;
    const visible = notices.filter((notice) => filter === "all" || !readIds.has(notice.id)).slice(0, 10);

    const updateRead = (next: Set<string>) => {
        setReadIds(next);
        saveIds(READ_KEY, next);
    };

    const openNotice = (notice: Notice) => {
        const next = new Set(readIds);
        next.add(notice.id);
        updateRead(next);
        setOpen(false);
        onNavigate("bookings");
    };

    const dismiss = (notice: Notice) => {
        const next = new Set(dismissedIds);
        next.add(notice.id);
        setDismissedIds(next);
        saveIds(DISMISSED_KEY, next);
    };

    const markAllRead = () => {
        const next = new Set(readIds);
        notices.forEach((notice) => next.add(notice.id));
        updateRead(next);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`Notifications, ${unreadCount} unread`}
                className="relative flex h-10 w-10 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <section role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
                    <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                        <div>
                            <h2 className="font-semibold text-neutral-900 dark:text-white">Notifications</h2>
                            <p className="text-xs text-neutral-500">{unreadCount} unread</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700">Mark all read</button>}
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:hover:bg-neutral-700"><X className="h-4 w-4" /></button>
                        </div>
                    </header>

                    <div className="flex gap-1 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700" role="tablist" aria-label="Notification filters">
                        {(["all", "unread"] as const).map((value) => (
                            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${filter === value ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"}`}>{value}</button>
                        ))}
                    </div>

                    <div className="max-h-[min(520px,calc(100dvh-13rem))] overflow-y-auto">
                        {loading ? (
                            <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Loading notifications…</div>
                        ) : error ? (
                            <div role="alert" className="px-5 py-10 text-center"><AlertCircle className="mx-auto h-6 w-6 text-red-500" /><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{error}</p><button type="button" onClick={() => void loadNotifications()} className="mt-3 text-sm font-semibold underline underline-offset-4">Retry</button></div>
                        ) : visible.length === 0 ? (
                            <div className="px-5 py-12 text-center"><Check className="mx-auto h-7 w-7 text-neutral-300" /><p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">{filter === "unread" ? "You’re all caught up" : "No notifications"}</p><p className="mt-1 text-xs text-neutral-500">{filter === "unread" ? "There are no unread notifications." : "Important appointment updates will appear here."}</p></div>
                        ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {visible.map((notice) => {
                                    const Icon = notice.icon;
                                    const unread = !readIds.has(notice.id);
                                    return (
                                        <li key={notice.id} className={`group relative flex gap-3 p-4 ${unread ? "bg-neutral-50 dark:bg-neutral-900/40" : ""}`}>
                                            <button type="button" onClick={() => openNotice(notice)} className="flex min-w-0 flex-1 gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900">
                                                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${noticeTone[notice.tone]}`}><Icon className="h-4 w-4" /></span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{notice.title}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}</span>
                                                    <span className="mt-1 block text-xs leading-5 text-neutral-600 dark:text-neutral-300">{notice.description}</span>
                                                    <span className="mt-2 flex items-center gap-2 text-xs"><span className="font-medium text-neutral-800 dark:text-neutral-100">{notice.actionLabel}</span><span className="text-neutral-400">·</span><time dateTime={notice.timestamp} className="text-neutral-500">{relativeTime(notice.timestamp)}</time></span>
                                                </span>
                                            </button>
                                            <button type="button" onClick={() => dismiss(notice)} aria-label={`Dismiss ${notice.title}`} className="h-7 w-7 shrink-0 rounded p-1.5 text-neutral-400 opacity-100 hover:bg-neutral-200 hover:text-neutral-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-white"><X className="h-4 w-4" /></button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <footer className="border-t border-neutral-200 p-3 dark:border-neutral-700">
                        <button type="button" onClick={() => { setOpen(false); onNavigate("bookings"); }} className="w-full rounded-md py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-700">View all appointments</button>
                    </footer>
                </section>
            )}
        </div>
    );
}
