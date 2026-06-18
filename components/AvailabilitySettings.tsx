"use client";

import { useState } from "react";
import { Settings, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import AvailabilitySchedule from "./AvailabilitySchedule";
import BlockTimeModal from "./BlockTimeModal";
import AppointmentSettingsTab from "./AppointmentSettingsTab";

type Tab = 'hours' | 'blocked' | 'settings';

export default function AvailabilitySettings() {
    const [activeTab, setActiveTab] = useState<Tab>('hours');

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-light tracking-wide text-neutral-900 mb-2">
                    Availability Settings
                </h1>
                <p className="text-neutral-600">Manage your business hours and blocked time slots</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-neutral-200">
                <button
                    onClick={() => setActiveTab('hours')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'hours'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-neutral-500 hover:text-neutral-700"
                    )}
                >
                    <Clock className="h-4 w-4" />
                    Schedules
                </button>
                <button
                    onClick={() => setActiveTab('blocked')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'blocked'
                            ? "border-neutral-900 text-neutral-900"
                            : "border-transparent text-neutral-500 hover:text-neutral-700"
                    )}
                >
                    <Ban className="h-4 w-4" />
                    Blocked Times
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        activeTab === 'settings'
                            ? "border-neutral-900 text-neutral-900"
                            : "border-transparent text-neutral-500 hover:text-neutral-700"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </button>
            </div>

            {/* Content */}
            <div className="bg-white border border-neutral-200 rounded-sm p-6">
                {activeTab === 'hours' && <AvailabilitySchedule key="hours" />}
                {activeTab === 'blocked' && <BlockTimeModal key="blocked" />}
                {activeTab === 'settings' && <AppointmentSettingsTab key="settings" />}
            </div>
        </div>
    );
}
