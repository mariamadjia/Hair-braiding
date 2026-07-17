export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-[#F6F5F1] dark:bg-neutral-900 pt-24 md:pt-32">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <div className="mx-auto mb-4 h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="mx-auto h-12 w-72 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <div className="divide-y divide-[#ecdcc0] dark:divide-neutral-700">
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between py-8 md:py-10"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 animate-pulse rounded-sm bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-6 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>

              <div className="h-9 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
