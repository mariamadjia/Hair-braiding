import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";

import Navbar from "@/components/Navbar";
import FooterWrapper from "@/components/FooterWrapper";
import { readBookingData } from "@/lib/categories-store";
import type { BookingItem, BookingSubcategory } from "@/lib/booking-types";
import { itemPriceRangeLabel, subcategoryPriceRangeLabel } from "@/lib/pricing-ranges";
import PricingControls from "./PricingControls";

// Cache the public catalog so navigating to Pricing does not wait on Render.
// Admin service and pricing updates explicitly invalidate this page.
export const revalidate = 300;

export const metadata: Metadata = {
    title: "Hair Braiding Prices",
    description: "Browse current AH Braiding price ranges by service and style. Select a style to see exact size and length pricing.",
    alternates: { canonical: "/pricing" },
};

type PriceStyle = {
    key: string;
    name: string;
    summary?: string;
    image?: string;
    price: string;
    duration?: string;
    href: string;
};

function durationLabel(minutes?: number) {
    if (!minutes || minutes <= 0) return undefined;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder} min`;
    if (!remainder) return `${hours} hr${hours === 1 ? "" : "s"}`;
    return `${hours} hr ${remainder} min`;
}

function subcategoryStyle(categorySlug: string, style: BookingSubcategory): PriceStyle | null {
    const price = subcategoryPriceRangeLabel(style);
    if (!price) return null;
    return {
        key: `subcategory-${style.id ?? style.slug}`,
        name: style.name,
        summary: style.summary,
        image: style.image ?? style.images?.[0],
        price,
        duration: (() => {
            const durations = style.items.map(item => item.durationMinutes).filter((value): value is number => Boolean(value && value > 0));
            if (!durations.length) return undefined;
            const shortest = Math.min(...durations);
            const longest = Math.max(...durations);
            return shortest === longest ? durationLabel(shortest) : `${durationLabel(shortest)}–${durationLabel(longest)}`;
        })(),
        href: `/booking/${categorySlug}/${style.slug}`,
    };
}

function directStyle(categorySlug: string, item: BookingItem, index: number): PriceStyle | null {
    const price = itemPriceRangeLabel(item);
    if (!price) return null;
    return {
        key: `item-${item.id ?? index}`,
        name: item.name,
        summary: item.description,
        image: item.image ?? item.images?.[0],
        price,
        duration: durationLabel(item.durationMinutes),
        href: `/booking/${categorySlug}`,
    };
}

export default async function PricingPage() {
    const categories = await readBookingData({ revalidateSeconds: 300 });
    const sections = categories.map(category => ({
        category,
        styles: [
            ...(category.subcategories ?? []).map(style => subcategoryStyle(category.slug, style)),
            ...(category.items ?? []).map((item, index) => directStyle(category.slug, item, index)),
        ].filter((style): style is PriceStyle => Boolean(style)),
    })).filter(section => section.styles.length > 0);

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[#F6F1EA] text-[#2C1810]">
                <section className="px-5 py-16 text-center sm:px-8 sm:py-20">
                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#A05B3A]">Service menu</p>
                    <h1 className="mx-auto mt-4 max-w-3xl font-serif text-5xl font-normal tracking-tight sm:text-7xl">Braiding prices</h1>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6F625A] sm:text-lg">
                        Explore every style and its current price range. Click <span className="font-semibold text-[#8B4D30]">View options</span> to see the exact price based on size and length.
                    </p>
                </section>

                {sections.length > 0 && <PricingControls categories={sections.map(({ category }) => ({ name: category.name, slug: category.slug }))} />}

                <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
                    {sections.length === 0 ? (
                        <section className="border border-[#DCCFC5] bg-[#FBF8F4] p-8 text-center">
                            <Scissors className="mx-auto h-7 w-7 text-[#A05B3A]" />
                            <h2 className="mt-4 font-serif text-3xl">Pricing is being updated</h2>
                            <p className="mt-3 text-[#6F625A]">Please check again soon or contact the salon for current pricing.</p>
                            <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center bg-[#2C1810] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">Contact us</Link>
                        </section>
                    ) : sections.map(({ category, styles }, sectionIndex) => (
                        <section data-pricing-section id={category.slug} key={category.slug} className={sectionIndex === 0 ? "scroll-mt-40" : "scroll-mt-40 border-t border-[#DCCFC5] pt-16 mt-16"}>
                            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A05B3A]">Category</p>
                                    <h2 className="mt-2 font-serif text-4xl font-normal sm:text-5xl">{category.name}</h2>
                                    {category.summary && <p className="mt-3 max-w-2xl leading-7 text-[#6F625A]">{category.summary}</p>}
                                </div>
                                <Link href={`/booking/${category.slug}`} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[#6B3A25] underline decoration-[#B98B73] underline-offset-4">
                                    Browse category <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="divide-y divide-[#DCCFC5] border-y border-[#DCCFC5]">
                                {styles.map(style => (
                                    <article data-price-style data-search-text={`${category.name} ${style.name} ${style.summary ?? ""}`.toLowerCase()} key={style.key} className="group grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 py-6 transition sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:gap-x-8 sm:py-9">
                                        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg bg-[#D6B9A7] sm:h-[112px] sm:w-[112px]">
                                            {style.image ? (
                                                <img src={style.image} alt={`${style.name} hairstyle`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center font-serif text-2xl text-[#68412F] sm:text-4xl" aria-hidden="true">{style.name.split(/\s+/).map(word => word.charAt(0)).join("").slice(0, 2)}</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-serif text-2xl font-normal sm:text-3xl">{style.name}</h3>
                                            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                                <p className="text-lg font-semibold text-[#8B4D30] sm:text-xl">{style.price}</p>
                                                <p className="text-sm text-[#81736A] sm:text-base">Varies by size and length</p>
                                            </div>
                                            {style.duration && <p className="mt-2 text-sm text-[#81736A]">Estimated duration: {style.duration}</p>}
                                            <Link href={style.href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#6B3A25] underline decoration-[#B98B73] underline-offset-4 sm:hidden">
                                                View options <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                        <Link href={style.href} className="hidden min-h-12 items-center gap-2 px-2 text-sm font-semibold text-[#6B3A25] underline decoration-[#B98B73] underline-offset-4 transition hover:text-[#2C1810] sm:inline-flex">
                                            View options <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}

                    <aside className="mt-20 border border-[#CDBBAE] bg-[#EDE2D9] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9">
                        <div>
                            <h2 className="font-serif text-3xl font-normal">A note about pricing</h2>
                            <p className="mt-3 max-w-3xl leading-7 text-[#66574E]">Displayed ranges cover the configured service options. Hair, special preparation, and optional add-ons may affect the final total. The exact price and deposit are shown before payment.</p>
                        </div>
                        <Link href="/services" className="mt-6 inline-flex min-h-12 shrink-0 items-center justify-center bg-[#2C1810] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white sm:mt-0">Choose a service</Link>
                    </aside>
                </div>
            </main>
            <FooterWrapper />
        </>
    );
}
