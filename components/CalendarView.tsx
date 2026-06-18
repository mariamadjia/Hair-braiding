"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Appointment = {
    id: number;
    customer: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
    };
    service?: {
        id: number;
        name: string;
        description: string;
    };
    appointmentDateTime: string;
    status: string;
    notes?: string;
    adminNotes?: string;
    approvedByName?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
};

type CalendarViewProps = {
    appointments: Appointment[];
    onAppointmentClick: (appointment: Appointment) => void;
    view?: 'month' | 'week' | 'day';
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function CalendarView({ appointments, onAppointmentClick, view = 'month' }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>(view);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];
        
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getAppointmentsForDate = (date: Date | null) => {
        if (!date) return [];
        
        return appointments.filter(apt => {
            const aptDate = new Date(apt.appointmentDateTime);
            return aptDate.getDate() === date.getDate() &&
                   aptDate.getMonth() === date.getMonth() &&
                   aptDate.getFullYear() === date.getFullYear();
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-500';
            case 'APPROVED':
                return 'bg-green-500';
            case 'DENIED':
                return 'bg-red-500';
            case 'CANCELLED':
                return 'bg-gray-500';
            case 'COMPLETED':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const goToPrevious = () => {
        if (selectedView === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
        } else if (selectedView === 'week') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
        } else if (selectedView === 'day') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 1);
            setCurrentDate(newDate);
        }
    };

    const goToNext = () => {
        if (selectedView === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
        } else if (selectedView === 'week') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
        } else if (selectedView === 'day') {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 1);
            setCurrentDate(newDate);
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="bg-white rounded-sm border border-neutral-200">
            {/* Header */}
            <div className="border-b border-neutral-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-light tracking-wide text-neutral-900">
                            {selectedView === 'month' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                            {selectedView === 'week' && (() => {
                                const startOfWeek = new Date(currentDate);
                                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                                const endOfWeek = new Date(startOfWeek);
                                endOfWeek.setDate(startOfWeek.getDate() + 6);
                                return `${MONTHS[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${MONTHS[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
                            })()}
                            {selectedView === 'day' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
                        </h2>
                        <Button
                            onClick={goToToday}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                        >
                            Today
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex border border-neutral-200 rounded-sm overflow-hidden">
                            <button
                                onClick={() => setSelectedView('month')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium transition-colors",
                                    selectedView === 'month'
                                        ? "bg-neutral-900 text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                Month
                            </button>
                            <button
                                onClick={() => setSelectedView('week')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium transition-colors border-x border-neutral-200",
                                    selectedView === 'week'
                                        ? "bg-neutral-900 text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setSelectedView('day')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium transition-colors",
                                    selectedView === 'day'
                                        ? "bg-neutral-900 text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                Day
                            </button>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={goToPrevious}
                                className="p-2 hover:bg-neutral-100 rounded-sm transition"
                            >
                                <ChevronLeft className="h-4 w-4 text-neutral-600" />
                            </button>
                            <button
                                onClick={goToNext}
                                className="p-2 hover:bg-neutral-100 rounded-sm transition"
                            >
                                <ChevronRight className="h-4 w-4 text-neutral-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-neutral-600">Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-neutral-600">Approved</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-neutral-600">Denied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-neutral-600">Completed</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid - Month View */}
            {selectedView === 'month' && (
                <div className="p-4">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs font-medium text-neutral-500 uppercase tracking-wider py-2"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-2">
                        {getDaysInMonth(currentDate).map((date, index) => {
                            const dayAppointments = getAppointmentsForDate(date);
                            
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "min-h-[120px] border border-neutral-200 rounded-sm p-2 transition",
                                        date === null && "invisible",
                                        date && "hover:border-neutral-400 cursor-pointer",
                                        isToday(date) && "bg-blue-50 border-blue-300"
                                    )}
                                >
                                    {date && (
                                        <>
                                            <div className={cn(
                                                "text-sm font-medium mb-2",
                                                isToday(date) ? "text-blue-600" : "text-neutral-700"
                                            )}>
                                                {date.getDate()}
                                            </div>
                                            
                                            <div className="space-y-1">
                                                {dayAppointments.slice(0, 3).map((apt) => (
                                                    <button
                                                        key={apt.id}
                                                        onClick={() => onAppointmentClick(apt)}
                                                        className={cn(
                                                            "w-full text-left px-2 py-1 rounded text-xs text-white truncate hover:opacity-80 transition",
                                                            getStatusColor(apt.status)
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatTime(apt.appointmentDateTime)}</span>
                                                        </div>
                                                        <div className="truncate font-medium">
                                                            {apt.customer.firstName} {apt.customer.lastName}
                                                        </div>
                                                    </button>
                                                ))}
                                                
                                                {dayAppointments.length > 3 && (
                                                    <div className="text-xs text-neutral-500 px-2">
                                                        +{dayAppointments.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Week View */}
            {selectedView === 'week' && (
                <div className="p-4">
                    {/* Week Days Header */}
                    <div className="grid grid-cols-8 gap-2 mb-2">
                        <div className="text-xs font-medium text-neutral-500 p-2"></div>
                        {Array.from({ length: 7 }, (_, i) => {
                            const date = new Date(currentDate);
                            const startOfWeek = date.getDate() - date.getDay();
                            const weekDate = new Date(date.setDate(startOfWeek + i));
                            
                            return (
                                <div key={i} className={cn(
                                    "text-center p-2 rounded-sm",
                                    isToday(weekDate) && "bg-blue-50"
                                )}>
                                    <div className="text-xs font-medium text-neutral-500 uppercase">
                                        {DAYS[i]}
                                    </div>
                                    <div className={cn(
                                        "text-lg font-light mt-1",
                                        isToday(weekDate) ? "text-blue-600 font-medium" : "text-neutral-700"
                                    )}>
                                        {weekDate.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid */}
                    <div className="border border-neutral-200 rounded-sm overflow-hidden">
                        {Array.from({ length: 10 }, (_, hourIndex) => {
                            const hour = 8 + hourIndex; // 8 AM to 6 PM
                            
                            return (
                                <div key={hour} className="grid grid-cols-8 border-b border-neutral-100 last:border-b-0">
                                    {/* Time Label */}
                                    <div className="p-2 text-xs text-neutral-500 border-r border-neutral-200 bg-neutral-50">
                                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                    </div>
                                    
                                    {/* Week Days */}
                                    {Array.from({ length: 7 }, (_, dayIndex) => {
                                        const date = new Date(currentDate);
                                        const startOfWeek = date.getDate() - date.getDay();
                                        const weekDate = new Date(date.setDate(startOfWeek + dayIndex));
                                        weekDate.setHours(hour, 0, 0, 0);
                                        
                                        const hourAppointments = appointments.filter(apt => {
                                            const aptDate = new Date(apt.appointmentDateTime);
                                            return aptDate.getDate() === weekDate.getDate() &&
                                                   aptDate.getMonth() === weekDate.getMonth() &&
                                                   aptDate.getFullYear() === weekDate.getFullYear() &&
                                                   aptDate.getHours() === hour;
                                        });
                                        
                                        return (
                                            <div key={dayIndex} className="min-h-[60px] p-1 border-r border-neutral-100 last:border-r-0 hover:bg-neutral-50">
                                                {hourAppointments.map((apt) => (
                                                    <button
                                                        key={apt.id}
                                                        onClick={() => onAppointmentClick(apt)}
                                                        className={cn(
                                                            "w-full text-left px-2 py-1 rounded text-xs text-white mb-1 hover:opacity-80 transition",
                                                            getStatusColor(apt.status)
                                                        )}
                                                    >
                                                        <div className="font-medium truncate">
                                                            {formatTime(apt.appointmentDateTime)}
                                                        </div>
                                                        <div className="truncate">
                                                            {apt.customer.firstName} {apt.customer.lastName}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Day View */}
            {selectedView === 'day' && (
                <div className="p-4">
                    {/* Day Header */}
                    <div className="mb-4 p-4 bg-neutral-50 rounded-sm border border-neutral-200">
                        <div className="text-center">
                            <div className="text-sm text-neutral-500 uppercase tracking-wider">
                                {DAYS[currentDate.getDay()]}
                            </div>
                            <div className={cn(
                                "text-3xl font-light mt-1",
                                isToday(currentDate) ? "text-blue-600" : "text-neutral-900"
                            )}>
                                {currentDate.getDate()}
                            </div>
                            <div className="text-sm text-neutral-600 mt-1">
                                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </div>
                        </div>
                    </div>

                    {/* Hourly Timeline */}
                    <div className="border border-neutral-200 rounded-sm overflow-hidden max-h-[600px] overflow-y-auto">
                        {Array.from({ length: 14 }, (_, hourIndex) => {
                            const hour = 6 + hourIndex; // 6 AM to 8 PM
                            
                            // Get appointments for this hour
                            const hourAppointments = appointments.filter(apt => {
                                const aptDate = new Date(apt.appointmentDateTime);
                                return aptDate.getDate() === currentDate.getDate() &&
                                       aptDate.getMonth() === currentDate.getMonth() &&
                                       aptDate.getFullYear() === currentDate.getFullYear() &&
                                       aptDate.getHours() === hour;
                            });
                            
                            const hasAppointments = hourAppointments.length > 0;
                            
                            return (
                                <div key={hour} className={cn(
                                    "grid grid-cols-[100px_1fr] border-b border-neutral-100 last:border-b-0",
                                    hasAppointments && "bg-blue-50/30"
                                )}>
                                    {/* Time Label */}
                                    <div className="p-4 text-sm font-medium text-neutral-600 border-r border-neutral-200 bg-neutral-50">
                                        {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                                    </div>
                                    
                                    {/* Appointments */}
                                    <div className="p-3 min-h-[80px]">
                                        {hourAppointments.length === 0 ? (
                                            <div className="text-sm text-neutral-400 italic">No appointments</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {hourAppointments.map((apt) => (
                                                    <button
                                                        key={apt.id}
                                                        onClick={() => onAppointmentClick(apt)}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-sm text-white hover:opacity-90 transition shadow-sm",
                                                            getStatusColor(apt.status)
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Clock className="h-4 w-4" />
                                                                    <span className="font-medium">
                                                                        {formatTime(apt.appointmentDateTime)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-base font-semibold mb-1">
                                                                    {apt.customer.firstName} {apt.customer.lastName}
                                                                </div>
                                                                {apt.service && (
                                                                    <div className="text-sm opacity-90">
                                                                        {apt.service.name}
                                                                    </div>
                                                                )}
                                                                <div className="text-xs opacity-75 mt-1">
                                                                    {apt.customer.email} • {apt.customer.phoneNumber}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs uppercase tracking-wider font-medium px-2 py-1 bg-white/20 rounded">
                                                                {apt.status}
                                                            </div>
                                                        </div>
                                                        {apt.notes && (
                                                            <div className="mt-2 pt-2 border-t border-white/20 text-sm opacity-90">
                                                                <span className="font-medium">Notes:</span> {apt.notes}
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
