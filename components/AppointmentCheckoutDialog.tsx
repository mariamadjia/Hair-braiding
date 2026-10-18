"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, Mail, ReceiptText, RotateCcw, UserX, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";

type Transaction = { id: number; type: "PAYMENT" | "REFUND"; paymentMethod: string; amountCents: number };
type Checkout = {
  appointmentId: number; customerName: string; customerEmail?: string; customerPhone: string; serviceName?: string;
  appointmentDateTime: string; appointmentStatus: string; serviceTotalCents: number; depositCreditCents: number;
  tipCents: number; amountPaidCents: number; amountRefundedCents: number; balanceDueCents: number;
  checkoutStatus: string; bookingSource?: "CUSTOMER" | "OWNER"; depositPolicyVersion?: string;
  depositPolicyAcceptedAt?: string; bookingPolicySnapshot?: string; offSessionConsentPolicyVersion?: string; offSessionConsentAt?: string;
  transactions: Transaction[];
};
type PaymentMethod = "CASH" | "ZELLE" | "CASH_APP" | "OTHER";
type View = "ACTIONS" | "PAYMENT" | "REFUND";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(`${value.replace(/Z$/, "")}Z`));
const read = async <T,>(response: Response): Promise<T> => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || body.message || "The action could not be completed"); return body as T; };

