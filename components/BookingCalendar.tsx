"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Mail, MessageSquare, Loader2, Phone } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";
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
    serviceName?: string;
    serviceSize?: string;
    serviceLength?: string;
    servicePrice?: string;
    serviceId?: number;
    lengthOptionId?: number;
    selectedTexture?: string;
    selectedFoundation?: string;
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

export default function BookingCalendar({ 
    className, 
    onBookingComplete,
    onDateSelected,
    onTimeSelected,
    serviceName,
    serviceSize,
    serviceLength,
    servicePrice,
    serviceId,
    lengthOptionId,
    selectedTexture,
    selectedFoundation
}: BookingCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [step, setStep] = useState<"date" | "time" | "details" | "payment" | "success">("date");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const [paymentToken, setPaymentToken] = useState<string | null>(null);
    const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stripePromise] = useState(() => getStripe());
    const availabilityRequest = useRef<AbortController | null>(null);
    const slotsCache = useRef(new Map<string, TimeSlot[]>());
    const [dateAvailability, setDateAvailability] = useState<Record<string, DateAvailability>>({});

    useEffect(() => () => availabilityRequest.current?.abort(), []);
    
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
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

    const requestSlots = async (date: Date, signal?: AbortSignal): Promise<TimeSlot[]> => {
        const dateStr = formatLocalDate(date);
        const response = await fetch(`${API_BASE_URL}/api/availability/slots?date=${dateStr}&timezone=America%2FChicago`, {
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
        const cached = slotsCache.current.get(dateStr);
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
            slotsCache.current.set(dateStr, slots);
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
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date >= today && !slotsCache.current.has(formatLocalDate(date));
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
                        slotsCache.current.set(key, slots);
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
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

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
            const timezone = "America/Chicago";
            const response = await fetch(`${API_BASE_URL}/api/availability/slots?date=${dateStr}&timezone=${timezone}`, {
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
        if (!serviceId) {
            setError("This service is not configured for online booking. Please choose it again or contact the salon.");
            return;
        }

        setIsSubmitting(true);
        setLoading(true);
        
        const appointmentDateTime = convertTimeToDateTime(selectedDate, selectedTime);

        try {
            if (createdAppointmentId && paymentToken) {
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
                    notes: formData.notes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to create appointment');
            }

            const result = await response.json();
            setCreatedAppointmentId(result.id);
            setPaymentToken(result.paymentToken);
            setConfirmationNumber(`APT-${result.id}`);
            setStep("payment");
        } catch (error) {
            console.error('Booking error:', error);
            alert(error instanceof Error ? error.message : 'Failed to create appointment. Please try again.');
            // If availability failed, go back to time selection
            if (error instanceof Error && error.message.includes('no longer available')) {
                setStep("time");
                setSelectedTime(null);
                onTimeSelected?.(null);
                await fetchAvailableSlots(selectedDate);
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
        const today = new Date();
        if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth()) return;
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const canGoToPreviousMonth = () => {
        const today = new Date();
        return currentDate.getFullYear() > today.getFullYear()
            || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() > today.getMonth());
    };

    const isToday = (day: number | null) => {
        if (!day) return false;
        const today = new Date();
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
                    {step === "date" || step === "time" ? (
                        <>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B0633E]">
                                    {step === "date" ? "Choose Your Visit" : "Choose Your Time"}
                                </p>
                                <h3 className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[#2C1810] sm:text-4xl">
                                    {step === "date" ? "Select a Date" : "Select a Time"}
                                </h3>
                                <p className="mt-3 text-xs tracking-wide text-[#76675E]">
                                    {step === "date" ? "Select a date to view available times" : "Choose an available appointment start"}
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
                            {step === "details" && "Your Details"}
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
                
                {selectedDate && (
                    <div className="mt-4 pt-4 border-t border-neutral-200/50">
                        <p className="text-sm text-neutral-600 font-light">
                            {selectedDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                            {selectedTime && (
                                <span className="ml-2 px-2.5 py-1 bg-neutral-900 text-white text-xs rounded-full">
                                    {selectedTime}
                                </span>
                            )}
                        </p>
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
                    {selectedDate && (
                        <div className="flex items-center justify-between gap-4 rounded-[5px] border border-[#D9C4B3] bg-[#FCF6F0] px-4 py-3.5">
                            <div>
                                <p className="font-serif text-lg text-[#2C1810]">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="mt-1 text-[11px] text-[#76675E]">Your selected appointment date</p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-[#8B735F]">
                                <Clock className="h-3.5 w-3.5" />
                                Central Time
                            </span>
                        </div>
                    )}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                First Name
                            </label>
                            <Input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="First name"
                                className="rounded-none border-neutral-300 focus:border-neutral-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Last Name
                            </label>
                            <Input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Last name"
                                className="rounded-none border-neutral-300 focus:border-neutral-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Address
                        </label>
                        <Input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            className="rounded-none border-neutral-300 focus:border-neutral-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone Number
                        </label>
                        <Input
                            type="tel"
                            required
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                            className="rounded-none border-neutral-300 focus:border-neutral-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any special requests or information..."
                            rows={4}
                            className="w-full px-3 py-2 border border-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 text-sm"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || isSubmitting}
                        className="w-full rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition"
                    >
                        {loading || isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            "Next: Payment"
                        )}
                    </Button>
                </form>
            )}

            {/* Payment Step */}
            {step === "payment" && stripePromise && (
                <div className="p-6">
                    <Elements
                        stripe={stripePromise}
                        options={{
                            mode: "payment",
                            amount: 5000,
                            currency: "usd",
                            capture_method: "manual",
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
                            amount={5000}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep("details")}
                            appointmentId={createdAppointmentId || undefined}
                            paymentToken={paymentToken || undefined}
                            customerEmail={formData.email}
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
                    <h3 className="text-2xl font-light text-neutral-900 mb-4">Appointment Request Submitted</h3>
                    <p className="text-neutral-600 mb-6">Your card has been authorized for $50. The salon will review your request before the hold is captured.</p>
                    
                    {confirmationNumber && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Confirmation Number</p>
                            <p className="text-lg font-mono font-semibold text-neutral-900">{confirmationNumber}</p>
                        </div>
                    )}
                    
                    <p className="text-sm text-neutral-600 mb-6">The salon will contact you after reviewing your request. All appointment times are San Antonio Central Time.</p>

                    
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
                            setStep("date");
                        }}
                        className="w-full rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition"
                    >
                        Book Another Appointment
                    </Button>
                </div>
            )}
        </div>
    );
}
