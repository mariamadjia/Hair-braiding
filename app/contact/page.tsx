import Link from 'next/link';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import FooterWrapper from '@/components/FooterWrapper';

const hours = [
  ['Monday', '9:00 AM – 7:00 PM'],
  ['Tuesday', '9:00 AM – 7:00 PM'],
  ['Wednesday', '9:00 AM – 7:00 PM'],
  ['Thursday', '9:00 AM – 7:00 PM'],
  ['Friday', '9:00 AM – 7:00 PM'],
  ['Saturday', '9:00 AM – 7:00 PM'],
  ['Sunday', '10:00 AM – 5:00 PM'],
];

function PhoneIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const IconCircle = ({ children }: { children: ReactNode }) => (
  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#B8754E] text-[#B0633E]">
    {children}
  </span>
);

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),transparent_42%),#F8F2EA] px-5 py-14 sm:px-8 md:py-16 lg:px-12 lg:py-12">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#B0633E]">Visit the Studio</p>
          <h1 className="mt-4 font-serif text-4xl leading-none tracking-[-0.03em] text-[#2C1810] sm:text-5xl lg:text-6xl">
            We’d Love to Welcome You
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#76675E]">
            Questions, directions, or appointment details—we’re here to help.
          </p>
        </header>

        <section className="mx-auto mt-10 max-w-6xl border border-[#D2A98E] bg-[#FFFDF9]/75 p-1.5 shadow-[0_18px_55px_rgba(70,39,24,0.06)] md:p-2">
          <div className="grid border border-[#E7CCBA] lg:grid-cols-[1.04fr_0.96fr]">
            <figure className="relative min-h-[420px] border-b border-[#E7CCBA] bg-[#EFE6DC] p-3 lg:min-h-[620px] lg:border-b-0 lg:border-r">
              <img src="/contact/salon-clean.png" alt="Interior of AH Braiding salon in San Antonio" className="h-full min-h-[396px] w-full object-cover lg:min-h-[594px]" />
              <figcaption className="absolute bottom-7 left-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-white drop-shadow">
                San Antonio, Texas
              </figcaption>
            </figure>

            <div className="flex flex-col px-6 py-8 sm:px-9 lg:px-10 lg:py-9">
              <section className="flex gap-4 border-b border-[#D9A98B] pb-7">
                <IconCircle><PhoneIcon /></IconCircle>
                <div>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B0633E]">Call the Studio</h2>
                  <a href="tel:+12108128121" className="mt-2 block font-serif text-2xl text-[#2C1810] transition-colors hover:text-[#B0633E]">
                    +1 (210) 812-8121
                  </a>
                </div>
              </section>

              <section className="flex gap-4 border-b border-[#D9A98B] py-7">
                <IconCircle><PinIcon /></IconCircle>
                <div>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B0633E]">Visit Us</h2>
                  <a href="https://maps.google.com/?q=1305+SW+Loop+410,+Unit+203,+San+Antonio,+TX+78227" target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm leading-6 text-[#3E312B] transition-colors hover:text-[#B0633E]">
                    1305 SW Loop 410, Unit 203<br />
                    San Antonio, TX 78227
                  </a>
                </div>
              </section>

              <section className="flex flex-1 gap-4 border-b border-[#D9A98B] py-7">
                <IconCircle><ClockIcon /></IconCircle>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B0633E]">Studio Hours</h2>
                  <dl className="mt-3 space-y-1.5 text-xs text-[#443630] sm:text-sm">
                    {hours.map(([day, time]) => (
                      <div key={day} className="flex items-center justify-between gap-4">
                        <dt>{day}</dt>
                        <dd className="whitespace-nowrap">{time}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>

              <Link href="/services" className="mx-auto mt-7 border-b border-[#B8754E] pb-1 text-sm text-[#B0633E] transition-colors hover:text-[#2C1810]">
                Book an appointment
              </Link>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-[#D9A98B] pt-5 text-[10px] font-medium uppercase tracking-[0.18em]" aria-label="Social media">
                <a href="https://www.instagram.com/ah_braiding" target="_blank" rel="noopener noreferrer" className="text-[#2C1810] transition-colors hover:text-[#B0633E]">Instagram</a>
                <a href="https://www.tiktok.com/@sanantoniobraidsadjias" target="_blank" rel="noopener noreferrer" className="text-[#2C1810] transition-colors hover:text-[#B0633E]">TikTok</a>
                <a href="https://www.facebook.com/adjias.braiding" target="_blank" rel="noopener noreferrer" className="text-[#2C1810] transition-colors hover:text-[#B0633E]">Facebook</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterWrapper />
    </>
  );
}
