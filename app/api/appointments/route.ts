import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-hairbraiding.onrender.com";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const authHeader = request.headers.get('authorization');
        const cookieHeader = request.headers.get('cookie');

        const status = searchParams.get('status');
        const dateRange = searchParams.get('dateRange') === 'true';
        searchParams.delete('status');
        searchParams.delete('dateRange');

        let endpoint = '';
        if (dateRange) endpoint = '/date-range';
        else if (status && status !== 'ALL') endpoint = `/status/${encodeURIComponent(status)}`;
        let url = `${BACKEND_URL}/api/appointments${endpoint}`;
        const query = searchParams.toString();
        if (query) {
            url += `?${query}`;
        }

        const backendResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
            cache: 'no-store',
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error('Backend error response:', errorText);
            
            if (backendResponse.status === 401 || backendResponse.status === 403) {
                return NextResponse.json(
                    { error: "Unauthorized - Invalid or expired token. Please log in again." },
                    { status: 401 }
                );
            }
            
            return NextResponse.json(
                { error: errorText || `Failed to fetch appointments: ${backendResponse.status}` },
                { status: backendResponse.status }
            );
        }

        const appointments = await backendResponse.json();

        return NextResponse.json(appointments);
    } catch (error) {
        console.error("Fetch appointments error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch appointments" },
            { status: 500 }
        );
    }
}
