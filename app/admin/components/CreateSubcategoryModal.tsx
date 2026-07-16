"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { validateFile } from "../utils/fileValidation";

interface CreateSubcategoryModalProps {
    categoryId: number;
    onClose: () => void;
    onCreate: (data: { name: string; categoryId: number }) => void;
}

export function CreateSubcategoryModal({ categoryId, onClose, onCreate }: CreateSubcategoryModalProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const handleCreate = () => {
        if (!name.trim()) {
            setError("Subcategory name is required");
            return;
        }
        
        onCreate({ name: name.trim(), categoryId });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Create New Subcategory
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Subcategory Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-white"
                        placeholder="Enter subcategory name"
                        autoFocus
                    />
                    {error && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                        You can add images after creating the subcategory
                    </p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Subcategory
                    </button>
                </div>
            </div>
        </div>
    );
}
