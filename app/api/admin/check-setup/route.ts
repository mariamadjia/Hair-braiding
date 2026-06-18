import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ADMIN_FILE = path.join(process.cwd(), "data", "admin.json");

export async function GET() {
    try {
        const adminExists = fs.existsSync(ADMIN_FILE);
        
        if (!adminExists) {
            return NextResponse.json({ needsSetup: true });
        }

        const adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, "utf-8"));
        const hasAdmin = adminData.users && adminData.users.length > 0;

        return NextResponse.json({ needsSetup: !hasAdmin });
    } catch (error) {
        return NextResponse.json({ needsSetup: true });
    }
}
