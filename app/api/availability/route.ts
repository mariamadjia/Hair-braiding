import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/utils/admin-route";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-hairbraiding.onrender.com';

export async function GET(request: Request) {
    // This is a public endpoint for customer booking, no auth required
    // Admin operations are handled by separate protected endpoints
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";
    
    if (!date) {
        return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/availability/slots?date=${date}&timezone=${timezone}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend availability error:', errorText);
            return NextResponse.json({ error: "Failed to fetch availability" }, { status: response.status });
        }

        const slots = await response.json();
        return NextResponse.json({ date, slots, source: "backend", timezone });
    } catch (error) {
        console.error('Availability fetch error:', error);
        return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
    }
}
