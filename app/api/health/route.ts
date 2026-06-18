import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function GET() {
    try {
        const backendResponse = await fetch(`${BACKEND_URL}/actuator/health`, {
            method: 'GET',
        });

        const backendHealth = backendResponse.ok 
            ? await backendResponse.json() 
            : { status: 'DOWN', error: `Backend returned ${backendResponse.status}` };

        return NextResponse.json({
            frontend: {
                status: 'UP',
                timestamp: new Date().toISOString(),
            },
            backend: {
                url: BACKEND_URL,
                status: backendResponse.ok ? 'UP' : 'DOWN',
                statusCode: backendResponse.status,
                health: backendHealth,
            }
        });
    } catch (error) {
        return NextResponse.json({
            frontend: {
                status: 'UP',
                timestamp: new Date().toISOString(),
            },
            backend: {
                url: BACKEND_URL,
                status: 'DOWN',
                error: error instanceof Error ? error.message : 'Cannot connect to backend',
                message: 'Make sure your Java Spring Boot backend is running on ' + BACKEND_URL
            }
        }, { status: 503 });
    }
}
