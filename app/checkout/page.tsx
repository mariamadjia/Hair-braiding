"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import BookingCalendar from "@/components/BookingCalendar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Navbar from "@/components/Navbar";
import FooterWrapper from "@/components/FooterWrapper";
import { API_BASE_URL } from "@/lib/config/api";
import { toProxyUrl } from "@/lib/utils/image";

type AuthoritativeService = {
    id: number;
    name: string;
    price?: string;
    description?: string;
    image?: string;
    sizePhotos?: string[];
    subcategoryName?: string;
    hairTextures?: string[];
    foundationChoicesEnabled?: boolean;
    knotlessPriceAdjustment?: string;
    lengthOptions?: Array<{ id: number; name?: string; price?: string; imageUrl?: string }>;
};

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [authoritativeService, setAuthoritativeService] = useState<AuthoritativeService | null>(null);
    const [serviceLoading, setServiceLoading] = useState(true);
    const [serviceError, setServiceError] = useState<string | null>(null);
    const [bookingStep, setBookingStep] = useState<"date" | "time" | "details" | "payment" | "success">("date");

    const categorySlug = searchParams.get("categorySlug") || "";
    const subcategorySlug = searchParams.get("subcategorySlug") || "";
    const serviceIdParam = searchParams.get("serviceId");
    const serviceId = serviceIdParam && /^\d+$/.test(serviceIdParam) ? Number(serviceIdParam) : undefined;
    const lengthOptionIdParam = searchParams.get("lengthOptionId");
    const lengthOptionId = lengthOptionIdParam && /^\d+$/.test(lengthOptionIdParam) ? Number(lengthOptionIdParam) : undefined;
    const selectedOption = authoritativeService?.lengthOptions?.find(option => option.id === lengthOptionId);
    const styleName = authoritativeService?.subcategoryName || authoritativeService?.name || "Service";
    const serviceName = authoritativeService?.name || "";
    const lengthLabel = selectedOption?.name || "";
    const foundation = searchParams.get("foundation") || "";
    const basePrice = selectedOption?.price || authoritativeService?.price || "";
    const price = foundation === "KNOTLESS"
        ? String(Number(basePrice.replace(/[^0-9.]/g, "")) + Number((authoritativeService?.knotlessPriceAdjustment || "0").replace(/[^0-9.]/g, "")))
        : basePrice;
    const description = authoritativeService?.description || "";
    const texture = searchParams.get("texture") || "";
    const image = toProxyUrl(
        selectedOption?.imageUrl
        || authoritativeService?.sizePhotos?.[0]
        || authoritativeService?.image
        || searchParams.get("image")
        || ""
    );
    const numericPrice = Number(price.replace(/[^0-9.]/g, "")) || 0;
    const depositAmount = Math.min(50, numericPrice);
    const depositAmountCents = Math.round(depositAmount * 100);
    const remainingBalance = Math.max(0, numericPrice - depositAmount);
    const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
    const activeProgressStep = bookingStep === "date" || bookingStep === "time"
        ? 2
        : bookingStep === "details"
            ? 3
            : 4;

    const changeService = () => {
        if (categorySlug && subcategorySlug) {
            router.push(`/booking/${categorySlug}/${subcategorySlug}`);
        } else {
            router.back();
        }
    };

    useEffect(() => {
        if (!serviceId) {
            setServiceError("This checkout link does not contain a valid service.");
            setServiceLoading(false);
            return;
        }
        const controller = new AbortController();
        fetch(`${API_BASE_URL}/api/services/${serviceId}`, { signal: controller.signal })
            .then(response => response.ok ? response.json() : Promise.reject(new Error("Service unavailable")))
            .then(service => {
                const optionIsRequired = Boolean(lengthOptionId);
                const optionExists = service.lengthOptions?.some((option: { id: number }) => option.id === lengthOptionId);
                if (service.lengthOptions?.length && !optionIsRequired) throw new Error("Choose a length before checking out.");
                if (optionIsRequired && !optionExists) throw new Error("The selected length is no longer available.");
                if (service.foundationChoicesEnabled && !["REGULAR", "KNOTLESS"].includes(foundation)) throw new Error("Choose a braid foundation before checking out.");
                if (!service.foundationChoicesEnabled && foundation) throw new Error("This service does not offer braid foundation choices.");
                setAuthoritativeService(service);
            })
            .catch(error => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                console.error("Unable to load authoritative service details", error);
                setServiceError(error instanceof Error ? error.message : "This service is unavailable.");
            })
            .finally(() => setServiceLoading(false));
        return () => controller.abort();
    }, [serviceId, lengthOptionId, foundation]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                router.back();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    if (serviceLoading) return <><Navbar /><main className="flex min-h-[65vh] items-center justify-center bg-[#F6F5F1]"><LoadingSpinner /></main><FooterWrapper /></>;
    if (serviceError || !authoritativeService) return <><Navbar /><main className="flex min-h-[65vh] items-center justify-center bg-[#F6F5F1] px-6"><div role="alert" className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center"><AlertCircle className="mx-auto mb-3 h-7 w-7 text-red-600" /><h1 className="font-serif text-2xl">Service unavailable</h1><p className="mt-2 text-sm text-neutral-600">{serviceError}</p><Button className="mt-6" onClick={() => router.back()}>Choose another service</Button></div></main><FooterWrapper /></>;

    return (
        <>
            <Navbar />
            <section className="relative isolate overflow-hidden bg-[#FBF7F1] pb-16 pt-6 text-neutral-900 md:pb-20 md:pt-7">
                <img
                    src="/checkout/checkout-hero.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-30 h-full w-full scale-[1.02] object-cover object-center opacity-55 blur-[1.5px]"
                />
                <div className="absolute inset-0 -z-20 bg-[#FBF7F1]/55" aria-hidden="true" />
                <div
                    className="absolute inset-0 -z-10 bg-gradient-to-b from-[#FFFDF9]/30 via-[#FBF7F1]/45 to-[#FBF7F1]/85"
                    aria-hidden="true"
                />

                <div className="container relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <ol className="mx-auto mb-6 grid max-w-3xl grid-cols-4" aria-label="Booking progress">
                        {["Style", "Date & Time", "Details", "Payment"].map((label, index) => {
                            const stepNumber = index + 1;
                            const isActive = activeProgressStep === stepNumber;
                            const isComplete = activeProgressStep > stepNumber;
                            return (
                                <li key={label} className="relative flex flex-col items-center text-center">
                                    {index > 0 && (
                                        <span className="absolute right-1/2 top-4 h-px w-full bg-[#D8C3B1]" aria-hidden="true" />
                                    )}
                                    <span
                                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                                            isActive
                                                ? "border-[#B8754E] bg-[#B8754E] text-white ring-2 ring-[#E8D5C5]"
                                                : isComplete
                                                    ? "border-[#A58D7C] bg-[#FBF7F1] text-[#2C1810]"
                                                    : "border-[#CDB9A9] bg-[#FBF7F1] text-[#76675E]"
                                        }`}
                                    >
                                        {stepNumber}
                                    </span>
                                    <span className={`mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] sm:text-[10px] ${
                                        isActive ? "text-[#A25735]" : "text-[#665850]"
                                    }`}>
                                        {label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="text-center">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#A25735] sm:text-xs">
                            Book Your Appointment
                        </p>
                        <h1 className="text-4xl font-light leading-tight tracking-[0.025em] text-[#2C1810] md:text-5xl lg:text-[3.25rem]">
                            <span className="font-serif">Complete Your Appointment</span>
                        </h1>
                        <p className="mx-auto mt-3 max-w-3xl text-sm font-light leading-relaxed tracking-[0.04em] text-[#665850] md:text-[16px]">
                          Review your selection, choose a date, and continue to payment.
                        </p>
                        <div className="mx-auto mt-4 flex max-w-[280px] items-center gap-3" aria-hidden="true">
                            <span className="h-px flex-1 bg-[#D9C2B1]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B8754E]" />
                            <span className="h-px flex-1 bg-[#D9C2B1]" />
                        </div>
                    </div>
                </div>

                <svg
                    className="pointer-events-none absolute -bottom-[44px] left-0 h-16 w-full"
                    viewBox="0 0 1440 96"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path
                        d="M0 5 Q720 52 1440 5 L1440 96 L0 96 Z"
                        fill="#FBF7F1"
                    />
                    <path
                        d="M0 5 Q720 52 1440 5"
                        fill="none"
                        stroke="#DEC8B8"
                        strokeWidth="1"
                    />
                </svg>
            </section>

            <section className="relative z-20 min-h-[70vh] bg-transparent pb-24 pt-6 md:pb-32">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Left Column - Appointment Summary */}
                        <div className="space-y-6 lg:sticky lg:top-24 lg:h-full">
                            {/* Appointment Summary Card */}
                            <div className="border border-[#D9C4B3] bg-[#FFFDF9] p-6 shadow-[0_10px_30px_rgba(44,24,16,0.06)] sm:p-7 lg:h-full">
                                {/* Header */}
                                <div className="mb-6 flex items-center gap-3 border-b border-[#E9DDD3] pb-5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9C4B3] bg-[#F8EFE7]">
                                        <CalendarDays className="h-5 w-5 text-[#B0633E]" />
                                    </div>
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2C1810]">
                                        Appointment Summary
                                    </h2>
                                </div>

                                {/* Service Info */}
                                <div className="mb-5 flex gap-5 border-b border-[#E9DDD3] pb-6">
                                    <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-[6px] bg-[#F5ECE3] sm:h-44 sm:w-44">
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
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <h3 className="font-serif text-2xl leading-tight text-[#2C1810]">{styleName}</h3>
                                        <button
                                            type="button"
                                            onClick={changeService}
                                            className="mt-3 w-fit text-xs font-medium text-[#A25735] underline decoration-[#B8754E] underline-offset-4 transition hover:text-[#2C1810]"
                                        >
                                            Edit selection
                                        </button>
                                        <div className="mt-auto space-y-3">
                                            {serviceName && (
                                                <div className="flex items-center justify-between border-b border-[#EEE3DA] pb-2">
                                                    <span className="text-xs tracking-wide text-[#76675E]">Size</span>
                                                    <span className="text-sm font-medium text-[#2C1810]">{serviceName}</span>
                                                </div>
                                            )}
                                            {lengthLabel && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs tracking-wide text-[#76675E]">Length</span>
                                                    <span className="text-sm font-medium text-[#2C1810]">{lengthLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Date/Time */}
                                <div className="space-y-1 border-b border-[#E9DDD3] pb-4">
                                    <div className="flex items-center justify-between px-1 py-3">
                                        <span className="text-xs tracking-wide text-[#76675E]">Selected Date</span>
                                        <span className="text-sm font-medium text-[#2C1810]">
                                            {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not selected'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-1 py-3">
                                        <span className="text-xs tracking-wide text-[#76675E]">Selected Time</span>
                                        <span className="text-sm font-medium text-[#2C1810]">
                                            {selectedTime || 'Not selected'}
                                        </span>
                                    </div>
                                </div>

                                {/* Price Breakdown */}
                                <div className="space-y-1 pt-3">
                                    <div className="flex items-center justify-between px-1 py-3">
                                        <span className="text-sm font-medium tracking-wide text-[#4F4038]">Total Price</span>
                                        <span className="font-semibold text-[#2C1810]">
                                            {formatCurrency(numericPrice)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-[4px] border border-[#E2CDBB] bg-[#F8EFE7] px-3 py-3">
                                        <span className="text-sm font-medium text-[#8E4E30]">Deposit Today</span>
                                        <span className="font-semibold text-[#8E4E30]">{formatCurrency(depositAmount)}</span>
                                    </div>

                                    <div className="flex items-center justify-between px-1 py-3">
                                        <span className="text-sm font-medium tracking-wide text-[#4F4038]">Remaining Balance</span>
                                        <span className="font-semibold text-[#2C1810]">{formatCurrency(remainingBalance)}</span>
                                    </div>
                                </div>
                            </div>

</div>
                        {/* Right Column - Embedded Calendar */}
                        <div className="flex h-full flex-col">
                            <div className="h-full rounded-sm shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
                                <BookingCalendar
                                    className="h-full"
                                    serviceName={styleName}
                                    serviceSize={serviceName}
                                    serviceLength={lengthLabel}
                                    servicePrice={price}
                                    serviceId={serviceId}
                                    lengthOptionId={lengthOptionId}
                                    selectedTexture={texture}
                                    selectedFoundation={foundation}
                                    depositAmountCents={depositAmountCents}
                                    onDateSelected={setSelectedDate}
                                    onTimeSelected={setSelectedTime}
                                    onStepChange={setBookingStep}
                                    onBookingComplete={() => undefined}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <FooterWrapper />
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
