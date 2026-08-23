"use client";

import { Loader2, Save } from "lucide-react";

export function ServicesSaveBar({
    visible,
    saving,
    disabled = false,
    onSave,
}: {
    visible: boolean;
    saving: boolean;
    disabled?: boolean;
    onSave: () => void;
}) {
    if (!visible && !saving) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e4d8cc] bg-[#fffdf9]/95 px-3 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_rgba(45,24,15,.10)] backdrop-blur md:left-64 md:px-4 dark:border-neutral-700 dark:bg-neutral-900/95">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#b7734d]" />
                    <div>
                        <p className="text-sm font-semibold text-[#351a10] dark:text-white">Unsaved changes</p>
                        <p className="hidden text-xs text-neutral-500 sm:block">Review your changes before saving.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={disabled || saving}
                    className="inline-flex min-h-10 min-w-36 items-center justify-center gap-2 rounded-xl bg-[#351a10] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(53,26,16,.16)] transition hover:bg-[#4b2819] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving…" : "Save changes"}
                </button>
            </div>
        </div>
    );
}
