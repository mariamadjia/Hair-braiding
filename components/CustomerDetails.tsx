"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, Mail, Phone, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken, removeAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

interface Appointment {
    id: number; serviceName: string; appointmentDateTime: string; appointmentEndDateTime: string | null;
    durationMinutes: number | null; status: string; paymentStatus: string | null; amountPaid: number;
}
interface CustomerDetail {
    id: number; firstName: string; lastName: string; email: string; phoneNumber: string;
    firstAppointmentDate: string | null; lastAppointmentDate: string | null; nextAppointmentDate: string | null;
    totalAppointments: number; completedVisits: number; upcomingAppointments: number;
    totalSpent: number; averageAppointmentValue: number; appointments: Appointment[];
    appointmentPage: number; appointmentTotalPages: number; appointmentTotalElements: number; notes: string | null;
}

function CustomerDetails({ customerId, onBack }: { customerId: number; onBack: () => void }) {
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState("ALL");

    const fetchDetails = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Your session has expired. Please log in again.");
            const params = new URLSearchParams({ appointmentPage: String(page), appointmentSize: "10", appointmentStatus: status });
            const response = await fetch(`${API_BASE_URL}/api/customers/${customerId}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) { removeAuthToken(); throw new Error("Your session has expired. Please log in again."); }
                throw new Error(body.error || (response.status === 404 ? "Customer not found" : "Failed to load customer details"));
            }
            setCustomer(body);
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to load customer details"); }
        finally { setLoading(false); }
    }, [customerId, page, status]);

    useEffect(() => { void fetchDetails(); }, [fetchDetails]);

    const date = (value: string | null, withTime = false) => value ? new Date(value).toLocaleString("en-US", withTime ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" } : { month: "short", day: "numeric", year: "numeric" }) : "—";
    const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    const statusClass = (value: string) => ({ APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", DENIED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", CANCELLED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200", COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" }[value] ?? "bg-neutral-100 text-neutral-700");

    if (loading && !customer) return <div role="status" className="flex justify-center gap-2 py-16 text-neutral-500"><Loader2 className="h-6 w-6 animate-spin" />Loading customer details…</div>;
    if (error && !customer) return <div className="space-y-4"><Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to customers</Button><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void fetchDetails()}>Retry</Button></div></div>;
    if (!customer) return null;

    return <section className="mx-auto max-w-6xl space-y-6" aria-labelledby="customer-name">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to customers</Button><h1 id="customer-name" className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">{customer.firstName} {customer.lastName}</h1><p className="mt-1 text-sm text-neutral-500">Customer #{customer.id}</p></div><Button variant="outline" size="sm" disabled={loading} onClick={() => void fetchDetails()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>
        {error && <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"><h2 className="font-semibold text-neutral-900 dark:text-white">Contact information</h2><a href={`mailto:${customer.email}`} className="mt-4 flex items-center gap-2 break-all text-sm text-neutral-700 hover:underline dark:text-neutral-200"><Mail className="h-4 w-4 shrink-0" />{customer.email}</a><a href={`tel:${customer.phoneNumber}`} className="mt-3 flex items-center gap-2 text-sm text-neutral-700 hover:underline dark:text-neutral-200"><Phone className="h-4 w-4" />{customer.phoneNumber}</a></article>
            <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"><h2 className="font-semibold text-neutral-900 dark:text-white">Customer activity</h2><dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3"><Metric label="Total requests" value={String(customer.totalAppointments)} /><Metric label="Completed visits" value={String(customer.completedVisits)} /><Metric label="Upcoming" value={String(customer.upcomingAppointments)} /><Metric label="Captured deposits" value={money(customer.totalSpent)} /><Metric label="Average captured deposit" value={money(customer.averageAppointmentValue)} /><Metric label="Last completed visit" value={date(customer.lastAppointmentDate)} /></dl>{customer.nextAppointmentDate && <div className="mt-5 flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"><CalendarClock className="h-4 w-4" /><b>Next appointment:</b> {date(customer.nextAppointmentDate, true)}</div>}</article>
        </div>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Appointment history</h2><p className="text-sm text-neutral-500">{customer.appointmentTotalElements} matching appointment{customer.appointmentTotalElements === 1 ? "" : "s"}</p></div><label><span className="sr-only">Filter appointment history</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="COMPLETED">Completed</option><option value="DENIED">Denied</option><option value="CANCELLED">Cancelled</option></select></label></div>
            {loading ? <div role="status" className="flex justify-center gap-2 py-12 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" />Loading history…</div> : customer.appointments.length === 0 ? <p className="py-12 text-center text-sm text-neutral-500">No appointments match this filter.</p> : <div className="mt-5 space-y-3">{customer.appointments.map(appointment => <div key={appointment.id} className="flex flex-col gap-3 rounded-md bg-neutral-50 p-4 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-neutral-900 dark:text-white">{appointment.serviceName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(appointment.status)}`}>{appointment.status}</span></div><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{date(appointment.appointmentDateTime, true)}</p><p className="mt-1 text-xs text-neutral-400">Appointment #{appointment.id}</p></div><div className="sm:text-right"><p className="text-xs uppercase tracking-wide text-neutral-500">{appointment.paymentStatus?.replaceAll("_", " ") || "Payment unknown"}</p><p className="mt-1 font-semibold text-neutral-900 dark:text-white">Paid: {money(appointment.amountPaid)}</p></div></div>)}</div>}
            {customer.appointmentTotalPages > 1 && <nav aria-label="Customer appointment history pages" className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700"><p className="text-sm text-neutral-500">Page {customer.appointmentPage + 1} of {customer.appointmentTotalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(value => Math.max(0, value - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page >= customer.appointmentTotalPages - 1 || loading} onClick={() => setPage(value => Math.min(customer.appointmentTotalPages - 1, value + 1))}>Next</Button></div></nav>}
        </article>
    </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">{value}</dd></div>; }

export default memo(CustomerDetails);
