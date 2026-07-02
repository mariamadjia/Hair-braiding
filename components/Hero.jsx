"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

// Default fallback images - these will show when backend/API is unavailable
const DEFAULT_HERO_IMAGES = [
  '/hero/default-1.jpg',
  '/hero/default-2.jpg',
  '/hero/default-3.jpg'
];

export default function Hero({ videoSrc, useVideo }) {
  const [images, setImages] = useState(DEFAULT_HERO_IMAGES);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Try to fetch images from API, but keep defaults if it fails
    fetch('/api/hero-images')
      .then(res => res.json())
      .then(data => {
        console.log('Hero images API response:', data);
        console.log('Source:', data.source);
        console.log('Number of images:', data.images?.length);
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        }
      })
      .catch(err => {
        console.log('Using default hero images (API unavailable)', err);
        // Keep default images on error
      });
  }, []);

  useEffect(() => {
    if (images.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section className="flex flex-col md:flex-row md:min-h-[85vh] relative">
      {/* Mobile & Desktop Layout */}
      <div className="flex flex-col md:flex-1 md:grid md:grid-cols-2">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="bg-[#FFF5EE] flex items-center justify-center px-6 pt-24 pb-10 md:py-0 md:px-16 lg:px-24"
        >
          <div className="w-full max-w-lg text-center">
            {/* Headline */}
            <div className="mb-8">
              <h1 className="text-[52px] sm:text-[64px] md:text-[80px] lg:text-[96px] font-[family-name:var(--font-allura)] font-normal leading-[1.1] text-[#2C1810] mb-4">
                AH Braiding
              </h1>
              <p className="text-[18px] sm:text-[20px] md:text-[20px] lg:text-[24px] font-serif italic font-light tracking-wide text-neutral-700">
                The Art of Elegant Braiding
              </p>
            </div>
            
            {/* CTA - Desktop only */}
            <div className="hidden md:block">
              <Link
                href="/booking"
                className="inline-block border-b-2 border-neutral-900 pb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 transition-opacity hover:opacity-70"
              >
                Book an Appointment
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Media Section - Video or Image Carousel */}
        <div className="relative h-[400px] sm:h-[500px] md:flex-1 md:h-auto bg-[#FFF5EE] px-6 md:p-0 overflow-hidden">
          {useVideo && videoSrc ? (
            /* Background Video */
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full max-w-md mx-auto object-cover md:absolute md:inset-0 md:max-w-none"
            />
          ) : images.length > 0 ? (
            /* Image Carousel */
            <>
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt="Luxury braiding portfolio"
                  crossOrigin="anonymous"
                  className="w-full h-full max-w-md mx-auto object-cover md:absolute md:inset-0 md:max-w-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              </AnimatePresence>

              {/* Image Indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "w-8 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/75"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
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
      <div className="md:hidden bg-[#FFF5EE] flex items-center justify-center py-6">
        <Link
          href="/booking"
          className="inline-block border-b-2 border-neutral-900 pb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 transition-opacity hover:opacity-70"
        >
          Book an Appointment
        </Link>
      </div>
      
      {/* Vertical separator line in the middle */}
      <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[#2C1810]"></div>
      
      {/* Horizontal separator line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#2C1810]"></div>
    </section>
  );
}