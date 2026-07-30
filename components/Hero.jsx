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
    <section className="flex flex-col md:flex-row md:min-h-[85vh] relative">
      {/* Mobile & Desktop Layout */}
      <div className="flex flex-col md:flex-1 md:grid md:grid-cols-2">
        {/* Text Content */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="bg-[#F6F5F1] flex items-center justify-center px-6 pb-6 pt-28 md:py-0 md:px-16 lg:px-24"
        >
          <div className="w-full max-w-lg text-center">
            {/* Headline */}
            <div className="mb-2 md:mb-8">
              <h1 className="mx-auto max-w-[340px] text-[30px] font-semibold uppercase leading-[1.05] tracking-[-0.02em] text-[#2C1810] sm:text-[38px] md:hidden">
                A premium braiding experience in San Antonio, Texas.
              </h1>
              <h1 className="hidden text-[80px] font-[family-name:var(--font-allura)] font-normal leading-[1.1] text-[#2C1810] md:mb-4 md:block lg:text-[96px]">
                AH Braiding
              </h1>
              <p className="hidden text-[20px] font-serif italic font-light tracking-wide text-neutral-700 md:block lg:text-[24px]">
                The Art of Elegant Braiding
              </p>
            </div>
            
            {/* CTA - Desktop only */}
            <div className="hidden md:block">
              <Link
                href="/services"
                className="inline-block border-b-2 border-neutral-900 pb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 transition-opacity hover:opacity-70"
              >
                Book an Appointment
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Media Section - Video or Image Carousel */}
        <div className="relative h-[400px] sm:h-[500px] md:flex-1 md:h-auto bg-[#F6F5F1] md:p-0 overflow-hidden">
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
                  className="absolute inset-x-[14%] inset-y-0 mx-auto md:inset-0 md:max-w-none"
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
                    className="object-cover"
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
      <div className="md:hidden bg-[#F6F5F1] flex items-center justify-center pb-20 pt-10">
        <Link
          href="/services"
          className="inline-block border-b-2 border-neutral-900 pb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 transition-opacity hover:opacity-70"
        >
          Book an Appointment
        </Link>
      </div>
      
      {/* Vertical separator line in the middle */}
      <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px overflow-hidden">
        <motion.div
          className="w-full h-full bg-[#2C1810] origin-top"
          initial={reduceMotion ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Horizontal separator line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#2C1810]"></div>
    </section>
  );
}
