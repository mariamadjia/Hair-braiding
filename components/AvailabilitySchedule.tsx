"use client";

import { useState, useEffect } from "react";
import { Plus, X, Clock, Save, Loader2, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";
import TimeDropdown from "./TimeDropdown";
import MiniCalendarPreview from "./availability/MiniCalendarPreview";

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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCopyConfirm, setShowCopyConfirm] = useState(false);
    const [copySourceDay, setCopySourceDay] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

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

        // Listen for save trigger from parent
        const handleTriggerSave = (e: CustomEvent) => {
            if (e.detail.tab === 'hours') {
                saveSchedule();
            }
        };
        
        window.addEventListener('globalCapacityChanged', handleGlobalCapacityChange as EventListener);
        window.addEventListener('triggerSave', handleTriggerSave as EventListener);
        
        return () => {
            window.removeEventListener('globalCapacityChanged', handleGlobalCapacityChange as EventListener);
            window.removeEventListener('triggerSave', handleTriggerSave as EventListener);
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
                                console.warn(`Could not load individual time slots for ${day.key}, using business hours fallback`);
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
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
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
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
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
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
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
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
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
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
    };

    const copyToAllDays = (sourceDayKey: string) => {
        const sourceDay = schedule.find(d => d.dayOfWeek === sourceDayKey);
        if (!sourceDay) return;

        setCopySourceDay(sourceDayKey);
        setShowCopyConfirm(true);
    };

    const confirmCopy = () => {
        if (!copySourceDay) return;

        const sourceDay = schedule.find(d => d.dayOfWeek === copySourceDay);
        if (!sourceDay) return;

        setSchedule(prev => prev.map(day => ({
            ...day,
            isAvailable: sourceDay.isAvailable,
            timeSlots: JSON.parse(JSON.stringify(sourceDay.timeSlots))
        })));
        setHasUnsavedChanges(true);
        window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
        setShowCopyConfirm(false);
        setCopySourceDay(null);
    };

    const cancelCopy = () => {
        setShowCopyConfirm(false);
        setCopySourceDay(null);
    };

    const applyTemplate = (template: string) => {
        const templates: Record<string, DaySchedule[]> = {
            '9to5': [
                { dayOfWeek: 'MONDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'TUESDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'WEDNESDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'THURSDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'FRIDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'SATURDAY', isAvailable: false, timeSlots: [] },
                { dayOfWeek: 'SUNDAY', isAvailable: false, timeSlots: [] },
            ],
            'retail': [
                { dayOfWeek: 'MONDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '21:00', capacity: 1 }] },
                { dayOfWeek: 'TUESDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '21:00', capacity: 1 }] },
                { dayOfWeek: 'WEDNESDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '21:00', capacity: 1 }] },
                { dayOfWeek: 'THURSDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '21:00', capacity: 1 }] },
                { dayOfWeek: 'FRIDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '21:00', capacity: 1 }] },
                { dayOfWeek: 'SATURDAY', isAvailable: true, timeSlots: [{ startTime: '10:00', endTime: '20:00', capacity: 1 }] },
                { dayOfWeek: 'SUNDAY', isAvailable: true, timeSlots: [{ startTime: '11:00', endTime: '18:00', capacity: 1 }] },
            ],
            'salon': [
                { dayOfWeek: 'MONDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00', capacity: 1 }] },
                { dayOfWeek: 'TUESDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00', capacity: 1 }] },
                { dayOfWeek: 'WEDNESDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00', capacity: 1 }] },
                { dayOfWeek: 'THURSDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00', capacity: 1 }] },
                { dayOfWeek: 'FRIDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '19:00', capacity: 1 }] },
                { dayOfWeek: 'SATURDAY', isAvailable: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', capacity: 1 }] },
                { dayOfWeek: 'SUNDAY', isAvailable: false, timeSlots: [] },
            ],
        };

        const selectedTemplate = templates[template];
        if (selectedTemplate) {
            setSchedule(selectedTemplate);
            setHasUnsavedChanges(true);
            window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: true } }));
            setShowTemplates(false);
        }
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

        // Notify parent of save status
        window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: true, error: null, success: false } }));

        try {
            const token = getAuthToken();

            if (!token) {
                setError("No authentication token found. Please log in again.");
                window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: "No authentication token found", success: false } }));
                return;
            }

            // Validate schedule before saving
            for (const day of schedule) {
                if (day.isAvailable && day.timeSlots.length === 0) {
                    setError(`${day.dayOfWeek} is marked as available but has no time slots. Please add time slots or mark the day as unavailable.`);
                    window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: `${day.dayOfWeek} has no time slots`, success: false } }));
                    setSaving(false);
                    return;
                }

                // Validate time slots
                for (const slot of day.timeSlots) {
                    if (slot.startTime >= slot.endTime) {
                        setError(`${day.dayOfWeek}: End time must be after start time`);
                        window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: `Invalid time slot on ${day.dayOfWeek}`, success: false } }));
                        setSaving(false);
                        return;
                    }
                }

                // Check for overlapping time slots
                for (let i = 0; i < day.timeSlots.length; i++) {
                    for (let j = i + 1; j < day.timeSlots.length; j++) {
                        const slot1 = day.timeSlots[i];
                        const slot2 = day.timeSlots[j];

                        // Check if slots overlap
                        if (slot1.startTime < slot2.endTime && slot1.endTime > slot2.startTime) {
                            setError(`${day.dayOfWeek}: Time slots overlap. Please adjust the times to avoid overlap.`);
                            window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: `Overlapping time slots on ${day.dayOfWeek}`, success: false } }));
                            setSaving(false);
                            return;
                        }
                    }
                }
            }

            const payload = {
                days: schedule.map((day) => ({
                    dayOfWeek: day.dayOfWeek,
                    isAvailable: day.isAvailable,
                    timeSlots: day.isAvailable
                        ? day.timeSlots.map((slot) => ({
                            dayOfWeek: day.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            capacity: slot.capacity,
                        }))
                        : [],
                })),
            };

            const response = await fetch(`${API_BASE_URL}/api/availability/schedule`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to save schedule: ${response.status}`;
                
                // Provide specific error messages
                if (errorMessage.includes('overlap')) {
                    throw new Error('Time slots overlap. Please check your time ranges.');
                } else if (errorMessage.includes('invalid')) {
                    throw new Error('Invalid time format. Please use HH:MM format (e.g., 09:00).');
                } else {
                    throw new Error(errorMessage);
                }
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

            // Reload fresh data from backend
            await fetchBusinessHours();

            // Clear unsaved changes flag
            setHasUnsavedChanges(false);
            window.dispatchEvent(new CustomEvent('unsavedChanges', { detail: { hasChanges: false } }));
            window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: null, success: true } }));

            window.dispatchEvent(new CustomEvent("settingsUpdated", {
                detail: { businessHoursUpdated: true },
            }));
        } catch (error) {
            console.error("Error saving schedule:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to save schedule";
            setError(errorMessage);
            window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: errorMessage, success: false } }));
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900">Availability Schedule</h3>
                    <p className="text-sm text-neutral-600">Set your available hours for each day of the week</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="px-4 py-2 text-sm border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
                    >
                        Use Template
                    </button>
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
            </div>

            {/* Template Selection */}
            {showTemplates && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-neutral-900 mb-3">Choose a schedule template</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => applyTemplate('9to5')}
                            className="p-4 border border-neutral-200 rounded-md hover:bg-white hover:border-blue-300 transition text-left"
                        >
                            <div className="font-medium text-neutral-900 mb-1">9-5 Weekdays</div>
                            <div className="text-xs text-neutral-600">Mon-Fri: 9am-5pm</div>
                        </button>
                        <button
                            onClick={() => applyTemplate('retail')}
                            className="p-4 border border-neutral-200 rounded-md hover:bg-white hover:border-blue-300 transition text-left"
                        >
                            <div className="font-medium text-neutral-900 mb-1">Retail Hours</div>
                            <div className="text-xs text-neutral-600">Mon-Sat: 10am-9pm, Sun: 11am-6pm</div>
                        </button>
                        <button
                            onClick={() => applyTemplate('salon')}
                            className="p-4 border border-neutral-200 rounded-md hover:bg-white hover:border-blue-300 transition text-left"
                        >
                            <div className="font-medium text-neutral-900 mb-1">Salon Hours</div>
                            <div className="text-xs text-neutral-600">Mon-Sat: 9am-7pm, Sun: Closed</div>
                        </button>
                    </div>
                </div>
            )}

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {schedule.map((day) => {
                    const dayInfo = DAYS.find(d => d.key === day.dayOfWeek);
                    if (!dayInfo) return null;

                    return (
                        <div key={day.dayOfWeek} className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-medium",
                                        day.isAvailable 
                                            ? "bg-blue-100 text-blue-700" 
                                            : "bg-neutral-100 text-neutral-400"
                                    )}>
                                        {dayInfo.abbr}
                                    </div>
                                    <div>
                                        <div className="font-medium text-neutral-900 text-sm sm:text-base">{dayInfo.label}</div>
                                        <div className="text-xs text-neutral-500">
                                            {day.isAvailable ? 'Available' : 'Unavailable'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {day.isAvailable && (
                                        <button
                                            onClick={() => copyToAllDays(day.dayOfWeek)}
                                            className="p-2 sm:p-3 text-neutral-600 hover:bg-neutral-100 rounded-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            title="Copy to all days"
                                        >
                                            <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleDayAvailability(day.dayOfWeek)}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 sm:h-7 sm:w-13 items-center rounded-full transition-colors min-h-[44px] min-w-[52px]",
                                            day.isAvailable ? "bg-blue-600" : "bg-neutral-200"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white transition-transform",
                                                day.isAvailable ? "translate-x-6 sm:translate-x-7" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            {day.isAvailable && (
                                <div className="space-y-2 sm:space-y-3 ml-13">
                                    {day.timeSlots.map((slot, slotIndex) => (
                                        <div key={slotIndex} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2 flex-1 w-full">
                                                <TimeDropdown
                                                    value={slot.startTime}
                                                    onChange={(value) => updateTimeSlot(day.dayOfWeek, slotIndex, 'startTime', value)}
                                                    className="w-full sm:w-32 min-h-[44px]"
                                                />
                                                <span className="text-neutral-400">-</span>
                                                <TimeDropdown
                                                    value={slot.endTime}
                                                    onChange={(value) => updateTimeSlot(day.dayOfWeek, slotIndex, 'endTime', value)}
                                                    className="w-full sm:w-32 min-h-[44px]"
                                                />
                                                {/* Only show capacity selector when breakdown is expanded (multiple slots) */}
                                                {day.timeSlots.length > 1 && (
                                                    <div className="flex items-center gap-2 ml-0 sm:ml-4 mt-2 sm:mt-0">
                                                        <select
                                                            value={slot.capacity}
                                                            onChange={(e) => updateCapacity(day.dayOfWeek, slotIndex, parseInt(e.target.value))}
                                                            className="w-20 px-2 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
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
                                                    className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center self-start sm:self-auto"
                                                >
                                                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        {day.timeSlots.length === 1 && day.timeSlots[0].startTime && day.timeSlots[0].endTime && (
                                            <button
                                                onClick={() => toggleBreakdown(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 min-h-[44px]"
                                            >
                                                <Clock className="h-4 w-4" />
                                                Split into time slots
                                            </button>
                                        )}

                                        {day.timeSlots.length > 1 && (
                                            <button
                                                onClick={() => hideBreakdown(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-700 font-medium py-2 px-3 min-h-[44px]"
                                            >
                                                <Clock className="h-4 w-4" />
                                                Merge to single range
                                            </button>
                                        )}

                                        {day.timeSlots.length > 0 && (
                                            <button
                                                onClick={() => addTimeSlot(day.dayOfWeek)}
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 min-h-[44px]"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add time slot
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>

                {/* Calendar Preview Sidebar */}
                <div className="lg:col-span-1">
                    <MiniCalendarPreview schedule={schedule} />
                </div>
            </div>

            {/* Copy Confirmation Modal */}
            {showCopyConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <Copy className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                                    Copy Schedule to All Days
                                </h3>
                                <p className="text-sm text-neutral-600 mb-4">
                                    This will copy {copySourceDay}'s schedule to all other days of the week. Any existing schedules on other days will be replaced. Are you sure?
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={cancelCopy}
                                        className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmCopy}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    >
                                        Copy to All Days
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
