"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

type TimePickerProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

const TIME_OPTIONS = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

export default function TimePicker({ value, onChange, disabled }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const formatTime12 = (time24: string) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes}${ampm}`;
    };

    const filteredOptions = TIME_OPTIONS.filter(time => {
        const formatted = formatTime12(time);
        return formatted.toLowerCase().includes(searchQuery.toLowerCase()) ||
               time.includes(searchQuery);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (time: string) => {
        onChange(time);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 py-2.5 text-left border border-neutral-200 rounded-lg bg-white flex items-center justify-between transition-all ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
            >
                <span className="text-sm font-medium">{formatTime12(value)}</span>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
                    <div className="p-3 border-b border-neutral-200">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search time..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((time) => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleSelect(time)}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors ${
                                        time === value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-neutral-700'
                                    }`}
                                >
                                    {formatTime12(time)}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-neutral-500">
                                No times found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