export default function AppointmentCheckoutDialog({ appointmentId, onClose, onChanged, onComplete, onNoShow, onCancel }: {
  appointmentId: number; onClose: () => void; onChanged: () => Promise<void> | void;
  onComplete: () => void; onNoShow: () => void; onCancel: () => void;
}) {
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [view, setView] = useState<View>("ACTIONS");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tip, setTip] = useState("0");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const headers = () => { const token = getAuthToken(); return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setCheckout(await read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${appointmentId}`, { headers: headers(), cache: "no-store" }))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout details could not be loaded"); }
    finally { setLoading(false); }
  }, [appointmentId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);

  const submitPayment = async () => {
    if (!checkout) return;
    const tipCents = Math.round(Number(tip || 0) * 100);
    if (!Number.isFinite(tipCents) || tipCents < 0) { setError("Enter a valid tip amount"); return; }
    setBusy(true); setError("");
    try {
      const updated = await read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${appointmentId}/external-payment`, { method: "POST", headers: headers(), body: JSON.stringify({ paymentMethod: method, tipCents, externalReference: reference || null, adminNotes: notes || null }) }));
      setCheckout(updated); setView("ACTIONS"); setNotice("Payment recorded, appointment completed, and receipt queued."); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Payment could not be recorded"); }
    finally { setBusy(false); }
  };
  const sendReceipt = async () => {
    if (!checkout) return; setBusy(true); setError("");
    try { setCheckout(await read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${appointmentId}/receipt`, { method: "POST", headers: headers(), body: JSON.stringify({ email: true, sms: true }) }))); setNotice("Receipt queued for every eligible contact channel."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Receipt could not be sent"); }
    finally { setBusy(false); }
  };
  const submitRefund = async () => {
    if (!checkout) return; const amountCents = Math.round(Number(refundAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1 || !refundReason.trim()) { setError("Enter a refund amount and reason"); return; }
    setBusy(true); setError("");
    try { const updated = await read<Checkout>(await fetch(`${API_BASE_URL}/api/checkouts/${appointmentId}/refunds`, { method: "POST", headers: headers(), body: JSON.stringify({ amountCents, reason: refundReason.trim(), externalReference: null }) })); setCheckout(updated); setView("ACTIONS"); setNotice("External refund recorded and receipt queued."); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Refund could not be recorded"); }
    finally { setBusy(false); }
  };

  const refundable = checkout ? checkout.amountPaidCents - checkout.amountRefundedCents : 0;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="checkout-dialog-title" className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#fffdf9] p-5 text-[#351d12] shadow-2xl dark:bg-neutral-950 dark:text-neutral-100 sm:rounded-3xl sm:p-6">
      <header className="flex items-center gap-3">{view !== "ACTIONS" && <button onClick={() => { setView("ACTIONS"); setError(""); }} aria-label="Back to checkout actions" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><ChevronLeft className="h-5 w-5"/></button>}<h2 id="checkout-dialog-title" className="flex-1 font-serif text-3xl">{view === "ACTIONS" ? "Checkout" : view === "PAYMENT" ? "Mark as paid" : "Record refund"}</h2><button onClick={onClose} disabled={busy} aria-label="Close checkout" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5"/></button></header>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin"/></div> : checkout && <>
        <div className="mt-5 rounded-2xl border border-[#eadfd4] bg-[#fffaf5] p-4 dark:border-neutral-700 dark:bg-neutral-900"><h3 className="text-lg font-bold">{checkout.customerName}</h3><p className="text-[#76675e] dark:text-neutral-400">{checkout.serviceName || "Braiding service"}</p><p className="mt-1 text-sm">{dateTime(checkout.appointmentDateTime)}</p><dl className="mt-4 space-y-2 text-sm"><Row label="Service total" value={money(checkout.serviceTotalCents)}/><Row label="Deposit paid" value={`−${money(checkout.depositCreditCents)}`}/>{checkout.tipCents > 0 && <Row label="Tip" value={money(checkout.tipCents)}/>}<div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>Balance due</dt><dd>{money(checkout.balanceDueCents)}</dd></div>{checkout.amountRefundedCents > 0 && <Row label="Refunded" value={money(checkout.amountRefundedCents)}/>}</dl></div>
        <details className="mt-4 rounded-2xl border border-[#eadfd4] bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <summary className="cursor-pointer font-semibold">Customer policy agreement</summary>
          {checkout.depositPolicyAcceptedAt ? <div className="mt-3 text-sm text-[#5f5048] dark:text-neutral-300">
            <p className="font-medium text-emerald-800 dark:text-emerald-300">Accepted {dateTime(checkout.depositPolicyAcceptedAt)}</p>
            <p className="mt-1 text-xs text-[#806f64] dark:text-neutral-400">Recorded policy: {checkout.depositPolicyVersion || "booking policy"}</p>
            {checkout.bookingPolicySnapshot ? <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#fffaf5] p-3 text-xs leading-5 text-[#4f4038] dark:bg-neutral-950 dark:text-neutral-300">{checkout.bookingPolicySnapshot}</div> : <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>The approved deposit is non-refundable and is applied toward the service balance.</li>
              <li>Payments are final and non-refundable under the accepted booking policy.</li>
              {checkout.offSessionConsentAt && <li>A missed appointment may result in a fee equal to 60% of the scheduled service price, with the deposit credited toward that fee.</li>}
              {checkout.offSessionConsentAt && <li>The customer authorized the salon to save the deposit card and charge an eligible remaining no-show balance.</li>}
            </ul>}
            {checkout.offSessionConsentAt && <p className="mt-3 text-xs text-[#806f64] dark:text-neutral-400">No-show authorization accepted {dateTime(checkout.offSessionConsentAt)} · {checkout.offSessionConsentPolicyVersion || "recorded policy"}</p>}
          </div> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No customer policy acceptance was recorded for this appointment{checkout.bookingSource === "OWNER" ? " because it was created by the salon" : ""}.</p>}
        </details>
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {view === "ACTIONS" && <div className="mt-5 space-y-2">
          {checkout.appointmentStatus === "APPROVED" && checkout.balanceDueCents > 0 && <Action icon={Banknote} title="Collect remaining balance" detail={`${money(checkout.balanceDueCents)} due`} onClick={() => setView("PAYMENT")}/>} 
          {checkout.appointmentStatus === "APPROVED" && <Action icon={CheckCircle2} title="Mark as paid" detail="Cash, Zelle, Cash App, or other" onClick={() => setView("PAYMENT")}/>} 
          {checkout.appointmentStatus === "APPROVED" && <Action icon={CheckCircle2} title="Mark appointment complete" detail="Complete without recording another payment" onClick={() => { onClose(); onComplete(); }}/>} 
          {checkout.transactions.some(item => item.type === "PAYMENT") && <Action disabled={busy} icon={Mail} title="Send receipt" detail="Email and text eligible channels" onClick={() => void sendReceipt()}/>} 
          {refundable > 0 && <Action icon={RotateCcw} title="Refund payment" detail={`${money(refundable)} eligible`} onClick={() => { setRefundAmount((refundable / 100).toFixed(2)); setRefundReason(""); setView("REFUND"); }}/>} 
          {checkout.appointmentStatus === "APPROVED" && <Action icon={UserX} title="Mark as no-show" detail="Choose fee or no fee on the next step" onClick={() => { onClose(); onNoShow(); }}/>} 
          {checkout.appointmentStatus === "APPROVED" && <Action danger icon={X} title="Cancel appointment" detail="A cancellation reason is required" onClick={() => { onClose(); onCancel(); }}/>} 
        </div>}
        {view === "PAYMENT" && <div className="mt-5"><h3 className="font-semibold">Payment method</h3><div className="mt-2 grid grid-cols-2 gap-2">{(["CASH", "ZELLE", "CASH_APP", "OTHER"] as PaymentMethod[]).map(value => <button key={value} onClick={() => setMethod(value)} className={`rounded-xl border px-3 py-3 text-sm font-medium ${method === value ? "border-[#b9532f] bg-[#fff0e8] text-[#9b3f22]" : "bg-white dark:bg-neutral-900"}`}>{value.replace("_", " ")}</button>)}</div><label className="mt-4 block text-sm font-medium">Tip<input inputMode="decimal" value={tip} onChange={event => setTip(event.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Reference or note (optional)<input value={reference} maxLength={255} onChange={event => setReference(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Completion notes (optional)<textarea value={notes} maxLength={500} onChange={event => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">This records a payment received outside Stripe. Confirm the funds before continuing.</p><button disabled={busy} onClick={() => void submitPayment()} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#b9532f] px-5 py-4 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Mark paid &amp; complete</button></div>}
        {view === "REFUND" && <div className="mt-5"><label className="block text-sm font-medium">Refund amount<input inputMode="decimal" value={refundAmount} onChange={event => setRefundAmount(event.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-xl font-semibold dark:bg-neutral-900"/></label><label className="mt-3 block text-sm font-medium">Reason<textarea value={refundReason} maxLength={500} onChange={event => setRefundReason(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 dark:bg-neutral-900"/></label><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Return the funds through the original external payment method before recording the refund here.</p><button disabled={busy} onClick={() => void submitRefund()} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#b9532f] px-5 py-4 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Record refund</button></div>}
      </>}
    </section>
  </div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between"><dt className="text-[#76675e]">{label}</dt><dd className="font-medium">{value}</dd></div>; }
function Action({ icon: Icon, title, detail, onClick, danger = false, disabled = false }: { icon: typeof ReceiptText; title: string; detail: string; onClick: () => void; danger?: boolean; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left transition hover:border-[#c98163] hover:bg-[#fffaf5] disabled:opacity-50 dark:bg-neutral-900 ${danger ? "border-red-200 text-red-700" : "border-[#e6d9ce] dark:border-neutral-700"}`}><span className={`rounded-full p-2 ${danger ? "bg-red-50" : "bg-[#f6e9df] text-[#a44728]"}`}><Icon className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-xs font-normal text-[#806f64] dark:text-neutral-400">{detail}</span></span><ChevronRight className="h-4 w-4 shrink-0"/></button>; }
