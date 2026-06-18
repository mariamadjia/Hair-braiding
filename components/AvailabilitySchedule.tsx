"use client";

import { useState, useEffect } from "react";
import { Plus, X, Clock, Save, Loader2, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";
import TimeDropdown from "./TimeDropdown";

type TimeSlot = {
    startTime: string;
    endTime: string;
    capacity: number; // Number of people who can book this slot
};

type DaySchedule = {
    dayOfWeek: string;
    isAvailable: boolean;
    timeSlots: TimeSlot[];
};

const DAYS = [
    { key: 'MONDAY', label: 'Monday', abbr: 'M' },
    { key: 'TUESDAY', label: 'Tuesday', abbr: 'T' },
    { key: 'WEDNESDAY', label: 'Wednesday', abbr: 'W' },
    { key: 'THURSDAY', label: 'Thursday', abbr: 'T' },
    { key: 'FRIDAY', label: 'Friday', abbr: 'F' },
    { key: 'SATURDAY', label: 'Saturday', abbr: 'S' },
    { key: 'SUNDAY', label: 'Sunday', abbr: 'S' }
];

export default function AvailabilitySchedule() {
    const [schedule, setSchedule] = useState<DaySchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [slotDurationMinutes, setSlotDurationMinutes] = useState(60);
    const [maxAppointmentsPerSlot, setMaxAppointmentsPerSlot] = useState(1);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchBusinessHours();
        
        // Listen for global capacity changes from Settings tab
        const handleGlobalCapacityChange = (e: CustomEvent) => {
            const newCapacity = e.detail.maxAppointmentsPerSlot;
            setSchedule(prev => prev.map(day => ({
                ...day,
                timeSlots: day.timeSlots.map(slot => ({
                    ...slot,
                    capacity: newCapacity
                }))
            })));
        };
        
        window.addEventListener('globalCapacityChanged', handleGlobalCapacityChange as EventListener);
        
        return () => {
            window.removeEventListener('globalCapacityChanged', handleGlobalCapacityChange as EventListener);
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/appointments/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSlotDurationMinutes(data.slotDurationMinutes || 60);
                setMaxAppointmentsPerSlot(data.maxAppointmentsPerSlot || 1);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchBusinessHours = async () => {
        setLoading(true);
        try {
            // Fetch business hours to check which days are open
            const hoursResponse = await fetch(`${API_BASE_URL}/api/availability/business-hours`);
            
            if (hoursResponse.ok) {
                const hoursData = await hoursResponse.json();
                
                if (Array.isArray(hoursData) && hoursData.length > 0) {
                    // Load individual time slots for each day
                    const loadedSchedule: DaySchedule[] = await Promise.all(
                        DAYS.map(async (day) => {
                            const existing = hoursData.find((h: any) => h.dayOfWeek === day.key);
                            
                            if (existing && existing.isOpen) {
                                // Fetch individual time slots for this day
                                try {
                                    const slotsResponse = await fetch(`${API_BASE_URL}/api/time-slots/${day.key}`);
                                    
                                    if (slotsResponse.ok) {
                                        const slotsData = await slotsResponse.json();
                                        console.log(`Loaded ${day.key} slots:`, slotsData);
                                        
                                        if (Array.isArray(slotsData) && slotsData.length > 0) {
                                            // Use saved individual slots
                                            return {
                                                dayOfWeek: day.key,
                                                isAvailable: true,
                                                timeSlots: slotsData.map((slot: any) => ({
                                                    startTime: slot.startTime,
                                                    endTime: slot.endTime,
                                                    capacity: slot.capacity || 1
                                                }))
                                            };
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error fetching slots for ${day.key}:`, error);
                                }
                                
                                // Fallback: create single slot from business hours
                                const openTime = existing.openTime?.substring(0, 5) || '09:00';
                                const closeTime = existing.closeTime?.substring(0, 5) || '17:00';
                                
                                return {
                                    dayOfWeek: day.key,
                                    isAvailable: true,
                                    timeSlots: [{ startTime: openTime, endTime: closeTime, capacity: maxAppointmentsPerSlot }]
                                };
                            }
                            
                            return {
                                dayOfWeek: day.key,
                                isAvailable: false,
                                timeSlots: []
                            };
                        })
                    );
                    
                    setSchedule(loadedSchedule);
                } else {
                    initializeSchedule();
                }
            } else {
                initializeSchedule();
            }
        } catch (error) {
            console.error('Error fetching business hours:', error);
            initializeSchedule();
        } finally {
            setLoading(false);
        }
    };

    const initializeSchedule = () => {
        // Initialize with default schedule - 1 hour slots from 7 AM to 7 PM
        const defaultTimeSlots: TimeSlot[] = [];
        for (let hour = 7; hour < 19; hour++) { // 7 AM to 7 PM (19:00)
            const startTime = `${String(hour).padStart(2, '0')}:00`;
            const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
            defaultTimeSlots.push({ startTime, endTime, capacity: 1 });
        }
        
        const defaultSchedule: DaySchedule[] = DAYS.map(day => ({
            dayOfWeek: day.key,
            isAvailable: day.key !== 'SUNDAY',
            timeSlots: day.key !== 'SUNDAY' ? [...defaultTimeSlots] : []
        }));
        
        setSchedule(defaultSchedule);
    };

    const toggleDayAvailability = (dayKey: string) => {
        setSchedule(prev => prev.map(day => {
            if (day.dayOfWeek === dayKey) {
                const newIsAvailable = !day.isAvailable;
                return {
                    ...day,
                    isAvailable: newIsAvailable,
                    timeSlots: newIsAvailable && day.timeSlots.length === 0 
                        ? [{ startTime: '09:00', endTime: '10:00', capacity: 1 }]
                        : day.timeSlots
                };
            }
            return day;
        }));
    };

    const addTimeSlot = (dayKey: string) => {
        setSchedule(prev => prev.map(day => {
            if (day.dayOfWeek === dayKey) {
                const lastSlot = day.timeSlots[day.timeSlots.length - 1];
                const newStartTime = lastSlot ? lastSlot.endTime : '09:00';
                const newEndTime = lastSlot ? addHours(lastSlot.endTime, 1) : '10:00';
                
                return {
                    ...day,
                    timeSlots: [...day.timeSlots, { startTime: newStartTime, endTime: newEndTime, capacity: 1 }]
                };
            }
            return day;
        }));
    };

    const removeTimeSlot = (dayKey: string, slotIndex: number) => {
        setSchedule(prev => prev.map(day => {
            if (day.dayOfWeek === dayKey) {
                return {
                    ...day,
                    timeSlots: day.timeSlots.filter((_, idx) => idx !== slotIndex)
                };
            }
            return day;
        }));
    };

    const updateTimeSlot = (dayKey: string, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
        setSchedule(prev => prev.map(day => {
            if (day.dayOfWeek === dayKey) {
                return {
                    ...day,
                    timeSlots: day.timeSlots.map((slot, idx) => 
                        idx === slotIndex ? { ...slot, [field]: value } : slot
                    )
                };
            }
            return day;
        }));
    };

    const updateCapacity = (dayKey: string, slotIndex: number, capacity: number) => {
        setSchedule(prev => prev.map(day => {
            if (day.dayOfWeek === dayKey) {
                return {
                    ...day,
                    timeSlots: day.timeSlots.map((slot, idx) => 
                        idx === slotIndex ? { ...slot, capacity: Math.max(0, Math.min(10, capacity)) } : slot
                    )
                };
            }
            return day;
        }));
    };

    const copyToAllDays = (sourceDayKey: string) => {
        const sourceDay = schedule.find(d => d.dayOfWeek === sourceDayKey);
        if (!sourceDay) return;

        setSchedule(prev => prev.map(day => ({
            ...day,
            isAvailable: sourceDay.isAvailable,
            timeSlots: JSON.parse(JSON.stringify(sourceDay.timeSlots))
        })));
    };

    const resetAllCapacities = () => {
        setSchedule(prev => prev.map(day => ({
            ...day,
            timeSlots: day.timeSlots.map(slot => ({
                ...slot,
                capacity: maxAppointmentsPerSlot
            }))
        })));
    };

    const addHours = (time: string, hours: number): string => {
        const [h, m] = time.split(':').map(Number);
        const newHour = (h + hours) % 24;
        return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const generateBreakdownSlots = (startTime: string, endTime: string) => {
        const slots = [];
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        // Handle overnight hours
        const finalEndMinutes = endMinutes < currentMinutes ? endMinutes + 24 * 60 : endMinutes;
        
        while (currentMinutes < finalEndMinutes) {
            const nextMinutes = currentMinutes + slotDurationMinutes;
            if (nextMinutes > finalEndMinutes) break;
            
            const slotStartHour = Math.floor(currentMinutes / 60) % 24;
            const slotStartMin = currentMinutes % 60;
            const slotEndHour = Math.floor(nextMinutes / 60) % 24;
            const slotEndMin = nextMinutes % 60;
            
            const slotStart = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
            const slotEnd = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;
            
            slots.push({
                start: formatTime12(slotStart),
                end: formatTime12(slotEnd)
            });
            
            currentMinutes = nextMinutes;
        }
        
        return slots;
    };

    const formatTime12 = (time24: string) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const toggleBreakdown = (dayKey: string) => {
        if (expandedDay === dayKey) {
            // Hide breakdown
            setExpandedDay(null);
        } else {
            // Show breakdown by generating slots
            generateSlotsForDay(dayKey);
            setExpandedDay(dayKey);
        }
    };

    const hideBreakdown = (dayKey: string) => {
        const day = schedule.find(d => d.dayOfWeek === dayKey);
        if (!day || day.timeSlots.length <= 1) return;

        // Collapse all slots back to a single time range
        const firstSlot = day.timeSlots[0];
        const lastSlot = day.timeSlots[day.timeSlots.length - 1];
        
        setSchedule(prev => prev.map(d => 
            d.dayOfWeek === dayKey 
                ? { 
                    ...d, 
                    timeSlots: [{
                        startTime: firstSlot.startTime,
                        endTime: lastSlot.endTime,
                        capacity: maxAppointmentsPerSlot
                    }]
                }
                : d
        ));
        
        setExpandedDay(null);
    };

    const generateSlotsForDay = (dayKey: string) => {
        const day = schedule.find(d => d.dayOfWeek === dayKey);
        if (!day || !day.isAvailable) return;

        // Get the overall time range (earliest start to latest end)
        let startTime = '07:00';
        let endTime = '19:00';
        
        if (day.timeSlots.length > 0) {
            startTime = day.timeSlots[0].startTime;
            endTime = day.timeSlots[day.timeSlots.length - 1].endTime;
        }

        // Generate slots based on slot duration
        const generatedSlots: TimeSlot[] = [];
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const finalEndMinutes = endMinutes < currentMinutes ? endMinutes + 24 * 60 : endMinutes;
        
        while (currentMinutes < finalEndMinutes) {
            const nextMinutes = currentMinutes + slotDurationMinutes;
            if (nextMinutes > finalEndMinutes) break;
            
            const slotStartHour = Math.floor(currentMinutes / 60) % 24;
            const slotStartMin = currentMinutes % 60;
            const slotEndHour = Math.floor(nextMinutes / 60) % 24;
            const slotEndMin = nextMinutes % 60;
            
            const slotStart = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
            const slotEnd = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;
            
            generatedSlots.push({
                startTime: slotStart,
                endTime: slotEnd,
                capacity: maxAppointmentsPerSlot
            });
            
            currentMinutes = nextMinutes;
        }

        // Update the schedule with generated slots
        setSchedule(prev => prev.map(d => 
            d.dayOfWeek === dayKey 
                ? { ...d, timeSlots: generatedSlots }
                : d
        ));
    };

    const saveSchedule = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const token = getAuthToken();
            
            if (!token) {
                setError('No authentication token found. Please log in again.');
                setSaving(false);
                return;
            }

            // Save each day's schedule
            for (const day of schedule) {
                if (!day.isAvailable) {
                    // Save as closed - save empty time slots array
                    await fetch(`${API_BASE_URL}/api/time-slots/${day.dayOfWeek}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify([])
                    });
                    
                    // Also update business hours to mark as closed
                    await fetch(`${API_BASE_URL}/api/availability/business-hours`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            dayOfWeek: day.dayOfWeek,
                            openTime: '00:00:00',
                            closeTime: '00:00:00',
                            isOpen: false
                        })
                    });
                } else {
                    // Save individual time slots with their capacities
                    if (day.timeSlots.length > 0) {
                        const slotsPayload = day.timeSlots.map(slot => ({
                            dayOfWeek: day.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            capacity: slot.capacity
                        }));
                        
                        console.log(`Saving ${day.dayOfWeek} slots:`, slotsPayload);
                        
                        const response = await fetch(`${API_BASE_URL}/api/time-slots/${day.dayOfWeek}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(slotsPayload)
                        });
                        
                        console.log(`${day.dayOfWeek} save response:`, response.status);
                        
                        if (!response.ok) {
                            throw new Error(`Failed to save ${day.dayOfWeek}`);
                        }
                        
                        // Also update business hours with overall time range
                        const openTime = day.timeSlots[0].startTime;
                        const closeTime = day.timeSlots[day.timeSlots.length - 1].endTime;
                        
                        await fetch(`${API_BASE_URL}/api/availability/business-hours`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                dayOfWeek: day.dayOfWeek,
                                openTime: openTime + ':00',
                                closeTime: closeTime + ':00',
                                isOpen: true
                            })
                        });
                    }
                }
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            // Dispatch event to notify booking calendar to refresh
            window.dispatchEvent(new CustomEvent('settingsUpdated', { 
                detail: { businessHoursUpdated: true }
            }));
        } catch (error) {
            console.error('Error saving schedule:', error);
            setError('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900">Availability Schedule</h3>
                    <p className="text-sm text-neutral-600">Set your available hours for each day of the week</p>
                </div>
                <Button
                    onClick={saveSchedule}
                    disabled={saving}
                    className="bg-neutral-900 hover:bg-neutral-800"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Schedule
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-sm p-4 text-sm text-green-800">
                    Schedule saved successfully!
                </div>
            )}

            <div className="space-y-4">
                {schedule.map((day) => {
                    const dayInfo = DAYS.find(d => d.key === day.dayOfWeek);
                    if (!dayInfo) return null;

                    return (
                        <div key={day.dayOfWeek} className="bg-white border border-neutral-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                                        day.isAvailable 
                                            ? "bg-blue-100 text-blue-700" 
                                            : "bg-neutral-100 text-neutral-400"
                                    )}>
                                        {dayInfo.abbr}
                                    </div>
                                    <div>
                                        <div className="font-medium text-neutral-900">{dayInfo.label}</div>
                                        <div className="text-xs text-neutral-500">
                                            {day.isAvailable ? 'Available' : 'Unavailable'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {day.isAvailable && (
                                        <button
                                            onClick={() => copyToAllDays(day.dayOfWeek)}
                                            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-sm transition"
                                            title="Copy to all days"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleDayAvailability(day.dayOfWeek)}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            day.isAvailable ? "bg-blue-600" : "bg-neutral-200"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                day.isAvailable ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            {day.isAvailable && (
                                <div className="space-y-2 ml-13">
                                    {day.timeSlots.map((slot, slotIndex) => (
                                        <div key={slotIndex} className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 flex-1">
                                                <TimeDropdown
                                                    value={slot.startTime}
                                                    onChange={(value) => updateTimeSlot(day.dayOfWeek, slotIndex, 'startTime', value)}
                                                    className="w-32"
                                                />
                                                <span className="text-neutral-400">-</span>
                                                <TimeDropdown
                                                    value={slot.endTime}
                                                    onChange={(value) => updateTimeSlot(day.dayOfWeek, slotIndex, 'endTime', value)}
                                                    className="w-32"
                                                />
                                                {/* Only show capacity selector when breakdown is expanded (multiple slots) */}
                                                {day.timeSlots.length > 1 && (
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <select
                                                            value={slot.capacity}
                                                            onChange={(e) => updateCapacity(day.dayOfWeek, slotIndex, parseInt(e.target.value))}
                                                            className="w-20 px-2 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="0">0</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                            <option value="4">4</option>
                                                            <option value="5">5</option>
                                                            <option value="6">6</option>
                                                            <option value="7">7</option>
                                                            <option value="8">8</option>
                                                            <option value="9">9</option>
                                                            <option value="10">10</option>
                                                        </select>
                                                        <span className="text-xs text-neutral-500">slots</span>
                                                    </div>
                                                )}
                                            </div>
                                            {day.timeSlots.length > 1 && (
                                                <button
                                                    onClick={() => removeTimeSlot(day.dayOfWeek, slotIndex)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2">
                                        {day.timeSlots.length === 1 && day.timeSlots[0].startTime && day.timeSlots[0].endTime && (
                                            <button
                                                onClick={() => toggleBreakdown(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                <Clock className="h-4 w-4" />
                                                Show Breakdown
                                            </button>
                                        )}

                                        {day.timeSlots.length > 1 && (
                                            <button
                                                onClick={() => hideBreakdown(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-700 font-medium"
                                            >
                                                <Clock className="h-4 w-4" />
                                                Hide Breakdown
                                            </button>
                                        )}

                                        {day.timeSlots.length > 0 && (
                                            <button
                                                onClick={() => addTimeSlot(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add hours
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
