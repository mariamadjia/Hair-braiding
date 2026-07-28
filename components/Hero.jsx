"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

// Default fallback images - these will show when backend/API is unavailable
const DEFAULT_HERO_IMAGES = [
  '/hero/IMG_9011.jpg',
  '/hero/ISIMG-678789.JPG',
  '/hero/ISIMG-680068.JPG'
];

export default function Hero({ videoSrc, useVideo, previewImages = /** @type {any} */ (null) }) {
  const [images, setImages] = useState(previewImages || DEFAULT_HERO_IMAGES);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setVideoReady(false);
  }, [videoSrc]);

  useEffect(() => {
    if (previewImages) {
      setImages(previewImages.length > 0 ? previewImages : DEFAULT_HERO_IMAGES);
      setCurrentImageIndex(0);
      return;
    }
    // Try to fetch images from API, but keep defaults if it fails
    fetch('/api/hero-images')
      .then(res => res.json())
      .then(data => {
        if (data.images && data.images.length > 0) {
          setImages(data.images);
          setCurrentImageIndex(0);
        }
      })
      .catch(err => {
        console.error('Using default hero images because the API is unavailable.', err);
        // Keep default images on error
      });
  }, [previewImages]);

  useEffect(() => {
    if (images.length === 0 || reduceMotion) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [images.length, reduceMotion]);

  return (
    <section className="relative flex flex-col overflow-hidden bg-[#F8F5EF] md:min-h-[calc(100vh-84px)] md:flex-row">
      {/* Mobile & Desktop Layout */}
      <div className="flex flex-col md:flex-1 md:grid md:grid-cols-2">
        {/* Text Content */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-center bg-[radial-gradient(circle_at_25%_45%,#fff_0%,#faf7f1_48%,#f1ebe2_100%)] px-7 pb-12 pt-20 md:justify-start md:px-12 md:py-16 lg:px-[10vw]"
        >
          <div className="w-full max-w-xl text-center md:text-left">
            {/* Headline */}
            <div className="mb-9">
              <h1 className="mb-5 text-[58px] font-[family-name:var(--font-allura)] font-normal leading-[1.02] text-[#2C1810] sm:text-[70px] md:text-[76px] lg:text-[94px] xl:text-[108px]">
                AH Braiding
              </h1>
              <div className="mx-auto mb-7 h-px w-12 bg-[#2C1810]/70 md:mx-0" aria-hidden="true" />
              <p className="font-serif text-[18px] font-light italic tracking-wide text-[#4B413B] sm:text-[20px] lg:text-[23px]">
                The Art of Elegant Braiding
              </p>
            </div>
            
            {/* CTA - Desktop only */}
            <div className="hidden md:block">
              <Link
                href="/services"
                className="group inline-flex min-h-14 items-center gap-7 bg-[#2C1810] px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FFFDF8] shadow-[0_12px_28px_rgba(44,24,16,0.16)] transition-all hover:-translate-y-0.5 hover:bg-[#3A2117] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2C1810]"
              >
                <span>Book an Appointment</span>
                <span aria-hidden="true" className="text-base transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Media Section - Video or Image Carousel */}
        <div className="relative h-[430px] overflow-hidden bg-[#F6F5F1] px-5 sm:h-[540px] md:h-auto md:flex-1 md:p-0">
          {useVideo && videoSrc ? (
            /* Background Video */
            <>
              {images[0] && (
                <Image
                  src={images[0]}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 767px) calc(100vw - 48px), 50vw"
                  className={`object-cover transition-opacity duration-300 ${
                    videoReady ? "opacity-0" : "opacity-100"
                  }`}
                />
              )}
              <video
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onCanPlay={() => setVideoReady(true)}
                className={`relative w-full h-full max-w-md mx-auto object-cover transition-opacity duration-300 md:absolute md:inset-0 md:max-w-none ${
                  videoReady ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : images.length > 0 ? (
            /* Image Carousel */
            <>
              <AnimatePresence initial={false} mode="sync">
                <motion.div
                  key={currentImageIndex}
                  className="absolute inset-x-6 inset-y-0 max-w-md mx-auto md:inset-0 md:max-w-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35 }}
                >
                  <Image
                    src={images[currentImageIndex]}
                    alt={`AH Braiding portfolio style ${currentImageIndex + 1}`}
                    fill
                    priority={currentImageIndex === 0}
                    sizes="(max-width: 767px) calc(100vw - 48px), 50vw"
                    className="object-cover object-center"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Image Indicators */}
              <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-0">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className="flex h-11 w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={index === currentImageIndex ? "true" : undefined}
                  >
                    <span className={`block h-1.5 rounded-full transition-all ${index === currentImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500 text-sm">Loading...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* CTA - Mobile only (below image) */}
      <div className="flex items-center justify-center bg-[#F8F5EF] py-7 md:hidden">
        <Link
          href="/services"
          className="inline-flex min-h-13 items-center gap-5 bg-[#2C1810] px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FFFDF8] shadow-[0_10px_24px_rgba(44,24,16,0.14)]"
        >
          <span>Book an Appointment</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      
      {/* Vertical separator line in the middle */}
      <div className="absolute bottom-0 left-1/2 top-0 hidden w-px overflow-hidden md:block">
        <motion.div
          className="h-full w-full origin-top bg-[#2C1810]/25"
          initial={reduceMotion ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Horizontal separator line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#2C1810]/25"></div>
    </section>
  );
}
