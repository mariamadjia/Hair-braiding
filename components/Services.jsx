import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toProxyUrl } from "@/lib/utils/image";

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
      <section className="relative overflow-hidden bg-[#FFFDD0] pt-24 pb-12 text-neutral-900 dark:bg-neutral-900 dark:text-white md:pt-32 md:pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
    <>
      <section
        id="services"
        className="relative overflow-hidden bg-[#FFFDD0] pt-24 pb-12 text-neutral-900 dark:bg-neutral-900 dark:text-white md:pt-32 md:pb-16"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center md:mb-14">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400">
              Our Expertise
            </p>

            <h2 className="text-4xl font-light tracking-tight text-neutral-900 dark:text-white md:text-6xl">
              Signature <span className="font-serif italic">Services</span>
            </h2>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-amber-100/30 blur-3xl" aria-hidden="true" />
      </section>

      <section className="bg-[#FFFDD0] pb-24 dark:bg-neutral-900 md:pb-32">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-700">
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
                    className="group flex items-center justify-between py-8 transition-all duration-300 hover:bg-white/50 dark:hover:bg-neutral-800/50 md:py-10"
                  >
                    <div className="flex items-center gap-4">
                      {rawImage && (
                        <img
                          src={toProxyUrl(rawImage)}
                          alt={category.name}
                          loading="lazy"
                          decoding="async"
                          className="h-14 w-14 shrink-0 rounded-sm object-cover"
                        />
                      )}

                      <span className="text-lg font-light tracking-wide text-neutral-900 transition-colors group-hover:text-neutral-700 dark:text-white dark:group-hover:text-neutral-300 md:text-xl">
                        {category.name}
                      </span>
                    </div>

                    <Button
                      asChild
                      className="rounded-none bg-[#2C1810] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1a0f0a] md:text-xs"
                    >
                      <Link href={`/booking/${category.slug}`} prefetch={true}>
                        Book Now
                      </Link>
                    </Button>
                  </div>
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
        </div>
      </section>
    </>
  );
}
