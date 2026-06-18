import { NextResponse } from "next/server";

const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
const squareLocationId = process.env.SQUARE_LOCATION_ID;
const squareServiceVariationId = process.env.SQUARE_SERVICE_VARIATION_ID;
const squareTeamMemberId = process.env.SQUARE_TEAM_MEMBER_ID;
const timezoneOffset = process.env.SQUARE_TIMEZONE_OFFSET ?? "-04:00";
const calendlyEventSlug = process.env.CALENDLY_EVENT_SLUG ?? "30min";
const calendlyTimezone = process.env.CALENDLY_TIMEZONE ?? "America/New_York";

export function getCalendlyApiKey() {
    const key = process.env.CALENDLY_API_KEY;
    if (!key) {
        throw new Error("Missing CALENDLY_API_KEY");
    }
    return key;
}

let calendlyUserUriCache: string | null = null;
let calendlyEventTypeUriCache: string | null = null;

type Slot = {
    startAt: string;
};

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

async function fetchCalendlySlots(startUtc: string, endUtc: string) {
    const apiKey = getCalendlyApiKey();
    const eventTypeUri = await getCalendlyEventTypeUri(apiKey);

    const url = new URL("https://api.calendly.com/event_type_available_times");
    url.searchParams.set("event_type", eventTypeUri);
    url.searchParams.set("start_time", startUtc);
    url.searchParams.set("end_time", endUtc);
    if (calendlyTimezone) {
        url.searchParams.set("timezone", calendlyTimezone);
    }

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Calendly availability request failed: ${response.status}`);
    }

    const data: { collection?: Array<{ start_time?: string }> } = await response.json();
    const slots: Slot[] = Array.isArray(data.collection)
        ? data.collection
              .filter((entry) => typeof entry.start_time === "string")
              .map((entry) => ({ startAt: entry.start_time! }))
        : [];

    return { slots, source: "calendly" as const };
}

function buildDailyWindow(dateInput?: string) {
    const baseDate = dateInput ? new Date(dateInput) : new Date();
    const year = baseDate.getFullYear();
    const month = `${baseDate.getMonth() + 1}`.padStart(2, "0");
    const day = `${baseDate.getDate()}`.padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    const startAt = `${date}T00:00:00${timezoneOffset}`;
    const endAt = `${date}T23:59:59${timezoneOffset}`;
    const startUtc = new Date(`${date}T00:00:00${timezoneOffset}`).toISOString();
    const endUtc = new Date(`${date}T23:59:59${timezoneOffset}`).toISOString();
    return { startAt, endAt, startUtc, endUtc, date };
}

function pad(value: number) {
    return value.toString().padStart(2, "0");
}

function buildMockSlots(startAt: string): Slot[] {
    const datePart = startAt.slice(0, 10);
    const slots: Slot[] = [];
    for (let hour = 9; hour <= 20; hour++) {
        const hourStr = pad(hour);
        slots.push({ startAt: `${datePart}T${hourStr}:00:00${timezoneOffset}` });
        slots.push({ startAt: `${datePart}T${hourStr}:30:00${timezoneOffset}` });
    }
    return slots;
}

async function fetchSquareSlots(startAt: string, endAt: string) {
    if (!squareAccessToken || !squareLocationId || !squareServiceVariationId) {
        return { slots: buildMockSlots(startAt), source: "mock" };
    }

    const segmentFilter: Record<string, unknown> = {
        service_variation_id: squareServiceVariationId,
    };
    if (squareTeamMemberId) {
        segmentFilter.team_member_id_filter = { any: [squareTeamMemberId] };
    }

    const body: Record<string, unknown> = {
        location_id: squareLocationId,
        start_at: startAt,
        end_at: endAt,
        limit: 100,
        segment_filters: [segmentFilter],
    };

    const response = await fetch("https://connect.squareup.com/v2/appointments/availability", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${squareAccessToken}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
            { error: "SQUARE_AVAILABILITY_ERROR", details: text },
            { status: response.status }
        );
    }

    const data = await response.json();
    const slots: Slot[] = Array.isArray(data.availabilities)
        ? data.availabilities.map((entry: Record<string, unknown>) => ({
              startAt: typeof entry.start_at === "string" ? entry.start_at : startAt,
          }))
        : [];

    return { slots, source: "square" };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get("date") ?? undefined;
    const { startAt, endAt, startUtc, endUtc, date } = buildDailyWindow(dateQuery);

    let result: { slots: Slot[]; source: string } | NextResponse | null = null;

    try {
        const calendlyResult = await fetchCalendlySlots(startUtc, endUtc);
        result = calendlyResult;
    } catch (error) {
        console.warn("Calendly availability fallback", error);
    }

    if (!result || ("slots" in result && result.slots.length === 0)) {
        const squareResult = await fetchSquareSlots(startAt, endAt);
        if (squareResult instanceof NextResponse) {
            return squareResult;
        }
        result = squareResult;
    }

    if (!result || result instanceof NextResponse) {
        return NextResponse.json({ date, slots: buildMockSlots(startAt), source: "mock" });
    }

    return NextResponse.json({ date, slots: result.slots, source: result.source });
}
