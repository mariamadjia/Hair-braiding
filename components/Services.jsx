import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toProxyUrl } from "@/lib/utils/image";
import { ArrowRight, Sparkles } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const CATEGORY_COPY = {
  "box braids": {
    eyebrow: "Timeless. Neat. Versatile.",
    description: "Classic box braids in a variety of lengths and sizes to match your look.",
  },
  twists: {
    eyebrow: "Natural. Protective. Lightweight.",
    description: "Two-strand twists and passion twists for a natural and elegant style.",
  },
  "miracle knots": {
    eyebrow: "Gentle on hair. Beautiful results.",
    description: "Knotless braids for a natural look, less tension, and lasting comfort.",
  },
  mens: {
    eyebrow: "Clean. Modern. Stylish.",
    description: "Neat and trendy braids for men. Styles that make a statement.",
  },
  locs: {
    eyebrow: "Distinctive. Polished. Expressive.",
    description: "Beautiful loc styles designed around your texture and personal expression.",
  },
  cornrows: {
    eyebrow: "Sleek. Detailed. Enduring.",
    description: "Precision cornrows with clean parts, creative patterns, and a polished finish.",
  },
  crochets: {
    eyebrow: "Effortless. Full. Versatile.",
    description: "Protective crochet styles with beautiful volume and flexible styling options.",
  },
};

