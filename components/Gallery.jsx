'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';

export default function Gallery({ previewCollections = /** @type {any} */ (null), interactive = true }) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [isFlipping, setIsFlipping] = useState({});
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());
  const reduceMotion = useReducedMotion();
  const rotationTimers = useRef([]);

  // Load collections from API
  useEffect(() => {
    if (previewCollections) {
      setCollections(previewCollections);
      // An edited collection can have fewer images than before. Reset the
      // carousel position so it never points past the new image array.
      setCurrentImageIndex({});
      setIsFlipping({});
      setLoading(false);
      setLoadError(false);
      return;
    }
    const loadCollections = async () => {
      setLoadError(false);
      setLoading(true);
      try {
        const res = await fetch('/api/gallery-collections');
        if (!res.ok) {
          throw new Error('Failed to fetch gallery collections');
        }
        const data = await res.json();
        if (data.collections) {
          setCollections(data.collections);
        }
      } catch (error) {
        console.error('Failed to load gallery collections:', error);
        // Set empty collections on error to prevent infinite loading
        setCollections([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, [retryCount, previewCollections]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      collections.forEach((collection) => {
        const key = collection.id ?? collection.slug;
        if (collection.images.length > 1) {
          setIsFlipping(prev => ({ ...prev, [key]: true }));
          
          const changeTimer = setTimeout(() => {
            setCurrentImageIndex(prev => {
              const currentIndex = Math.min(prev[key] || 0, collection.images.length - 1);
              const newIndex = currentIndex === collection.images.length - 1 ? 0 : currentIndex + 1;
              return { ...prev, [key]: newIndex };
            });
            
            const finishTimer = setTimeout(() => {
              setIsFlipping(prev => ({ ...prev, [key]: false }));
            }, 300);
            rotationTimers.current.push(finishTimer);
          }, 300);
          rotationTimers.current.push(changeTimer);
        }
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      rotationTimers.current.forEach(clearTimeout);
      rotationTimers.current = [];
    };
  }, [collections, reduceMotion]);

  const handlePrevImage = (collectionIndex, collectionKey, e) => {
    e.stopPropagation();
    const collection = collections[collectionIndex];
    const currentIndex = Math.min(currentImageIndex[collectionKey] || 0, collection.images.length - 1);
    const newIndex = currentIndex === 0 ? collection.images.length - 1 : currentIndex - 1;
    setCurrentImageIndex((previous) => ({ ...previous, [collectionKey]: newIndex }));
  };

  const handleNextImage = (collectionIndex, collectionKey, e) => {
    e.stopPropagation();
    const collection = collections[collectionIndex];
    const currentIndex = Math.min(currentImageIndex[collectionKey] || 0, collection.images.length - 1);
    const newIndex = currentIndex === collection.images.length - 1 ? 0 : currentIndex + 1;
    setCurrentImageIndex((previous) => ({ ...previous, [collectionKey]: newIndex }));
  };

  const handleSwipe = (collectionIndex, collectionKey, startX, endX) => {
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextImage(collectionIndex, collectionKey, { stopPropagation: () => {} });
      } else {
        handlePrevImage(collectionIndex, collectionKey, { stopPropagation: () => {} });
      }
    }
  };

  if (loading) {
    return (
      <section className="bg-[#F6F5F1] py-10 md:py-14 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-[#2C1810]"></div>
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900">
              Gallery
            </h2>
            <p className="text-[20px] md:text-[28px] font-light text-neutral-900">
              Our Work Collection
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-6" aria-label="Loading gallery">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <div className="aspect-[4/5] animate-pulse border border-[#2C1810] bg-neutral-200 md:border-2 md:p-4" />
                <div className="mx-auto mt-3 h-3 w-2/3 animate-pulse bg-neutral-200" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F6F5F1] py-10 md:py-14 relative">
      {/* Horizontal Separator Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#2C1810]"></div>
      
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="mb-8 text-center md:mb-10">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900">
            Gallery
          </h2>
          <p className="text-[20px] md:text-[28px] font-light text-neutral-900">
            Our Work Collection
          </p>
        </div>

        {loadError && (
          <div role="alert" className="mb-8 text-center">
            <p className="mb-3 text-sm text-neutral-600">The gallery could not be loaded right now.</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="min-h-11 border border-neutral-900 px-5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-900"
            >
              Retry gallery
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-6">
          {collections.map((item, index) => {
            const itemKey = item.id ?? item.slug;
            const currentIndex = Math.min(currentImageIndex[itemKey] || 0, item.images.length - 1);
            const hasMultipleImages = item.images.length > 1;
            let touchStartX = 0;

            return (
              <div 
                key={itemKey}
                className="group cursor-pointer"
                role={interactive ? 'link' : undefined}
                tabIndex={interactive ? 0 : -1}
                aria-label={interactive ? `View ${item.title} styles` : `${item.title} preview`}
                onClick={() => {
                  if (interactive && item.slug) {
                    router.push(`/${item.slug}`);
                  }
                }}
                onKeyDown={(event) => {
                  if (interactive && (event.key === 'Enter' || event.key === ' ') && item.slug) {
                    event.preventDefault();
                    router.push(`/${item.slug}`);
                  }
                }}
              >
                {/* Image Container with Border */}
                <div className="relative mb-2 border border-[#2C1810] p-1.5 md:mb-3 md:border-2 md:border-black md:p-4">
                  <div 
                    className="aspect-[4/5] bg-neutral-200 overflow-hidden relative"
                    style={{ perspective: '1000px' }}
                    onTouchStart={(e) => {
                      touchStartX = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (hasMultipleImages) {
                        const touchEndX = e.changedTouches[0].clientX;
                        handleSwipe(index, itemKey, touchStartX, touchEndX);
                      }
                    }}
                  >
                    <div
                      className="w-full h-full transition-transform duration-600"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipping[itemKey] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {item.images && item.images.length > 0 && item.images[currentIndex] && !failedImages.has(item.images[currentIndex]) ? (
                        <Image
                          src={item.images[currentIndex].replace(/ /g, '%20')}
                          alt={`${item.title} ${currentIndex + 1}`}
                          fill
                          sizes="(max-width: 767px) 50vw, 25vw"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ backfaceVisibility: 'hidden' }}
                          onError={() => {
                            console.error('Image load error:', item.images[currentIndex]);
                            setFailedImages((previous) => new Set(previous).add(item.images[currentIndex]));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-sm">
                            Image unavailable
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation Arrows - Only show if multiple images */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={(e) => handlePrevImage(index, itemKey, e)}
                          className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-300 hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Previous ${item.title} image`}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => handleNextImage(index, itemKey, e)}
                          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-300 hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Next ${item.title} image`}
                        >
                          <ChevronRight size={20} />
                        </button>
                        
                        {/* Image Indicators */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {item.images.map((_, imgIndex) => (
                            <div
                              key={imgIndex}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                imgIndex === currentIndex 
                                  ? 'w-5 bg-white' 
                                  : 'w-1.5 bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Title - Outside Border */}
                <div className="mt-1 text-center">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-900 sm:text-[11px] md:text-[13px] md:tracking-[0.25em]">
                    {item.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>

        {collections.length > 0 && (
          <div className="mt-12 text-center md:mt-14">
            <Link
              href="/gallery"
              className="inline-block border-b border-[#2C1810] pb-1 text-[10px] font-medium uppercase tracking-[0.24em] text-[#2C1810] transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-4 md:text-[11px]"
            >
              View Full Gallery
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
