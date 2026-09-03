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
      
      {/* Mobile */}
      <div className="w-full px-6 pb-14 pt-16 lg:hidden">
        <div className="mx-auto grid w-full max-w-sm grid-cols-1 items-center gap-y-9 text-center">
          <h2 className="text-2xl font-semibold tracking-[0.25em]">
            AH BRAIDING
          </h2>

          <div className="aspect-[4/5] w-full overflow-hidden bg-[#21110b]">
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

          <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] font-medium uppercase tracking-[0.18em] sm:text-[13px]">
            <a href="https://www.instagram.com/ah_braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">INSTAGRAM</a>
            <a href="https://www.tiktok.com/@sanantoniobraidsadjias" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">TIKTOK</a>
            <a href="https://www.facebook.com/adjias.braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">FACEBOOK</a>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden w-full px-24 pb-10 pt-14 lg:block">
        <div className="flex items-center justify-between gap-12">
          <div className="text-left">
            <h2 className="mb-6 text-3xl font-semibold tracking-[0.25em]">
              AH BRAIDING
            </h2>
            <div className="flex flex-wrap justify-start gap-6 text-[13px] font-medium uppercase tracking-[0.18em]">
              <a href="https://www.instagram.com/ah_braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">INSTAGRAM</a>
              <a href="https://www.tiktok.com/@sanantoniobraidsadjias" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">TIKTOK</a>
              <a href="https://www.facebook.com/adjias.braiding" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">FACEBOOK</a>
            </div>
          </div>

          <div className="aspect-[6/5] w-[450px] max-w-none overflow-hidden bg-[#21110b]">
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
      <div className="mx-4 border-t border-white lg:mx-0"></div>

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
            <a href="/privacy" className="hover:opacity-70 transition-opacity">PRIVACY</a>
            <a href="/terms" className="hover:opacity-70 transition-opacity">TERMS</a>
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
