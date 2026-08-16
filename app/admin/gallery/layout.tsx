"use client";

import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { AdminSidebar } from '../components/AdminSidebar';

export default function AdminGalleryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

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
                onLogout={async () => {
                    await authApi.logout();
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
