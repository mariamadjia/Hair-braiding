import { NextResponse } from "next/server";

const calendlyEventSlug = process.env.CALENDLY_EVENT_SLUG ?? "30min";

function getCalendlyApiKey() {
    const key = process.env.CALENDLY_API_KEY;
    if (!key) {
        throw new Error("Missing CALENDLY_API_KEY");
    }
    return key;
}

let calendlyUserUriCache: string | null = null;
let calendlyEventTypeUriCache: string | null = null;

async function getCalendlyUserUri(apiKey: string) {
    if (calendlyUserUriCache) {
        return calendlyUserUriCache;
    }

    const response = await fetch("https://api.calendly.com/users/me", {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Calendly users/me request failed: ${response.status}`);
    }

    const data: { resource?: { uri?: string } } = await response.json();
    const userUri = data.resource?.uri;
    if (!userUri) {
        throw new Error("Calendly user URI missing in response");
    }

    calendlyUserUriCache = userUri;
    return userUri;
}

async function getCalendlyEventTypeUri(apiKey: string) {
    if (calendlyEventTypeUriCache) {
        return calendlyEventTypeUriCache;
    }

    if (!calendlyEventSlug) {
        throw new Error("Missing Calendly event slug (set CALENDLY_EVENT_SLUG)");
    }

    const userUri = await getCalendlyUserUri(apiKey);
    const url = new URL("https://api.calendly.com/event_types");
    url.searchParams.set("user", userUri);
    url.searchParams.set("slug", calendlyEventSlug);

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Calendly event_types request failed: ${response.status}`);
    }

    const data: { collection?: Array<{ uri?: string }> } = await response.json();
    const eventTypeUri = data.collection?.[0]?.uri;

    if (!eventTypeUri) {
        throw new Error(`Calendly event type not found for slug "${calendlyEventSlug}"`);
    }

    calendlyEventTypeUriCache = eventTypeUri;
    return eventTypeUri;
}

export async function GET() {
    try {
        const apiKey = getCalendlyApiKey();
        const eventTypeUri = await getCalendlyEventTypeUri(apiKey);
        return NextResponse.json({ eventTypeUri });
    } catch (error) {
        console.error("Failed to fetch event type:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch event type" },
            { status: 500 }
        );
    }
}
