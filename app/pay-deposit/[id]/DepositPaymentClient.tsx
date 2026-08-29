"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CalendarDays, CheckCircle2, Loader2, Lock, TriangleAlert } from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getStripe } from "@/lib/stripe";

type PageData = { appointmentId: number; customerName: string; serviceName: string; selectedSize?: string; selectedLength?: string; selectedFoundation?: string; selectedTexture?: string; addOns?: { id: number; name: string }[]; appointmentDateTime: string; serviceTotalCents: number; depositDueCents: number; remainingBalanceCents: number; expiresAt: string; paymentStatus: string; appointmentStatus: string; clientSecret?: string };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(`${value.replace(/Z$/, "")}Z`)) + " CT";

function DepositForm({ data, token, onPaid }: { data: PageData; token: string; onPaid: () => void }) {
  const stripe = useStripe(); const elements = useElements();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const pay = async (event: React.FormEvent) => {
    event.preventDefault(); if (!stripe || !elements || !data.clientSecret) return;
    setBusy(true); setError(null);
    const returnUrl = `${window.location.origin}/pay-deposit/${data.appointmentId}?token=${encodeURIComponent(token)}`;
    const result = await stripe.confirmPayment({ elements, clientSecret: data.clientSecret, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
    if (result.error) setError(result.error.message || "Payment could not be completed.");
    else if (result.paymentIntent?.status === "succeeded") onPaid();
    else setError("Payment is still processing. Please refresh this page in a moment.");
    setBusy(false);
  };
  return <form onSubmit={pay} className="space-y-5"><PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }}/>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button disabled={!stripe || busy} className="flex h-14 w-full items-center justify-center rounded-xl bg-[#9d5f3d] text-base font-semibold text-white shadow-sm hover:bg-[#82472c] disabled:opacity-50">{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Lock className="mr-2 h-5 w-5"/>}Pay {money(data.depositDueCents)} deposit</button><p className="flex items-center justify-center gap-2 text-center text-xs text-neutral-500"><Lock className="h-3.5 w-3.5"/>Secure payment powered by Stripe</p></form>;
}

export default function DepositPaymentClient({ appointmentId }: { appointmentId: number }) {
  const [data, setData] = useState<PageData | null>(null); const [error, setError] = useState<string | null>(null); const [paid, setPaid] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || ""; setToken(value);
    if (!appointmentId || !value) { setError("This deposit link is invalid."); return; }
    void fetch(`${API_BASE_URL}/api/public/deposits/${appointmentId}?token=${encodeURIComponent(value)}`, { cache: "no-store" }).then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || body.message || "This payment link is unavailable."); return body; }).then((body: PageData) => { setData(body); if (body.paymentStatus === "CAPTURED" || body.appointmentStatus === "APPROVED") setPaid(true); }).catch(reason => setError(reason instanceof Error ? reason.message : "This payment link is unavailable."));
  }, [appointmentId]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#f7f4f1] p-5"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl"><TriangleAlert className="mx-auto h-9 w-9 text-red-600"/><h1 className="mt-4 text-2xl font-semibold">Payment link unavailable</h1><p className="mt-2 text-neutral-600">{error}</p></section></main>;
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-[#f7f4f1]"><Loader2 className="h-8 w-8 animate-spin text-[#9d5f3d]"/></main>;
  if (paid) return <main className="flex min-h-screen items-center justify-center bg-[#f7f4f1] p-5"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600"/><h1 className="mt-4 text-3xl font-semibold">Appointment confirmed</h1><p className="mt-2 text-neutral-600">Your deposit was received. Confirmation has been sent by email and SMS.</p><p className="mt-5 rounded-xl bg-[#f8f2ed] p-4 font-medium">{data.serviceName}<br/><span className="text-sm font-normal">{dateTime(data.appointmentDateTime)}</span></p></section></main>;

  const options = [data.selectedSize, data.selectedLength, data.selectedFoundation, data.selectedTexture].filter(Boolean).join(" · ");
  return <main className="min-h-screen bg-[#f7f4f1] px-4 py-8 text-[#241711] sm:py-12"><section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#dfd4cc] bg-white shadow-[0_18px_55px_rgba(54,31,20,.12)]"><header className="flex items-center justify-between border-b px-6 py-5 sm:px-9"><div className="font-serif text-2xl tracking-[.18em] text-[#6d321c]">AH BRAIDING</div><span className="flex items-center gap-2 text-sm text-neutral-500"><Lock className="h-4 w-4"/>Secure payment</span></header><div className="space-y-7 p-6 sm:p-9"><div><h1 className="text-3xl font-semibold">Pay your deposit</h1><p className="mt-2 text-neutral-500">Your appointment is confirmed after the deposit is paid.</p></div><section className="rounded-2xl border border-[#e4dad3] p-5"><h2 className="text-lg font-semibold">{data.customerName}</h2><p className="mt-1 font-medium">{data.serviceName}</p>{options && <p className="text-sm text-neutral-500">{options}</p>}{data.addOns?.length ? <p className="mt-1 text-sm text-neutral-500">Add-ons: {data.addOns.map(item => item.name).join(", ")}</p> : null}<p className="mt-5 flex items-center gap-2 border-t pt-5 text-sm"><CalendarDays className="h-5 w-5"/>{dateTime(data.appointmentDateTime)}</p><dl className="mt-5 space-y-2 border-t pt-5 text-sm"><div className="flex justify-between"><dt>Service total</dt><dd>{money(data.serviceTotalCents)}</dd></div><div className="flex justify-between text-base font-semibold text-[#8b4e31]"><dt>Deposit due today</dt><dd>{money(data.depositDueCents)}</dd></div><div className="flex justify-between text-neutral-500"><dt>Remaining balance after deposit</dt><dd>{money(data.remainingBalanceCents)}</dd></div></dl></section>{data.clientSecret && <Elements stripe={getStripe()} options={{ clientSecret: data.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#9d5f3d", borderRadius: "10px" } } }}><DepositForm data={data} token={token} onPaid={() => setPaid(true)}/></Elements>}<p className="text-center text-xs text-neutral-400">Payment link expires {dateTime(data.expiresAt)}.</p></div></section></main>;
}
