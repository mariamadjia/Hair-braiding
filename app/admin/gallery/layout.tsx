"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminSidebar } from '../components/AdminSidebar';

export default function AdminGalleryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/admin');
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="text-neutral-600">Checking authentication...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-50">
            {/* Sidebar */}
            <AdminSidebar 
                currentSection="gallery"
                onSectionChange={(section) => {
                    if (section !== 'gallery') {
                        router.push('/admin');
                    }
                }}
                onLogout={() => {
                    localStorage.removeItem('auth_token');
                    router.push('/admin');
                }}
            />
            
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
