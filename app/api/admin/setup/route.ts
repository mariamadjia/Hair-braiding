import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ADMIN_FILE = path.join(process.cwd(), "data", "admin.json");
const DATA_DIR = path.join(process.cwd(), "data");

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (fs.existsSync(ADMIN_FILE)) {
            const adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, "utf-8"));
            if (adminData.users && adminData.users.length > 0) {
                return NextResponse.json(
                    { error: "Admin account already exists" },
                    { status: 400 }
                );
            }
        }

        const body = await req.json();
        const { firstName, lastName, username, email, password, confirmPassword } = body;

        if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return NextResponse.json(
                { error: "Password does not meet requirements" },
                { status: 400 }
            );
        }

        const token = generateToken();
        const hashedPassword = hashPassword(password);

        const adminData = {
            users: [
                {
                    id: crypto.randomUUID(),
                    firstName,
                    lastName,
                    username,
                    email,
                    password: hashedPassword,
                    token,
                    createdAt: new Date().toISOString(),
                },
            ],
        };

        fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2));

        return NextResponse.json({ 
            success: true, 
            token,
            message: "Admin account created successfully" 
        });
    } catch (error) {
        console.error("Setup error:", error);
        return NextResponse.json(
            { error: "Failed to create admin account" },
            { status: 500 }
        );
    }
}
