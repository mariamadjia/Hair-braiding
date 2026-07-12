"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    lastAppointmentDate: string | null;
    totalAppointments: number;
    totalSpent: number;
}

interface CustomerTableProps {
    onViewDetails: (customerId: number) => void;
}

function CustomerTable({ onViewDetails }: CustomerTableProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchCustomers();
    }, [page]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/customers?page=${page}&size=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both paginated and non-paginated responses
                if (data.content) {
                    setCustomers(data.content);
                    setTotalPages(data.totalPages);
                } else {
                    setCustomers(data);
                    setTotalPages(1);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.error || errorData.message || 'Failed to fetch customers');
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            setError('Failed to connect to server. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const filteredCustomers = customers.filter(customer => {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return fullName.includes(searchLower) || 
               customer.email.toLowerCase().includes(searchLower) ||
               customer.phoneNumber.includes(searchLower);
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Customer Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Last Appt</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Appts</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Total Spent</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                                    No customers found
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-neutral-50">
                                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                                        {customer.firstName} {customer.lastName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">{customer.email}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">{customer.phoneNumber}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">{formatDate(customer.lastAppointmentDate)}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">{customer.totalAppointments}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">{formatCurrency(customer.totalSpent)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <button
                                            onClick={() => onViewDetails(customer.id)}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-neutral-600">
                <span>Total Customers: {customers.length}</span>
                <span>Showing: {filteredCustomers.length}</span>
            </div>

            {/* Pagination Controls */}
            {!loading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
                    <div className="text-sm text-neutral-600">
                        Page {page + 1} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 text-sm border border-neutral-300 rounded-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="px-4 py-2 text-sm border border-neutral-300 rounded-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(CustomerTable);
