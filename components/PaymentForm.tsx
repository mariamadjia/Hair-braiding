"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock, AlertCircle } from "lucide-react";

type PaymentFormProps = {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
  clientSecret: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
};

export default function PaymentForm({
  amount,
  onSuccess,
  onBack,
  clientSecret,
  customerEmail,
  customerPhone,
  customerName,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingEmail, setBillingEmail] = useState(customerEmail);
  const [confirmedPhone, setConfirmedPhone] = useState(customerPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Failed to submit payment details");
        setLoading(false);
        return;
      }

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete("payment_intent");
      returnUrl.searchParams.delete("payment_intent_client_secret");
      returnUrl.searchParams.delete("redirect_status");

      // Confirm payment using the client secret
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl.toString(),
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: billingEmail.trim(),
            },
          },
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        setError(confirmError.message || "Payment confirmation failed");
        setLoading(false);
        return;
      }

      console.log("Payment confirmed:", paymentIntent);

      // Check if payment is in the correct state
      if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded")) {
        onSuccess(paymentIntent.id);
      } else {
        setError(`Payment authorization failed. Status: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border-2 border-neutral-300 rounded-sm p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
          <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-wide">
            Payment Method
          </h3>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            Email address <span className="text-red-600" aria-hidden="true">*</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={billingEmail}
              onChange={(event) => setBillingEmail(event.target.value)}
              className="mt-2 w-full rounded-sm border border-neutral-300 px-3 py-3 text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            Phone number <span className="text-red-600" aria-hidden="true">*</span>
            <input
              type="tel"
              required
              autoComplete="tel"
              value={confirmedPhone}
              onChange={(event) => setConfirmedPhone(event.target.value)}
              className="mt-2 w-full rounded-sm border border-neutral-300 px-3 py-3 text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </label>
        </div>
        <div className="bg-white rounded-sm">
          <PaymentElement
            options={{
              layout: {
                type: "accordion",
                defaultCollapsed: false,
                radios: true,
                spacedAccordionItems: false,
              },
              defaultValues: {
                billingDetails: {
                  name: customerName,
                  email: billingEmail,
                },
              },
              fields: {
                billingDetails: {
                  name: "never",
                  email: "never",
                },
              },
              wallets: {
                applePay: "never",
                googlePay: "never",
              },
              paymentMethodOrder: [
                "card",
              ],
              terms: {
                card: "never",
              },
            }}
          />
        </div>
        <p className="mt-4 text-xs leading-5 text-neutral-600">
          By continuing, you authorize AH Braiding Salon to save this card and charge any remaining
          no-show balance described in the Booking Policies. Your deposit is credited toward that fee.
        </p>
      </div>

      {error && (
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-300 rounded-sm p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 mb-1 tracking-wide">Payment Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-neutral-300 rounded-sm p-6 shadow-sm">
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={loading}
            className="flex-1 rounded-none border-2 border-neutral-300 bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={!stripe || loading}
            className="flex-1 rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.25em] transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Authorizing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Authorize ${(amount / 100).toFixed(2)}
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-neutral-200 text-xs text-neutral-600">
          <Lock className="h-3.5 w-3.5" />
          <span className="font-medium">Secured by Stripe • Your payment info is safe</span>
        </div>
      </div>
    </form>
  );
}
