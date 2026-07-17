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
    success,
    saveLabel = "Save Changes"
}: StickySaveBarProps) {
    if (!hasUnsavedChanges && !saving && !error && !success) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg z-40">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 text-amber-600">
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
                    {success && (
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="text-sm font-medium">Saved successfully!</span>
                        </div>
                    )}
                </div>

                <Button
                    onClick={onSave}
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
                            {saveLabel}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
