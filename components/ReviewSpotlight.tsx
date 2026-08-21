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
      className="relative isolate flex min-h-[27rem] items-center justify-center overflow-hidden bg-[#e6dac8] px-5 py-14 sm:min-h-[30rem] sm:px-8 lg:min-h-[34rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,#f4ecdf_0%,#e9dece_48%,#d5c4ae_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_48%,rgba(255,252,245,.88)_0%,rgba(255,250,240,.38)_34%,transparent_68%),linear-gradient(108deg,rgba(111,83,61,.13),transparent_25%,transparent_72%,rgba(101,75,56,.12))]" />
      <div className="absolute inset-0 -z-10 opacity-[0.22] [background-image:repeating-linear-gradient(0deg,rgba(104,79,58,.18)_0,rgba(104,79,58,.18)_1px,transparent_1px,transparent_4px),repeating-linear-gradient(90deg,rgba(104,79,58,.14)_0,rgba(104,79,58,.14)_1px,transparent_1px,transparent_4px)]" />

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
            <figcaption className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-[family-name:var(--font-montserrat)] text-[9px] font-medium uppercase tracking-[0.24em] text-[#422b20] sm:text-[10px]">
              <span aria-label="5 out of 5 stars" className="tracking-[0.16em] text-[#d6a45c]">
                ★★★★★
              </span>
              <span>{review.source}</span>
            </figcaption>

            <blockquote className="mx-auto max-w-[42rem] font-[family-name:var(--font-playfair)] text-[clamp(1.35rem,2.65vw,2.15rem)] font-normal leading-[1.35] tracking-[-0.02em] text-[#4a3023] [text-shadow:0_1px_18px_rgba(255,252,245,.58)]">
              “{review.quote}”
            </blockquote>

            <p className="mt-7 font-[family-name:var(--font-montserrat)] text-[9px] font-medium uppercase tracking-[0.2em] text-[#4a3023]/75 sm:text-[10px]">
              {review.name} <span aria-hidden="true">·</span> {review.service}{" "}
              <span aria-hidden="true">·</span> Verified Client
            </p>
          </motion.figure>
        </AnimatePresence>
      </div>
    </section>
  );
}