async function getServiceCategories() {
  try {
    const response = await fetch(
      `${API_URL}/api/categories/gallery-cards`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response:", errorText);
      throw new Error(`Failed to fetch service categories: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching service categories:", error);
    throw error;
  }
}

export default async function Services() {
  let categories;
  try {
    categories = await getServiceCategories();
  } catch (error) {
    return (
      <section
        className="relative overflow-hidden bg-[#F6F5F1] bg-cover bg-top pt-24 pb-12 text-neutral-900 dark:bg-neutral-900 dark:text-white md:pt-32 md:pb-16"
        style={{ backgroundImage: "url('/services-background.png')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[#faf7f1]/15 dark:bg-neutral-950/75" aria-hidden="true" />
        <div className="relative mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center md:mb-14">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400">
              Our Expertise
            </p>
            <h2 className="text-4xl font-light tracking-tight text-neutral-900 dark:text-white md:text-6xl">
              Signature <span className="font-serif italic">Services</span>
            </h2>
          </div>
          <div className="max-w-5xl mx-auto py-12 text-center text-neutral-500">
            <p className="mb-4">Unable to load services at this time.</p>
            <p className="text-sm mb-6">Please try again later or contact us if the problem persists.</p>
            <Button
              onClick={() => window.location.reload()}
              className="rounded-none bg-[#2C1810] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1a0f0a]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className="relative overflow-hidden bg-[#F6F5F1] bg-cover bg-top bg-no-repeat dark:bg-neutral-900"
      style={{ backgroundImage: "url('/services-background.png')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#fffaf3]/8 dark:bg-neutral-950/75" aria-hidden="true" />
      <section
        id="services"
        className="relative z-10 overflow-hidden pt-14 pb-6 text-neutral-900 dark:text-white md:pt-20 md:pb-7"
      >
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.42em] text-[#a86b3d] dark:text-[#d6a47d]">
              Our Expertise
            </p>

            <h2 className="font-serif text-4xl font-medium leading-none tracking-[-0.035em] text-[#20140f] dark:text-white md:text-6xl">
              Signature <span className="italic text-[#9a6b38]">Services</span>
            </h2>
            <div className="my-4 flex items-center justify-center gap-2 text-[#b7834d]" aria-hidden="true">
              <span className="h-px w-12 bg-current" />
              <Sparkles className="h-4 w-4" />
              <span className="h-px w-12 bg-current" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-14 md:pb-20">
        <div className="mx-auto w-full max-w-[920px] px-4 sm:px-6 lg:px-8">
          <div className="space-y-2.5">
            {categories.length > 0 ? (
              categories.map((category) => {
                const rawImage =
                  category.flippingImages?.[0] ||
                  category.fallbackImages?.[0] ||
                  category.image ||
                  "";
                const copy = CATEGORY_COPY[category.name?.trim().toLowerCase()] ?? {
                  eyebrow: "Beautiful. Protective. Personal.",
                  description: category.summary || "Explore this collection and choose the style that feels like you.",
                };

                return (
                  <article
                    key={category.id}
                    className="group grid grid-cols-[minmax(112px,38%)_minmax(0,1fr)] gap-x-4 overflow-hidden rounded-xl border border-[#dfcdbb]/75 bg-[#fffdf9]/82 p-2.5 shadow-[0_8px_24px_rgba(76,45,27,0.07)] backdrop-blur-[3px] transition duration-300 hover:-translate-y-0.5 hover:border-[#cda985] hover:shadow-[0_12px_30px_rgba(76,45,27,0.11)] dark:border-neutral-700 dark:bg-neutral-900/85 sm:grid-cols-[145px_minmax(0,1fr)_125px] sm:items-center sm:gap-4 sm:p-3 md:grid-cols-[170px_minmax(0,1fr)_145px] md:gap-5"
                  >
                    {rawImage ? (
                      <img
                        src={toProxyUrl(rawImage)}
                        alt={category.name}
                        loading="lazy"
                        decoding="async"
                        className="h-[190px] w-full self-stretch rounded-lg bg-[#f3eee7] object-cover object-center sm:h-28 sm:object-contain md:h-32"
                      />
                    ) : (
                      <div className="h-[190px] rounded-lg bg-[#eee4da] sm:h-28 md:h-32" aria-hidden="true" />
                    )}

                    <div className="min-w-0 px-0 py-2 sm:px-0 sm:py-1">
                      <h3 className="font-serif text-[25px] leading-none text-[#241610] dark:text-white md:text-3xl">{category.name}</h3>
                      <p className="mt-2.5 text-[9px] font-semibold uppercase leading-4 tracking-[0.16em] text-[#b27342] sm:text-[10px] sm:tracking-[0.19em]">{copy.eyebrow}</p>
                      <p className="mt-1.5 max-w-[360px] text-[12px] leading-[1.4] text-[#595653] dark:text-neutral-300 sm:mt-2 sm:text-[14px] sm:leading-[1.45] md:text-[15px]">{copy.description}</p>
                      <Link
                        href={`/booking/${category.slug}`}
                        prefetch={true}
                        className="mt-3 inline-flex min-h-10 items-center justify-center gap-3 rounded-md bg-[#2C1810] px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_5px_12px_rgba(44,24,16,0.16)] transition hover:bg-[#1a0f0a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2C1810] sm:hidden"
                      >
                        Select <ArrowRight className="h-4 w-4 text-[#c69667]" aria-hidden="true" />
                      </Link>
                    </div>

                    <div className="hidden sm:flex sm:h-24 sm:items-center sm:justify-center sm:border-l sm:border-[#e6d7c9] sm:py-0 md:h-28">
                      <Link
                        href={`/booking/${category.slug}`}
                        prefetch={true}
                        className="inline-flex min-h-10 items-center justify-center gap-3 rounded-md bg-[#2C1810] px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_5px_12px_rgba(44,24,16,0.16)] transition hover:bg-[#1a0f0a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2C1810] sm:px-5 sm:text-[11px]"
                      >
                        Select <ArrowRight className="h-4 w-4 text-[#c69667]" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="mb-2">No services available at this time.</p>
                <p className="text-sm">Please check back later or contact us for more information.</p>
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="mt-4 grid items-center gap-4 rounded-xl border border-[#dfcdbb]/75 bg-[#fffdf9]/82 px-5 py-4 shadow-[0_8px_24px_rgba(76,45,27,0.07)] backdrop-blur-[3px] dark:border-neutral-700 dark:bg-neutral-900/85 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
              <div>
                <h3 className="font-serif text-xl text-[#251710] dark:text-white md:text-2xl">Not sure what to choose?</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">We&apos;re here to help you find the perfect style.</p>
              </div>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-md border border-[#b7834d] px-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#2C1810] transition hover:bg-[#2C1810] hover:text-white dark:text-white">
                Contact Us <ArrowRight className="h-4 w-4 text-[#b7834d]" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
