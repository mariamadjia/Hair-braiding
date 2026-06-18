'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Gallery() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [isFlipping, setIsFlipping] = useState({});
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load collections from API
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const res = await fetch('/api/gallery-collections');
        const data = await res.json();
        if (data.collections) {
          setCollections(data.collections);
        }
      } catch (error) {
        console.error('Failed to load gallery collections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      collections.forEach((collection, index) => {
        if (collection.images.length > 1) {
          setIsFlipping(prev => ({ ...prev, [index]: true }));
          
          setTimeout(() => {
            setCurrentImageIndex(prev => {
              const currentIndex = prev[index] || 0;
              const newIndex = currentIndex === collection.images.length - 1 ? 0 : currentIndex + 1;
              return { ...prev, [index]: newIndex };
            });
            
            setTimeout(() => {
              setIsFlipping(prev => ({ ...prev, [index]: false }));
            }, 300);
          }, 300);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [collections]);

  const handlePrevImage = (collectionIndex, e) => {
    e.stopPropagation();
    const collection = collections[collectionIndex];
    const currentIndex = currentImageIndex[collectionIndex] || 0;
    const newIndex = currentIndex === 0 ? collection.images.length - 1 : currentIndex - 1;
    setCurrentImageIndex({ ...currentImageIndex, [collectionIndex]: newIndex });
  };

  const handleNextImage = (collectionIndex, e) => {
    e.stopPropagation();
    const collection = collections[collectionIndex];
    const currentIndex = currentImageIndex[collectionIndex] || 0;
    const newIndex = currentIndex === collection.images.length - 1 ? 0 : currentIndex + 1;
    setCurrentImageIndex({ ...currentImageIndex, [collectionIndex]: newIndex });
  };

  const handleSwipe = (collectionIndex, startX, endX) => {
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextImage(collectionIndex, { stopPropagation: () => {} });
      } else {
        handlePrevImage(collectionIndex, { stopPropagation: () => {} });
      }
    }
  };

  if (loading) {
    return (
      <section className="bg-[#FFF5EE] py-10 md:py-14 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-[#2C1810]"></div>
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 mb-2">
              Gallery
            </h2>
            <p className="text-[20px] md:text-[28px] font-light text-neutral-900">
              Our Work Collection
            </p>
          </div>
          <div className="text-center text-neutral-500">Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#FFF5EE] py-10 md:py-14 relative">
      {/* Horizontal Separator Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#2C1810]"></div>
      
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-900 mb-2">
            Gallery
          </h2>
          <p className="text-[20px] md:text-[28px] font-light text-neutral-900">
            Our Work Collection
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {collections.map((item, index) => {
            const currentIndex = currentImageIndex[index] || 0;
            const hasMultipleImages = item.images.length > 1;
            let touchStartX = 0;

            return (
              <div 
                key={index} 
                className="group cursor-pointer"
                onClick={() => {
                  if (item.slug) {
                    router.push(`/${item.slug}`);
                  }
                }}
              >
                {/* Image Container with Border */}
                <div className="border-2 border-black p-4 mb-3 relative">
                  <div 
                    className="aspect-[4/5] bg-neutral-200 overflow-hidden relative"
                    style={{ perspective: '1000px' }}
                    onTouchStart={(e) => {
                      touchStartX = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (hasMultipleImages) {
                        const touchEndX = e.changedTouches[0].clientX;
                        handleSwipe(index, touchStartX, touchEndX);
                      }
                    }}
                  >
                    <div
                      className="w-full h-full transition-transform duration-600"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipping[index] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {item.images && item.images.length > 0 && item.images[currentIndex] ? (
                        <img
                          src={item.images[currentIndex].replace(/ /g, '%20')}
                          alt={`${item.title} ${currentIndex + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ backfaceVisibility: 'hidden' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-sm">
                          No Images
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation Arrows - Only show if multiple images */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={(e) => handlePrevImage(index, e)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          aria-label="Previous image"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => handleNextImage(index, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          aria-label="Next image"
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
                                  ? 'w-6 bg-white' 
                                  : 'w-1.5 bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Title - Outside Border */}
                <div className="text-center mt-1">
                  <h3 className="text-[11px] md:text-[13px] uppercase tracking-[0.25em] text-neutral-900 font-semibold">
                    {item.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
