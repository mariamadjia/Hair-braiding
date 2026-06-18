"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BusinessHours = {
    id?: number;
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
    notes?: string;
};

const DAYS = [
    { key: 'MONDAY', label: 'Monday' },
    { key: 'TUESDAY', label: 'Tuesday' },
    { key: 'WEDNESDAY', label: 'Wednesday' },
    { key: 'THURSDAY', label: 'Thursday' },
    { key: 'FRIDAY', label: 'Friday' },
    { key: 'SATURDAY', label: 'Saturday' },
    { key: 'SUNDAY', label: 'Sunday' }
];

export default function BusinessHoursForm() {
    const [hours, setHours] = useState<BusinessHours[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchBusinessHours();
    }, []);

    const fetchBusinessHours = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/api/availability/business-hours', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch business hours');

            const data = await response.json();
            
            // Initialize with defaults if empty
            if (data.length === 0) {
                setHours(DAYS.map(day => ({
                    dayOfWeek: day.key,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isOpen: day.key !== 'SUNDAY',
                    notes: ''
                })));
            } else {
                setHours(data.map((h: any) => ({
                    id: h.id,
                    dayOfWeek: h.dayOfWeek,
                    openTime: h.openTime,
                    closeTime: h.closeTime,
                    isOpen: h.isOpen,
                    notes: h.notes || ''
                })));
            }
        } catch (error) {
            console.error('Error fetching business hours:', error);
            setError('Failed to load business hours');
            // Initialize with defaults on error
            setHours(DAYS.map(day => ({
                dayOfWeek: day.key,
                openTime: '09:00',
                closeTime: '17:00',
                isOpen: day.key !== 'SUNDAY',
                notes: ''
            })));
        } finally {
            setLoading(false);
        }
    };

    const updateDay = (dayOfWeek: string, field: keyof BusinessHours, value: any) => {
        setHours(prev => prev.map(h => 
            h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
        ));
    };

    const saveBusinessHours = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('auth_token');
            
            // Save each day's hours
            for (const dayHours of hours) {
                const response = await fetch('http://localhost:8080/api/availability/business-hours', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dayHours)
                });

                if (!response.ok) {
                    throw new Error(`Failed to save ${dayHours.dayOfWeek}`);
                }
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            fetchBusinessHours(); // Refresh data
        } catch (error) {
            console.error('Error saving business hours:', error);
            setError(error instanceof Error ? error.message : 'Failed to save business hours');
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
                    <h3 className="text-lg font-medium text-neutral-900">Business Hours</h3>
                    <p className="text-sm text-neutral-600">Set your operating hours for each day of the week</p>
                </div>
                <Button
                    onClick={saveBusinessHours}
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
                            Save Hours
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
                    Business hours saved successfully!
                </div>
            )}

            <div className="space-y-3">
                {DAYS.map(day => {
                    const dayHours = hours.find(h => h.dayOfWeek === day.key);
                    if (!dayHours) return null;

                    return (
                        <div
                            key={day.key}
                            className={cn(
                                "grid grid-cols-[140px_1fr] gap-4 p-4 border rounded-sm transition",
                                dayHours.isOpen ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50"
                            )}
                        >
                            {/* Day Name & Toggle */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={dayHours.isOpen}
                                    onChange={(e) => updateDay(day.key, 'isOpen', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                />
                                <span className={cn(
                                    "font-medium",
                                    dayHours.isOpen ? "text-neutral-900" : "text-neutral-400"
                                )}>
                                    {day.label}
                                </span>
                            </div>

                            {/* Time Inputs */}
                            {dayHours.isOpen ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-neutral-400" />
                                        <input
                                            type="time"
                                            value={dayHours.openTime}
                                            onChange={(e) => updateDay(day.key, 'openTime', e.target.value)}
                                            className="px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                        />
                                    </div>
                                    <span className="text-neutral-400">to</span>
                                    <input
                                        type="time"
                                        value={dayHours.closeTime}
                                        onChange={(e) => updateDay(day.key, 'closeTime', e.target.value)}
                                        className="px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                    />
                                    <input
                                        type="text"
                                        value={dayHours.notes || ''}
                                        onChange={(e) => updateDay(day.key, 'notes', e.target.value)}
                                        placeholder="Notes (optional)"
                                        className="flex-1 px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center text-sm text-neutral-400 italic">
                                    Closed
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
