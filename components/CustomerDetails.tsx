"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAuthToken } from "@/lib/utils/auth";
import { API_BASE_URL } from "@/lib/config/api";

interface Appointment {
    id: number;
    serviceName: string;
    appointmentDateTime: string;
    status: string;
    amountPaid: number;
}

interface CustomerDetail {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    firstAppointmentDate: string | null;
    lastAppointmentDate: string | null;
    totalAppointments: number;
    totalSpent: number;
    averageAppointmentValue: number;
    appointments: Appointment[];
    notes: string | null;
}

interface CustomerDetailsProps {
    customerId: number;
    onBack: () => void;
}

export default function CustomerDetails({ customerId, onBack }: CustomerDetailsProps) {
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomerDetails();
    }, [customerId]);

    const fetchCustomerDetails = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/customers/${customerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCustomer(data);
            } else {
                setError('Failed to fetch customer details');
            }
        } catch (error) {
            console.error('Error fetching customer details:', error);
            setError('Failed to fetch customer details');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return 'bg-green-100 text-green-700';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700';
            case 'DENIED':
                return 'bg-red-100 text-red-700';
            case 'CANCELLED':
                return 'bg-neutral-100 text-neutral-700';
            default:
                return 'bg-neutral-100 text-neutral-700';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800">
                {error || 'Customer not found'}
            </div>
        );
    }

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
                    {customer.firstName} {customer.lastName}
                </h2>
            </div>

            {/* Contact Info */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                    <div>
                        <span className="text-sm text-neutral-500">Email:</span>
                        <span className="ml-2 text-sm text-neutral-900">{customer.email}</span>
                    </div>
                    <div>
                        <span className="text-sm text-neutral-500">Phone:</span>
                        <span className="ml-2 text-sm text-neutral-900">{customer.phoneNumber}</span>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{customer.totalAppointments}</div>
                        <div className="text-sm text-neutral-500">Total Appointments</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{formatCurrency(customer.totalSpent)}</div>
                        <div className="text-sm text-neutral-500">Total Spent</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{formatCurrency(customer.averageAppointmentValue)}</div>
                        <div className="text-sm text-neutral-500">Average Value</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{formatDate(customer.lastAppointmentDate)}</div>
                        <div className="text-sm text-neutral-500">Last Appointment</div>
                    </div>
                </div>
            </div>

            {/* Appointment History */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Appointment History</h3>
                {customer.appointments.length === 0 ? (
                    <p className="text-sm text-neutral-500">No appointments found</p>
                ) : (
                    <div className="space-y-3">
                        {customer.appointments.map((appointment) => (
                            <div key={appointment.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-md">
                                <div>
                                    <div className="font-medium text-neutral-900">{appointment.serviceName}</div>
                                    <div className="text-sm text-neutral-600">{formatDateTime(appointment.appointmentDateTime)}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                        {appointment.status}
                                    </span>
                                    <span className="text-sm font-medium text-neutral-900">
                                        {formatCurrency(appointment.amountPaid)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
