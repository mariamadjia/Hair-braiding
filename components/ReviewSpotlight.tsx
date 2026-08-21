"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import LazyVideo from "./LazyVideo";

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
      className="relative isolate flex min-h-[27rem] items-center justify-center overflow-hidden bg-[#24130d] px-5 py-14 sm:min-h-[30rem] sm:px-8 lg:min-h-[34rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <LazyVideo
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        autoPlay={!reduceMotion}
        loop
        muted
        playsInline
        poster="/Gallery/Salon.JPG"
        ariaLabel="Braiding appointment in the salon"
      >
        <source src="/welcome/video2.m4v" type="video/mp4" />
      </LazyVideo>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(47,25,16,.42)_0%,rgba(30,15,10,.68)_72%,rgba(20,10,7,.8)_100%)]" />

      <div className="relative w-full max-w-[38rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={`${review.name}-${activeReview}`}
            aria-live="polite"
            className="m-0 rounded-[1.25rem] border border-white/55 bg-white/[0.14] px-6 py-8 text-center shadow-[0_20px_55px_rgba(18,9,5,.24)] backdrop-blur-md sm:px-10 sm:py-9 lg:px-12"
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

            <blockquote className="mx-auto font-[family-name:var(--font-playfair)] text-[clamp(1.05rem,1.8vw,1.5rem)] font-normal leading-[1.4] tracking-[-0.015em] text-[#fff8ee] [text-shadow:0_2px_22px_rgba(22,9,5,.5)]">
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
