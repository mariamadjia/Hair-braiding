"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';

const defaultItems = [
  {
    type: 'video',
    src: '/welcome/video1.MOV',
    label: 'Join us Today',
    alt: 'In-studio bookings',
    link: '/join-us'
  },
  {
    type: 'video',
    src: '/welcome/video2.MOV',
    label: 'Book us now',
    alt: 'Book us now',
    link: '/services'
  },
  {
    type: 'video',
    src: '/welcome/video4.MOV',
    label: 'Explore gallery',
    alt: 'Explore gallery',
    link: '/gallery'
  }
];

export default function Welcome({ items: propItems = defaultItems, editMode = false, onEditItem } = {}) {
  const items = propItems;

  return (
    <section className="bg-[#FFF5EE] py-12 md:py-24">
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        {/* Desktop: Side by side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="max-w-lg">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 mb-4">
              Welcome to AH Braiding.
            </h2>
            <p className="text-[15px] md:text-[16px] leading-relaxed text-neutral-700 font-light">
              More than braids—AH Braiding is a space for self-expression, skill-building, and growth rooted in beauty, culture, and confidence.
            </p>
          </div>

          {/* Right: Three Images/Videos */}
          <div className="grid grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div key={index} className="space-y-4 relative">
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
                        <video
                          src={item.src}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
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
                      <video
                        src={item.src}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
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
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Stacked layout with alternating image-text */}
        <div className="lg:hidden space-y-12">
          {/* Intro Text */}
          <div className="text-center px-4">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 mb-4">
              Welcome to the Studio.
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-700 font-light max-w-md mx-auto">
              Introducing a one-of-a-kind experience by luxury braider AH Braiding—offering exclusive in-studio appointments, curated brand partnerships, and expert-led online courses for aspiring braiders.
            </p>
          </div>

          {/* First: Media Left, Text Right */}
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="relative">
              {editMode && (
                <button
                  onClick={() => onEditItem && onEditItem(0)}
                  className="absolute top-2 right-2 z-10 p-2 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
                  title={`Edit ${items[0]?.label}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {items[0].link ? (
                <Link href={items[0].link}>
                  <div className="aspect-[3/5] bg-neutral-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    {items[0].type === 'video' ? (
                      <video
                        src={items[0].src}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={items[0].src}
                        alt={items[0].alt}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="aspect-[3/5] bg-neutral-200 overflow-hidden">
                  {items[0].type === 'video' ? (
                    <video
                      src={items[0].src}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={items[0].src}
                      alt={items[0].alt}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              {items[0].link ? (
                <Link href={items[0].link}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight cursor-pointer hover:underline">
                    {items[0].label.split(' ').map((word, i) => (
                      <span key={i}>{word}<br /></span>
                    ))}
                  </p>
                </Link>
              ) : (
                <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight">
                  {items[0].label.split(' ').map((word, i) => (
                    <span key={i}>{word}<br /></span>
                  ))}
                </p>
              )}
            </div>
          </div>

          {/* Second: Text Left, Media Right */}
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="flex items-center justify-center">
              {items[1].link ? (
                <Link href={items[1].link}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight cursor-pointer hover:underline">
                    {items[1].label.split(' ').map((word, i) => (
                      <span key={i}>{word}<br /></span>
                    ))}
                  </p>
                </Link>
              ) : (
                <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight">
                  {items[1].label.split(' ').map((word, i) => (
                    <span key={i}>{word}<br /></span>
                  ))}
                </p>
              )}
            </div>
            <div className="relative">
              {editMode && (
                <button
                  onClick={() => onEditItem && onEditItem(1)}
                  className="absolute top-2 right-2 z-10 p-2 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
                  title={`Edit ${items[1]?.label}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {items[1].link ? (
                <Link href={items[1].link}>
                  <div className="aspect-[3/5] bg-neutral-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    {items[1].type === 'video' ? (
                      <video
                        src={items[1].src}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={items[1].src}
                        alt={items[1].alt}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="aspect-[3/5] bg-neutral-200 overflow-hidden">
                  {items[1].type === 'video' ? (
                    <video
                      src={items[1].src}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={items[1].src}
                      alt={items[1].alt}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Third: Media Left, Text Right */}
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="relative">
              {editMode && (
                <button
                  onClick={() => onEditItem && onEditItem(2)}
                  className="absolute top-2 right-2 z-10 p-2 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
                  title={`Edit ${items[2]?.label}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {items[2].link ? (
                <Link href={items[2].link}>
                  <div className="aspect-[3/5] bg-neutral-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    {items[2].type === 'video' ? (
                      <video
                        src={items[2].src}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={items[2].src}
                        alt={items[2].alt}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="aspect-[3/5] bg-neutral-200 overflow-hidden">
                  {items[2].type === 'video' ? (
                    <video
                      src={items[2].src}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={items[2].src}
                      alt={items[2].alt}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              {items[2].link ? (
                <Link href={items[2].link}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight cursor-pointer hover:underline">
                    {items[2].label.split(' ').map((word, i) => (
                      <span key={i}>{word}<br /></span>
                    ))}
                  </p>
                </Link>
              ) : (
                <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900 leading-tight">
                  {items[2].label.split(' ').map((word, i) => (
                    <span key={i}>{word}<br /></span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
