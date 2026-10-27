"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

type PricingCategory = { name: string; slug: string };

export default function PricingControls({ categories }: { categories: PricingCategory[] }) {
    const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");
    const [query, setQuery] = useState("");
    const [noResults, setNoResults] = useState(false);

    useEffect(() => {
        const sections = categories
            .map(category => document.getElementById(category.slug))
            .filter((section): section is HTMLElement => Boolean(section));
        if (!sections.length) return;

        const observer = new IntersectionObserver(entries => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible[0]?.target.id) setActiveCategory(visible[0].target.id);
        }, { rootMargin: "-150px 0px -55% 0px", threshold: [0, 0.1] });

        sections.forEach(section => observer.observe(section));
        return () => observer.disconnect();
    }, [categories]);

    useEffect(() => {
        const normalizedQuery = query.trim().toLowerCase();
        let visibleTotal = 0;
        document.querySelectorAll<HTMLElement>("[data-pricing-section]").forEach(section => {
            let visibleStyles = 0;
            section.querySelectorAll<HTMLElement>("[data-price-style]").forEach(style => {
                const matches = !normalizedQuery || (style.dataset.searchText ?? "").includes(normalizedQuery);
                style.hidden = !matches;
                if (matches) {
                    visibleStyles += 1;
                    visibleTotal += 1;
                }
            });
            section.hidden = visibleStyles === 0;
        });
        setNoResults(Boolean(normalizedQuery) && visibleTotal === 0);
    }, [query]);

    return (
        <div className="sticky top-[62px] z-30 border-b border-[#DCCFC5] bg-[#F6F1EA]/95 px-5 backdrop-blur-sm md:top-[70px] sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                <nav aria-label="Pricing categories" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map(category => {
                        const active = activeCategory === category.slug;
                        return (
                            <a
                                key={category.slug}
                                href={`#${category.slug}`}
                                aria-current={active ? "location" : undefined}
                                className={`relative flex min-h-11 shrink-0 items-center px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#A05B3A] ${active ? "text-[#8B4D30]" : "text-[#5E534C] hover:text-[#A05B3A]"}`}
                            >
                                {category.name}
                                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#A05B3A]" aria-hidden="true" />}
                            </a>
                        );
                    })}
                </nav>
                <label className="relative block shrink-0 lg:w-64">
                    <span className="sr-only">Search styles</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A7B72]" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="Search styles"
                        className="min-h-11 w-full border border-[#CDBFB5] bg-[#FBF8F4] py-2 pl-10 pr-3 text-sm text-[#2C1810] outline-none placeholder:text-[#8A7B72] focus:border-[#A05B3A] focus:ring-1 focus:ring-[#A05B3A]"
                    />
                </label>
            </div>
            {noResults && (
                <p className="mx-auto max-w-6xl pb-3 text-sm text-[#6F625A]">No styles match “{query}”.</p>
            )}
        </div>
    );
}
