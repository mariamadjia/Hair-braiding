import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import nodemailer, { type Transporter } from "nodemailer";

export const runtime = "nodejs";

declare global {
    // eslint-disable-next-line no-var
    var contactTransporter: Transporter | undefined;
}

const getTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";

    if (!host || !port || !user || !pass) {
        throw new Error("Missing SMTP configuration. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.");
    }

    if (!globalThis.contactTransporter) {
        globalThis.contactTransporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
        });
    }

    return globalThis.contactTransporter;
};

type ContactPayload = {
    name: string;
    email: string;
    phone?: string;
    message: string;
};

const buildMessage = ({ name, email, phone, message }: ContactPayload) => {
    const recipient = process.env.CONTACT_RECIPIENT_EMAIL ?? "djonretglo@gmail.com";
    const subject = `New message from ${name}`;
    const phoneLine = phone ? `<p><strong>Phone:</strong> ${phone}</p>` : "";

    return {
        from: {
            name: "ZBoo Braids Contact Form",
            address: userVisibleEmail(),  // This should be your Gmail address from .env
        },
        replyTo: {
            name: name || "Contact Form User",
            address: email,  // This is the user's email from the form
        },
        to: recipient,
        subject,
        text: `Name: ${name}\nEmail: ${email}${phone ? '\nPhone: ' + phone : ''}\n\n${message}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a5568;">New Contact Form Submission</h2>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
                    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #4a5568; margin-top: 0;">Message:</h3>
                    <p style="white-space: pre-line; line-height: 1.6;">${message}</p>
                </div>
                <p style="color: #718096; font-size: 14px; margin-top: 20px;">
                    This email was sent from the contact form on ZBoo Braids.
                </p>
            </div>
        `,
    };
};

const userVisibleEmail = () => process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@example.com";

export async function POST(req: NextRequest) {
    let payload: ContactPayload;

    try {
        payload = await req.json();
    } catch (error) {
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { name, email, message } = payload;

    if (!name || !email || !message) {
        return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    try {
        const transporter = getTransporter();
        await transporter.sendMail(buildMessage(payload));

        return NextResponse.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to send contact email:", error);

        const responseMessage =
            process.env.NODE_ENV !== "production"
                ? `Failed to send message: ${errorMessage}`
                : "Failed to send message. Please try again later.";

        return NextResponse.json({ error: responseMessage }, { status: 500 });
    }
}
