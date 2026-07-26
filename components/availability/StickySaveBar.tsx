"use client";

import { Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StickySaveBarProps = {
    onSave: () => void;
    saving: boolean;
    hasUnsavedChanges: boolean;
    error?: string | null;
    success?: boolean;
    saveLabel?: string;
};

export default function StickySaveBar({
    onSave,
    saving,
    hasUnsavedChanges,
    error,
    saveLabel = "Save Changes"
}: StickySaveBarProps) {
    if (!hasUnsavedChanges && !saving && !error) {
        return null;
    }

    return (
        <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-[#e8ddd2] bg-white/95 shadow-[0_-10px_28px_rgba(57,32,18,0.08)] backdrop-blur sm:-mx-6 lg:-mx-8">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 text-[#6b584c]">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Unsaved changes</span>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                </div>

                <Button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-[#30251f] text-white hover:bg-[#44342b]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {saveLabel}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
