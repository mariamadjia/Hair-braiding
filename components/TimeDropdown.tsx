"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeDropdownProps = {
    value: string;
    onChange: (value: string) => void;
    className?: string;
};

export default function TimeDropdown({ value, onChange, className }: TimeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const period = hour < 12 ? 'am' : 'pm';
                const displayMinute = String(minute).padStart(2, '0');
                const displayTime = `${displayHour}:${displayMinute}${period}`;
                
                options.push({ value: timeValue, label: displayTime });
            }
        }
        return options;
    };

    const timeOptions = generateTimeOptions();
    const selectedOption = timeOptions.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && listRef.current && selectedOption) {
            const selectedIndex = timeOptions.findIndex(opt => opt.value === value);
            const itemHeight = 36; // approximate height of each item
            const scrollPosition = selectedIndex * itemHeight - 72; // center the selected item
            listRef.current.scrollTop = Math.max(0, scrollPosition);
        }
    }, [isOpen, value, selectedOption, timeOptions]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    const filteredOptions = searchTerm
        ? timeOptions.filter(opt => opt.label.includes(searchTerm))
        : timeOptions;

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between hover:border-neutral-300 transition-colors"
            >
                <span>{selectedOption?.label || 'Select time'}</span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-neutral-400 transition-transform",
                    isOpen && "transform rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg">
                    {/* Search input */}
                    <div className="p-2 border-b border-neutral-100">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search time..."
                            className="w-full px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    {/* Options list with limited height */}
                    <div 
                        ref={listRef}
                        className="max-h-[200px] overflow-y-auto"
                    >
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between transition-colors",
                                    option.value === value && "bg-blue-50 text-blue-600"
                                )}
                            >
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                )}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-sm text-neutral-400 text-center">
                                No times found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
