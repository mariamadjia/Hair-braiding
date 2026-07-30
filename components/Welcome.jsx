"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Edit } from 'lucide-react';
import LazyVideo from './LazyVideo';

const defaultItems = [
  {
    type: 'video',
    src: '/welcome/video1.m4v',
    label: 'Join our team',
    alt: 'In-studio bookings',
    link: '/join-us'
  },
  {
    type: 'video',
    src: '/welcome/video2.m4v',
    label: 'Book an appointment',
    alt: 'Book us now',
    link: '/services'
  },
  {
    type: 'video',
    src: '/welcome/video4.m4v',
    label: 'Explore gallery',
    alt: 'Explore gallery',
    link: '/gallery'
  }
];

export default function Welcome({ items: propItems = defaultItems, editMode = false, onEditItem } = {}) {
  const items = propItems;
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[#F6F5F1] py-12 md:py-24">
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        {/* Desktop: Side by side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="max-w-lg">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 mb-4">
              Welcome to AH Braiding.
            </h2>
            <p className="text-[15px] md:text-[16px] leading-relaxed text-neutral-700 font-light">
              More than braids—AH Braiding is a San Antonio space for self-expression, beauty, culture, and confidence. Choose your style, review pricing and deposit details, then request an available time.
            </p>
          </div>

          {/* Right: Three Images/Videos */}
          <div className="grid grid-cols-3 gap-4">
            {items.map((item, index) => (
              <motion.div
                key={index}
                className="space-y-4 relative"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: index * 0.35, ease: "easeOut" }}
              >
                {editMode && (
                  <button
                    onClick={() => onEditItem && onEditItem(index)}
                    className="absolute top-2 right-2 z-10 p-2 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
                    title={`Edit ${item.label}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {item.link ? (
                  <Link href={item.link}>
                    <div className="aspect-[3/5] bg-neutral-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                      {item.type === 'video' ? (
                        <LazyVideo
                          className="w-full h-full object-cover"
                          autoPlay={!reduceMotion}
                          delayMs={index * 350}
                          loop
                          muted
                          playsInline
                        ><source src={item.src} media="(min-width: 1024px)" /></LazyVideo>
                      ) : (
                        <img
                          src={item.src}
                          alt={item.alt}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="aspect-[3/5] bg-neutral-200 overflow-hidden">
                    {item.type === 'video' ? (
                      <LazyVideo
                        className="w-full h-full object-cover"
                        autoPlay={!reduceMotion}
                        delayMs={index * 350}
                        loop
                        muted
                        playsInline
                      ><source src={item.src} media="(min-width: 1024px)" /></LazyVideo>
                    ) : (
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
                {item.link ? (
                  <Link href={item.link}>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-center text-neutral-900 cursor-pointer hover:underline mt-4">
                      {item.label}
                    </p>
                  </Link>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-center text-neutral-900 mt-4">
                    {item.label}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: compact editorial layout with alternating media and actions */}
        <div className="space-y-10 lg:hidden">
          {/* Intro Text */}
          <div className="px-1 text-center">
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900">
              Welcome to AH Braiding.
            </h2>
            <p className="mx-auto max-w-[34rem] text-[14px] font-light leading-[1.7] text-neutral-700 sm:text-[15px]">
              More than braids—AH Braiding is a San Antonio space for self-expression, beauty, culture, and confidence.
            </p>
          </div>

          {items.map((item, index) => {
            const media = (
              <div className="relative overflow-hidden bg-neutral-200 aspect-[3/5]">
                {editMode && (
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      onEditItem && onEditItem(index);
                    }}
                    className="absolute right-2 top-2 z-10 rounded-full bg-neutral-900 p-2 text-white shadow-lg transition-colors hover:bg-neutral-800"
                    title={`Edit ${item.label}`}
                    aria-label={`Edit ${item.label}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {item.type === 'video' ? (
                  <LazyVideo
                    className="h-full w-full object-cover"
                    autoPlay={!reduceMotion}
                    delayMs={index * 350}
                    loop
                    muted
                    playsInline
                  >
                    <source src={item.src} media="(max-width: 1023px)" />
                  </LazyVideo>
                ) : (
                  <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                )}
              </div>
            );

            const mediaColumn = item.link ? (
              <Link
                href={item.link}
                aria-label={item.label}
                className="block transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {media}
              </Link>
            ) : media;

            const action = item.link ? (
              <Link
                href={item.link}
                className="inline-block max-w-[9rem] text-center text-[10px] font-medium uppercase leading-[1.55] tracking-[0.22em] text-neutral-900 transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-[11px]"
              >
                {item.label}
              </Link>
            ) : (
              <p className="max-w-[9rem] text-center text-[10px] font-medium uppercase leading-[1.55] tracking-[0.22em] text-neutral-900 sm:text-[11px]">
                {item.label}
              </p>
            );

            return (
              <motion.div
                key={`${item.src}-${index}`}
                className={`grid items-center gap-4 ${
                  index % 2 === 0
                    ? "grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]"
                    : "grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
                }`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, delay: index * 0.12, ease: "easeOut" }}
              >
                <div className={index % 2 === 0 ? "order-1" : "order-2"}>{mediaColumn}</div>
                <div className={`flex items-center justify-center ${index % 2 === 0 ? "order-2" : "order-1"}`}>{action}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
