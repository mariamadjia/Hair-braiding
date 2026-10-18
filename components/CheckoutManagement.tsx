"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, CreditCard, Loader2, Mail, MoreHorizontal, RotateCcw, Search, UserX, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";

type Transaction = { id: number; type: "PAYMENT" | "REFUND"; paymentMethod: string; status: string; amountCents: number; externalReference?: string; reason?: string; createdAt: string };
type Checkout = {
  appointmentId: number; customerId: number; customerName: string; customerEmail?: string; customerPhone: string;
  serviceName?: string; appointmentDateTime: string; appointmentEndDateTime?: string; appointmentStatus: string;
  depositPaymentStatus?: string; serviceTotalCents: number; depositCreditCents: number; tipCents: number;
  amountPaidCents: number; amountRefundedCents: number; balanceDueCents: number; checkoutStatus: string;
  completedAt?: string; notificationStatus?: string; transactions: Transaction[];
};
type Page = { content: Checkout[]; totalPages: number; totalElements: number; number: number };
type Tab = "READY" | "PAST";
type PaymentMethod = "CASH" | "ZELLE" | "CASH_APP" | "OTHER";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(`${value.replace(/Z$/, "")}Z`));
const read = async <T,>(response: Response): Promise<T> => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || body.message || "The action could not be completed"); return body as T; };

