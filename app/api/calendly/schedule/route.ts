import { NextResponse } from "next/server";

function getCalendlyApiKey() {
    const key = process.env.CALENDLY_API_KEY;
    if (!key) {
        throw new Error("Missing CALENDLY_API_KEY");
    }
    return key;
}

async function getCalendlyUserUri(apiKey: string): Promise<string> {
    const response = await fetch("https://api.calendly.com/users/me", {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
    }

    const data: { resource?: { uri?: string; current_organization?: string } } = await response.json();
    const userUri = data.resource?.uri;
    if (!userUri) {
        throw new Error("User URI missing in response");
    }

    return userUri;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { eventTypeUri, startTime, name, email, notes } = body;

        if (!eventTypeUri || !startTime || !name || !email) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Since Calendly API doesn't support direct booking, we'll construct
        // a Calendly booking URL with pre-filled parameters
        const calendlyBaseUrl = process.env.CALENDLY_BOOKING_URL || "https://calendly.com/djonretglo/30min";
        
        const bookingUrl = new URL(calendlyBaseUrl);
        bookingUrl.searchParams.set("name", name);
        bookingUrl.searchParams.set("email", email);
        
        // Format the date/time for Calendly's URL format
        const selectedDate = new Date(startTime);
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const year = selectedDate.getFullYear();
        bookingUrl.searchParams.set("month", `${year}-${month}`);
        bookingUrl.searchParams.set("date", `${year}-${month}-${day}`);
        
        if (notes) {
            bookingUrl.searchParams.set("a1", notes);
        }

        console.log("Generated Calendly booking URL:", bookingUrl.toString());

        return NextResponse.json({ 
            success: true, 
            bookingUrl: bookingUrl.toString(),
            message: "Redirecting to Calendly to complete your booking." 
        });
    } catch (error) {
        console.error("Scheduling error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create booking link" },
            { status: 500 }
        );
    }
}
