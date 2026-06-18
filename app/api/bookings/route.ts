import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, phoneNumber, appointmentDateTime, serviceId, notes } = body;

        if (!firstName || !lastName || !email || !phoneNumber || !appointmentDateTime) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const backendResponse = await fetch(`${BACKEND_URL}/api/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                phoneNumber,
                appointmentDateTime,
                serviceId,
                notes
            })
        });

        if (!backendResponse.ok) {
            const errorData = await backendResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create appointment');
        }

        const appointment = await backendResponse.json();

        return NextResponse.json({ 
            success: true,
            message: "Booking confirmed successfully! We'll review your request and get back to you soon.",
            appointment
        });
    } catch (error) {
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create booking" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        
        const authHeader = request.headers.get('authorization');
        
        console.log('GET /api/bookings - Auth header present:', !!authHeader);
        console.log('GET /api/bookings - Auth header value:', authHeader ? `${authHeader.substring(0, 20)}...` : 'none');
        
        if (!authHeader) {
            console.error('No authorization header provided');
            return NextResponse.json(
                { error: "Unauthorized - No authentication token provided" },
                { status: 401 }
            );
        }
        
        let url = `${BACKEND_URL}/api/appointments`;
        if (status && status !== 'ALL') {
            url += `/status/${status}`;
        }

        console.log('Fetching from backend:', url);

        const backendResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });

        console.log('Backend response status:', backendResponse.status);

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error('Backend error response:', errorText);
            
            if (backendResponse.status === 401 || backendResponse.status === 403) {
                return NextResponse.json(
                    { error: "Unauthorized - Invalid or expired token. Please log in again." },
                    { status: 401 }
                );
            }
            
            throw new Error(`Failed to fetch appointments: ${backendResponse.status}`);
        }

        const appointments = await backendResponse.json();
        console.log('Successfully fetched appointments:', appointments.length);

        return NextResponse.json(appointments);
    } catch (error) {
        console.error("Fetch appointments error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch appointments" },
            { status: 500 }
        );
    }
}
