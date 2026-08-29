"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CalendarDays, CheckCircle2, CircleHelp, Loader2, Lock, Mail, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
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
  return <form onSubmit={pay} className="space-y-5"><PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }}/>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button disabled={!stripe || busy} className="flex h-14 w-full items-center justify-center rounded-xl bg-[#a75f3a] text-base font-semibold text-white shadow-sm transition hover:bg-[#87472b] disabled:opacity-50">{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Lock className="mr-2 h-5 w-5"/>}Pay {money(data.depositDueCents)} deposit</button></form>;
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
  if (paid) return <main className="flex min-h-screen items-center justify-center bg-[#f7f4f1] p-5"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600"/><h1 className="mt-4 text-3xl font-semibold">Appointment confirmed</h1><p className="mt-2 text-neutral-600">Your deposit was received. You’ll receive a receipt by email.</p><p className="mt-5 rounded-xl bg-[#f8f2ed] p-4 font-medium">{data.serviceName}<br/><span className="text-sm font-normal">{dateTime(data.appointmentDateTime)}</span></p></section></main>;

  const options = [data.selectedSize, data.selectedLength, data.selectedFoundation, data.selectedTexture].filter(Boolean).join(" · ");
  return <main className="min-h-screen bg-[#f8f5f2] px-4 py-6 text-[#241711] sm:px-6 sm:py-10">
    <section className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#dfd4cc] bg-[#fffdfb] shadow-[0_18px_55px_rgba(54,31,20,.10)]">
      <header className="flex items-center justify-between border-b border-[#e8ded7] px-6 py-5 sm:px-10">
        <div className="font-serif text-xl tracking-[.2em] text-[#71351f] sm:text-2xl">AH BRAIDING</div>
        <span className="flex items-center gap-2 text-sm text-neutral-600"><Lock className="h-4 w-4"/>Secure checkout</span>
      </header>
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr] lg:gap-7 lg:p-9">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#e4dad3] bg-white p-5 shadow-sm sm:p-6">
            <h1 className="font-serif text-2xl">Appointment details</h1>
            <div className="mt-5 flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f7f1ec]"><UserRound className="h-6 w-6"/></span><div><h2 className="text-lg font-semibold">{data.customerName}</h2><p className="mt-1 font-medium">{data.serviceName}</p>{options && <p className="text-sm text-neutral-500">{options}</p>}{data.addOns?.length ? <p className="mt-1 text-sm text-neutral-500">Add-ons: {data.addOns.map(item => item.name).join(", ")}</p> : null}</div></div>
            <p className="mt-5 flex items-center gap-4 border-t border-[#eee5df] pt-5 text-sm"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f7f1ec]"><CalendarDays className="h-5 w-5"/></span>{dateTime(data.appointmentDateTime)}</p>
          </section>
          <section className="rounded-2xl border border-[#e4dad3] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-serif text-2xl">Payment summary</h2>
            <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Service total</dt><dd>{money(data.serviceTotalCents)}</dd></div><div className="flex justify-between gap-4 text-base font-semibold text-[#8b4e31]"><dt>Deposit due today</dt><dd>{money(data.depositDueCents)}</dd></div><div className="flex justify-between gap-4 text-neutral-500"><dt>Remaining balance at appointment</dt><dd>{money(data.remainingBalanceCents)}</dd></div></dl>
          </section>
        </div>
        <div>
          <section className="rounded-2xl border border-[#e4dad3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Card information</h2><p className="mt-2 flex items-center gap-2 text-sm text-neutral-500"><Lock className="h-4 w-4"/>Pay {money(data.depositDueCents)} securely</p></div><span className="rounded-lg border border-[#e4dad3] px-3 py-2 text-xs text-neutral-500">Powered by Stripe</span></div>
            {data.clientSecret && <Elements stripe={getStripe()} options={{ clientSecret: data.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#9d5f3d", borderRadius: "10px" } } }}><DepositForm data={data} token={token} onPaid={() => setPaid(true)}/></Elements>}
          </section>
          <div className="mt-5 space-y-3 px-1 text-sm text-neutral-600"><p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#78432d]"/>Payment securely processed by Stripe.</p><p className="flex items-center gap-3"><Mail className="h-5 w-5 shrink-0 text-[#78432d]"/>You’ll receive a receipt by email.</p></div>
        </div>
        <footer className="border-t border-[#e8ded7] pt-5 text-sm text-neutral-600 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"><a href="mailto:adjiashairbraiding@gmail.com" className="flex items-center gap-2 underline decoration-[#b98b73] underline-offset-4"><CircleHelp className="h-4 w-4"/>Need help? Contact AH Braiding</a></div>
          <p className="mt-4 text-center text-xs text-neutral-400">Payment link expires {dateTime(data.expiresAt)}.</p>
        </footer>
      </div>
    </section>
  </main>;
}
