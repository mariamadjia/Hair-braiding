"use client";

import { memo } from "react";

interface CustomerTableProps {
    onViewDetails: (customerId: number) => void;
}

function CustomerTable({ onViewDetails }: CustomerTableProps) {
    return (
        <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                <p className="text-neutral-600">Customer management feature coming soon</p>
            </div>
        </div>
    );
}

export default memo(CustomerTable);
