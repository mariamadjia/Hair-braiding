"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Server,
  WalletCards,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type Status = {
  checkedAt: string;
  application: string;
  database: string;
  stripe: boolean;
  email: boolean;
  sms: boolean;
  pendingNotifications: number;
  failedNotifications: number;
};
type Notification = {
  id: number;
  appointmentId: number;
  customerId: number;
  customerName: string;
  serviceName?: string;
  appointmentDateTime: string;
  channel: "EMAIL" | "SMS";
  recipient: string;
  subject?: string;
  body: string;
  status: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
type Page = {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${value.replace(/Z$/, "")}Z`));

export default function NotificationAdmin({
  compactHeader = false,
}: {
  compactHeader?: boolean;
}) {
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");
  const headers = () => {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };
  const read = async <T,>(response: Response): Promise<T> => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error || body.message || "Request failed");
    return body as T;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status,
        channel,
        query: query.trim(),
        page: String(page),
        size: "100",
      });
      const [health, notifications] = await Promise.all([
        read<Status>(
          await fetch(`${API_BASE_URL}/api/admin/system-status`, {
            headers: headers(),
            cache: "no-store",
          }),
        ),
        read<Page>(
          await fetch(`${API_BASE_URL}/api/admin/notifications?${params}`, {
            headers: headers(),
            cache: "no-store",
          }),
        ),
      ]);
      setSystem(health);
      setItems(notifications.content);
      setTotalPages(notifications.totalPages);
      setTotal(notifications.totalElements);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Admin status could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, [channel, page, query, status]);
  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (id: number) => {
    setRetrying(id);
    setError("");
    try {
      await read(
        await fetch(`${API_BASE_URL}/api/admin/notifications/${id}/retry`, {
          method: "POST",
          headers: headers(),
        }),
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Notification could not be retried",
      );
    } finally {
      setRetrying(null);
    }
  };

  const downloadEmailPdf = (message: Notification) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Your browser blocked the PDF window. Allow pop-ups and try again.");
      return;
    }

    const safeName = `${message.customerName}-${message.subject || "email"}`
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(message.body);
    printWindow.document.close();
    printWindow.document.title = safeName || `email-${message.id}`;

    const print = () => {
      printWindow.focus();
      printWindow.print();
    };
    if (printWindow.document.readyState === "complete") {
      window.setTimeout(print, 250);
    } else {
      printWindow.addEventListener("load", () => window.setTimeout(print, 250), {
        once: true,
      });
    }
  };

  const services = system
    ? ([
        ["Application", system.application === "AVAILABLE", Server],
        ["Database", system.database === "AVAILABLE", Database],
        ["Stripe", system.stripe, WalletCards],
        ["Email", system.email, Mail],
        ["SMS", system.sms, MessageSquare],
      ] as const)
    : [];

  const customers = useMemo(() => {
    const groups = new Map<number, Notification[]>();
    items.forEach((item) =>
      groups.set(item.customerId, [
        ...(groups.get(item.customerId) ?? []),
        item,
      ]),
    );
    return Array.from(groups.entries()).map(([customerId, messages]) => ({
      customerId,
      messages,
    }));
  }, [items]);
  const selectedCustomer =
    customers.find((group) => group.customerId === selectedCustomerId) ?? null;
  const selectedMessage =
    selectedCustomer?.messages.find((item) => item.id === selectedMessageId) ??
    selectedCustomer?.messages[0] ??
    null;

  const openCustomer = (group: {
    customerId: number;
    messages: Notification[];
  }) => {
    setSelectedCustomerId(group.customerId);
    setSelectedMessageId(group.messages[0]?.id ?? null);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {!compactHeader && (
            <>
              <h2 className="text-2xl font-semibold">
                System &amp; notifications
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Monitor service configuration and recover failed customer
                messages.
              </p>
            </>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <section
        aria-label="System status"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {services.map(([label, available, Icon]) => (
          <div
            key={label}
            className="rounded-2xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-neutral-500" />
              {available ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <p className="mt-4 font-semibold">{label}</p>
            <p
              className={`text-xs font-medium ${available ? "text-emerald-700" : "text-amber-700"}`}
            >
              {available
                ? "Available / configured"
                : "Unavailable / not configured"}
            </p>
          </div>
        ))}
      </section>
      {system && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <b>{system.pendingNotifications}</b> notifications waiting
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <b>{system.failedNotifications}</b> failed notifications
          </div>
        </div>
      )}
      <section className="rounded-2xl border bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px]">
          <input
            aria-label="Search notifications"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search customer or recipient"
            className="h-11 rounded-xl border px-3"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            className="h-11 rounded-xl border px-3"
          >
            <option value="ALL">All statuses</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SENT">Sent</option>
          </select>
          <select
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setPage(0);
            }}
            className="h-11 rounded-xl border px-3"
          >
            <option value="ALL">Email and SMS</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">
            No notifications match these filters.
          </p>
        ) : (
          <div className="divide-y">
            {customers.map((group) => {
              const latest = group.messages[0];
              const sent = group.messages.filter(item => item.status === "SENT").length;
              const failed = group.messages.filter(item => item.status === "FAILED").length;
              const appointments = new Set(group.messages.map(item => item.appointmentId)).size;
              const email = group.messages.find(item => item.channel === "EMAIL")?.recipient;
              const phone = group.messages.find(item => item.channel === "SMS")?.recipient;
              return (
              <article
                key={group.customerId}
                className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_190px_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold">{latest.customerName}</p>
                  <p className="text-xs text-neutral-500">
                    {appointments} appointment{appointments === 1 ? "" : "s"} · {group.messages.length} message{group.messages.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="min-w-0">
                  {email && <p className="truncate text-sm">{email}</p>}
                  {phone && <p className="truncate text-xs text-neutral-500">{phone}</p>}
                  <p className="mt-1 truncate text-xs text-neutral-500">Latest: {formatDate(latest.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {sent > 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{sent} sent</span>}
                  {failed > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">{failed} failed</span>}
                  {group.messages.length - sent - failed > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{group.messages.length - sent - failed} pending</span>}
                </div>
                <Button variant="outline" onClick={() => openCustomer(group)}><Eye className="mr-2 h-4 w-4" />View messages</Button>
              </article>
              );
            })}
          </div>
        )}
        <footer className="flex items-center justify-between border-t p-4 text-sm">
          <span>{customers.length} customer{customers.length === 1 ? "" : "s"} · {total} notifications</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </footer>
      </section>
      {selectedCustomer && selectedMessage && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label={`Messages for ${selectedMessage.customerName}`}>
          <button className="absolute inset-0 cursor-default" aria-label="Close message history" onClick={() => setSelectedCustomerId(null)} />
          <section className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-900">
            <header className="flex items-start justify-between border-b p-5 sm:p-6 dark:border-neutral-700">
              <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9A5A3A]">Delivery history</p><h3 className="mt-1 font-serif text-3xl">{selectedMessage.customerName}</h3><p className="mt-1 text-sm text-neutral-500">{selectedCustomer.messages.length} saved message{selectedCustomer.messages.length === 1 ? "" : "s"}</p></div>
              <Button variant="outline" size="icon" onClick={() => setSelectedCustomerId(null)} aria-label="Close"><X className="h-5 w-5" /></Button>
            </header>
            <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="overflow-y-auto border-b bg-neutral-50 p-3 md:border-b-0 md:border-r dark:border-neutral-700 dark:bg-neutral-950">
                {selectedCustomer.messages.map(item => (
                  <button key={item.id} type="button" onClick={() => setSelectedMessageId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left transition ${selectedMessage.id === item.id ? "border-[#9A5A3A] bg-white shadow-sm dark:bg-neutral-800" : "border-transparent hover:bg-white dark:hover:bg-neutral-800"}`}>
                    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold">{item.channel === "EMAIL" ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}{item.channel === "EMAIL" ? "Email" : "SMS"}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === "SENT" ? "bg-emerald-100 text-emerald-800" : item.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{item.status}</span></div>
                    <p className="mt-2 line-clamp-2 text-sm">{item.subject || item.body}</p>
                    <p className="mt-2 text-xs text-neutral-500">Appointment #{item.appointmentId} · {formatDate(item.createdAt)}</p>
                  </button>
                ))}
              </aside>
              <div className="min-w-0 overflow-y-auto p-5 sm:p-7">
                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-700">
                  <div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedMessage.status === "SENT" ? "bg-emerald-100 text-emerald-800" : selectedMessage.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{selectedMessage.status}</span><span className="text-sm text-neutral-500">{selectedMessage.attempts} attempt{selectedMessage.attempts === 1 ? "" : "s"}</span></div><h4 className="mt-3 text-xl font-semibold">{selectedMessage.subject || "Text message"}</h4><p className="mt-1 text-sm text-neutral-500">To {selectedMessage.recipient}</p><p className="mt-1 text-xs text-neutral-500">{selectedMessage.serviceName || "Appointment"} · {formatDate(selectedMessage.appointmentDateTime)}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {selectedMessage.channel === "EMAIL" && (
                      <Button variant="outline" onClick={() => downloadEmailPdf(selectedMessage)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    )}
                    {selectedMessage.status !== "SENT" && <Button variant="outline" disabled={retrying === selectedMessage.id} onClick={() => void retry(selectedMessage.id)}>{retrying === selectedMessage.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Retry</Button>}
                  </div>
                </div>
                {selectedMessage.lastError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><b>Delivery error</b><p className="mt-1">{selectedMessage.lastError}</p></div>}
                <div className="mt-6"><p className="mb-2 text-sm font-semibold">Message sent</p>{selectedMessage.channel === "EMAIL" ? <iframe title="Email content" sandbox="" srcDoc={selectedMessage.body} className="min-h-[560px] w-full rounded-xl border bg-white" /> : <div className="max-w-lg rounded-[2rem] border-8 border-neutral-900 bg-neutral-100 p-4"><p className="mb-3 text-center text-xs text-neutral-500">AH Braiding</p><div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white p-4 text-sm leading-6 shadow-sm">{selectedMessage.body}</div></div>}</div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
