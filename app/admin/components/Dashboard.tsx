"use client";

import { useEffect, useState } from "react";
import { 
    TrendingUp, 
    TrendingDown, 
    Calendar, 
    DollarSign, 
    Users, 
    Scissors,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw
} from "lucide-react";

interface DashboardStats {
    todayBookings: number;
    weekRevenue: number;
    monthCustomers: number;
    totalServices: number;
    trends: {
        bookings: number;
        revenue: number;
        customers: number;
    };
}

interface Booking {
    id: string;
    time: string;
    customerName: string;
    service: string;
    status: "confirmed" | "pending" | "completed" | "cancelled";
}

interface PopularService {
    name: string;
    bookings: number;
    revenue: number;
    trend: number;
}

interface Activity {
    id: string;
    message: string;
    time: string;
    type: "booking" | "payment" | "customer" | "cancellation";
}

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        todayBookings: 12,
        weekRevenue: 2450,
        monthCustomers: 45,
        totalServices: 127,
        trends: {
            bookings: 20,
            revenue: 15,
            customers: 8,
        }
    });

    const [todaySchedule] = useState<Booking[]>([
        { id: "1", time: "9:00 AM", customerName: "Jane Doe", service: "Box Braids", status: "confirmed" },
        { id: "2", time: "11:00 AM", customerName: "Sarah Johnson", service: "Cornrows", status: "confirmed" },
        { id: "3", time: "2:00 PM", customerName: "Maria Garcia", service: "Senegalese Twists", status: "pending" },
        { id: "4", time: "4:00 PM", customerName: "Lisa Brown", service: "Knotless Braids", status: "confirmed" },
        { id: "5", time: "6:00 PM", customerName: "Emma Wilson", service: "Faux Locs", status: "pending" },
    ]);

    const [popularServices] = useState<PopularService[]>([
        { name: "Box Braids", bookings: 45, revenue: 4500, trend: 12 },
        { name: "Cornrows", bookings: 32, revenue: 2880, trend: 8 },
        { name: "Senegalese Twists", bookings: 28, revenue: 3360, trend: -3 },
        { name: "Knotless Braids", bookings: 25, revenue: 3250, trend: 15 },
        { name: "Faux Locs", bookings: 18, revenue: 2340, trend: 5 },
    ]);

    const [recentActivity] = useState<Activity[]>([
        { id: "1", message: "Jane Doe booked Box Braids", time: "2 hours ago", type: "booking" },
        { id: "2", message: "Payment received from Sarah Johnson - $90", time: "3 hours ago", type: "payment" },
        { id: "3", message: "New customer registered: Maria Garcia", time: "5 hours ago", type: "customer" },
        { id: "4", message: "Booking cancelled by admin", time: "1 day ago", type: "cancellation" },
        { id: "5", message: "Emma Wilson booked Faux Locs", time: "1 day ago", type: "booking" },
    ]);

    const [bookingStatus] = useState({
        confirmed: 45,
        pending: 30,
        completed: 20,
        cancelled: 5,
    });

    const getStatusColor = (status: Booking["status"]) => {
        switch (status) {
            case "confirmed": return "text-green-600 bg-green-50";
            case "pending": return "text-yellow-600 bg-yellow-50";
            case "completed": return "text-blue-600 bg-blue-50";
            case "cancelled": return "text-red-600 bg-red-50";
        }
    };

    const getStatusIcon = (status: Booking["status"]) => {
        switch (status) {
            case "confirmed": return <CheckCircle className="h-3 w-3" />;
            case "pending": return <Clock className="h-3 w-3" />;
            case "completed": return <CheckCircle className="h-3 w-3" />;
            case "cancelled": return <XCircle className="h-3 w-3" />;
        }
    };

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
                    <p className="text-sm text-neutral-500 mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Bookings */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${stats.trends.bookings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.trends.bookings >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(stats.trends.bookings)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{stats.todayBookings}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Today's Bookings</p>
                    </div>
                </div>

                {/* Week Revenue */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${stats.trends.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.trends.revenue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(stats.trends.revenue)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">${stats.weekRevenue.toLocaleString()}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This Week Revenue</p>
                    </div>
                </div>

                {/* Month Customers */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${stats.trends.customers >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.trends.customers >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(stats.trends.customers)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{stats.monthCustomers}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This Month Customers</p>
                    </div>
                </div>

                {/* Total Services */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                            <Scissors className="h-5 w-5 text-orange-600" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{stats.totalServices}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Services</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Today's Schedule</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{todaySchedule.length} appointments scheduled</p>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {todaySchedule.map((booking) => (
                            <div key={booking.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{booking.time.split(' ')[0]}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{booking.time.split(' ')[1]}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{booking.customerName}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{booking.service}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                        {getStatusIcon(booking.status)}
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Booking Status */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Booking Status</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Current month breakdown</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Confirmed</span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{bookingStatus.confirmed}%</span>
                            </div>
                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${bookingStatus.confirmed}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Pending</span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{bookingStatus.pending}%</span>
                            </div>
                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500" style={{ width: `${bookingStatus.pending}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Completed</span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{bookingStatus.completed}%</span>
                            </div>
                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${bookingStatus.completed}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Cancelled</span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{bookingStatus.cancelled}%</span>
                            </div>
                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${bookingStatus.cancelled}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Services */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Popular Services</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Top performing services this month</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {popularServices.map((service, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{service.name}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{service.bookings} bookings</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">${service.revenue.toLocaleString()}</p>
                                        <div className={`flex items-center gap-1 text-xs ${service.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {service.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {Math.abs(service.trend)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Activity</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Latest updates and actions</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                        activity.type === 'booking' ? 'bg-blue-50' :
                                        activity.type === 'payment' ? 'bg-green-50' :
                                        activity.type === 'customer' ? 'bg-purple-50' :
                                        'bg-red-50'
                                    }`}>
                                        {activity.type === 'booking' && <Calendar className="h-4 w-4 text-blue-600" />}
                                        {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-600" />}
                                        {activity.type === 'customer' && <Users className="h-4 w-4 text-purple-600" />}
                                        {activity.type === 'cancellation' && <XCircle className="h-4 w-4 text-red-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{activity.message}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">New Booking</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-sm hover:bg-neutral-50 transition-colors">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Add Customer</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-sm hover:bg-neutral-50 transition-colors">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">View Calendar</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-sm hover:bg-neutral-50 transition-colors">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-medium">Reports</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
