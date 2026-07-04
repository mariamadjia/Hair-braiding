import { Button } from "@/components/ui/button";
import { toProxyUrl } from "@/lib/utils/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getCategories() {
  try {
    const response = await fetch(`${API_URL}/api/booking`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch booking data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching booking data:', error);
    return [];
  }
}

export default async function Services() {
  const categories = await getCategories();

  return (
    <>
      <section id="services" className="relative overflow-hidden bg-[#FFF5EE] dark:bg-neutral-900 pt-24 md:pt-32 pb-12 md:pb-16 text-neutral-900 dark:text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400 mb-4">Our Expertise</p>
            <h2 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900 dark:text-white">
              Signature <span className="font-serif italic">Services</span>
            </h2>
          </div>
        </div>
      </section>

      <section className="bg-[#FFF5EE] dark:bg-neutral-900 pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="divide-y divide-[#ecdcc0] dark:divide-neutral-700">
            {Array.isArray(categories) && categories.length > 0 ? categories.map((cat, idx) => (
              <div
                key={`${cat.slug}-${idx}`}
                className="group flex items-center justify-between py-8 md:py-10 transition-all duration-300 hover:bg-white/80 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-4">
                  {cat.image && (
                    <img
                      src={toProxyUrl(cat.image)}
                      alt={cat.name}
                      className="h-14 w-14 object-cover rounded-sm shrink-0"
                    />
                  )}
                  <span className="text-lg md:text-xl font-light tracking-wide text-neutral-900 dark:text-white transition-colors group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                    {cat.name}
                  </span>
                </div>
                <Button
                  asChild
                  className="rounded-none bg-[#2C1810] text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold hover:bg-[#1a0f0a] transition-colors"
                >
                  <a href={`/booking/${cat.slug}`}>Book Now</a>
                </Button>
              </div>
            )) : (
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
