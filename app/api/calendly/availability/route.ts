import { NextResponse } from "next/server";

const calendlyTimezone = process.env.CALENDLY_TIMEZONE ?? "America/New_York";

function getCalendlyApiKey() {
    const key = process.env.CALENDLY_API_KEY;
    if (!key) {
        throw new Error("Missing CALENDLY_API_KEY");
    }
    return key;
}

function buildMockSlots(dateQuery: string) {
    const date = new Date(dateQuery);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
        slots.push({ startAt: `${dateStr}T${String(hour).padStart(2, "0")}:00:00-05:00` });
        slots.push({ startAt: `${dateStr}T${String(hour).padStart(2, "0")}:30:00-05:00` });
    }
    return slots;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get("date");
    const eventTypeUri = searchParams.get("event_type");

    if (!dateQuery || !eventTypeUri) {
        return NextResponse.json(
            { error: "Missing date or event_type parameter" },
            { status: 400 }
        );
    }

    try {
        const apiKey = getCalendlyApiKey();
        
        // Build date range for the entire day in UTC
        const startDate = new Date(dateQuery + "T00:00:00Z");
        const endDate = new Date(dateQuery + "T23:59:59Z");

        const startUtc = startDate.toISOString();
        const endUtc = endDate.toISOString();

        console.log("Fetching Calendly availability:", { 
            eventTypeUri, 
            startUtc, 
            endUtc,
            timezone: calendlyTimezone 
        });

        // Calendly's availability endpoint requires specific date range format
        // Query for a wider range to ensure we get results
        const queryStartDate = new Date(dateQuery);
        queryStartDate.setDate(queryStartDate.getDate() - 1);
        const queryEndDate = new Date(dateQuery);
        queryEndDate.setDate(queryEndDate.getDate() + 2);

        const url = new URL("https://api.calendly.com/event_type_available_times");
        url.searchParams.set("event_type", eventTypeUri);
        url.searchParams.set("start_time", queryStartDate.toISOString());
        url.searchParams.set("end_time", queryEndDate.toISOString());

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Calendly API error:", response.status, errorText);
            console.log("Falling back to mock data");
            return NextResponse.json({ slots: buildMockSlots(dateQuery), source: "mock" });
        }

        const data: { collection?: Array<{ start_time?: string; invitees_remaining?: number }> } = await response.json();
        console.log("Calendly response:", JSON.stringify(data, null, 2));
        
        // Filter slots to only include the requested date
        const requestedDateStr = dateQuery;
        const slots = Array.isArray(data.collection)
            ? data.collection
                  .filter((entry) => {
                      if (typeof entry.start_time !== "string") return false;
                      if ((entry.invitees_remaining ?? 1) <= 0) return false;
                      // Check if the slot is on the requested date
                      const slotDate = entry.start_time.slice(0, 10);
                      return slotDate === requestedDateStr;
                  })
                  .map((entry) => ({ startAt: entry.start_time! }))
            : [];

        console.log(`Found ${slots.length} slots for ${requestedDateStr}`);
        return NextResponse.json({ slots, source: "calendly" });
    } catch (error) {
        console.error("Calendly availability error:", error);
        console.log("Falling back to mock data");
        return NextResponse.json({ slots: buildMockSlots(dateQuery), source: "mock" });
    }
}
