import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toProxyUrl } from "@/lib/utils/image";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getServiceCategories() {
  try {
    const response = await fetch(
      `${API_URL}/api/categories/gallery-cards`,
      {
        next: { revalidate: 300, tags: ['categories'] },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch service categories");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return [];
  }
}

export default async function Services() {
  const categories = await getServiceCategories();

  return (
    <>
      <section
        id="services"
        className="relative overflow-hidden bg-[#FFF5EE] pt-24 pb-12 text-neutral-900 dark:bg-neutral-900 dark:text-white md:pt-32 md:pb-16"
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
      </section>

      <section className="bg-[#FFF5EE] pb-24 dark:bg-neutral-900 md:pb-32">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="divide-y divide-[#ecdcc0] dark:divide-neutral-700">
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
                    className="group flex items-center justify-between py-8 transition-all duration-300 hover:bg-white/80 dark:hover:bg-neutral-800/50 md:py-10"
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
              <div className="py-12 text-center text-neutral-500">
                <p>No services available at this time.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
