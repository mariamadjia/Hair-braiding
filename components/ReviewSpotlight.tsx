"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const reviews = [
  {
    quote:
      "The entire experience felt thoughtful and professional. My braids came out even better than I imagined, and I left feeling completely confident.",
    name: "Maya",
    service: "Knotless Braids",
    source: "Google Review",
  },
  {
    quote:
      "From booking to the final look, everything felt thoughtful and professional. I left feeling completely confident.",
    name: "Nia",
    service: "Knotless Braids",
    source: "Verified Booking",
  },
];

const DISPLAY_TIME_MS = 7000;

export default function ReviewSpotlight() {
  const [activeReview, setActiveReview] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isPaused || reduceMotion || reviews.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveReview((current) => (current + 1) % reviews.length);
    }, DISPLAY_TIME_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion]);

  const review = reviews[activeReview];

  return (
    <section
      aria-label="Client reviews"
      className="relative isolate flex min-h-[27rem] items-center justify-center overflow-hidden bg-[#2a160f] px-5 py-14 sm:min-h-[30rem] sm:px-8 lg:min-h-[34rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_38%,#b28b70_0%,#805c48_25%,#4a2b20_58%,#25120d_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_58%_58%,rgba(238,199,157,.28)_0%,rgba(185,131,92,.1)_30%,transparent_62%),linear-gradient(110deg,rgba(20,9,6,.42),transparent_36%,rgba(255,226,192,.06)_55%,rgba(17,8,5,.5))]" />
      <div className="absolute inset-0 -z-10 opacity-[0.16] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_180%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.9%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%220.28%22/%3E%3C/svg%3E')]" />

      <div className="relative w-full max-w-[44rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={`${review.name}-${activeReview}`}
            aria-live="polite"
            className="m-0 px-1 py-5 text-center sm:px-8 sm:py-7"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeInOut" }}
          >
            <figcaption className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-[family-name:var(--font-montserrat)] text-[9px] font-medium uppercase tracking-[0.24em] text-[#fff8ee] sm:text-[10px]">
              <span aria-label="5 out of 5 stars" className="tracking-[0.16em] text-[#d6a45c]">
                ★★★★★
              </span>
              <span>{review.source}</span>
            </figcaption>

            <blockquote className="mx-auto max-w-[42rem] font-[family-name:var(--font-playfair)] text-[clamp(1.35rem,2.65vw,2.15rem)] font-normal leading-[1.35] tracking-[-0.02em] text-[#fff8ee] [text-shadow:0_2px_22px_rgba(22,9,5,.35)]">
              “{review.quote}”
            </blockquote>

            <p className="mt-7 font-[family-name:var(--font-montserrat)] text-[9px] font-medium uppercase tracking-[0.2em] text-white/80 sm:text-[10px]">
              {review.name} <span aria-hidden="true">·</span> {review.service}{" "}
              <span aria-hidden="true">·</span> Verified Client
            </p>
          </motion.figure>
        </AnimatePresence>
      </div>
    </section>
  );
}
