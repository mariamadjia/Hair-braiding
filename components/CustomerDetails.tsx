"use client";

import { memo } from "react";
import { ArrowLeft } from "lucide-react";

interface CustomerDetailsProps {
    customerId: number;
    onBack: () => void;
}

function CustomerDetails({ customerId, onBack }: CustomerDetailsProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <h2 className="text-xl font-medium text-neutral-900">
                    Customer Details
                </h2>
            </div>

            {/* Placeholder */}
            <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                <p className="text-neutral-600">Customer details feature coming soon</p>
            </div>
        </div>
    );
}

export default memo(CustomerDetails);
