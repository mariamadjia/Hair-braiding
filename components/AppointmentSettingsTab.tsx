"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

type AppointmentSettings = {
    slotDurationMinutes: number;
    advanceBookingDays: number;
    maxAppointmentsPerSlot: number;
    requireApproval: boolean;
    allowSameDayBooking: boolean;
};

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIME_OPTIONS = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

export default function AppointmentSettingsTab() {
    const [settings, setSettings] = useState<AppointmentSettings>({
        slotDurationMinutes: 60,
        advanceBookingDays: 60,
        maxAppointmentsPerSlot: 1,
        requireApproval: true,
        allowSameDayBooking: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();

        // Listen for save trigger from parent
        const handleTriggerSave = (e: CustomEvent) => {
            if (e.detail.tab === 'settings') {
                saveSettings();
            }
        };

        window.addEventListener('triggerSave', handleTriggerSave as EventListener);

        return () => {
            window.removeEventListener('triggerSave', handleTriggerSave as EventListener);
        };
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            
            // Fetch appointment settings
            const settingsResponse = await fetch(`${API_BASE_URL}/api/appointments/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (settingsResponse.ok) {
                const data = await settingsResponse.json();
                setSettings({
                    slotDurationMinutes: data.slotDurationMinutes,
                    advanceBookingDays: data.advanceBookingDays,
                    maxAppointmentsPerSlot: data.maxAppointmentsPerSlot || 1,
                    requireApproval: data.requireApproval,
                    allowSameDayBooking: data.allowSameDayBooking
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        // Notify parent of save status
        window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: true, error: null, success: false } }));

        try {
            const token = getAuthToken();
            
            if (!token) {
                setError('No authentication token found. Please log in again.');
                window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: 'No authentication token found', success: false } }));
                setSaving(false);
                return;
            }

            const settingsResponse = await fetch(`${API_BASE_URL}/api/appointments/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!settingsResponse.ok) {
                const errorData = await settingsResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save appointment settings');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            // Dispatch event to notify booking calendar to refresh
            window.dispatchEvent(new CustomEvent('settingsUpdated', { 
                detail: { 
                    slotDurationMinutes: settings.slotDurationMinutes
                }
            }));
            
            // Dispatch event to sync global capacity to all slots in AvailabilitySchedule
            window.dispatchEvent(new CustomEvent('globalCapacityChanged', { 
                detail: { 
                    maxAppointmentsPerSlot: settings.maxAppointmentsPerSlot 
                }
            }));

            window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: null, success: true } }));
        } catch (error) {
            console.error('Error saving settings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
            setError(errorMessage);
            window.dispatchEvent(new CustomEvent('saveStatus', { detail: { saving: false, error: errorMessage, success: false } }));
        } finally {
            setSaving(false);
        }
    };

    const formatTime12 = (time24: string) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
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
                    <h3 className="text-lg font-medium text-neutral-900">Appointment Configuration</h3>
                    <p className="text-sm text-neutral-600">Configure how appointments work on your booking calendar</p>
                </div>
                <Button
                    onClick={saveSettings}
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
                            Save Settings
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
                    Settings saved successfully!
                </div>
            )}

            {/* Appointment Configuration Section */}
            <div className="border border-neutral-200 rounded-lg p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-neutral-900">⚙️ Appointment Configuration</h3>
                    <p className="text-sm text-neutral-600">Configure how appointments work on your booking calendar</p>
                </div>

                {/* Booking Gap */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-900">
                        Booking Gap
                    </label>
                    <select
                        value={settings.slotDurationMinutes}
                        onChange={(e) => setSettings({ ...settings, slotDurationMinutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes (1 hour)</option>
                        <option value={90}>90 minutes (1.5 hours)</option>
                        <option value={120}>120 minutes (2 hours)</option>
                        <option value={180}>180 minutes (3 hours)</option>
                    </select>
                    <p className="text-xs text-neutral-500">
                        Time interval between available booking slots
                    </p>
                </div>

                {/* Advance Booking Period */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-900">
                        Advance Booking Period
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={settings.advanceBookingDays}
                            onChange={(e) => setSettings({ ...settings, advanceBookingDays: parseInt(e.target.value) || 1 })}
                            className="w-32 px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-600">days</span>
                    </div>
                    <p className="text-xs text-neutral-500">
                        How far in advance customers can book appointments
                    </p>
                </div>

                {/* Max Appointments Per Slot */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-900">
                        Max Appointments Per Slot
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.maxAppointmentsPerSlot}
                        onChange={(e) => setSettings({ ...settings, maxAppointmentsPerSlot: parseInt(e.target.value) || 1 })}
                        className="w-32 px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-neutral-500">
                        How many people can book the same time slot
                    </p>
                </div>

                {/* Require Approval */}
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => setSettings({ ...settings, requireApproval: !settings.requireApproval })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.requireApproval ? "bg-blue-600" : "bg-neutral-200"
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.requireApproval ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                    </button>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-900">
                            Require admin approval for appointments
                        </label>
                        <p className="text-xs text-neutral-500 mt-1">
                            When enabled, appointments will be pending until you approve them. When disabled, appointments are automatically confirmed.
                        </p>
                    </div>
                </div>

                {/* Allow Same-Day Booking */}
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => setSettings({ ...settings, allowSameDayBooking: !settings.allowSameDayBooking })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.allowSameDayBooking ? "bg-blue-600" : "bg-neutral-200"
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.allowSameDayBooking ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                    </button>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-900">
                            Allow same-day booking
                        </label>
                        <p className="text-xs text-neutral-500 mt-1">
                            When enabled, customers can book appointments for today. When disabled, they must book at least one day in advance.
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                    <strong>Preview:</strong> Booking slots are available every {settings.slotDurationMinutes} minutes. 
                    Customers can book up to {settings.advanceBookingDays} days in advance.
                    {settings.requireApproval ? ' Appointments require your approval before confirmation.' : ' Appointments are automatically confirmed.'}
                    {settings.allowSameDayBooking ? ' Same-day booking is allowed.' : ' Same-day booking is not allowed.'}
                </p>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center gap-4">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
                {success && (
                    <span className="text-green-600 text-sm">Settings saved successfully!</span>
                )}
                {error && (
                    <span className="text-red-600 text-sm">{error}</span>
                )}
            </div>
        </div>
    );
}
