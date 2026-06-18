"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock, DollarSign, Info, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import BookingCalendar from "@/components/BookingCalendar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const styleName = searchParams.get("style") || searchParams.get("service") || "Service";
    const serviceName = searchParams.get("size") || searchParams.get("service") || "";
    const lengthLabel = searchParams.get("length") || "";
    const price = searchParams.get("price") || "";
    const duration = searchParams.get("duration") || "";
    const description = searchParams.get("description") || "";
    const texture = searchParams.get("texture") || "";
    const image = decodeURIComponent(searchParams.get("image") || "");
    const refreshToken = searchParams.toString();

    console.log("Checkout - Received image URL:", image);
    console.log("Checkout - Full search params:", refreshToken);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                router.back();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    return (
        <>
            <Navbar />
            <section className="bg-[#FFF5EE] pt-8 pb-12 md:pt-12 md:pb-16 text-neutral-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="mb-12 rounded-none border border-neutral-300 bg-transparent px-6 py-2.5 text-xs font-medium uppercase tracking-[0.25em] text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                    >
                        <ChevronLeft className="h-3 w-3 mr-2" />
                        Back
                    </Button>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-light tracking-wide text-neutral-900 leading-tight">
                            <span className="font-serif">Complete Your Appointment</span>
                        </h1>
                        <p className="mt-4 text-[16px] text-neutral-700 max-w-3xl mx-auto leading-relaxed tracking-[0.04em] font-light">
                          Review your selection, choose a date, and continue to payment.
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-[#FFF5EE] pb-24 md:pb-32 min-h-[70vh]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Appointment Summary */}
                        <div className="space-y-6 lg:sticky lg:top-24">
                            {/* Appointment Summary Card */}
                            <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-100">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl flex items-center justify-center shadow-sm">
                                        <CalendarDays className="h-5 w-5 text-amber-700" />
                                    </div>
                                    <h2 className="text-xs font-semibold tracking-[0.2em] text-neutral-800 uppercase">
                                        Appointment Summary
                                    </h2>
                                </div>

                                {/* Service Info */}
                                <div className="flex gap-4 mb-5 pb-5 border-b border-neutral-100">
                                    <div className="w-28 h-28 lg:w-40 lg:h-40 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 rounded-xl flex-shrink-0 overflow-hidden shadow-inner">
                                        {image ? (
                                            <img
                                                src={image}
                                                alt={styleName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    console.error("Image failed to load:", image);
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between h-28 lg:h-40">
                                        <h3 className="text-2xl font-serif text-neutral-900 leading-tight">
                                            {styleName}
                                        </h3>
                                        <div className="space-y-2">
                                            {serviceName && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-neutral-500 text-xs tracking-wide">Size</span>
                                                    <span className="text-neutral-900 font-medium text-sm">{serviceName}</span>
                                                </div>
                                            )}
                                            {lengthLabel && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-neutral-500 text-xs tracking-wide">Length</span>
                                                    <span className="text-neutral-900 font-medium text-sm">{lengthLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-3 py-2">
                                        <span className="text-neutral-600 font-medium text-sm tracking-wide">Total Price</span>
                                        <span className="text-neutral-900 font-semibold">
                                            {price || "$0.00"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/50 rounded-xl px-3 py-2 shadow-sm">
                                        <span className="text-amber-900 font-medium text-sm">Deposit Today <span className="text-amber-700/80 font-normal text-xs"></span></span>
                                        <span className="text-amber-900 font-semibold">$50.00</span>
                                    </div>

                                    <div className="flex justify-between items-center px-3 py-2">
                                        <span className="text-neutral-600 font-medium text-sm tracking-wide">Remaining Balance</span>
                                        <span className="text-neutral-900 font-semibold">
                                            ${price ? (parseFloat(price.replace("$", "").replace(",", "")) - 50).toFixed(2) : "0.00"}
                                        </span>
                                    </div>
                                </div>
                            </div>

    {/* Deposit Policy Card */}
    <div className="bg-[#FFF5EE] rounded-2xl p-6 md:p-8 border border-neutral-200/70 shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 mb-5">
            <svg
                className="w-10 h-10 text-amber-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
            </svg>

            <h3 className="text-sm md:text-base font-semibold text-neutral-900 uppercase tracking-[0.18em]">
                Deposit Policy
            </h3>
        </div>

        <div className="space-y-4">
            {[
                "Your card will be authorized today, but not charged.",
                "Payment is processed only after admin approval.",
                "If denied, the hold is released immediately.",
                "Fully refunded if your appointment is denied.",
            ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                    <svg
                        className="w-6 h-6 text-amber-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4"
                        />
                    </svg>

                    <span className="text-neutral-700 leading-relaxed">
                        {item}
                    </span>
                </div>
            ))}
        </div>

        {/* Secure Note */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-neutral-200">
            <div className="w-9 h-9 bg-neutral-100 rounded-full flex items-center justify-center">
                <Lock className="h-4 w-4 text-neutral-600" />
            </div>

            <span className="text-sm text-neutral-600 leading-relaxed">
                Your payment information is secure and encrypted.
            </span>
        </div>
    </div>
</div>
                        {/* Right Column - Embedded Calendar */}
                        <div className="flex flex-col">
                            <div className="rounded-sm shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
                                <BookingCalendar
                                    serviceName={styleName}
                                    serviceSize={serviceName}
                                    serviceLength={lengthLabel}
                                    servicePrice={price}
                                    onBookingComplete={(bookingData) => {
                                        console.log("Booking completed:", bookingData);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
