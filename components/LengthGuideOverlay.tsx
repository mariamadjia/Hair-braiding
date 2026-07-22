"use client";

import { ArrowLeft, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LengthGuideOverlay({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col bg-white text-neutral-900 lg:absolute lg:inset-auto lg:left-[calc(100%+1rem)] lg:top-0 lg:h-full lg:w-[32rem] lg:overflow-hidden lg:rounded-xl lg:border lg:border-neutral-200 lg:shadow-[0_20px_60px_rgb(0,0,0,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="length-guide-title"
        >
            <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-neutral-200 bg-white px-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#2C1810]"
                    aria-label="Close length guide"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 id="length-guide-title" className="text-base font-semibold tracking-wide">Length Guide</h2>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[#F6F5F1] px-3 py-4 sm:px-6">
                <p className="mb-3 flex items-center justify-center gap-2 text-xs text-neutral-500">
                    <ZoomIn className="h-4 w-4" /> Pinch to zoom
                </p>
                <div className="m-auto flex max-w-4xl items-center justify-center overflow-auto rounded-xl bg-white p-2 shadow-sm sm:p-4">
                    <img
                        src="/images/length-guide.png"
                        alt="Hair length guide showing shoulder, armpit, bra-strap, mid-back, waist, hip, tailbone, classic, and mid-thigh lengths"
                        className="h-auto max-h-[calc(100dvh-10.5rem)] w-auto max-w-full object-contain [touch-action:pinch-zoom]"
                        draggable={false}
                    />
                </div>
            </div>

            <footer className="shrink-0 border-t border-neutral-200 bg-white p-4 shadow-[0_-10px_24px_rgba(0,0,0,0.06)] sm:px-8">
                <Button type="button" variant="outline" onClick={onClose} className="mx-auto block w-full max-w-xl rounded-lg py-3 text-xs font-semibold uppercase tracking-wider">
                    <span className="lg:hidden">Back to length options</span>
                    <span className="hidden lg:inline">Close length guide</span>
                </Button>
            </footer>
        </div>
    );
}
