"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, Mail, MessageSquare, RefreshCw, Server, WalletCards } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type Status = { checkedAt: string; application: string; database: string; stripe: boolean; email: boolean; sms: boolean; pendingNotifications: number; failedNotifications: number };
type Notification = { id: number; appointmentId: number; customerName: string; channel: "EMAIL" | "SMS"; recipient: string; subject?: string; status: string; attempts: number; lastError?: string; createdAt: string; updatedAt: string };
type Page = { content: Notification[]; totalElements: number; totalPages: number; number: number };

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value.replace(/Z$/, "")}Z`));

export default function NotificationAdmin() {
  const [system, setSystem] = useState<Status | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [status, setStatus] = useState("ALL");
  const [channel, setChannel] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const headers = () => { const token = getAuthToken(); return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; };
  const read = async <T,>(response: Response): Promise<T> => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || body.message || "Request failed"); return body as T; };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ status, channel, query: query.trim(), page: String(page), size: "25" });
      const [health, notifications] = await Promise.all([
        read<Status>(await fetch(`${API_BASE_URL}/api/admin/system-status`, { headers: headers(), cache: "no-store" })),
        read<Page>(await fetch(`${API_BASE_URL}/api/admin/notifications?${params}`, { headers: headers(), cache: "no-store" })),
      ]);
      setSystem(health); setItems(notifications.content); setTotalPages(notifications.totalPages); setTotal(notifications.totalElements);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Admin status could not be loaded"); }
    finally { setLoading(false); }
  }, [channel, page, query, status]);
  useEffect(() => { void load(); }, [load]);

  const retry = async (id: number) => {
    setRetrying(id); setError("");
    try { await read(await fetch(`${API_BASE_URL}/api/admin/notifications/${id}/retry`, { method: "POST", headers: headers() })); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Notification could not be retried"); }
    finally { setRetrying(null); }
  };

  const services = system ? [
    ["Application", system.application === "AVAILABLE", Server],
    ["Database", system.database === "AVAILABLE", Database],
    ["Stripe", system.stripe, WalletCards],
    ["Email", system.email, Mail],
    ["SMS", system.sms, MessageSquare],
  ] as const : [];

  return <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-semibold">System &amp; notifications</h2><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Monitor service configuration and recover failed customer messages.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh</Button></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <section aria-label="System status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{services.map(([label, available, Icon]) => <div key={label} className="rounded-2xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-neutral-500"/>{available ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : <AlertTriangle className="h-5 w-5 text-amber-600"/>}</div><p className="mt-4 font-semibold">{label}</p><p className={`text-xs font-medium ${available ? "text-emerald-700" : "text-amber-700"}`}>{available ? "Available / configured" : "Unavailable / not configured"}</p></div>)}</section>
    {system && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><b>{system.pendingNotifications}</b> notifications waiting</div><div className="rounded-xl border border-red-200 bg-red-50 p-4"><b>{system.failedNotifications}</b> failed notifications</div></div>}
    <section className="rounded-2xl border bg-white dark:border-neutral-700 dark:bg-neutral-800"><div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px]"><input aria-label="Search notifications" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search customer or recipient" className="h-11 rounded-xl border px-3"/><select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className="h-11 rounded-xl border px-3"><option value="ALL">All statuses</option><option value="FAILED">Failed</option><option value="PENDING">Pending</option><option value="PROCESSING">Processing</option><option value="SENT">Sent</option></select><select value={channel} onChange={event => { setChannel(event.target.value); setPage(0); }} className="h-11 rounded-xl border px-3"><option value="ALL">Email and SMS</option><option value="EMAIL">Email</option><option value="SMS">SMS</option></select></div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin"/></div> : items.length === 0 ? <p className="p-10 text-center text-sm text-neutral-500">No notifications match these filters.</p> : <div className="divide-y">{items.map(item => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_170px_auto] lg:items-center"><div><p className="font-semibold">{item.customerName}</p><p className="text-xs text-neutral-500">Appointment #{item.appointmentId} · {formatDate(item.createdAt)}</p></div><div className="min-w-0"><p className="truncate text-sm">{item.channel === "EMAIL" ? item.subject || "Email" : "Text message"}</p><p className="truncate text-xs text-neutral-500">{item.recipient}</p>{item.lastError && <p className="mt-1 text-xs text-red-700">{item.lastError}</p>}</div><div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "SENT" ? "bg-emerald-100 text-emerald-800" : item.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{item.status}</span><p className="mt-1 text-xs text-neutral-500">{item.attempts} attempt{item.attempts === 1 ? "" : "s"}</p></div>{item.status !== "SENT" && <Button variant="outline" disabled={retrying === item.id} onClick={() => void retry(item.id)}>{retrying === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Retry</Button>}</article>)}</div>}
      <footer className="flex items-center justify-between border-t p-4 text-sm"><span>{total} notifications</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(value => value + 1)}>Next</Button></div></footer>
    </section>
  </main>;
}
