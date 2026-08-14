'use client';

import { useReducedMotion } from 'framer-motion';
import LazyVideo from './LazyVideo';

const FOOTER_VIDEO_POSTER = '/Footer/footer-poster.jpg';

interface FooterProps {
  videoSrc?: string | null;
}

export default function Footer({ videoSrc = null }: FooterProps = {}) {
  const reduceMotion = useReducedMotion();
  return (
    <footer className="bg-[#2C1810] text-white w-full">
      
      <div className="w-full px-6 pb-10 pt-14 lg:px-24">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-12">
          <div className="text-center lg:text-left">
            <h2 className="mb-6 text-2xl font-semibold tracking-[0.25em] lg:text-3xl">
              BY AH BRAIDING
            </h2>
            <div className="flex flex-wrap justify-center gap-6 text-[13px] font-medium uppercase tracking-[0.18em] lg:justify-start">
              <a href="https://www.instagram.com/ah_braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">INSTAGRAM</a>
              <a href="https://www.tiktok.com/@ah.braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">TIKTOK</a>
              <a href="https://www.facebook.com/adjias.braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">FACEBOOK</a>
            </div>
            <nav className="mt-8 flex flex-wrap justify-center gap-6 text-[13px] font-medium uppercase tracking-[0.18em] lg:hidden">
              <a href="/" className="transition-opacity hover:opacity-70">HOME</a>
              <a href="/gallery" className="transition-opacity hover:opacity-70">GALLERY</a>
              <a href="/services" className="transition-opacity hover:opacity-70">SERVICES</a>
              <a href="/contact" className="transition-opacity hover:opacity-70">CONTACT</a>
            </nav>
          </div>

          <div className="aspect-[4/5] w-full max-w-xs overflow-hidden bg-[#21110b] lg:aspect-[6/5] lg:w-[450px] lg:max-w-none">
            {videoSrc && (
              <LazyVideo
                className="h-full w-full object-cover"
                style={{ objectPosition: 'center 30%' }}
                autoPlay={!reduceMotion}
                poster={FOOTER_VIDEO_POSTER}
              >
                <source src={videoSrc} type="video/mp4" />
              </LazyVideo>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white"></div>

      {/* Bottom Bar */}
      <div className="px-6 py-6">
        {/* Mobile: Centered Credit */}
        <div className="lg:hidden text-center text-[10px] uppercase tracking-[0.15em] opacity-100">
          <a
            href="https://www.gloria-djonret.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            DESIGNED BY Gloria Djonret
          </a>
        </div>

        {/* Desktop: Navigation + Credit */}
        <div className="hidden lg:flex flex-wrap justify-between items-center gap-4">
          <nav className="flex flex-wrap gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
            <a href="/" className="hover:opacity-70 transition-opacity">HOME</a>
            <a href="/gallery" className="hover:opacity-70 transition-opacity">GALLERY</a>
            <a href="/services" className="hover:opacity-70 transition-opacity">SERVICES</a>
            <a href="/contact" className="hover:opacity-70 transition-opacity">CONTACT</a>
          </nav>

          <div className="text-[10px] uppercase tracking-[0.15em] opacity-100">
             {""}
            <a
                href="https://www.gloria-djonret.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
            >
               DESIGNED BY Gloria Djonret
            </a>
          </div>
        </div>
      </div>

    </footer>
  );
}
