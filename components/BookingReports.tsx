"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Loader2, Printer, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type Summary = {
  grossCollectedCents: number; refundsCents: number; netCollectedCents: number;
  bookedRevenueCents: number; depositsCents: number; checkoutPaymentsCents: number;
  noShowChargesCents: number; tipsCents: number; outstandingCents: number;
  totalBookings: number; completedAppointments: number; approvedAppointments: number;
  pendingAppointments: number; cancelledAppointments: number; noShowAppointments: number;
  deniedAppointments: number; averageTicketCents: number; completionRate: number;
  cancellationRate: number; noShowRate: number;
};
type Report = {
  from: string; to: string; generatedAt: string; dateBasis: string; revenueNote: string;
  summary: Summary;
  daily: { date: string; bookings: number; completed: number; netCollectedCents: number }[];
  services: { serviceName: string; bookings: number; completed: number; grossCollectedCents: number; refundsCents: number; netCollectedCents: number; averageTicketCents: number }[];
  paymentMethods: { paymentMethod: string; transactions: number; grossCollectedCents: number; refundsCents: number; netCollectedCents: number }[];
  statuses: { status: string; count: number; percentage: number }[];
};

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const monthRange = () => {
  const now = new Date();
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
};
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());

export default function BookingReports() {
  const initial = useMemo(monthRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/bookings?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || "Report could not be loaded");
      setReport(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Report could not be loaded");
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const preset = (kind: "today" | "week" | "month" | "year") => {
    const now = new Date();
    if (kind === "today") { setFrom(iso(now)); setTo(iso(now)); return; }
    if (kind === "week") {
      const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const end = new Date(start); end.setDate(start.getDate() + 6);
      setFrom(iso(start)); setTo(iso(end)); return;
    }
    if (kind === "month") { const range = monthRange(); setFrom(range.from); setTo(range.to); return; }
    setFrom(iso(new Date(now.getFullYear(), 0, 1))); setTo(iso(new Date(now.getFullYear(), 11, 31)));
  };

  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["AH Braiding booking report", `${report.from} to ${report.to}`], [],
      ["SUMMARY", "VALUE"],
      ["Net collected", money(report.summary.netCollectedCents)], ["Gross collected", money(report.summary.grossCollectedCents)],
      ["Refunds", money(report.summary.refundsCents)], ["Booked revenue", money(report.summary.bookedRevenueCents)],
      ["Deposits", money(report.summary.depositsCents)], ["Final payments", money(report.summary.checkoutPaymentsCents)],
      ["Tips", money(report.summary.tipsCents)], ["Outstanding", money(report.summary.outstandingCents)],
      ["Total bookings", report.summary.totalBookings], ["Completed", report.summary.completedAppointments], [],
      ["SERVICE", "BOOKINGS", "COMPLETED", "GROSS", "REFUNDS", "NET", "AVERAGE TICKET"],
      ...report.services.map(item => [item.serviceName, item.bookings, item.completed, money(item.grossCollectedCents), money(item.refundsCents), money(item.netCollectedCents), money(item.averageTicketCents)]), [],
      ["PAYMENT METHOD", "TRANSACTIONS", "GROSS", "REFUNDS", "NET"],
      ...report.paymentMethods.map(item => [label(item.paymentMethod), item.transactions, money(item.grossCollectedCents), money(item.refundsCents), money(item.netCollectedCents)]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `booking-report-${report.from}-to-${report.to}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  };

  const maxDaily = Math.max(1, ...(report?.daily.map(item => Math.max(0, item.netCollectedCents)) ?? [1]));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 print:p-0 sm:p-8">
      <header className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9A5A3A]">Business performance</p><h2 className="mt-1 font-serif text-3xl text-[#2c1810] dark:text-white">Analytics &amp; reports</h2><p className="mt-1 text-sm text-neutral-500">Revenue and appointment performance by appointment date.</p></div>
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "year"] as const).map(value => <Button key={value} variant="outline" size="sm" onClick={() => preset(value)} className="capitalize">{value === "week" ? "This week" : value === "month" ? "This month" : value === "year" ? "This year" : "Today"}</Button>)}
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 print:hidden dark:border-neutral-700 dark:bg-neutral-800 sm:flex-row sm:items-end">
        <label className="text-sm font-medium">From<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} className="mt-1 block h-11 rounded-lg border px-3 dark:bg-neutral-900" /></label>
        <label className="text-sm font-medium">To<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} className="mt-1 block h-11 rounded-lg border px-3 dark:bg-neutral-900" /></label>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
        <div className="sm:ml-auto flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!report}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="outline" onClick={() => window.print()} disabled={!report}><Printer className="mr-2 h-4 w-4" />Print</Button></div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading && !report ? <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin" /></div> : report && <>
        <div className="hidden print:block"><h1 className="font-serif text-3xl">AH Braiding booking report</h1><p>{report.from} through {report.to}</p></div>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Net collected" value={money(report.summary.netCollectedCents)} note={report.revenueNote} primary />
          <Metric title="Booked revenue" value={money(report.summary.bookedRevenueCents)} note="Active appointments in range" />
          <Metric title="Outstanding balance" value={money(report.summary.outstandingCents)} note="Approved appointments" />
          <Metric title="Average ticket" value={money(report.summary.averageTicketCents)} note="Net collected per completed visit" />
          <Metric title="Gross collected" value={money(report.summary.grossCollectedCents)} note={`${money(report.summary.refundsCents)} refunded`} />
          <Metric title="Deposits" value={money(report.summary.depositsCents)} note="Captured Stripe deposits" />
          <Metric title="Final payments" value={money(report.summary.checkoutPaymentsCents)} note={`${money(report.summary.tipsCents)} in tips`} />
          <Metric title="Appointments" value={String(report.summary.totalBookings)} note={`${report.summary.completedAppointments} completed · ${report.summary.completionRate}% completion`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
          <div className="rounded-xl border bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"><div className="flex items-center justify-between"><div><h3 className="font-serif text-2xl">Daily net collections</h3><p className="text-sm text-neutral-500">Revenue attached to appointments in this range</p></div><BarChart3 className="h-5 w-5 text-[#9A5A3A]" /></div><div className="mt-6 flex h-56 items-end gap-1 overflow-x-auto border-b pb-px">{report.daily.map(item => <div key={item.date} className="group flex min-w-7 flex-1 flex-col items-center justify-end" title={`${dateLabel(item.date)}: ${money(item.netCollectedCents)}`}><span className="mb-1 hidden text-[9px] group-hover:block">{money(item.netCollectedCents)}</span><div className="w-full max-w-10 rounded-t bg-[#9A5A3A]" style={{ height: `${Math.max(item.netCollectedCents > 0 ? 4 : 0, item.netCollectedCents / maxDaily * 180)}px` }} /><span className="mt-2 text-[9px] text-neutral-500 [writing-mode:vertical-rl]">{dateLabel(item.date)}</span></div>)}</div></div>
          <div className="rounded-xl border bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="font-serif text-2xl">Appointment outcomes</h3><div className="mt-5 space-y-4">{report.statuses.filter(item => item.count > 0).map(item => <div key={item.status}><div className="flex justify-between text-sm"><span>{label(item.status)}</span><b>{item.count} <span className="font-normal text-neutral-500">({item.percentage}%)</span></b></div><div className="mt-1.5 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700"><div className="h-full rounded-full bg-[#9A5A3A]" style={{ width: `${item.percentage}%` }} /></div></div>)}</div></div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white dark:border-neutral-700 dark:bg-neutral-800"><div className="p-5"><h3 className="font-serif text-2xl">Service performance</h3><p className="text-sm text-neutral-500">Sorted by net collected revenue</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900"><tr><th className="p-3 pl-5">Service</th><th className="p-3 text-right">Bookings</th><th className="p-3 text-right">Completed</th><th className="p-3 text-right">Gross</th><th className="p-3 text-right">Refunds</th><th className="p-3 text-right">Net</th><th className="p-3 pr-5 text-right">Avg. ticket</th></tr></thead><tbody className="divide-y dark:divide-neutral-700">{report.services.length ? report.services.map(item => <tr key={item.serviceName}><td className="p-3 pl-5 font-medium">{item.serviceName}</td><td className="p-3 text-right">{item.bookings}</td><td className="p-3 text-right">{item.completed}</td><td className="p-3 text-right">{money(item.grossCollectedCents)}</td><td className="p-3 text-right text-red-600">{money(item.refundsCents)}</td><td className="p-3 text-right font-semibold">{money(item.netCollectedCents)}</td><td className="p-3 pr-5 text-right">{money(item.averageTicketCents)}</td></tr>) : <tr><td colSpan={7} className="p-8 text-center text-neutral-500">No appointments in this range.</td></tr>}</tbody></table></div></section>

        <section className="grid gap-6 lg:grid-cols-2"><Breakdown title="Payment methods" rows={report.paymentMethods.map(item => ({ name: label(item.paymentMethod), detail: `${item.transactions} transaction${item.transactions === 1 ? "" : "s"}`, value: money(item.netCollectedCents) }))} /><Breakdown title="Revenue composition" rows={[{ name: "Captured deposits", value: money(report.summary.depositsCents) }, { name: "Final payments", value: money(report.summary.checkoutPaymentsCents) }, { name: "No-show charges", value: money(report.summary.noShowChargesCents) }, { name: "Refunds", value: `−${money(report.summary.refundsCents)}` }]} /></section>
      </>}
    </main>
  );
}

function Metric({ title, value, note, primary = false }: { title: string; value: string; note: string; primary?: boolean }) {
  return <article className={`rounded-xl border p-5 ${primary ? "border-[#9A5A3A] bg-[#fffaf6] dark:bg-neutral-800" : "bg-white dark:border-neutral-700 dark:bg-neutral-800"}`}><p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">{title}</p><p className="mt-2 font-serif text-3xl text-[#2c1810] dark:text-white">{value}</p><p className="mt-1 text-xs text-neutral-500">{note}</p></article>;
}
function Breakdown({ title, rows }: { title: string; rows: { name: string; detail?: string; value: string }[] }) {
  return <section className="rounded-xl border bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="font-serif text-2xl">{title}</h3><div className="mt-4 divide-y dark:divide-neutral-700">{rows.length ? rows.map(row => <div key={row.name} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{row.name}</p>{row.detail && <p className="text-xs text-neutral-500">{row.detail}</p>}</div><b>{row.value}</b></div>) : <p className="py-8 text-center text-sm text-neutral-500">No payment activity.</p>}</div></section>;
}
