"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config/api";

type PaymentFormProps = {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
  appointmentId?: number;
  customerEmail: string;
  customerName: string;
};

export default function PaymentForm({
  amount,
  onSuccess,
  onBack,
  appointmentId,
  customerEmail,
  customerName,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: {
          billing_details: {
            name: customerName,
            email: customerEmail,
          },
        },
      });

      if (paymentMethodError) {
        setError(paymentMethodError.message || "Failed to create payment method");
        setLoading(false);
        return;
      }

      if (!paymentMethod || !paymentMethod.id) {
        console.error("Payment method creation failed:", paymentMethod);
        setError("Failed to create payment method");
        setLoading(false);
        return;
      }

      console.log("Payment method created successfully:", paymentMethod.id);

      const requestBody = {
        amount,
        currency: "usd",
        paymentMethodId: paymentMethod.id,
        appointmentId,
        customerEmail,
        customerName,
      };

      console.log("Sending payment intent request:", requestBody);

      const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to authorize payment");
      }

      const result = await response.json();

      if (result.status === "requires_capture") {
        onSuccess(result.paymentIntentId);
      } else {
        setError("Payment authorization failed. Please try again.");
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
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-300 rounded-sm p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-3 tracking-wide">
              Payment Authorization
            </h3>
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium text-base">
                Authorization Amount: <span className="text-lg font-bold text-blue-700">${(amount / 100).toFixed(2)}</span>
              </p>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span className="text-blue-800">Card authorized, <strong className="font-semibold">NOT charged</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span className="text-blue-800">Payment processes after admin approval</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span className="text-blue-800">Full refund if appointment denied</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-300 rounded-sm p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
          <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-wide">
            Card Information
          </h3>
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
              paymentMethodOrder: ["card", "apple_pay", "google_pay"],
              defaultValues: {
                billingDetails: {
                  name: customerName,
                  email: customerEmail,
                },
              },
              fields: {
                billingDetails: {
                  name: "never",
                  email: "never",
                },
              },
              wallets: {
                applePay: "auto",
                googlePay: "auto",
              },
              terms: {
                card: "never",
              },
            }}
          />
        </div>
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
