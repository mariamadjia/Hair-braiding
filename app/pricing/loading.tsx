export default function PricingLoading() {
    return (
        <main className="min-h-screen bg-[#F6F1EA] px-5 py-16 text-center text-[#2C1810] sm:px-8 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#A05B3A]">Service menu</p>
            <div className="mx-auto mt-5 h-14 w-72 max-w-full animate-pulse bg-[#E8DDD4] sm:h-16 sm:w-96" />
            <div className="mx-auto mt-6 h-5 w-[34rem] max-w-full animate-pulse bg-[#E8DDD4]" />
            <div className="mx-auto mt-3 h-5 w-80 max-w-full animate-pulse bg-[#E8DDD4]" />
            <div className="mx-auto mt-14 max-w-6xl border-t border-[#DCCFC5] pt-10 text-left">
                <div className="h-10 w-64 animate-pulse bg-[#E8DDD4]" />
                <div className="mt-8 space-y-1 border-y border-[#DCCFC5]">
                    {[0, 1, 2].map(item => <div key={item} className="h-32 animate-pulse border-b border-[#DCCFC5] bg-[#F1E9E2] last:border-0" />)}
                </div>
            </div>
        </main>
    );
}