export default function CheckoutManagement() {
  const [tab, setTab] = useState<Tab>("READY");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Checkout | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tip, setTip] = useState("0");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const headers = () => { const token = getAuthToken(); return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; };
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await read<Page>(await fetch(`${API_BASE_URL}/api/checkouts?tab=${tab}&page=${page}&size=30`, { headers: headers(), cache: "no-store" }))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout appointments could not be loaded"); }
    finally { setLoading(false); }
  }, [tab, page]);
  useEffect(() => { void load(); }, [load]);

  const act = async (work: () => Promise<Checkout>, success: string) => {
    setBusy(true); setError(""); setNotice("");
    try { const updated = await work(); setSelected(updated); setNotice(success); setPaymentOpen(false); setRefundOpen(false); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The action could not be completed"); }
    finally { setBusy(false); }
  };

  const submitPayment = async () => {
    if (!selected) return;
    const tipCents = Math.round(Number(tip || 0) * 100);
    if (!Number.isFinite(tipCents) || tipCents < 0) { setError("Enter a valid tip amount"); return; }
    await act(async () => read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${selected.appointmentId}/external-payment`, { method: "POST", headers: headers(), body: JSON.stringify({ paymentMethod: method, tipCents, externalReference: reference || null, adminNotes: notes || null }) })), "Payment recorded and appointment completed. A receipt was queued for every eligible contact channel.");
  };
  const sendReceipt = async (item: Checkout) => act(async () => read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${item.appointmentId}/receipt`, { method: "POST", headers: headers(), body: JSON.stringify({ email: true, sms: true }) })), "Receipt queued for delivery.");
  const submitRefund = async () => {
    if (!selected) return;
    const amountCents = Math.round(Number(refundAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1 || !refundReason.trim()) { setError("Enter a refund amount and reason"); return; }
    await act(async () => read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${selected.appointmentId}/refunds`, { method: "POST", headers: headers(), body: JSON.stringify({ amountCents, reason: refundReason.trim(), externalReference: null }) })), "External refund recorded. A receipt was queued for every eligible contact channel.");
  };
  const cancel = async (item: Checkout) => {
    const reason = window.prompt("Why is this appointment being cancelled?"); if (!reason?.trim()) return;
    await act(async () => { await read(await fetch(`${API_BASE_URL}/api/appointments/${item.appointmentId}/cancel`, { method: "PUT", headers: headers(), body: JSON.stringify({ adminNotes: reason.trim() }) })); return item; }, "Appointment cancelled and customer notification queued.");
  };
  const completeWithoutBalance = async (item: Checkout) => {
    await act(async () => { await read(await fetch(`${API_BASE_URL}/api/appointments/${item.appointmentId}/complete`, { method: "PUT", headers: headers(), body: JSON.stringify({ adminNotes: "Checkout completed with no remaining balance" }) })); return { ...item, appointmentStatus: "COMPLETED", checkoutStatus: "PAID" }; }, "Appointment marked complete.");
  };
  const noShow = async (item: Checkout, collect: boolean) => {
    if (!window.confirm(collect ? "Mark no-show and submit the policy fee?" : "Mark no-show and waive the additional fee?")) return;
    await act(async () => { await read(await fetch(`${API_BASE_URL}/api/appointments/${item.appointmentId}/no-show`, { method: "POST", headers: headers(), body: JSON.stringify({ feeDecision: collect ? "ACTIVE" : "WAIVED", confirmOverdue: false }) })); return item; }, collect ? "No-show recorded and fee submitted." : "No-show recorded with the additional fee waived.");
  };

  const filtered = (data?.content || []).filter(item => `${item.customerName} ${item.serviceName || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-full bg-[#f8f4ee] px-4 py-6 text-[#351d12] dark:bg-neutral-950 dark:text-neutral-100 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[#b9532f]">Owner workspace</p><h1 className="mt-1 font-serif text-4xl sm:text-5xl">Checkout</h1><p className="mt-2 text-sm text-[#76675e] dark:text-neutral-400">Collect balances, complete visits, and manage receipts.</p></div><div className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm dark:bg-neutral-800">{data?.totalElements || 0} {tab === "READY" ? "ready" : "records"}</div></header>
      <div className="mt-7 grid grid-cols-2 border-b border-[#d9cabd]" role="tablist">{(["READY", "PAST"] as Tab[]).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(0); setSelected(null); }} className={`border-b-2 px-4 py-3 text-lg font-semibold ${tab === value ? "border-[#b9532f] text-[#b9532f]" : "border-transparent text-[#88766b]"}`}>{value === "READY" ? "Ready" : "Past"}</button>)}</div>
      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e2d6ca] bg-white px-4 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"><Search className="h-4 w-4 text-neutral-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customer or service" className="w-full bg-transparent text-sm outline-none"/></label>
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin"/></div> : filtered.length === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-[#d9cabd] bg-white/60 p-12 text-center text-[#76675e]">{tab === "READY" ? "No appointments are ready for checkout." : "No past checkout records found."}</div> : <div className="mt-5 space-y-4">{filtered.map(item => <CheckoutCard key={item.appointmentId} item={item} past={tab === "PAST"} onOpen={setSelected}/>)}</div>}
      {data && data.totalPages > 1 && <div className="mt-6 flex justify-between"><button disabled={page === 0} onClick={() => setPage(v => v - 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page >= data.totalPages - 1} onClick={() => setPage(v => v + 1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Next</button></div>}
    </div>
    {selected && !paymentOpen && !refundOpen && <Sheet title={selected.customerName} onClose={() => setSelected(null)}>
      <Summary item={selected}/>
      {selected.appointmentStatus === "APPROVED" && <><button onClick={() => selected.balanceDueCents > 0 ? setPaymentOpen(true) : void completeWithoutBalance(selected)} className="mt-5 w-full rounded-2xl bg-[#b9532f] px-5 py-4 font-semibold text-white">{selected.balanceDueCents > 0 ? `Checkout ${money(selected.balanceDueCents)}` : "Complete appointment"}</button><div className="mt-3 grid gap-2 rounded-2xl border p-2"><Action icon={UserX} label="Mark no-show — waive fee" onClick={() => void noShow(selected, false)}/><Action icon={CreditCard} label="Mark no-show — collect fee" onClick={() => void noShow(selected, true)}/><Action danger icon={X} label="Cancel appointment" onClick={() => void cancel(selected)}/></div></>}
      {selected.amountPaidCents > selected.amountRefundedCents && <div className="mt-4 grid gap-2"><Action icon={Mail} label="Send email/text receipt" onClick={() => void sendReceipt(selected)}/><Action icon={RotateCcw} label="Record a refund" onClick={() => { setRefundAmount(((selected.amountPaidCents - selected.amountRefundedCents) / 100).toFixed(2)); setRefundReason(""); setRefundOpen(true); }}/></div>}
    </Sheet>}
    {selected && paymentOpen && <Sheet title="Mark as paid" onClose={() => setPaymentOpen(false)}><Summary item={{ ...selected, tipCents: Math.round(Number(tip || 0) * 100), balanceDueCents: selected.balanceDueCents + Math.round(Number(tip || 0) * 100) }}/><h3 className="mt-5 font-semibold">Payment method</h3><div className="mt-2 grid grid-cols-2 gap-2">{(["CASH", "ZELLE", "CASH_APP", "OTHER"] as PaymentMethod[]).map(value => <button key={value} onClick={() => setMethod(value)} className={`rounded-xl border px-3 py-3 text-sm font-medium ${method === value ? "border-[#b9532f] bg-[#fff0e8] text-[#9b3f22]" : "bg-white dark:bg-neutral-900"}`}>{value.replace("_", " ")}</button>)}</div><label className="mt-4 block text-sm font-medium">Tip<input inputMode="decimal" value={tip} onChange={e => setTip(e.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Reference or note (optional)<input value={reference} maxLength={255} onChange={e => setReference(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Completion notes (optional)<textarea value={notes} maxLength={500} onChange={e => setNotes(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">This records a payment received outside Stripe. Confirm the funds before continuing.</p><button disabled={busy} onClick={() => void submitPayment()} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#b9532f] px-5 py-4 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Mark paid &amp; complete</button></Sheet>}
    {selected && refundOpen && <Sheet title="Record refund" onClose={() => setRefundOpen(false)}><Summary item={selected}/><label className="mt-5 block text-sm font-medium">Refund amount<input inputMode="decimal" value={refundAmount} onChange={e => setRefundAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-xl font-semibold dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Reason<textarea value={refundReason} maxLength={500} onChange={e => setRefundReason(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">This records a refund made outside Stripe. Return the money through the original external payment method first.</p><button disabled={busy} onClick={() => void submitRefund()} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#b9532f] px-5 py-4 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Record refund</button></Sheet>}
  </div>;
}

function CheckoutCard({ item, past, onOpen }: { item: Checkout; past: boolean; onOpen: (item: Checkout) => void }) {
  const status = item.appointmentStatus === "COMPLETED" ? "Completed" : item.appointmentStatus === "NO_SHOW" ? "No-show" : item.appointmentStatus === "CANCELLED" ? "Cancelled" : "Ready";
  return <article className="rounded-3xl border border-[#e4d8cc] bg-white p-4 shadow-[0_8px_30px_rgba(63,39,25,.06)] dark:border-neutral-700 dark:bg-neutral-900 sm:p-5"><button className="w-full text-left" onClick={() => onOpen(item)}><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3e2d6] text-lg font-bold text-[#9b3f22]">{item.customerName.split(" ").map(v => v[0]).slice(0,2).join("")}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h2 className="truncate text-lg font-bold">{item.customerName}</h2><p className="truncate text-[#76675e] dark:text-neutral-400">{item.serviceName || "Braiding service"}</p></div>{past && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Completed" ? "bg-emerald-100 text-emerald-800" : status === "No-show" ? "bg-red-100 text-red-800" : "bg-neutral-100 text-neutral-700"}`}>{status}</span>}</div><p className="mt-3 text-sm">{dateTime(item.appointmentDateTime)}</p><div className="mt-2 flex items-center justify-between"><p className="font-semibold">{past ? item.checkoutStatus === "REFUNDED" ? "Refunded" : `${money(item.depositCreditCents + item.amountPaidCents)} paid` : `${money(item.serviceTotalCents)} total · ${money(item.balanceDueCents)} due`}</p><span className="flex items-center gap-1 text-sm font-semibold text-[#b9532f]">{past ? "Details" : "Checkout"}<ChevronRight className="h-4 w-4"/></span></div></div></div></button></article>;
}
function Summary({ item }: { item: Checkout }) { return <div className="rounded-2xl border border-[#eadfd4] bg-[#fffaf5] p-4 dark:border-neutral-700 dark:bg-neutral-900"><p className="text-sm text-[#76675e]">{item.serviceName || "Braiding service"} · {dateTime(item.appointmentDateTime)}</p><dl className="mt-4 space-y-2 text-sm"><Row label="Service total" value={money(item.serviceTotalCents)}/><Row label="Deposit paid" value={`−${money(item.depositCreditCents)}`}/>{item.tipCents > 0 && <Row label="Tip" value={money(item.tipCents)}/>}<div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>{item.balanceDueCents > 0 ? "Balance due" : "Total paid"}</dt><dd>{money(item.balanceDueCents > 0 ? item.balanceDueCents : item.depositCreditCents + item.amountPaidCents)}</dd></div>{item.amountRefundedCents > 0 && <Row label="Refunded" value={money(item.amountRefundedCents)}/>}</dl></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between"><dt className="text-[#76675e]">{label}</dt><dd className="font-medium">{value}</dd></div>; }
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#fffdf9] p-5 shadow-2xl dark:bg-neutral-950 sm:rounded-3xl"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5"/></button></div><div className="mt-5">{children}</div></section></div>; }
function Action({ icon: Icon, label, onClick, danger = false }: { icon: typeof MoreHorizontal; label: string; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 ${danger ? "text-red-700" : ""}`}><Icon className="h-4 w-4"/>{label}<ChevronRight className="ml-auto h-4 w-4"/></button>; }
