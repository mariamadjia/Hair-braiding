"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Clock, Ban, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import AvailabilitySchedule from "./AvailabilitySchedule";
import BlockTimeModal from "./BlockTimeModal";
import AppointmentSettingsTab from "./AppointmentSettingsTab";
import StickySaveBar from "./availability/StickySaveBar";

type Tab = 'hours' | 'blocked' | 'settings';

export default function AvailabilitySettings() {
    const [activeTab, setActiveTab] = useState<Tab>('hours');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [pendingTab, setPendingTab] = useState<Tab | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const saveAndSwitch = useRef(false);

    // Listen for unsaved changes events from child components
    useEffect(() => {
        const handleUnsavedChanges = (e: CustomEvent) => {
            setHasUnsavedChanges(e.detail.hasChanges);
        };

        const handleSaveStatus = (e: CustomEvent) => {
            setSaving(e.detail.saving || false);
            setSaveError(e.detail.error || null);
            setSaveSuccess(e.detail.success || false);
            if (e.detail.success && saveAndSwitch.current) {
                saveAndSwitch.current = false;
                setHasUnsavedChanges(false);
                setShowUnsavedWarning(false);
                setPendingTab(current => {
                    if (current) setActiveTab(current);
                    return null;
                });
            }
        };

        window.addEventListener('unsavedChanges', handleUnsavedChanges as EventListener);
        window.addEventListener('saveStatus', handleSaveStatus as EventListener);

        return () => {
            window.removeEventListener('unsavedChanges', handleUnsavedChanges as EventListener);
            window.removeEventListener('saveStatus', handleSaveStatus as EventListener);
        };
    }, []);

    const handleSave = () => {
        // Dispatch save event to the active tab
        window.dispatchEvent(new CustomEvent('triggerSave', { detail: { tab: activeTab } }));
    };

    const handleTabChange = (tab: Tab) => {
        if (hasUnsavedChanges) {
            setPendingTab(tab);
            setShowUnsavedWarning(true);
        } else {
            setActiveTab(tab);
        }
    };

    const confirmTabChange = () => {
        setHasUnsavedChanges(false);
        setShowUnsavedWarning(false);
        if (pendingTab) {
            setActiveTab(pendingTab);
            setPendingTab(null);
        }
    };

    const cancelTabChange = () => {
        setShowUnsavedWarning(false);
        setPendingTab(null);
    };

    const saveBeforeTabChange = () => {
        saveAndSwitch.current = true;
        setShowUnsavedWarning(false);
        window.dispatchEvent(new CustomEvent('triggerSave', { detail: { tab: activeTab } }));
    };

    return (
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
            {/* Tabs */}
            <div className="mb-5 flex gap-2 border-b border-neutral-200">
                <button
                    onClick={() => handleTabChange('hours')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'hours'
                            ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                            : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                    )}
                >
                    <Clock className="h-4 w-4" />
                    Weekly Hours
                </button>
                <button
                    onClick={() => handleTabChange('blocked')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'blocked'
                            ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                            : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                    )}
                >
                    <Ban className="h-4 w-4" />
                    Blocked Dates
                </button>
                <button
                    onClick={() => handleTabChange('settings')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'settings'
                            ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                            : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    Booking Rules
                </button>
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-[#e8ddd2] bg-[#fffdfa] p-4 shadow-[0_18px_45px_rgba(57,32,18,0.05)] sm:p-5">
                {activeTab === 'hours' && <AvailabilitySchedule key="hours" onManageBlockedDates={() => handleTabChange('blocked')} />}
                {activeTab === 'blocked' && <BlockTimeModal key="blocked" />}
                {activeTab === 'settings' && <AppointmentSettingsTab key="settings" />}
            </div>

            {/* Unsaved Changes Warning Modal */}
            {showUnsavedWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-6 w-6 text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                                    Unsaved Changes
                                </h3>
                                <p className="text-sm text-neutral-600 mb-4">
                                    Save your changes before switching, or discard them.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={cancelTabChange}
                                        className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50"
                                    >
                                        Stay on This Tab
                                    </button>
                                    <button
                                        onClick={saveBeforeTabChange}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Save and Switch
                                    </button>
                                    <button
                                        onClick={confirmTabChange}
                                        className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800"
                                    >
                                        Discard Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Save Bar */}
            <StickySaveBar
                onSave={handleSave}
                saving={saving}
                hasUnsavedChanges={hasUnsavedChanges}
                error={saveError}
                success={saveSuccess}
                saveLabel="Save changes"
            />
        </div>
    );
}
