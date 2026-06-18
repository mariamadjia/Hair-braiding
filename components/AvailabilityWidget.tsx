"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = {
    startAt: string;
};

type ApiResponse = {
    date: string;
    slots: Slot[];
    source?: string;
};

type AvailabilityWidgetProps = {
    serviceName: string;
    sizeOptions: string[];
    lengthOptions: string[];
    initialSize?: string;
    initialLength?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getCalendarCells(year: number, month: number) {
    const totalDays = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    const cells: Array<{ key: string; day?: number; date?: Date }> = [];

    for (let i = 0; i < firstDay; i++) {
        cells.push({ key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        cells.push({ key: `day-${day}`, day, date });
    }

    return cells;
}

function formatTimeLabel(iso: string) {
    const local = new Date(iso);
    return local.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function detectPeriod(iso: string) {
    const hour = new Date(iso).getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
}

function buildLocalMockSlots(date: Date): Slot[] {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const base = `${year}-${month}-${day}`;
    const slots: Slot[] = [];
    for (let hour = 9; hour <= 18; hour++) {
        const hourStr = `${hour}`.padStart(2, "0");
        slots.push({ startAt: `${base}T${hourStr}:00:00` });
        slots.push({ startAt: `${base}T${hourStr}:30:00` });
    }
    return slots;
}

export default function AvailabilityWidget({
    serviceName,
    sizeOptions,
    lengthOptions,
    initialSize,
    initialLength,
}: AvailabilityWidgetProps) {
    const today = useMemo(() => new Date(), []);
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(() => today);
    const [selectedSize, setSelectedSize] = useState(() => {
        if (initialSize && sizeOptions.includes(initialSize)) return initialSize;
        return sizeOptions[0] ?? "";
    });
    const [selectedLength, setSelectedLength] = useState(() => {
        if (initialLength && lengthOptions.includes(initialLength)) return initialLength;
        return lengthOptions[0] ?? "";
    });
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [source, setSource] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (sizeOptions.length === 0) {
            setSelectedSize("");
            return;
        }
        setSelectedSize((prev) => (sizeOptions.includes(prev) ? prev : sizeOptions[0]));
    }, [sizeOptions]);

    useEffect(() => {
        if (lengthOptions.length === 0) {
            setSelectedLength("");
            return;
        }
        setSelectedLength((prev) => (lengthOptions.includes(prev) ? prev : lengthOptions[0]));
    }, [lengthOptions]);

    useEffect(() => {
        let ignore = false;
        async function loadSlots() {
            setLoading(true);
            setError(null);
            try {
                const dateParam = selectedDate.toISOString().slice(0, 10);
                const response = await fetch(`/api/availability?date=${dateParam}`);
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }
                const data: ApiResponse = await response.json();
                if (ignore) return;
                setSlots(data.slots);
                setSource(data.source);
            } catch (err) {
                if (ignore) return;
                console.warn("Falling back to local mock availability", err);
                setSlots(buildLocalMockSlots(selectedDate));
                setSource("mock-local");
                setError(null);
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        loadSlots();
        return () => {
            ignore = true;
        };
    }, [selectedDate]);

    const groupedSlots = useMemo(() => {
        const groups: Record<string, Slot[]> = {
            Morning: [],
            Afternoon: [],
            Evening: [],
        };
        slots.forEach((slot) => {
            const period = detectPeriod(slot.startAt);
            groups[period].push(slot);
        });
        return groups;
    }, [slots]);

    const cells = useMemo(() => getCalendarCells(currentYear, currentMonth), [currentYear, currentMonth]);

    const timezoneLabel = useMemo(() => {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }, []);

    function goToPreviousMonth() {
        setCurrentMonth((prev) => {
            const next = prev - 1;
            if (next < 0) {
                setCurrentYear((year) => year - 1);
                return 11;
            }
            return next;
        });
    }

    function goToNextMonth() {
        setCurrentMonth((prev) => {
            const next = prev + 1;
            if (next > 11) {
                setCurrentYear((year) => year + 1);
                return 0;
            }
            return next;
        });
    }

    function handleDayClick(date?: Date) {
        if (!date) return;
        setSelectedDate(date);
    }

    const selectedDayKey = selectedDate.toISOString().slice(0, 10);

    return (
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-b from-neutral-100 via-white to-white shadow-2xl ring-1 ring-neutral-200">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                <div className="flex flex-col gap-6 bg-neutral-100/50 p-6 md:p-8">
                    <div className="space-y-2">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-900">{serviceName}</p>
                        <div className="flex items-start gap-2 rounded-lg bg-white/60 p-3 text-xs text-neutral-600">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 text-emerald-600 font-bold">i</span>
                            <span>Booking will be confirmed after selecting time and purchasing slots</span>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-white bg-white p-5 shadow-md">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goToPreviousMonth}
                                className="text-lg font-bold text-neutral-600 hover:text-neutral-900"
                                aria-label="Previous month"
                            >
                                ‹
                            </button>
                            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-700">
                                {formatMonthLabel(currentYear, currentMonth)}
                            </span>
                            <button
                                type="button"
                                onClick={goToNextMonth}
                                className="text-lg font-bold text-neutral-600 hover:text-neutral-900"
                                aria-label="Next month"
                            >
                                ›
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-emerald-700">
                            {WEEKDAYS.map((day) => (
                                <span key={day}>{day}</span>
                            ))}
                        </div>

                        <div className="mt-3 grid grid-cols-7 gap-2">
                            {cells.map(({ key, day, date }) => {
                                if (!day || !date) {
                                    return <span key={key} />;
                                }
                                const isoKey = date.toISOString().slice(0, 10);
                                const isSelected = isoKey === selectedDayKey;
                                const isToday = isoKey === today.toISOString().slice(0, 10);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleDayClick(date)}
                                        className={`aspect-square rounded-xl text-sm font-semibold transition ${
                                            isSelected
                                                ? "bg-emerald-600 text-white shadow-md"
                                                : isToday
                                                ? "bg-neutral-200 text-neutral-900"
                                                : "bg-transparent text-neutral-600 hover:bg-neutral-100"
                                        }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 bg-white p-6 md:p-8">
                    <div className="space-y-3">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Style Size</label>
                                <div className="relative">
                                    <select
                                        value={selectedSize}
                                        onChange={(e) => setSelectedSize(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-emerald-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                    >
                                        {sizeOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-emerald-600">
                                        ▾
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Length</label>
                                <div className="relative">
                                    <select
                                        value={selectedLength}
                                        onChange={(e) => setSelectedLength(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-emerald-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                    >
                                        {lengthOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-emerald-600">
                                        ▾
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Available Slots</p>
                        <p className="text-xs font-medium text-blue-500">{timezoneLabel}: G ▾</p>
                    </div>

                    <div className="flex flex-1 flex-col space-y-2">
                        {loading ? (
                            <p className="text-sm text-neutral-500">Loading availability…</p>
                        ) : error ? (
                            <p className="text-sm text-red-500">{error}</p>
                        ) : slots.length === 0 ? (
                            <p className="text-sm text-neutral-600">No openings for this date. Try another day.</p>
                        ) : (
                            <div className="space-y-4">
                                {(["Morning", "Afternoon", "Evening"] as const).map((period) => {
                                    const periodSlots = groupedSlots[period] ?? [];
                                    return (
                                        <div key={period} className="space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">{period}</p>
                                            {periodSlots.length > 0 ? (
                                                <div className="flex items-center gap-3 overflow-x-auto pb-2 pr-2">
                                                    {periodSlots.map((slot) => {
                                                        const isSelected = selectedSlot === slot.startAt;
                                                        return (
                                                            <button
                                                                key={slot.startAt}
                                                                type="button"
                                                                onClick={() => setSelectedSlot(slot.startAt)}
                                                                className={`min-w-[120px] rounded-2xl border-2 px-5 py-3 text-center text-sm font-semibold transition ${
                                                                    isSelected
                                                                        ? "border-emerald-600 bg-emerald-600 text-white shadow-lg"
                                                                        : "border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                                                                }`}
                                                            >
                                                                {formatTimeLabel(slot.startAt)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-neutral-400">No slots available</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {selectedSlot && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                                Selected {formatTimeLabel(selectedSlot)} • {selectedSize || "Size TBD"} • {selectedLength || "Length TBD"}
                            </div>
                        )}

                        {source === "mock" && (
                            <p className="text-xs text-neutral-400">
                                Showing sample availability. Configure Square credentials to load live data.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 bg-emerald-600 px-6 py-4">
                <button
                    type="button"
                    disabled={!selectedSlot}
                    className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                        selectedSlot
                            ? "bg-white text-emerald-700 hover:bg-emerald-50"
                            : "bg-white/50 text-emerald-600/70 cursor-not-allowed"
                    }`}
                    onClick={() => {
                        if (!selectedSlot) return;
                        console.log("Add to cart", {
                            serviceName,
                            size: selectedSize,
                            length: selectedLength,
                            startAt: selectedSlot,
                        });
                    }}
                >
                    Add to Cart
                </button>
            </div>
        </div>
    );
}
