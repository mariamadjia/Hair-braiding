"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import LazyVideo from "./LazyVideo";

const reviews = [
  {
    quote:
      "First time here and I was impressed! Professional and kind from start to finish. They had me in and out in just 3 hours!! I’ve never had knotless braids done that quickly. My hair turned out great, the price was reasonable, and the hair was included. I’ll definitely be back and will update my review after future visits!",
    name: "Ruta SD",
    service: "Knotless Braids",
    source: "Google Review",
    sourceUrl: "https://www.google.com/maps/contrib/104076181694074372514/reviews?hl=en",
  },
  {
    quote:
      "Excellent service... very easy to book and very helpful with the style I wanted. This was my second visit. The first time I was able to pull my braids up the same day-- no pain, not too tight. This time I got crochet boho braids. I’m very pleased with both and will be back",
    name: "Kim Ervin",
    service: "Crochet Boho Braids",
    source: "Google Review",
    sourceUrl: "https://www.google.com/maps/contrib/115070349485538825094/reviews?hl=en",
  },
  {
    quote:
      "I have been going to AH braiding for the last 2 years and can honestly say they are the best! Miriam and her team are very professional and create any braided style to perfection. As per pictures bellow, I have gone so long as to keep my braids in for (3 months) and they still looked great!",
    name: "Zelnita Williams",
    service: "Braided Styles",
    source: "Google Review",
    sourceUrl: "https://www.google.com/maps/contrib/106334529932890913163/reviews?hl=en-US",
  },
  {
    quote:
      "Had a wonderful experience getting my hair braided today. Got knotless braids. I am tender headed but even with two people braiding they never pulled or braided too tight. The. style was exactly what I wanted. I am so pleased.",
    name: "Jowanna Tillman",
    service: "Knotless Braids",
    source: "Google Review",
    sourceUrl: "https://www.google.com/maps/contrib/115077777759240822689/reviews?hl=en-US",
  },
  {
    quote:
      "Miriam and her staff are the sweetest, most talented braiders. From beginning to end, the process was smooth, the salon was clean, and service was prompt and professional. I’m very happy and will definitely be back!!! Thank you!!!",
    name: "Jess Conrad",
    service: "Braiding Service",
    source: "Google Review",
    sourceUrl: "https://www.google.com/maps/contrib/106924192576058337013/reviews?hl=en-US",
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
              <a
                href={review.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 transition-opacity hover:opacity-70 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                aria-label={`Read ${review.name}’s review on Google Maps`}
              >
                {review.source}
              </a>
            </figcaption>

            <blockquote className="mx-auto font-[family-name:var(--font-playfair)] text-[clamp(1.05rem,1.8vw,1.5rem)] font-normal leading-[1.4] tracking-[-0.015em] text-[#fff8ee] [text-shadow:0_2px_22px_rgba(22,9,5,.5)]">
              “{review.quote}”
            </blockquote>

            <p className="mt-7 font-[family-name:var(--font-montserrat)] text-[9px] font-medium uppercase tracking-[0.2em] text-white/80 sm:text-[10px]">
              {review.name} <span aria-hidden="true">·</span> {review.service}
            </p>
          </motion.figure>
        </AnimatePresence>
      </div>
    </section>
  );
}
