"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import type { BookingCategory } from "@/lib/booking-types";

export default function BookingPageClient({ categories }: { categories: BookingCategory[] }) {

    return (
        <>
            <Navbar />
            <section className="relative overflow-hidden bg-[#FFF5EE] py-24 md:py-32 text-neutral-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">Book Your Style</p>
                    <h1 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900">
                        Services <span className="font-serif italic">Categories</span>
                    </h1>
                </div>
                <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-amber-100/30 blur-3xl" aria-hidden="true" />
            </section>

            <section className="bg-[#FFF5EE] pb-24 md:pb-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                    <div className="divide-y divide-neutral-200/60">
                        {categories.map((category) => (
                            <div
                                key={category.slug}
                                className="group flex items-center justify-between py-8 md:py-10 transition-all duration-300 hover:bg-neutral-50/50"
                            >
                                <div className="flex flex-col">
                                    <span className="text-lg md:text-xl font-light tracking-wide text-neutral-900 transition-colors group-hover:text-neutral-700">
                                        {category.name}
                                    </span>
                                </div>

                                <Button
                                    asChild
                                    className="rounded-none bg-[#2C1810] text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold hover:bg-[#1a0f0a] transition-colors"
                                >
                                    <Link href={`/booking/${category.slug}`}>Book Now</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

        </>
    );
}
