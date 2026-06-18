import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { adminNotes } = body;

        // Extract JWT token from cookies or Authorization header
        const token = request.cookies.get('token')?.value || 
                     request.headers.get('authorization')?.replace('Bearer ', '');

        console.log('Deny appointment - Token:', token ? 'Present' : 'Missing');

        const backendResponse = await fetch(`${BACKEND_URL}/api/appointments/${id}/deny`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ adminNotes })
        });

        console.log('Backend response status:', backendResponse.status);

        if (!backendResponse.ok) {
            const errorData = await backendResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to deny appointment');
        }

        const appointment = await backendResponse.json();

        return NextResponse.json(appointment);
    } catch (error) {
        console.error("Deny appointment error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to deny appointment" },
            { status: 500 }
        );
    }
}
