"use client";

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { 
    LayoutDashboard, 
    Scissors, 
    Calendar, 
    Users, 
    DollarSign, 
    Image as ImageIcon, 
    Settings, 
    User, 
    ChevronLeft,
    ChevronRight,
    LogOut,
    ChevronDown,
    ChevronUp,
    Sun,
    Moon,
    Home,
    Clock
} from "lucide-react";

interface SidebarProps {
    currentSection: string;
    onSectionChange: (section: string) => void;
    onLogout: () => void;
    adminName?: string;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    subItems?: { id: string; label: string }[];
}

export function AdminSidebar({ currentSection, onSectionChange, onLogout, adminName = "Admin" }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(["services"]);
    const { isDarkMode, toggleDarkMode } = useTheme();

    const menuItems: MenuItem[] = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "homepage", label: "Homepage", icon: Home },
        { 
            id: "categories", 
            label: "Services", 
            icon: Scissors
        },
        { id: "bookings", label: "Bookings", icon: Calendar },
        { id: "availability", label: "Availability", icon: Clock },
        { id: "customers", label: "Customers", icon: Users },
        { id: "pricing", label: "Pricing", icon: DollarSign },
        { id: "gallery", label: "Gallery", icon: ImageIcon },
        { 
            id: "settings", 
            label: "Settings", 
            icon: Settings,
            subItems: [
                { id: "general", label: "General" },
                { id: "booking-config", label: "Booking Config" },
                { id: "integrations", label: "Integrations" },
            ]
        },
        { id: "profile", label: "Profile", icon: User },
    ];

    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleItemClick = (itemId: string, hasSubItems: boolean) => {
        if (hasSubItems) {
            toggleExpanded(itemId);
        } else {
            onSectionChange(itemId);
        }
    };

    return (
        <div 
            className={`h-screen bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex flex-col transition-all duration-300 ${
                isCollapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Header */}
            <div className="h-16 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-4 shrink-0">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-neutral-700 flex items-center justify-center">
                            <span className="text-white text-sm">✨</span>
                        </div>
                        <span className="font-medium text-neutral-900 dark:text-white text-sm">Braiding Admin</span>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 hover:bg-neutral-100 rounded-sm transition-colors"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-neutral-600" />
                    ) : (
                        <ChevronLeft className="h-4 w-4 text-neutral-600" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentSection === item.id || 
                            item.subItems?.some(sub => currentSection === sub.id);
                        const isExpanded = expandedItems.includes(item.id);
                        const hasSubItems = item.subItems && item.subItems.length > 0;

                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleItemClick(item.id, !!hasSubItems)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
                                        isActive 
                                            ? "bg-neutral-900 dark:bg-neutral-700 text-white" 
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="text-sm flex-1 text-left">{item.label}</span>
                                            {hasSubItems && (
                                                isExpanded ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )
                                            )}
                                        </>
                                    )}
                                </button>

                                {/* Sub-items */}
                                {!isCollapsed && hasSubItems && isExpanded && (
                                    <ul className="mt-1 ml-4 space-y-1">
                                        {item.subItems!.map((subItem) => (
                                            <li key={subItem.id}>
                                                <button
                                                    onClick={() => onSectionChange(subItem.id)}
                                                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm transition-colors ${
                                                        currentSection === subItem.id
                                                            ? "bg-neutral-100 text-neutral-900 font-medium"
                                                            : "text-neutral-600 hover:bg-neutral-50"
                                                    }`}
                                                >
                                                    <span className="h-1 w-1 rounded-full bg-current" />
                                                    {subItem.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 shrink-0">
                {!isCollapsed ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                                <User className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{adminName}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Administrator</p>
                            </div>
                        </div>
                        
                        {/* Dark Mode Toggle */}
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-sm transition-colors">
                            <div className="flex items-center gap-2">
                                {isDarkMode ? (
                                    <Moon className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                                ) : (
                                    <Sun className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                                )}
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                    {isDarkMode ? "Dark" : "Light"} Mode
                                </span>
                            </div>
                            <button
                                onClick={toggleDarkMode}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    isDarkMode ? "bg-neutral-900" : "bg-neutral-300"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                        isDarkMode ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-sm transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Dark Mode Toggle - Collapsed */}
                        <button
                            onClick={toggleDarkMode}
                            className="w-full flex items-center justify-center p-2 text-neutral-700 hover:bg-neutral-100 rounded-sm transition-colors"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDarkMode ? (
                                <Moon className="h-4 w-4" />
                            ) : (
                                <Sun className="h-4 w-4" />
                            )}
                        </button>
                        
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center p-2 text-neutral-700 hover:bg-neutral-100 rounded-sm transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
