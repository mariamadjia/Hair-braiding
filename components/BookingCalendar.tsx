"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Clock, User, Mail, Loader2, Phone, X, ShieldCheck, LockKeyhole } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";
import BookingConfirmationStatus from "@/components/BookingConfirmationStatus";
import PaymentForm from "@/components/PaymentForm";
import { API_BASE_URL } from "@/lib/config/api";

type TimeSlot = {
    time: string;
    available: boolean;
};

type DateAvailability = "loading" | "available" | "unavailable" | "error";

type BookingCalendarProps = {
    className?: string;
    onBookingComplete?: (bookingData: BookingData) => void;
    onDateSelected?: (date: Date | null) => void;
    onTimeSelected?: (time: string | null) => void;
    onStepChange?: (step: "date" | "time" | "details" | "payment" | "success") => void;
    serviceName?: string;
    serviceSize?: string;
    serviceLength?: string;
    servicePrice?: string;
    serviceId?: number;
    lengthOptionId?: number;
    selectedTexture?: string;
    selectedFoundation?: string;
    depositAmountCents?: number;
    quoteToken: string;
};

type BookingData = {
    date: Date;
    time: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    notes?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const PENDING_PAYMENT_STORAGE_KEY = "ah-braiding-pending-payment";
const SALON_TIME_ZONE = "America/Chicago";

const salonToday = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: SALON_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return new Date(Number(value.year), Number(value.month) - 1, Number(value.day));
};

const parseStoredCalendarDate = (value: string) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
};

const policySections = (depositAmountCents: number) => [
    {
        title: "Appointments, Deposits & Approval",
        points: [
            "All braiding services are available by appointment.",
            `A card authorization of $${(depositAmountCents / 100).toFixed(2)} is required to submit your appointment request. Your card is charged when the appointment is approved, automatically or after salon review according to the booking policy.`,
            `Once approved, the $${(depositAmountCents / 100).toFixed(2)} deposit is non-refundable and will be applied toward your total service balance. If your request is denied, the authorization hold is released.`,
            "Please note that all payments are final and non-refundable. No refunds will be issued under any circumstances.",
        ],
    },
    {
        title: "Hair & Appointment Preparation",
        points: [
            "Please arrive with clean, fully detangled hair unless a wash and blow-dry service has been scheduled.",
            "Additional detangling or preparation fees may apply.",
            "You are responsible for providing the correct type, color, and quantity of extension hair unless hair is included with your selected service.",
            "Additional hair may result in an additional charge.",
            "Please inform your stylist of any scalp sensitivity, recent chemical services, hair loss, or other concerns before your appointment.",
            "The stylist may decline or modify a service if your hair or scalp appears unsuitable for braiding.",
        ],
    },
    {
        title: "Late Arrivals",
        points: [
            "Please arrive on time. A 30-minute grace period is provided.",
            "Arrivals beyond the grace period may result in a shortened service, an additional fee, or rescheduling.",
            "Your deposit may be forfeited if the appointment cannot be completed.",
        ],
    },
    {
        title: "Cancellations, Rescheduling & No-Shows",
        points: [
            "At least 72 hours’ notice is required to cancel or reschedule.",
            "Late cancellations and no-shows may result in loss of the deposit and/or a requirement to pay a new deposit before booking another appointment.",
            "An appointment is considered a no-show when a client misses their scheduled appointment without providing notice.",
            "Missing your appointment without notice will result in a non-refundable fee equal to 60% of the scheduled service price. Your deposit is applied toward this fee.",
            "By accepting these policies, you authorize AH Braiding Salon to save the card used for your deposit and charge the remaining no-show balance to that card. The charge is normally processed within 24 hours after the missed appointment and no later than seven calendar days afterward.",
            "Repeated no-shows may result in the loss of future booking privileges.",
        ],
    },
    {
        title: "Photos & Promotional Use",
        points: [
            "AH Braiding Salon may photograph or record completed hairstyles for use on our website, social media, portfolio, and other promotional materials.",
            "If you prefer not to be photographed or recorded, please notify your stylist before your service begins. We will respect your request.",
        ],
    },
];

