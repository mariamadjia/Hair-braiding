import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toProxyUrl } from "@/lib/utils/image";
import { ArrowRight } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
      <section className="relative overflow-hidden bg-[#f8f3eb] pb-24 pt-24 text-[#2c1810] md:pb-32 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center md:mb-14">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-[#766b64]">
              Our Expertise
            </p>
            <h2 className="font-serif text-4xl font-normal tracking-tight md:text-6xl">
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
    <section
      id="services"
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_12%,#fffdfa_0%,#f8f3eb_48%,#f2eadf_100%)] pb-24 pt-20 text-[#2c1810] md:pb-32 md:pt-24"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-0 h-[540px] w-[620px] text-[#7b654e] opacity-[0.075] blur-[1.5px]"
        viewBox="0 0 620 540"
        fill="none"
      >
        <path d="M640 42C526 126 444 232 392 398" stroke="currentColor" strokeWidth="17" strokeLinecap="round" />
        <path d="M558 110C470 116 404 143 345 190" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d="M515 165C432 174 372 207 322 256" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M476 224C400 240 348 274 304 322" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M589 71C528 49 472 43 414 53" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d="M602 118C538 92 482 84 423 89" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M546 190C503 154 458 135 410 125" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      </svg>

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 text-center md:mb-14">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.42em] text-[#786d66]">
              Our Expertise
            </p>

            <h1 className="font-serif text-[42px] font-normal leading-none tracking-[-0.035em] sm:text-5xl md:text-[64px]">
              Signature <span className="font-serif italic">Services</span>
            </h1>
            <span className="mx-auto mt-8 block h-px w-16 bg-[#c9a46b]" aria-hidden="true" />
          </div>

        <div className="space-y-3">
            {categories.length > 0 ? (
              categories.map((category) => {
                const rawImage =
                  category.flippingImages?.[0] ||
                  category.fallbackImages?.[0] ||
                  category.image ||
                  "";

                return (
                  <div
                    key={category.id}
                    className="group grid min-h-[118px] grid-cols-[92px_1fr] items-center gap-5 rounded-[18px] border border-[#d9cec1]/75 bg-white/35 p-3 shadow-[0_8px_30px_rgba(76,48,31,0.025)] backdrop-blur-[2px] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c7ad91] hover:bg-white/65 hover:shadow-[0_15px_38px_rgba(76,48,31,0.08)] sm:grid-cols-[120px_1fr_auto] sm:gap-8 sm:p-4 md:min-h-[142px] md:grid-cols-[144px_1fr_230px]"
                  >
                    <div>
                      {rawImage && (
                        <img
                          src={toProxyUrl(rawImage)}
                          alt={category.name}
                          loading="lazy"
                          decoding="async"
                          className="h-[92px] w-[92px] rounded-[13px] object-cover sm:h-[112px] sm:w-[120px] md:h-[118px] md:w-[144px]"
                        />
                      )}
                      {!rawImage && (
                        <div className="h-[92px] w-[92px] rounded-[13px] bg-[#ede5dc] sm:h-[112px] sm:w-[120px] md:h-[118px] md:w-[144px]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-[25px] font-normal tracking-[-0.02em] text-[#2c1810] sm:text-[30px] md:text-[34px]">
                        {category.name}
                      </h2>
                    </div>

                    <div className="col-span-2 flex items-center justify-end border-t border-[#ded3c7]/75 pt-3 sm:col-span-1 sm:h-full sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0 md:justify-center">
                      <Button
                        asChild
                        className="h-12 rounded-[5px] bg-[#2C1810] px-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_8px_18px_rgba(44,24,16,0.13)] transition-all hover:bg-[#44261a] hover:shadow-[0_10px_24px_rgba(44,24,16,0.2)]"
                      >
                        <Link href={`/booking/${category.slug}`} prefetch={true}>
                          Select
                          <ArrowRight aria-hidden="true" className="ml-3 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[18px] border border-[#d9cec1] bg-white/50 py-12 text-center text-neutral-500">
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
      </div>
    </section>
  );
}
