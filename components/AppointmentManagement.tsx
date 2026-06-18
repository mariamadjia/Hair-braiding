"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Mail, Phone, MessageSquare, Check, X, Loader2, Filter, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/utils/auth";
import CalendarView from "./CalendarView";

type Appointment = {
    id: number;
    customer: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
    };
    service?: {
        id: number;
        name: string;
        description: string;
    };
    selectedService?: string;
    selectedSize?: string;
    selectedLength?: string;
    price?: string;
    appointmentDateTime: string;
    status: string;
    notes?: string;
    adminNotes?: string;
    approvedByName?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
};

export default function AppointmentManagement() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DENIED'>('PENDING');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = filter === 'ALL' 
                ? '/api/bookings' 
                : `/api/bookings?status=${filter}`;
            
            const token = getAuthToken();
            
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Check if it's an authentication error
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid - redirect to login
                    localStorage.removeItem('auth_token');
                    sessionStorage.removeItem('auth_token');
                    throw new Error('Your session has expired. Please log in again.');
                }
                
                throw new Error(errorData.error || 'Failed to fetch appointments');
            }
            
            const data = await response.json();
            setAppointments(data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setError(error instanceof Error ? error.message : 'Failed to connect to backend. Make sure the Java backend is running on http://localhost:8080');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (appointmentId: number) => {
        const notes = prompt('Add approval notes (optional):');
        
        setActionLoading(appointmentId);
        try {
            const token = getAuthToken();
            
            const response = await fetch(`/api/appointments/${appointmentId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ adminNotes: notes || '' })
            });

            if (!response.ok) throw new Error('Failed to approve appointment');
            
            await fetchAppointments();
            alert('Appointment approved successfully!');
        } catch (error) {
            console.error('Error approving appointment:', error);
            alert('Failed to approve appointment');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeny = async (appointmentId: number) => {
        const notes = prompt('Reason for denial (required):');
        if (!notes) {
            alert('Please provide a reason for denial');
            return;
        }
        
        setActionLoading(appointmentId);
        try {
            const token = getAuthToken();
            
            const response = await fetch(`/api/appointments/${appointmentId}/deny`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ adminNotes: notes })
            });

            if (!response.ok) throw new Error('Failed to deny appointment');
            
            await fetchAppointments();
            alert('Appointment denied');
        } catch (error) {
            console.error('Error denying appointment:', error);
            alert('Failed to deny appointment');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDateTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'APPROVED':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'DENIED':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-light tracking-wide text-neutral-900 mb-2">
                        Appointment Management
                    </h1>
                    <p className="text-neutral-600">Review and manage customer appointment requests</p>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex border border-neutral-200 rounded-sm overflow-hidden">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                            viewMode === 'list'
                                ? "bg-neutral-900 text-white"
                                : "bg-white text-neutral-600 hover:bg-neutral-50"
                        )}
                    >
                        <List className="h-4 w-4" />
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-l border-neutral-200",
                            viewMode === 'calendar'
                                ? "bg-neutral-900 text-white"
                                : "bg-white text-neutral-600 hover:bg-neutral-50"
                        )}
                    >
                        <CalendarDays className="h-4 w-4" />
                        Calendar
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-neutral-200">
                {(['ALL', 'PENDING', 'APPROVED', 'DENIED'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                            filter === status
                                ? "border-neutral-900 text-neutral-900"
                                : "border-transparent text-neutral-500 hover:text-neutral-700"
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <X className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-900 mb-2">Connection Error</h3>
                            <p className="text-sm text-red-700 mb-4">{error}</p>
                            <div className="bg-red-100 border border-red-200 rounded p-4 text-sm text-red-800">
                                <p className="font-medium mb-2">To fix this:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>Open a terminal and navigate to: <code className="bg-red-200 px-1 rounded">/Users/gloriadjonret/Desktop/Backend-Braiding</code></li>
                                    <li>Run: <code className="bg-red-200 px-1 rounded">./mvnw spring-boot:run</code></li>
                                    <li>Wait for "Started BackendBraidingApplication" message</li>
                                    <li>Click the retry button below</li>
                                </ol>
                            </div>
                            <Button
                                onClick={fetchAppointments}
                                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                                size="sm"
                            >
                                Retry Connection
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && appointments.length === 0 && (
                <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">No {filter.toLowerCase()} appointments found</p>
                </div>
            )}

            {/* Calendar View */}
            {!loading && !error && viewMode === 'calendar' && (
                <CalendarView 
                    appointments={appointments}
                    onAppointmentClick={(apt) => setSelectedAppointment(apt)}
                />
            )}

            {/* Appointments List */}
            {!loading && appointments.length > 0 && viewMode === 'list' && (
                <div className="space-y-4">
                    {appointments.map((appointment) => (
                        <div
                            key={appointment.id}
                            className="bg-white border border-neutral-200 rounded-sm p-6 hover:shadow-md transition"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-medium text-neutral-900">
                                            {appointment.customer.firstName} {appointment.customer.lastName}
                                        </h3>
                                        <span className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-full border",
                                            getStatusColor(appointment.status)
                                        )}>
                                            {appointment.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-neutral-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDateTime(appointment.appointmentDateTime)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            <span>{appointment.customer.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            <span>{appointment.customer.phoneNumber}</span>
                                        </div>
                                    </div>

                                    {/* Appointment Summary */}
                                    {(appointment.service || appointment.selectedService || appointment.selectedSize || appointment.selectedLength || appointment.price) && (
                                        <div className="mt-3 p-4 bg-neutral-50 rounded-sm border border-neutral-200">
                                            <h4 className="text-sm font-semibold text-neutral-900 mb-3">Appointment Summary</h4>
                                            <div className="space-y-1.5 text-sm">
                                                {(appointment.service || appointment.selectedService) && (
                                                    <div className="font-semibold text-neutral-900 text-base">
                                                        {appointment.selectedService || appointment.service?.name}
                                                    </div>
                                                )}
                                                {appointment.selectedSize && (
                                                    <div className="text-neutral-700">{appointment.selectedSize}</div>
                                                )}
                                                {appointment.selectedLength && (
                                                    <div className="text-neutral-700">{appointment.selectedLength}</div>
                                                )}
                                                {appointment.price && (
                                                    <div className="font-extrabold text-lg text-neutral-900 mt-2">$ {appointment.price}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {appointment.notes && (
                                        <div className="mt-3 p-3 bg-neutral-50 rounded-sm">
                                            <div className="flex items-start gap-2 text-sm">
                                                <MessageSquare className="h-4 w-4 text-neutral-500 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-neutral-700">Customer Notes:</p>
                                                    <p className="text-neutral-600">{appointment.notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {appointment.adminNotes && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-sm">
                                            <div className="flex items-start gap-2 text-sm">
                                                <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-blue-700">Admin Notes:</p>
                                                    <p className="text-blue-600">{appointment.adminNotes}</p>
                                                    {appointment.approvedByName && (
                                                        <p className="text-xs text-blue-500 mt-1">
                                                            By {appointment.approvedByName} on {formatDateTime(appointment.approvedAt!)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {appointment.status === 'PENDING' && (
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            onClick={() => handleApprove(appointment.id)}
                                            disabled={actionLoading === appointment.id}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            size="sm"
                                        >
                                            {actionLoading === appointment.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Approve
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => handleDeny(appointment.id)}
                                            disabled={actionLoading === appointment.id}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            {actionLoading === appointment.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <X className="h-4 w-4 mr-1" />
                                                    Deny
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-neutral-400 mt-4 pt-4 border-t border-neutral-100">
                                Requested on {formatDateTime(appointment.createdAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
