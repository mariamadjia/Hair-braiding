"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CircleDollarSign, Download, Loader2, Printer, Receipt, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type Summary = {
  netCollectedCents: number; bookedRevenueCents: number; depositsCents: number; checkoutPaymentsCents: number;
  noShowChargesCents: number; outstandingCents: number; totalBookings: number; completedAppointments: number;
  noShowAppointments: number; averageTicketCents: number; completionRate: number;
};
type Report = {
  from: string; to: string; revenueNote: string; summary: Summary;
  daily: { date: string; bookings: number; completed: number; netCollectedCents: number }[];
  services: { serviceName: string; bookings: number; completed: number; netCollectedCents: number; averageTicketCents: number }[];
  paymentMethods: { paymentMethod: string; transactions: number; netCollectedCents: number }[];
};
type Period = "week" | "month" | "year" | "custom";

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const rangeFor = (period: Exclude<Period, "custom">) => {
  const now = new Date();
  if (period === "week") { const from = new Date(now); from.setDate(now.getDate() - ((now.getDay() + 6) % 7)); const to = new Date(from); to.setDate(from.getDate() + 6); return { from: iso(from), to: iso(to) }; }
  if (period === "year") return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) };
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
};
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const moneyExact = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const shortDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
const title = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());

export default function BookingReports() {
  const initial = useMemo(() => rangeFor("month"), []);
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/bookings?from=${from}&to=${to}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || "Report could not be loaded");
      setReport(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Report could not be loaded"); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const changePeriod = (value: Period) => {
    setPeriod(value);
    if (value !== "custom") { const range = rangeFor(value); setFrom(range.from); setTo(range.to); }
  };
  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [["AH Braiding analytics report", `${report.from} to ${report.to}`], [], ["METRIC", "VALUE"], ["Net collected", moneyExact(report.summary.netCollectedCents)], ["Booked revenue", moneyExact(report.summary.bookedRevenueCents)], ["Outstanding", moneyExact(report.summary.outstandingCents)], ["Completed appointments", report.summary.completedAppointments], ["Total bookings", report.summary.totalBookings], [], ["SERVICE", "BOOKINGS", "COMPLETED", "NET REVENUE", "AVERAGE TICKET"], ...report.services.map(item => [item.serviceName, item.bookings, item.completed, moneyExact(item.netCollectedCents), moneyExact(item.averageTicketCents)]), [], ["PAYMENT METHOD", "TRANSACTIONS", "NET"], ...report.paymentMethods.map(item => [title(item.paymentMethod), item.transactions, moneyExact(item.netCollectedCents)])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `salon-analytics-${report.from}-to-${report.to}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const topServices = report?.services.slice(0, 5) ?? [];
  const maxServiceRevenue = Math.max(1, ...topServices.map(item => item.netCollectedCents));
  const bestService = topServices[0];

  return <main className="mx-auto w-full max-w-[1500px] space-y-[18px] p-4 text-[#24221f] print:p-0 sm:p-7 lg:p-8 dark:text-neutral-100">
    <header className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-start lg:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#875d45]">Business intelligence</p><h2 className="mt-1 text-3xl font-extrabold tracking-[-.035em]">Analytics &amp; Reports</h2><p className="mt-1 text-sm text-[#77736d] dark:text-neutral-400">Know your numbers. Grow your braiding business.</p></div><div className="flex flex-wrap gap-2"><select value={period} onChange={event => changePeriod(event.target.value as Period)} className="h-11 rounded-[10px] border border-[#eae7e2] bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom dates</option></select><Button variant="outline" onClick={exportCsv} disabled={!report}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button onClick={() => window.print()} disabled={!report} className="bg-[#875d45] text-white hover:bg-[#704a36]"><Printer className="mr-2 h-4 w-4" />Generate report</Button></div></header>

    {period === "custom" && <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#eae7e2] bg-white p-4 print:hidden dark:border-neutral-700 dark:bg-neutral-800"><label className="text-xs font-semibold text-[#77736d]">From<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border px-3 dark:bg-neutral-900" /></label><label className="text-xs font-semibold text-[#77736d]">To<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border px-3 dark:bg-neutral-900" /></label><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></section>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loading && !report ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : report && <>
      <div className="hidden print:block"><h1 className="text-3xl font-bold">AH Braiding Analytics Report</h1><p>{report.from} through {report.to}</p></div>
      <section className="grid gap-[15px] sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Total revenue" value={money(report.summary.netCollectedCents)} note={report.revenueNote} icon={CircleDollarSign} /><Kpi label="Appointments" value={String(report.summary.totalBookings)} note={`${report.summary.completedAppointments} completed`} icon={CalendarCheck} /><Kpi label="Average booking" value={money(report.summary.averageTicketCents)} note="Revenue per completed appointment" icon={Receipt} /><Kpi label="Outstanding" value={money(report.summary.outstandingCents)} note="Approved appointments" icon={TrendingUp} /></section>

      <section className="grid gap-[18px] xl:grid-cols-[1.55fr_1fr]"><Card><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-bold">Revenue overview</h3><p className="text-xs text-[#77736d]">Revenue across the selected period</p></div><span className="text-xs text-[#77736d]"><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#875d45]" />Revenue</span></div><RevenueChart values={report.daily} /></Card><Card><div className="mb-5 flex items-start justify-between"><div><h3 className="text-[17px] font-bold">Top braiding services</h3><p className="text-xs text-[#77736d]">Revenue by hairstyle</p></div><span className="text-xs text-[#77736d]">Top {topServices.length}</span></div><div className="space-y-4">{topServices.length ? topServices.map(item => <div key={item.serviceName}><div className="mb-2 flex justify-between gap-3 text-xs"><strong className="text-[13px]">{item.serviceName}</strong><span>{money(item.netCollectedCents)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f1ede9] dark:bg-neutral-700"><div className="h-full rounded-full bg-[#875d45]" style={{ width: `${Math.max(2, item.netCollectedCents / maxServiceRevenue * 100)}%` }} /></div></div>) : <Empty />}</div></Card></section>

      <section className="grid gap-[18px] xl:grid-cols-[1.15fr_1fr]"><Card className="overflow-hidden p-0"><div className="p-5 pb-3"><h3 className="text-[17px] font-bold">Service performance</h3><p className="text-xs text-[#77736d]">Bookings and revenue by service</p></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead><tr className="border-b border-[#eae7e2] text-[10px] uppercase tracking-[.06em] text-[#77736d]"><th className="px-5 py-3">Service</th><th className="p-3 text-right">Bookings</th><th className="p-3 text-right">Completed</th><th className="p-3 pr-5 text-right">Revenue</th></tr></thead><tbody>{report.services.length ? report.services.map(item => <tr key={item.serviceName} className="border-b border-[#f2efed] last:border-0 dark:border-neutral-700"><td className="px-5 py-3.5 font-semibold">{item.serviceName}</td><td className="p-3 text-right">{item.bookings}</td><td className="p-3 text-right">{item.completed}</td><td className="p-3 pr-5 text-right font-bold">{money(item.netCollectedCents)}</td></tr>) : <tr><td colSpan={4}><Empty /></td></tr>}</tbody></table></div></Card><Card><div className="mb-5 flex items-start justify-between"><div><h3 className="text-[17px] font-bold">Business insights</h3><p className="text-xs text-[#77736d]">Highlights from this reporting period</p></div><Sparkles className="h-4 w-4 text-[#875d45]" /></div><div className="space-y-3"><Insight icon="✦" title="Top revenue driver" text={bestService ? `${bestService.serviceName} leads with ${money(bestService.netCollectedCents)} in revenue.` : "Complete appointments to see your leading service."} /><Insight icon="↗" title="Completion rate" text={`${report.summary.completionRate}% of included bookings were completed. Cancelled appointments are excluded.`} /><Insight icon="＄" title="Revenue mix" text={`${money(report.summary.depositsCents)} in deposits and ${money(report.summary.checkoutPaymentsCents)} in final payments were collected.`} />{report.summary.noShowAppointments > 0 && <Insight icon="◷" title="No-show watch" text={`${report.summary.noShowAppointments} no-show${report.summary.noShowAppointments === 1 ? "" : "s"} recorded in this period.`} />}</div></Card></section>

      <Card><div className="mb-4"><h3 className="text-[17px] font-bold">Payment methods</h3><p className="text-xs text-[#77736d]">Net collected by payment type</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{report.paymentMethods.length ? report.paymentMethods.map(item => <div key={item.paymentMethod} className="rounded-xl border border-[#f0ebe7] p-3"><p className="text-xs text-[#77736d]">{title(item.paymentMethod)}</p><p className="mt-1 text-lg font-extrabold">{money(item.netCollectedCents)}</p><p className="text-[11px] text-[#77736d]">{item.transactions} transaction{item.transactions === 1 ? "" : "s"}</p></div>) : <Empty />}</div></Card>
      <p className="text-[11px] text-[#87817b]">Cancelled appointments are excluded. Revenue is shown before Stripe processing fees.</p>
    </>}
  </main>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <article className={`rounded-2xl border border-[#eae7e2] bg-white p-5 shadow-[0_2px_10px_rgba(40,30,20,.018)] dark:border-neutral-700 dark:bg-neutral-800 ${className}`}>{children}</article>; }
function Kpi({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof CircleDollarSign }) { return <Card><div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#77736d]"><span>{label}</span><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#f6eee7] text-[#875d45]"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-[27px] font-extrabold tracking-[-.03em]">{value}</p><p className="mt-1 text-xs text-[#77736d]">{note}</p></Card>; }
function Insight({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="flex gap-3 rounded-xl border border-[#f0ebe7] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f7eee8] text-[#875d45]">{icon}</span><div><strong className="text-[13px]">{title}</strong><p className="mt-1 text-xs leading-5 text-[#77736d]">{text}</p></div></div>; }
function Empty() { return <p className="p-8 text-center text-sm text-[#77736d]">No report data for this period.</p>; }

function RevenueChart({ values }: { values: Report["daily"] }) {
  const populated = values.filter(item => item.netCollectedCents !== 0 || item.bookings !== 0);
  const data = populated.length > 1 ? populated : values.slice(0, Math.min(values.length, 7));
  const width = 680, height = 250, left = 58, right = 660, top = 15, bottom = 210;
  const max = Math.max(100, ...data.map(item => Math.max(0, item.netCollectedCents)));
  const points = data.map((item, index) => ({ x: data.length === 1 ? (left + right) / 2 : left + index * (right - left) / (data.length - 1), y: bottom - Math.max(0, item.netCollectedCents) / max * (bottom - top), item }));
  const line = points.map(point => `${point.x},${point.y}`).join(" ");
  const area = points.length ? `${left},${bottom} ${line} ${right},${bottom}` : "";
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full overflow-visible" role="img" aria-label="Revenue trend chart">{[0, .25, .5, .75, 1].map(fraction => { const y = bottom - (bottom - top) * fraction; return <g key={fraction}><line x1={left} y1={y} x2={right} y2={y} stroke="#eee9e4" strokeDasharray="4 4" /><text x={left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#86817c">{money(Math.round(max * fraction))}</text></g>; })}{area && <polygon points={area} fill="#d9b7a2" fillOpacity=".22" />}{line && <polyline points={line} fill="none" stroke="#875d45" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}{points.map(point => <circle key={point.item.date} cx={point.x} cy={point.y} r="5" fill="#875d45" stroke="white" strokeWidth="2"><title>{shortDate(point.item.date)}: {moneyExact(point.item.netCollectedCents)}</title></circle>)}</svg><div className="flex justify-between pl-[58px] text-[10px] text-[#77736d]">{points.map((point, index) => <span key={point.item.date} className={points.length > 8 && index % Math.ceil(points.length / 8) !== 0 && index !== points.length - 1 ? "hidden" : ""}>{shortDate(point.item.date)}</span>)}</div></div>;
}
