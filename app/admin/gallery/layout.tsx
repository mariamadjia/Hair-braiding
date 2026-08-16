"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { AdminSidebar } from '../components/AdminSidebar';

export default function AdminGalleryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkAuthentication = async () => {
            try {
                await authApi.session();
                if (!cancelled) {
                    setIsAuthenticated(true);
                }
            } catch {
                if (!cancelled) {
                    router.replace('/admin');
                }
            }
        };

        void checkAuthentication();

        return () => {
            cancelled = true;
        };
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
                    localStorage.removeItem('admin_user');
                    sessionStorage.removeItem('auth_token');
                    sessionStorage.removeItem('admin_user');
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
