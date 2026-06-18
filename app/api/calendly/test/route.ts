import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.CALENDLY_API_KEY;
    
    if (!apiKey) {
        return NextResponse.json({ 
            error: "CALENDLY_API_KEY not found in environment",
            hasKey: false 
        });
    }

    // Test the API key by calling Calendly's users/me endpoint
    try {
        const response = await fetch("https://api.calendly.com/users/me", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                error: "API key is invalid or lacks permissions",
                status: response.status,
                details: errorText,
                hasKey: true,
                keyWorks: false
            });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            hasKey: true,
            keyWorks: true,
            user: data.resource?.name || "Unknown",
            userUri: data.resource?.uri || "Unknown"
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error",
            hasKey: true,
            keyWorks: false
        });
    }
}
