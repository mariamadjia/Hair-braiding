"use client";

import { useState, useEffect } from "react";
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

type BookingCalendarProps = {
    className?: string;
    onBookingComplete?: (bookingData: BookingData) => void;
    serviceName?: string;
    serviceSize?: string;
    serviceLength?: string;
    servicePrice?: string;
    serviceId?: number;
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
    serviceName,
    serviceSize,
    serviceLength,
    servicePrice,
    serviceId
}: BookingCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [step, setStep] = useState<"date" | "time" | "details" | "payment">("date");
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const [stripePromise] = useState(() => getStripe());
    
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
            if (selectedDate) {
                fetchAvailableSlots(selectedDate);
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
        
        return date < today;
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
        setStep("time");
        setLoading(true);
        await fetchAvailableSlots(date);
        setLoading(false);
    };

    const fetchAvailableSlots = async (date: Date) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            console.log('Fetching slots for date:', dateStr);
            
            const response = await fetch(`http://localhost:8080/api/availability/slots?date=${dateStr}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend error:', errorText);
                throw new Error(`Failed to fetch available slots: ${response.status}`);
            }
            
            const backendSlots = await response.json();
            console.log('Received slots from backend:', backendSlots);
            
            if (!Array.isArray(backendSlots) || backendSlots.length === 0) {
                console.warn('No slots returned from backend (business hours may not be configured), using fallback slots');
                generateFallbackTimeSlots(date);
                return;
            }
            
            const slots: TimeSlot[] = backendSlots.map((slot: any) => {
                const startTime = new Date(slot.startTime);
                return {
                    time: formatTime24To12(startTime),
                    available: slot.isAvailable && slot.availableSpots > 0
                };
            });
            
            setAvailableSlots(slots);
        } catch (error) {
            console.error('Error fetching available slots:', error);
            console.log('Using fallback time slots');
            generateFallbackTimeSlots(date);
        }
    };

    const generateFallbackTimeSlots = (date: Date) => {
        const slots: TimeSlot[] = [];
        const startHour = 9;
        const endHour = 17;
        
        for (let hour = startHour; hour < endHour; hour++) {
            const slotDate = new Date(date);
            slotDate.setHours(hour, 0, 0, 0);
            const now = new Date();
            
            slots.push({
                time: formatTime24To12(slotDate),
                available: slotDate > now
            });
        }
        
        setAvailableSlots(slots);
    };

    const formatTime24To12 = (date: Date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
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
        setStep("details");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return;

        setLoading(true);
        
        const appointmentDateTime = convertTimeToDateTime(selectedDate, selectedTime);

        try {
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
                    serviceId: serviceId || null,
                    serviceName: serviceName || null,
                    selectedSize: serviceSize || null,
                    selectedLength: serviceLength || null,
                    price: servicePrice ? servicePrice.replace('$', '').trim() : null,
                    notes: formData.notes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create appointment');
            }

            const result = await response.json();
            setCreatedAppointmentId(result.id);
            setStep("payment");
        } catch (error) {
            console.error('Booking error:', error);
            alert(error instanceof Error ? error.message : 'Failed to create appointment. Please try again.');
        } finally {
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

        alert('Booking submitted successfully! Your card has been authorized for $50. You will only be charged if the admin approves your appointment. Check your email for confirmation.');
        
        if (onBookingComplete) {
            onBookingComplete(bookingData);
        }
        
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
        setStep("date");
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
        
        return appointmentDate.toISOString().split('.')[0];
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const resetToDateSelection = () => {
        setStep("date");
        setSelectedTime(null);
    };

    const resetToTimeSelection = () => {
        setStep("time");
    };

    return (
        <div className={cn("bg-white rounded-lg shadow-sm border border-neutral-200/40 overflow-hidden", className)}>
            {/* Header */}
            <div className="bg-gradient-to-br from-neutral-50 to-white border-b border-neutral-200/40 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Calendar className="h-5 w-5 text-neutral-700" />
                        </div>
                        <h3 className="text-xl font-light tracking-tight text-neutral-900">
                            {step === "date" && "Select Date"}
                            {step === "time" && "Select Time"}
                            {step === "details" && "Your Details"}
                            {step === "payment" && "Payment"}
                        </h3>
                    </div>
                    {step !== "date" && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={step === "time" ? resetToDateSelection : resetToTimeSelection}
                            className="text-xs uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50"
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                            Back
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
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={goToPreviousMonth}
                            className="p-2.5 hover:bg-neutral-100 rounded-full transition-all duration-200 hover:shadow-sm"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5 text-neutral-600" />
                        </button>
                        <h4 className="text-lg font-light tracking-wide text-neutral-900">
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h4>
                        <button
                            onClick={goToNextMonth}
                            className="p-2.5 hover:bg-neutral-100 rounded-full transition-all duration-200 hover:shadow-sm"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5 text-neutral-600" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs font-medium text-neutral-400 uppercase tracking-[0.1em] py-3"
                            >
                                {day}
                            </div>
                        ))}
                        
                        {getDaysInMonth(currentDate).map((day, index) => (
                            <button
                                key={index}
                                onClick={() => handleDateSelect(day)}
                                disabled={isDateDisabled(day)}
                                className={cn(
                                    "aspect-square p-2 text-sm font-medium rounded-full transition-all duration-200",
                                    day === null && "invisible",
                                    !isDateDisabled(day) && "bg-blue-50/80 hover:bg-blue-100 hover:scale-105 cursor-pointer text-blue-600 hover:shadow-md",
                                    isDateDisabled(day) && "text-neutral-300 cursor-not-allowed",
                                    isSameDay(selectedDate, day) && "bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg scale-105"
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Time Selection */}
            {step === "time" && (
                <div className="p-8 space-y-8 max-h-[500px] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mb-3" />
                            <p className="text-sm text-neutral-500">Loading available times...</p>
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-sm text-neutral-500">No available time slots for this date.</p>
                        </div>
                    ) : (
                        <>
                    {/* Morning */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 < 12;
                    }).length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-[0.15em]">Morning</h4>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 < 12;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        disabled={!slot.available}
                                        className={cn(
                                            "px-4 py-3.5 text-sm font-medium rounded-lg border-2 transition-all duration-200",
                                            slot.available && "border-neutral-200/60 hover:border-neutral-900 hover:bg-neutral-50 hover:shadow-md hover:scale-[1.02] cursor-pointer text-neutral-700",
                                            !slot.available && "border-neutral-100 text-neutral-300 cursor-not-allowed bg-neutral-50/30",
                                            selectedTime === slot.time && "bg-neutral-900 text-white border-neutral-900 shadow-lg scale-[1.02]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Afternoon */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 >= 12 && hour24 < 17;
                    }).length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-[0.15em]">Afternoon</h4>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 >= 12 && hour24 < 17;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        disabled={!slot.available}
                                        className={cn(
                                            "px-4 py-3.5 text-sm font-medium rounded-lg border-2 transition-all duration-200",
                                            slot.available && "border-neutral-200/60 hover:border-neutral-900 hover:bg-neutral-50 hover:shadow-md hover:scale-[1.02] cursor-pointer text-neutral-700",
                                            !slot.available && "border-neutral-100 text-neutral-300 cursor-not-allowed bg-neutral-50/30",
                                            selectedTime === slot.time && "bg-neutral-900 text-white border-neutral-900 shadow-lg scale-[1.02]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Evening */}
                    {availableSlots.filter(slot => {
                        const hour = parseInt(slot.time.split(':')[0]);
                        const isPM = slot.time.includes('PM');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        return hour24 >= 17;
                    }).length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-[0.15em]">Evening</h4>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {availableSlots.filter(slot => {
                                    const hour = parseInt(slot.time.split(':')[0]);
                                    const isPM = slot.time.includes('PM');
                                    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                                    return hour24 >= 17;
                                }).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        disabled={!slot.available}
                                        className={cn(
                                            "px-4 py-3.5 text-sm font-medium rounded-lg border-2 transition-all duration-200",
                                            slot.available && "border-neutral-200/60 hover:border-neutral-900 hover:bg-neutral-50 hover:shadow-md hover:scale-[1.02] cursor-pointer text-neutral-700",
                                            !slot.available && "border-neutral-100 text-neutral-300 cursor-not-allowed bg-neutral-50/30",
                                            selectedTime === slot.time && "bg-neutral-900 text-white border-neutral-900 shadow-lg scale-[1.02]"
                                        )}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </div>
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
                        disabled={loading}
                        className="w-full rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] transition"
                    >
                        {loading ? (
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
                            customerEmail={formData.email}
                            customerName={`${formData.firstName} ${formData.lastName}`}
                        />
                    </Elements>
                </div>
            )}
        </div>
    );
}
