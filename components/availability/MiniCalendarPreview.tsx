"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type DaySchedule = {
    dayOfWeek: string;
    isAvailable: boolean;
    timeSlots: Array<{ startTime: string; endTime: string; capacity: number }>;
};

type MiniCalendarPreviewProps = {
    schedule: DaySchedule[];
    blockedDates?: string[]; // Array of date strings in YYYY-MM-DD format
};

export default function MiniCalendarPreview({ schedule, blockedDates = [] }: MiniCalendarPreviewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

        return { daysInMonth, startDayOfWeek };
    };

    const isDayAvailable = (date: Date) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayMapping = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayKey = dayMapping[dayOfWeek];
        
        const daySchedule = schedule.find(d => d.dayOfWeek === dayKey);
        if (!daySchedule || !daySchedule.isAvailable) {
            return false;
        }

        // Check if this specific date is blocked
        const dateString = date.toISOString().split('T')[0];
        if (blockedDates.includes(dateString)) {
            return false;
        }

        return true;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-neutral-600" />
                    <h3 className="text-sm font-medium text-neutral-900">Customer View Preview</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-neutral-100 rounded transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-neutral-700 w-28 text-center">{monthName}</span>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-neutral-100 rounded transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {days.map(day => (
                    <div key={day} className="text-xs font-medium text-neutral-500 text-center py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const available = isDayAvailable(date);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div
                            key={day}
                            className={cn(
                                "aspect-square flex items-center justify-center text-xs sm:text-sm rounded-md transition",
                                available
                                    ? "bg-green-100 text-green-700"
                                    : "bg-neutral-100 text-neutral-400",
                                isToday && "ring-2 ring-blue-500 ring-offset-1"
                            )}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="flex items-center gap-4 text-xs text-neutral-600">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 rounded-sm" />
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-neutral-100 rounded-sm" />
                        <span>Unavailable</span>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                    This is what customers will see when booking appointments.
                </p>
            </div>
        </div>
    );
}
