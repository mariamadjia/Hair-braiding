"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlockedSlot = {
    id: number;
    startDateTime: string;
    endDateTime: string;
    reason: string;
    isRecurring: boolean;
    recurrencePattern?: string;
    createdByName?: string;
    createdAt: string;
};

export default function BlockTimeModal() {
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('17:00');
    const [reason, setReason] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrencePattern, setRecurrencePattern] = useState('');

    useEffect(() => {
        fetchBlockedSlots();
    }, []);

    const fetchBlockedSlots = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const now = new Date();
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 3);

            const response = await fetch(
                `http://localhost:8080/api/availability/blocked-times?startDate=${now.toISOString()}&endDate=${futureDate.toISOString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch blocked slots');

            const data = await response.json();
            setBlockedSlots(data);
        } catch (error) {
            console.error('Error fetching blocked slots:', error);
        } finally {
            setLoading(false);
        }
    };

    const createBlockedSlot = async () => {
        if (!startDate || !endDate || !reason.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('auth_token');
            const startDateTime = `${startDate}T${startTime}:00`;
            const endDateTime = `${endDate}T${endTime}:00`;

            const response = await fetch('http://localhost:8080/api/availability/block-time', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDateTime,
                    endDateTime,
                    reason,
                    isRecurring,
                    recurrencePattern: isRecurring ? recurrencePattern : null
                })
            });

            if (!response.ok) throw new Error('Failed to create blocked slot');

            // Reset form
            setStartDate('');
            setStartTime('09:00');
            setEndDate('');
            setEndTime('17:00');
            setReason('');
            setIsRecurring(false);
            setRecurrencePattern('');
            setShowForm(false);

            // Refresh list
            fetchBlockedSlots();
        } catch (error) {
            console.error('Error creating blocked slot:', error);
            alert('Failed to block time slot');
        } finally {
            setSaving(false);
        }
    };

    const deleteBlockedSlot = async (id: number) => {
        if (!confirm('Are you sure you want to remove this blocked time?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:8080/api/availability/blocked-times/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete blocked slot');

            fetchBlockedSlots();
        } catch (error) {
            console.error('Error deleting blocked slot:', error);
            alert('Failed to delete blocked time');
        }
    };

    const formatDateTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900">Blocked Time Slots</h3>
                    <p className="text-sm text-neutral-600">Block specific dates and times when appointments cannot be booked</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-neutral-900 hover:bg-neutral-800"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Block Time
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-sm p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Reason
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Holiday, Lunch Break, Personal Time"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <label className="text-sm text-neutral-700">
                            Recurring block
                        </label>
                    </div>

                    {isRecurring && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Recurrence Pattern
                            </label>
                            <select
                                value={recurrencePattern}
                                onChange={(e) => setRecurrencePattern(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            >
                                <option value="">Select pattern</option>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={createBlockedSlot}
                            disabled={saving}
                            className="bg-neutral-900 hover:bg-neutral-800"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Block'
                            )}
                        </Button>
                        <Button
                            onClick={() => setShowForm(false)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Blocked Slots List */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
            ) : blockedSlots.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-sm">
                    <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">No blocked time slots</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {blockedSlots.map((slot) => (
                        <div
                            key={slot.id}
                            className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-sm hover:shadow-sm transition"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-medium text-neutral-900">{slot.reason}</span>
                                    {slot.isRecurring && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                            {slot.recurrencePattern}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-neutral-600">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {formatDateTime(slot.startDateTime)}
                                    </div>
                                    <span>→</span>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {formatDateTime(slot.endDateTime)}
                                    </div>
                                </div>
                                {slot.createdByName && (
                                    <div className="text-xs text-neutral-500 mt-1">
                                        Created by {slot.createdByName}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => deleteBlockedSlot(slot.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
