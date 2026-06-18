"use client";

import { useState } from "react";

type ContactFormData = {
    name: string;
    email: string;
    phone: string;
    message: string;
};

type FormStatus =
    | { type: "idle" }
    | { type: "success"; message: string }
    | { type: "error"; message: string };

export default function Contact() {
    const [formData, setFormData] = useState<ContactFormData>({
        name: "",
        email: "",
        phone: "",
        message: "",
    });
    const [status, setStatus] = useState<FormStatus>({ type: "idle" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: "idle" });
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const message = errorData?.error ?? "Failed to send message. Please try again.";
                throw new Error(message);
            }

            setStatus({ type: "success", message: "Thanks for reaching out! We'll get back to you shortly." });
            setFormData({ name: "", email: "", phone: "", message: "" });
        } catch (error) {
            console.error("Contact form submission failed", error);
            const fallbackMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
            setStatus({ type: "error", message: fallbackMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-[#fff8e5] via-[#fffdf4] to-[#ffffff] py-24 md:py-32">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 md:mb-20">
                    <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">Connect</p>
                    <h2 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900">
                        Get in <span className="font-serif italic">Touch</span>
                    </h2>
                </div>

                <div className="grid gap-12 lg:grid-cols-2 max-w-6xl mx-auto">
                    {/* Left: Social & Contact Info */}
                    <div className="space-y-8 text-neutral-800">
                        <div className="space-y-4">
                            <h3 className="text-2xl md:text-3xl font-light text-neutral-900">Let&apos;s Connect</h3>
                            <p className="text-base text-neutral-600 leading-relaxed">
                                Have questions about our services, pricing, or availability? We&apos;d love to hear from you! Reach out via the form or connect with us on social media.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900/90 shadow-sm">
                                    <svg
                                        className="h-6 w-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Phone</p>
                                    <p className="mt-1 text-base font-light text-neutral-900">(555) 123-4567</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900">
                                    <svg
                                        className="h-6 w-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Email</p>
                                    <p className="mt-1 text-base font-light text-neutral-900">hello@zboobraids.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900">
                                    <svg
                                        className="h-6 w-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Location</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6">
                            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">Follow Us</p>
                            <div className="flex gap-4">
                                <a
                                    href="https://instagram.com/zboobraids"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                                    aria-label="Instagram"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.facebook.com/profile.php?id=61581770414179"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                                    aria-label="Facebook"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.tiktok.com/@zboobraids_7"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                                    aria-label="TikTok"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right: Contact Form */}
                    <div className="rounded-sm border border-[#f1ead6] bg-[#fffef9] p-8 md:p-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                        <h3 className="text-2xl font-light text-neutral-900 mb-8">Send us a message</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="block text-xs font-medium uppercase tracking-[0.15em] text-neutral-600 mb-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-none border border-neutral-300/70 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-[0.15em] text-neutral-600 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-none border border-neutral-300/70 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                    placeholder="jane@example.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-xs font-medium uppercase tracking-[0.15em] text-neutral-600 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full rounded-none border border-neutral-300/70 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-xs font-medium uppercase tracking-[0.15em] text-neutral-600 mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    className="w-full rounded-none border border-neutral-300/70 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                    placeholder="Tell us about your desired style or ask any questions..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full rounded-none border border-neutral-900 bg-neutral-900 px-6 py-3.5 text-xs font-medium uppercase tracking-[0.3em] text-white transition-all duration-300 hover:bg-transparent hover:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-white"
                            >
                                {isSubmitting ? "Sending..." : "Send Message"}
                            </button>
                            {status.type === "success" && (
                                <p className="text-sm text-emerald-600" role="status">
                                    {status.message}
                                </p>
                            )}
                            {status.type === "error" && (
                                <p className="text-sm text-red-600" role="alert">
                                    {status.message}
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
            {/* Decorative elements */}
            <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-amber-100/30 blur-3xl" aria-hidden="true" />
        </section>
    );
}
