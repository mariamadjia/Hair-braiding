"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronRight, Loader2, Mail, Phone, RefreshCw, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken, removeAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

interface Customer {
    id: number; firstName: string; lastName: string; email: string; phoneNumber: string;
    lastAppointmentDate: string | null; nextAppointmentDate: string | null;
    totalAppointments: number; completedVisits: number; totalSpent: number;
}

export type CustomerListState = {
    query: string;
    segment: "ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "NO_UPCOMING";
    sort: "NAME_ASC" | "NAME_DESC" | "LAST_VISIT" | "NEXT_APPOINTMENT" | "VALUE" | "APPOINTMENTS";
    page: number;
};

interface Props {
    onViewDetails: (customerId: number) => void;
    state: CustomerListState;
    onStateChange: (state: CustomerListState) => void;
}

function CustomerTable({ onViewDetails, state, onStateChange }: Props) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const setState = (patch: Partial<CustomerListState>) => onStateChange({ ...state, ...patch });

    const fetchCustomers = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Your session has expired. Please log in again.");
            const params = new URLSearchParams({ page: String(state.page), size: "20", query: state.query.trim(), segment: state.segment, sort: state.sort });
            const response = await fetch(`${API_BASE_URL}/api/customers?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) { removeAuthToken(); throw new Error("Your session has expired. Please log in again."); }
                throw new Error(body.error || "Failed to load customers");
            }
            setCustomers(body.content ?? []); setTotalPages(body.totalPages ?? 0); setTotalElements(body.totalElements ?? 0); setLastUpdated(new Date());
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to load customers"); }
        finally { setLoading(false); }
    }, [state.page, state.query, state.segment, state.sort]);

    useEffect(() => { const timer = window.setTimeout(() => void fetchCustomers(), state.query ? 300 : 0); return () => window.clearTimeout(timer); }, [fetchCustomers, state.query]);

    const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    const CustomerCard = ({ customer }: { customer: Customer }) => <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold text-neutral-900 dark:text-white">{customer.firstName} {customer.lastName}</h2><a href={`mailto:${customer.email}`} className="mt-1 flex items-center gap-1.5 truncate text-sm text-neutral-600 hover:underline dark:text-neutral-300"><Mail className="h-3.5 w-3.5 shrink-0" />{customer.email}</a><a href={`tel:${customer.phoneNumber}`} className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600 hover:underline dark:text-neutral-300"><Phone className="h-3.5 w-3.5" />{customer.phoneNumber}</a></div><Button variant="outline" size="sm" onClick={() => onViewDetails(customer.id)}>View <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-700"><div><dt className="text-neutral-500">Next appointment</dt><dd className="font-medium text-neutral-900 dark:text-white">{date(customer.nextAppointmentDate)}</dd></div><div><dt className="text-neutral-500">Last visit</dt><dd className="font-medium text-neutral-900 dark:text-white">{date(customer.lastAppointmentDate)}</dd></div><div><dt className="text-neutral-500">Requests / visits</dt><dd className="font-medium text-neutral-900 dark:text-white">{customer.totalAppointments} / {customer.completedVisits}</dd></div><div><dt className="text-neutral-500">Captured deposits</dt><dd className="font-medium text-neutral-900 dark:text-white">{money(customer.totalSpent)}</dd></div></dl>
    </article>;

    return <section className="mx-auto max-w-7xl space-y-5" aria-labelledby="customers-title">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 id="customers-title" className="text-2xl font-semibold text-neutral-900 dark:text-white">Customers</h1><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Search customer history and captured payment activity</p>{lastUpdated && <p className="mt-1 text-xs text-neutral-400">Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}</div><Button variant="outline" size="sm" onClick={() => void fetchCustomers()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_200px_220px]">
            <label className="relative"><span className="sr-only">Search all customers</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={state.query} onChange={event => setState({ query: event.target.value, page: 0 })} placeholder="Search all customers by name, email, or phone" className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" /></label>
            <label><span className="sr-only">Filter customers</span><select value={state.segment} onChange={event => setState({ segment: event.target.value as CustomerListState["segment"], page: 0 })} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"><option value="ALL">All customers</option><option value="UPCOMING">Has upcoming</option><option value="COMPLETED">Completed visits</option><option value="CANCELLED">Cancelled or denied</option><option value="NO_UPCOMING">No upcoming</option></select></label>
            <label><span className="sr-only">Sort customers</span><select value={state.sort} onChange={event => setState({ sort: event.target.value as CustomerListState["sort"], page: 0 })} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"><option value="NAME_ASC">Name A–Z</option><option value="NAME_DESC">Name Z–A</option><option value="NEXT_APPOINTMENT">Next appointment</option><option value="LAST_VISIT">Most recent visit</option><option value="VALUE">Captured deposits</option><option value="APPOINTMENTS">Most requests</option></select></label>
        </div>

        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void fetchCustomers()}>Retry</Button></div>}
        {loading ? <div role="status" className="flex justify-center gap-2 py-16 text-neutral-500"><Loader2 className="h-6 w-6 animate-spin" />Loading customers…</div> : !error && customers.length === 0 ? <div className="py-16 text-center text-neutral-500"><Users className="mx-auto mb-3 h-10 w-10 text-neutral-300" /><p>No customers match these filters.</p></div> : !error && <>
            <div className="space-y-3 md:hidden">{customers.map(customer => <CustomerCard key={customer.id} customer={customer} />)}</div>
            <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 md:block"><table className="w-full min-w-[980px]"><thead><tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Next appointment</th><th className="px-4 py-3">Last visit</th><th className="px-4 py-3">Requests / visits</th><th className="px-4 py-3">Captured deposits</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">{customers.map(customer => <tr key={customer.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"><td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{customer.firstName} {customer.lastName}</td><td className="px-4 py-3 text-sm"><a href={`mailto:${customer.email}`} className="block text-neutral-700 hover:underline dark:text-neutral-200">{customer.email}</a><a href={`tel:${customer.phoneNumber}`} className="block text-neutral-500 hover:underline dark:text-neutral-400">{customer.phoneNumber}</a></td><td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">{date(customer.nextAppointmentDate)}</td><td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">{date(customer.lastAppointmentDate)}</td><td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">{customer.totalAppointments} / {customer.completedVisits}</td><td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">{money(customer.totalSpent)}</td><td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => onViewDetails(customer.id)}>View</Button></td></tr>)}</tbody></table></div>
        </>}

        {!loading && !error && <footer className="flex flex-col gap-3 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between"><p>{totalElements} customer{totalElements === 1 ? "" : "s"}{totalPages > 0 ? ` · Page ${state.page + 1} of ${totalPages}` : ""}</p>{totalPages > 1 && <nav aria-label="Customer pages" className="flex gap-2"><Button variant="outline" size="sm" disabled={state.page === 0} onClick={() => setState({ page: Math.max(0, state.page - 1) })}>Previous</Button><Button variant="outline" size="sm" disabled={state.page >= totalPages - 1} onClick={() => setState({ page: Math.min(totalPages - 1, state.page + 1) })}>Next</Button></nav>}</footer>}
    </section>;
}

export default memo(CustomerTable);
