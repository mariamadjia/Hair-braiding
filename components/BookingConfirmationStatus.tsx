"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config/api";

type Status = { appointmentStatus?: string; paymentStatus?: string; requireApproval?: boolean; approvalRequested?: boolean };
export function bookingStatusMessage(status: Status | null): { title: string; body: string } {
    if (!status) return { title: "Checking your booking", body: "Payment was submitted. We are checking confirmation; please do not submit another booking." };
    if (["CANCELLED", "DENIED"].includes(status.appointmentStatus || "")) return { title: "Booking not confirmed", body: "This booking is no longer active. Contact the salon for assistance." };
    if (status.appointmentStatus === "APPROVED") return { title: "Appointment confirmed", body: "Your appointment is confirmed. Your confirmation will be sent by email and, if you opted in, by text." };
    if (status.paymentStatus?.includes("FAILED")) return { title: "Confirmation needs attention", body: "Your booking is not confirmed yet. The salon is retrying the payment operation. Please do not book again." };
    if (status.appointmentStatus === "PENDING" && !status.approvalRequested && status.requireApproval !== false && status.paymentStatus === "AUTHORIZED") return { title: "Awaiting salon approval", body: "Your deposit is authorized, not charged. The salon will review your request and send its decision by email and, if you opted in, by text." };
    return { title: "Confirmation processing", body: "Your booking is not confirmed yet. This page updates automatically. Please do not submit another booking." };
}

export default function BookingConfirmationStatus({ appointmentId, paymentToken }: { appointmentId: number | null; paymentToken: string | null }) {
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!appointmentId || !paymentToken) { setError(true); return; }
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        const controller = new AbortController();
        const refresh = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/payments/booking-status?appointmentId=${appointmentId}&paymentToken=${encodeURIComponent(paymentToken)}`, { signal: controller.signal });
                if (!response.ok) throw new Error('Status unavailable');
                const value: Status = await response.json();
                if (stopped) return;
                setStatus(value); setError(false);
                if (["APPROVED", "DENIED", "CANCELLED"].includes(value.appointmentStatus || "")) return;
                if (!value.approvalRequested && value.requireApproval !== false && value.paymentStatus === "AUTHORIZED") return;
            } catch { if (stopped) return; setError(true); }
            timer = setTimeout(refresh, 5000);
        };
        void refresh();
        return () => { stopped = true; controller.abort(); clearTimeout(timer); };
    }, [appointmentId, paymentToken]);
    const message = bookingStatusMessage(status);
    return <div aria-live="polite"><h3 className="text-2xl font-light text-neutral-900 mb-4">{message.title}</h3><p className="text-neutral-600 mb-6">{message.body}</p>{error && <p role="alert" className="mb-4 text-amber-700">We cannot verify the latest status right now. Check your email or contact the salon before making another booking.</p>}</div>;
}