export default function BookingCalendar({ 
    className, 
    onBookingComplete,
    onDateSelected,
    onTimeSelected,
    onStepChange,
    serviceName,
    serviceSize,
    serviceLength,
    servicePrice,
    serviceId,
    lengthOptionId,
    selectedTexture,
    selectedFoundation,
    depositAmountCents = 5000,
    quoteToken
}: BookingCalendarProps) {
    const [currentDate, setCurrentDate] = useState(salonToday);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [step, setStep] = useState<"date" | "time" | "details" | "payment" | "success">("date");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const [paymentToken, setPaymentToken] = useState<string | null>(null);
    const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
    const [authorizedAmountCents, setAuthorizedAmountCents] = useState(depositAmountCents);
    const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stripePromise] = useState(() => getStripe());
    const availabilityRequest = useRef<AbortController | null>(null);
    const slotsCache = useRef(new Map<string, TimeSlot[]>());
    const [dateAvailability, setDateAvailability] = useState<Record<string, DateAvailability>>({});
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [smsConsentAccepted, setSmsConsentAccepted] = useState(false);
    const [policyModalOpen, setPolicyModalOpen] = useState(false);
    const [expandedPolicy, setExpandedPolicy] = useState(0);

    useEffect(() => () => availabilityRequest.current?.abort(), []);

    useEffect(() => {
        onStepChange?.(step);
    }, [onStepChange, step]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const clientSecret = params.get("payment_intent_client_secret");
        const returnedPaymentIntentId = params.get("payment_intent");
        if (!clientSecret || !returnedPaymentIntentId || !stripePromise) return;

        let cancelled = false;
        void stripePromise.then(async (stripe) => {
            if (!stripe || cancelled) return;

            const storedBooking = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
            if (!storedBooking) {
                setError("We could not verify this payment against your booking. Please start again.");
                return;
            }
            try {
                    const restored = JSON.parse(storedBooking);
                    const statusResponse = await fetch(
                        `${API_BASE_URL}/api/payments/booking-status?appointmentId=${encodeURIComponent(restored.appointmentId)}&paymentToken=${encodeURIComponent(restored.paymentToken)}`
                    );
                    if (!statusResponse.ok) throw new Error("Booking payment verification failed.");
                    const verified = await statusResponse.json();
                    if (verified.paymentIntentId !== returnedPaymentIntentId
                        || (verified.status !== "requires_capture" && verified.status !== "succeeded")) {
                        throw new Error(`Payment authorization was not completed. Status: ${verified.status || "unknown"}`);
                    }
                    if (cancelled) return;
                    const restoredDate = parseStoredCalendarDate(restored.date);
                    setSelectedDate(restoredDate);
                    setSelectedTime(restored.time);
                    setFormData(restored.formData);
                    setCreatedAppointmentId(restored.appointmentId);
                    setPaymentToken(restored.paymentToken);
                    setAuthorizedAmountCents(verified.amount);
                    setConfirmationNumber(`APT-${restored.appointmentId}`);
                    onDateSelected?.(restoredDate);
                    onTimeSelected?.(restored.time);
            } catch (verificationError) {
                setError(verificationError instanceof Error ? verificationError.message : "Payment verification failed.");
                return;
            }

            sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
            setStep("success");

            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("payment_intent");
            cleanUrl.searchParams.delete("payment_intent_client_secret");
            cleanUrl.searchParams.delete("redirect_status");
            window.history.replaceState({}, "", cleanUrl.toString());
        });

        return () => {
            cancelled = true;
        };
    }, [onDateSelected, onTimeSelected, stripePromise]);

    useEffect(() => {
        if (!policyModalOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setPolicyModalOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [policyModalOpen]);
    
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        notes: ""
    });

    // Listen for settings updates and refresh slots
    useEffect(() => {
        const handleSettingsUpdate = () => {
            slotsCache.current.clear();
            setDateAvailability({});
            if (selectedDate) {
                fetchAvailableSlots(selectedDate, true);
            }
        };

        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        
        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate);
        };
    }, [selectedDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];
        
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const isDateDisabled = (day: number | null) => {
        if (!day) return true;
        
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const today = salonToday();
        
        const status = dateAvailability[formatLocalDate(date)];
        return date < today || status === "unavailable";
    };

    const isSameDay = (date1: Date | null, day: number | null) => {
        if (!date1 || !day) return false;
        return (
            date1.getDate() === day &&
            date1.getMonth() === currentDate.getMonth() &&
            date1.getFullYear() === currentDate.getFullYear()
        );
    };

    const handleDateSelect = async (day: number | null) => {
        if (isDateDisabled(day)) return;
        
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day!);
        setSelectedDate(date);
        onDateSelected?.(date);
        setStep("time");
        setLoading(true);
        await fetchAvailableSlots(date);
        setLoading(false);
    };

    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const formatLocalDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:${minute}:00`;
    };

    const slotCacheKey = (date: Date) => `${serviceId ?? "default"}:${lengthOptionId ?? "none"}:${formatLocalDate(date)}`;

    const requestSlots = async (date: Date, signal?: AbortSignal): Promise<TimeSlot[]> => {
        const dateStr = formatLocalDate(date);
        const params = new URLSearchParams({ date: dateStr, timezone: SALON_TIME_ZONE });
        if (serviceId) params.set("serviceId", String(serviceId));
        if (lengthOptionId) params.set("lengthOptionId", String(lengthOptionId));
        const response = await fetch(`${API_BASE_URL}/api/availability/slots?${params}`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            signal
        });
        if (!response.ok) throw new Error(response.status === 500
            ? 'Unable to load available times. Please try again later.'
            : `Failed to fetch available slots: ${response.status}`);
        const backendSlots = await response.json();
        if (!Array.isArray(backendSlots)) return [];
        return backendSlots.map((slot: any) => ({
            time: formatTime24To12(slot.startTime),
            available: slot.isAvailable && slot.availableSpots > 0
        }));
    };

    const fetchAvailableSlots = async (date: Date, force = false) => {
        const dateStr = formatLocalDate(date);
        const cacheKey = slotCacheKey(date);
        const cached = slotsCache.current.get(cacheKey);
        if (!force && cached) {
            setError(null);
            setAvailableSlots(cached);
            return;
        }
        availabilityRequest.current?.abort();
        const controller = new AbortController();
        availabilityRequest.current = controller;
        try {
            const slots = await requestSlots(date, controller.signal);
            slotsCache.current.set(cacheKey, slots);
            setDateAvailability(previous => ({
                ...previous,
                [dateStr]: slots.some(slot => slot.available) ? "available" : "unavailable"
            }));
            setError(null);
            setAvailableSlots(slots);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error fetching available slots:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unable to load available times. Please try again later.';
            setError(errorMessage);
            setAvailableSlots([]);
        } finally {
            if (availabilityRequest.current === controller) availabilityRequest.current = null;
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        const dates = getDaysInMonth(currentDate)
            .filter((day): day is number => day !== null)
            .map(day => new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
            .filter(date => {
                const today = salonToday();
                return date >= today && !slotsCache.current.has(slotCacheKey(date));
            });

        setDateAvailability(previous => {
            const next = { ...previous };
            dates.forEach(date => { next[formatLocalDate(date)] = "loading"; });
            return next;
        });

        const prefetch = async () => {
            for (let index = 0; index < dates.length && !controller.signal.aborted; index += 4) {
                const batch = dates.slice(index, index + 4);
                await Promise.all(batch.map(async date => {
                    const key = formatLocalDate(date);
                    try {
                        const slots = await requestSlots(date, controller.signal);
                        slotsCache.current.set(slotCacheKey(date), slots);
                        setDateAvailability(previous => ({
                            ...previous,
                            [key]: slots.some(slot => slot.available) ? "available" : "unavailable"
                        }));
                    } catch (error) {
                        if (!(error instanceof DOMException && error.name === 'AbortError')) {
                            setDateAvailability(previous => ({ ...previous, [key]: "error" }));
                        }
                    }
                }));
            }
        };
        void prefetch();
        return () => controller.abort();
    }, [currentDate.getFullYear(), currentDate.getMonth(), serviceId, lengthOptionId]);

    const formatTime24To12 = (dateTime: string) => {
        const [, time = "00:00"] = dateTime.split("T");
        const [hourText, minuteText] = time.split(":");
        const hours = Number(hourText);
        const minutes = Number(minuteText);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const formatTime = (time24: string) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        onTimeSelected?.(time);
        setStep("details");
    };

    const validateAvailability = async (date: Date, time: string): Promise<boolean> => {
        try {
            const dateStr = formatLocalDate(date);
            const timezone = SALON_TIME_ZONE;
            const params = new URLSearchParams({ date: dateStr, timezone });
            if (serviceId) params.set("serviceId", String(serviceId));
            if (lengthOptionId) params.set("lengthOptionId", String(lengthOptionId));
            const response = await fetch(`${API_BASE_URL}/api/availability/slots?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error('Failed to validate availability');
                return false;
            }

            const slots = await response.json();
            const slot = slots.find((s: any) => {
                const slotTime = formatTime24To12(s.startTime);
                return slotTime === time;
            });

            return slot && slot.isAvailable && slot.availableSpots > 0;
        } catch (error) {
            console.error('Availability validation error:', error);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime || isSubmitting) return;
        if (!policyAccepted) {
            setError("Please review and accept the booking policies before continuing.");
            return;
        }
        if (!serviceId) {
            setError("This service is not configured for online booking. Please choose it again or contact the salon.");
            return;
        }

        setIsSubmitting(true);
        setLoading(true);
        
        const appointmentDateTime = convertTimeToDateTime(selectedDate, selectedTime);

        try {
            if (createdAppointmentId && paymentToken) {
                if (!paymentClientSecret) {
                    const paymentResponse = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ appointmentId: createdAppointmentId, paymentToken }),
                    });
                    if (!paymentResponse.ok) {
                        const paymentError = await paymentResponse.json();
                        throw new Error(paymentError.error || paymentError.message || "Failed to initialize payment");
                    }
                    const payment = await paymentResponse.json();
                    setPaymentClientSecret(payment.clientSecret);
                    setAuthorizedAmountCents(payment.amount);
                }
                setStep("payment");
                return;
            }
            // Validate availability before booking
            const isAvailable = await validateAvailability(selectedDate, selectedTime);
            if (!isAvailable) {
                throw new Error('This time slot is no longer available. Please select a different time.');
            }

            const response = await fetch(`${API_BASE_URL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    appointmentDateTime: appointmentDateTime,
                    serviceId,
                    serviceName: serviceName || null,
                    selectedSize: serviceSize || null,
                    selectedLength: serviceLength || null,
                    lengthOptionId: lengthOptionId || null,
                    selectedTexture: selectedTexture || null,
                    selectedFoundation: selectedFoundation || null,
                    price: servicePrice ? servicePrice.replace('$', '').trim() : null,
                    notes: formData.notes,
                    quoteToken,
                    depositPolicyAccepted: policyAccepted,
                    offSessionConsentAccepted: policyAccepted,
                    smsConsentAccepted,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409) {
                    const message = errorData.error || errorData.message || "This time slot is no longer available.";
                    alert(message);
                    setStep("time");
                    setSelectedTime(null);
                    onTimeSelected?.(null);
                    await fetchAvailableSlots(selectedDate, true);
                    return;
                }
                throw new Error(errorData.error || errorData.message || 'Failed to create appointment');
            }

            const result = await response.json();
            setCreatedAppointmentId(result.id);
            setPaymentToken(result.paymentToken);
            setConfirmationNumber(`APT-${result.id}`);

            const paymentResponse = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId: result.id, paymentToken: result.paymentToken }),
            });
            if (!paymentResponse.ok) {
                const paymentError = await paymentResponse.json();
                throw new Error(paymentError.error || paymentError.message || "Failed to initialize payment");
            }
            const payment = await paymentResponse.json();
            setPaymentClientSecret(payment.clientSecret);
            setAuthorizedAmountCents(payment.amount);
            sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify({
                appointmentId: result.id,
                paymentToken: result.paymentToken,
                date: formatLocalDate(selectedDate),
                time: selectedTime,
                formData,
            }));
            setStep("payment");
        } catch (error) {
            console.error('Booking error:', error);
            alert(error instanceof Error ? error.message : 'Failed to create appointment. Please try again.');
            // If availability failed, go back to time selection
            if (error instanceof Error && error.message.includes('no longer available')) {
                setStep("time");
                setSelectedTime(null);
                onTimeSelected?.(null);
                await fetchAvailableSlots(selectedDate, true);
            }
        } finally {
            setIsSubmitting(false);
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (paymentIntentId: string) => {
        const bookingData: BookingData = {
            date: selectedDate!,
            time: selectedTime!,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            notes: formData.notes
        };

        setStep("success");
        
        if (onBookingComplete) {
            onBookingComplete(bookingData);
        }
    };

    const convertTimeToDateTime = (date: Date, timeStr: string): string => {
        const [time, period] = timeStr.split(' ');
        const [hourStr, minuteStr] = time.split(':');
        let hour = parseInt(hourStr);
        const minute = parseInt(minuteStr);
        
        if (period === 'PM' && hour !== 12) {
            hour += 12;
        } else if (period === 'AM' && hour === 12) {
            hour = 0;
        }
        
        const appointmentDate = new Date(date);
        appointmentDate.setHours(hour, minute, 0, 0);
        
        return formatLocalDateTime(appointmentDate);
    };

    const goToPreviousMonth = () => {
        const today = salonToday();
        if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth()) return;
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const canGoToPreviousMonth = () => {
        const today = salonToday();
        return currentDate.getFullYear() > today.getFullYear()
            || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() > today.getMonth());
    };

    const isToday = (day: number | null) => {
        if (!day) return false;
        const today = salonToday();
        return day === today.getDate()
            && currentDate.getMonth() === today.getMonth()
            && currentDate.getFullYear() === today.getFullYear();
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const resetToDateSelection = () => {
        setStep("date");
        setSelectedTime(null);
        onTimeSelected?.(null);
    };

    const resetToTimeSelection = () => {
        setStep("time");
    };

    return (
        <div className={cn("bg-[#FFFDF9] rounded-lg shadow-sm border border-[#E5D5C8] overflow-hidden", className)}>
            {/* Header */}
            <div className="bg-[#FFFDF9] border-b border-[#E9DDD3] px-8 py-6">
                <div className="flex items-center justify-between">
                    {step === "date" || step === "time" || step === "details" ? (
                        <>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B0633E]">
                                    {step === "date" && "Choose Your Visit"}
                                    {step === "time" && "Choose Your Time"}
                                    {step === "details" && "Complete Your Request"}
                                </p>
                                <h3 className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[#2C1810] sm:text-4xl">
                                    {step === "date" && "Select a Date"}
                                    {step === "time" && "Select a Time"}
                                    {step === "details" && "Your Details"}
                                </h3>
                                <p className="mt-3 text-xs tracking-wide text-[#76675E]">
                                    {step === "date" && "Select a date to view available times"}
                                    {step === "time" && "Choose an available appointment start"}
                                    {step === "details" && "Tell us how to contact you about your appointment"}
                                </p>
                            </div>
                            {step === "date" && (
                                <span className="hidden min-h-11 items-center gap-2 rounded-[4px] border border-[#CDB5A2] px-4 text-xs text-[#4F4038] sm:flex">
                                    <Clock className="h-4 w-4 text-[#8B735F]" />
                                    San Antonio Central Time
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Calendar className="h-5 w-5 text-neutral-700" />
                            </div>
                            <h3 className="text-xl font-light tracking-tight text-neutral-900">
                                {step === "payment" && "Payment"}
                            </h3>
                        </div>
                    )}
                    {step !== "date" && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={step === "time" ? resetToDateSelection : resetToTimeSelection}
                            className="text-[10px] uppercase tracking-[0.18em] text-[#8B735F] hover:text-[#2C1810] hover:bg-[#F4E9E0]"
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                            {step === "time" ? "Back to Dates" : "Back"}
                        </Button>
                    )}
                </div>
                
                {selectedDate && (step === "details" || step === "payment") && (
                    <div className="mt-5 border-t border-[#E9DDD3] pt-4 sm:hidden">
                        <div className="flex items-center gap-3 border border-[#D9C4B3] bg-[#F8EFE7] px-3 py-3">
                            <Calendar className="h-4 w-4 flex-shrink-0 text-[#B0633E]" aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A25735]">
                                    Your Appointment
                                </p>
                                <p className="mt-1 truncate text-xs font-medium text-[#2C1810]">
                                    {selectedDate.toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    {selectedTime && <span> · {selectedTime}</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Date Selection */}
            {step === "date" && (
                <div className="p-8">
                    <div className="mb-7 flex sm:hidden">
                        <span className="flex min-h-11 items-center gap-2 rounded-[4px] border border-[#CDB5A2] px-3 text-[11px] text-[#4F4038]">
                            <Clock className="h-4 w-4 text-[#8B735F]" />
                            San Antonio Central Time
                        </span>
                    </div>
                    <div className="flex items-center justify-between mb-7">
                        <button
                            onClick={goToPreviousMonth}
                            disabled={!canGoToPreviousMonth()}
                            className="p-2.5 text-[#B0633E] transition-all duration-200 hover:bg-[#F4E9E0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E] disabled:opacity-25 disabled:pointer-events-none"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h4 className="font-serif text-2xl font-normal tracking-[-0.01em] text-[#2C1810]">
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h4>
                        <button
                            onClick={goToNextMonth}
                            className="p-2.5 text-[#B0633E] transition-all duration-200 hover:bg-[#F4E9E0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E]"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-3">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#665850]"
                            >
                                {day}
                            </div>
                        ))}
                        
                        {getDaysInMonth(currentDate).map((day, index) => {
                            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                            const status = date ? dateAvailability[formatLocalDate(date)] : undefined;
                            return (
                            <button
                                key={index}
                                onClick={() => handleDateSelect(day)}
                                disabled={isDateDisabled(day)}
                                aria-label={day ? `${MONTHS[currentDate.getMonth()]} ${day}${status === 'available' ? ', appointments available' : status === 'unavailable' ? ', unavailable' : ''}` : "Empty day"}
                                aria-pressed={isSameDay(selectedDate, day)}
                                className={cn(
                                    "relative aspect-square min-h-11 rounded-[8px] border p-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E]",
                                    day === null && "invisible",
                                    !isDateDisabled(day) && "cursor-pointer border-[#EADFD5] bg-[#FFFCF8] text-[#2C1810] hover:-translate-y-0.5 hover:border-[#B8754E] hover:bg-[#F8EFE7] hover:shadow-sm",
                                    isDateDisabled(day) && "cursor-not-allowed border-[#F1EBE5] bg-[#FBF8F4]/70 text-[#D1C8C0]",
                                    isToday(day) && !isSameDay(selectedDate, day) && "ring-1 ring-inset ring-[#A58D7C] font-semibold",
                                    isSameDay(selectedDate, day) && "border-[#2C1810] bg-[#FFFDF9] text-[#2C1810] ring-2 ring-[#2C1810] ring-offset-1 shadow-sm"
                                )}
                            >
                                {day}
                                {status === "loading" && day && (
                                    <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neutral-300 animate-pulse" />
                                )}
                                {status === "available" && day && !isSameDay(selectedDate, day) && (
                                    <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#B7602E]" />
                                )}
                            </button>
                        )})}
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEE3DA] pt-5 text-[11px] text-[#76675E]">
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#B7602E]" /> Available</span>
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#DED7D0]" /> Fully booked or closed</span>
                    </div>
                </div>
            )}

            {/* Time Selection */}
            {step === "time" && (
                <div className="h-[430px] space-y-7 overflow-y-auto p-8 sm:h-[580px]">
                    {loading ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#8B735F]">
                                <Loader2 className="h-4 w-4 animate-spin text-[#B0633E]" />
                                <span className="text-xs tracking-wide">Loading available times...</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="h-12 animate-pulse rounded-[4px] border border-[#EEE3DA] bg-[#FBF7F2]" />
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-xs text-[#76675E] text-center max-w-md mb-4 tracking-wide">We couldn't load available times. Please try again.</p>
                            <Button
                                onClick={() => {
                                    setError(null);
                                    if (selectedDate) fetchAvailableSlots(selectedDate);
                                }}
                                variant="ghost"
                                className="border border-[#B8754E] text-xs tracking-wide text-[#8E4E30] hover:bg-[#F4E9E0]"
                            >
                                Try again
                            </Button>
                        </div>
                    ) : availableSlots.filter(slot => slot.available).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="mb-1 text-xs font-medium tracking-wide text-[#4F4038]">No available times</p>
                            <p className="mb-4 text-xs text-[#8B7B71]">
                                This date is fully booked or the salon is closed.
                            </p>
                            <Button
                                onClick={resetToDateSelection}
                                variant="ghost"
                                className="border border-[#B8754E] text-xs tracking-wide text-[#8E4E30] hover:bg-[#F4E9E0]"
                            >
                                Choose another date
                            </Button>
                        </div>
                    ) : (
                        <>
                    {/* Morning */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 < 12 && slot.available;
                    }).length > 0 && (
                        <fieldset className="space-y-3">
                            <legend className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B0633E]">Morning</legend>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 < 12 && slot.available;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        aria-label={`${slot.time} available`}
                                        aria-pressed={selectedTime === slot.time}
                                        className={cn(
                                            "rounded-[4px] border px-4 py-3 text-xs font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E]",
                                            "cursor-pointer border-[#D9C4B3] bg-[#FFFDF9] text-[#4F4038] hover:border-[#B8754E] hover:bg-[#F8EFE7]",
                                            selectedTime === slot.time && "border-[#2C1810] bg-[#2C1810] text-[#FFF8EF] hover:bg-[#2C1810]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {/* Afternoon */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 >= 12 && hour24 < 17 && slot.available;
                    }).length > 0 && (
                        <fieldset className="space-y-3">
                            <legend className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B0633E]">Afternoon</legend>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 >= 12 && hour24 < 17 && slot.available;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        aria-label={`${slot.time} available`}
                                        aria-pressed={selectedTime === slot.time}
                                        className={cn(
                                            "rounded-[4px] border px-4 py-3 text-xs font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E]",
                                            "cursor-pointer border-[#D9C4B3] bg-[#FFFDF9] text-[#4F4038] hover:border-[#B8754E] hover:bg-[#F8EFE7]",
                                            selectedTime === slot.time && "border-[#2C1810] bg-[#2C1810] text-[#FFF8EF] hover:bg-[#2C1810]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {/* Evening */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 >= 17 && slot.available;
                    }).length > 0 && (
                        <fieldset className="space-y-3">
                            <legend className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B0633E]">Evening</legend>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 >= 17 && slot.available;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        aria-label={`${slot.time} available`}
                                        aria-pressed={selectedTime === slot.time}
                                        className={cn(
                                            "rounded-[4px] border px-4 py-3 text-xs font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B8754E]",
                                            "cursor-pointer border-[#D9C4B3] bg-[#FFFDF9] text-[#4F4038] hover:border-[#B8754E] hover:bg-[#F8EFE7]",
                                            selectedTime === slot.time && "border-[#2C1810] bg-[#2C1810] text-[#FFF8EF] hover:bg-[#2C1810]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}
                    </>
                    )}
                </div>
            )}

            {/* Details Form */}
            {step === "details" && (
                <form onSubmit={handleSubmit} className="h-[430px] space-y-5 overflow-y-auto p-8 sm:h-[580px]">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#665850]">
                                <User className="h-4 w-4 text-[#B0633E]" />
                                First Name
                            </label>
                            <Input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="First name"
                                className="h-12 rounded-[4px] border-[#D9C4B3] bg-[#FFFDF9] text-[#2C1810] focus:border-[#B8754E] focus:ring-[#B8754E]"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#665850]">
                                Last Name
                            </label>
                            <Input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Last name"
                                className="h-12 rounded-[4px] border-[#D9C4B3] bg-[#FFFDF9] text-[#2C1810] focus:border-[#B8754E] focus:ring-[#B8754E]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#665850]">
                            <Mail className="h-4 w-4 text-[#B0633E]" />
                            Email Address
                        </label>
                        <Input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            className="h-12 rounded-[4px] border-[#D9C4B3] bg-[#FFFDF9] text-[#2C1810] focus:border-[#B8754E] focus:ring-[#B8754E]"
                        />
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#665850]">
                            <Phone className="h-4 w-4 text-[#B0633E]" />
                            Phone Number
                        </label>
                        <Input
                            type="tel"
                            required
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                            className="h-12 rounded-[4px] border-[#D9C4B3] bg-[#FFFDF9] text-[#2C1810] focus:border-[#B8754E] focus:ring-[#B8754E]"
                        />
                    </div>

                    <section className="border border-[#D9C4B3] bg-[#FCF7F1] p-4" aria-labelledby="booking-policy-consent">
                        <div className="flex items-center gap-2 text-[#B0633E]">
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            <h4 id="booking-policy-consent" className="text-[10px] font-semibold uppercase tracking-[0.22em]">Booking Policies</h4>
                        </div>
                        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#4F4038]">
                            <input
                                type="checkbox"
                                checked={policyAccepted}
                                onChange={(event) => {
                                    setPolicyAccepted(event.target.checked);
                                    if (event.target.checked) setError(null);
                                }}
                                className="mt-1 h-5 w-5 flex-shrink-0 rounded-sm border-[#BBA18E] text-[#2C1810] focus:ring-[#B8754E]"
                                required
                            />
                            <span>
                                I have read and agree to AH Braiding Salon’s Booking Policies.{" "}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setPolicyModalOpen(true);
                                    }}
                                    className="font-medium text-[#A25735] underline decoration-[#B8754E] underline-offset-4 hover:text-[#2C1810]"
                                >
                                    View full policies
                                </button>
                            </span>
                        </label>
                    </section>

                    <section className="border border-[#D9C4B3] bg-white p-4" aria-labelledby="sms-consent">
                        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#4F4038]">
                            <input
                                type="checkbox"
                                checked={smsConsentAccepted}
                                onChange={(event) => setSmsConsentAccepted(event.target.checked)}
                                className="mt-1 h-5 w-5 flex-shrink-0 rounded-sm border-[#BBA18E] text-[#2C1810] focus:ring-[#B8754E]"
                            />
                            <span id="sms-consent">
                                I agree to receive transactional SMS messages from AH Braiding about my appointments. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to opt out. Stopping texts does not cancel an appointment. Consent is not a condition of purchase. View our{" "}
                                <a href="/privacy" target="_blank" className="font-medium text-[#A25735] underline underline-offset-4">Privacy Policy</a>{" "}
                                and{" "}<a href="/terms" target="_blank" className="font-medium text-[#A25735] underline underline-offset-4">Terms &amp; Conditions</a>.
                            </span>
                        </label>
                    </section>

                    {error && step === "details" && (
                        <p role="alert" className="text-xs text-red-700">{error}</p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || isSubmitting || !policyAccepted}
                        className="w-full rounded-none bg-[#2C1810] hover:bg-[#45271B] text-white px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition disabled:cursor-not-allowed disabled:bg-[#D8CFC8] disabled:text-[#8E8178]"
                    >
                        {loading || isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            "Continue to Payment"
                        )}
                    </Button>
                </form>
            )}

            {/* Payment Step */}
            {step === "payment" && stripePromise && paymentClientSecret && (
                <div className="p-6">
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret: paymentClientSecret,
                            appearance: {
                                theme: "stripe",
                                variables: {
                                    colorPrimary: "#171717",
                                    colorBackground: "#ffffff",
                                    colorText: "#171717",
                                    colorDanger: "#ef4444",
                                    fontFamily: "system-ui, sans-serif",
                                    borderRadius: "2px",
                                },
                            },
                        }}
                    >
                        <PaymentForm
                            amount={authorizedAmountCents}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep("details")}
                            clientSecret={paymentClientSecret}
                            customerEmail={formData.email}
                            customerPhone={formData.phoneNumber}
                            customerName={`${formData.firstName} ${formData.lastName}`}
                        />
                    </Elements>
                </div>
            )}

            {step === "payment" && !stripePromise && (
                <div className="p-6 text-center text-sm text-red-700">
                    Payments are temporarily unavailable. Please contact the salon or try again later.
                </div>
            )}

            {/* Success Step */}
            {step === "success" && (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <BookingConfirmationStatus appointmentId={createdAppointmentId} paymentToken={paymentToken} />

                    {confirmationNumber && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Confirmation Number</p>
                            <p className="text-lg font-mono font-semibold text-neutral-900">{confirmationNumber}</p>
                        </div>
                    )}
                    
                    <p className="text-sm text-neutral-600 mb-6">Your latest booking status is shown above. All appointment times are San Antonio Central Time.</p>

                    
                    <Button
                        type="button"
                        onClick={() => {
                            setFormData({
                                firstName: "",
                                lastName: "",
                                email: "",
                                phoneNumber: "",
                                notes: ""
                            });
                            setSelectedDate(null);
                            setSelectedTime(null);
                            setCreatedAppointmentId(null);
                            setPaymentToken(null);
                            setConfirmationNumber(null);
                            setPolicyAccepted(false);
                            setSmsConsentAccepted(false);
                            setStep("date");
                        }}
                        className="w-full rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition"
                    >
                        Book Another Appointment
                    </Button>
                </div>
            )}

            {policyModalOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C0F0A]/75 p-4 backdrop-blur-[2px]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="booking-policies-title"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setPolicyModalOpen(false);
                    }}
                >
                    <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden border border-[#B8754E]/60 bg-[#FBF6EF] p-1 shadow-2xl">
                        <div className="flex max-h-[calc(90vh-10px)] flex-col border border-[#D8C3B1]">
                            <button
                                type="button"
                                onClick={() => setPolicyModalOpen(false)}
                                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#B8754E]/60 bg-[#FBF6EF] text-[#2C1810] transition hover:bg-[#F1E5D9] focus:outline-none focus:ring-2 focus:ring-[#B8754E] focus:ring-offset-2"
                                aria-label="Close booking policies"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <header className="border-b border-[#E1D2C5] px-6 pb-6 pt-8 sm:px-10">
                                <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-[#A25735]">
                                    Before You Continue
                                </p>
                                <h2
                                    id="booking-policies-title"
                                    className="font-serif text-3xl text-[#2C1810] sm:text-4xl"
                                >
                                    Booking Policies
                                </h2>
                                <div className="my-4 h-px w-14 bg-[#B8754E]" />
                                <p className="max-w-xl text-sm leading-6 text-[#66554B]">
                                    Please review these policies before continuing to payment. They help us protect your appointment time and provide every client with a smooth experience.
                                </p>
                            </header>

                            <div className="overflow-y-auto px-6 py-4 sm:px-10">
                                <div className="divide-y divide-[#E1D2C5] border-y border-[#E1D2C5]">
                                    {policySections(depositAmountCents).map((section, index) => {
                                        const isExpanded = expandedPolicy === index;
                                        return (
                                            <section key={section.title}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedPolicy(isExpanded ? -1 : index)}
                                                    className="flex w-full items-center justify-between gap-4 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8754E] focus-visible:ring-inset"
                                                    aria-expanded={isExpanded}
                                                >
                                                    <span className="font-serif text-lg text-[#2C1810]">
                                                        {section.title}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-5 w-5 flex-shrink-0 text-[#A25735]" />
                                                    ) : (
                                                        <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#A25735]" />
                                                    )}
                                                </button>
                                                {isExpanded && (
                                                    <ul className="space-y-3 pb-5">
                                                        {section.points.map((item) => (
                                                            <li
                                                                key={item}
                                                                className="flex gap-3 text-sm leading-6 text-[#66554B]"
                                                            >
                                                                <span
                                                                    className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B8754E]"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </section>
                                        );
                                    })}
                                </div>
                            </div>

                            <footer className="border-t border-[#E1D2C5] bg-[#F5ECE3] px-6 py-5 sm:px-10">
                                <div className="mb-4 flex items-center justify-center gap-2 text-xs text-[#66554B]">
                                    <LockKeyhole className="h-4 w-4 text-[#A25735]" />
                                    <span>Your booking and payment information are protected.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPolicyModalOpen(false)}
                                    className="w-full bg-[#2C1810] px-6 py-3.5 text-xs font-medium uppercase tracking-[0.25em] text-white transition hover:bg-[#45271B] focus:outline-none focus:ring-2 focus:ring-[#B8754E] focus:ring-offset-2"
                                >
                                    I Understand
                                </button>
                            </footer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
