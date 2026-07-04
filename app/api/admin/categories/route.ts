import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function isAuthorized(req: NextRequest) {
    // Check for x-admin-token (legacy)
    const adminToken = req.headers.get("x-admin-token");
    if (adminToken === process.env.ADMIN_SECRET) {
        return true;
    }
    
    // Check for Bearer token (JWT)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return true;
    }
    
    return false;
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    try {
        console.log('Fetching categories from backend admin endpoint:', `${API_URL}/api/categories/admin`);
        const response = await fetch(`${API_URL}/api/categories/admin`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Backend response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend admin endpoint error:', errorText, '- falling back to regular endpoint');

            // Fallback to regular endpoint if admin endpoint fails
            console.log('Fetching categories from fallback endpoint:', `${API_URL}/api/categories`);
            const fallbackResponse = await fetch(`${API_URL}/api/categories`);
            console.log('Fallback response status:', fallbackResponse.status);

            if (!fallbackResponse.ok) {
                const fallbackError = await fallbackResponse.text();
                console.error('Fallback endpoint also failed:', fallbackError);
                return NextResponse.json({ error: `Both endpoints failed. Admin: ${response.status}, Fallback: ${fallbackResponse.status}` }, { status: 500 });
            }

            const data = await fallbackResponse.json();
            console.log('Fallback response data keys:', Object.keys(data));
            return NextResponse.json(data);
        }

        const data = await response.json();
        console.log('Backend response data keys:', Object.keys(data));
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch categories from backend:', error);

        // Try fallback on catch as well
        try {
            console.log('Attempting fallback after error:', `${API_URL}/api/categories`);
            const fallbackResponse = await fetch(`${API_URL}/api/categories`);
            const data = await fallbackResponse.json();
            console.log('Fallback successful after error');
            return NextResponse.json(data);
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return NextResponse.json({ error: "Failed to fetch categories from both endpoints" }, { status: 500 });
        }
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const category = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(category)
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to create category" }, { status: response.status });
        }
        
        // Return updated categories list
        const categoriesResponse = await fetch(`${API_URL}/api/categories`);
        const data = await categoriesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create category:', error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
