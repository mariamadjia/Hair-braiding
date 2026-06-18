'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function CategoryPageTemplate({ 
  categoryName, 
  categorySlug, 
  subcategories, 
  description = 'Choose a Style' 
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const style = params.get('style');
    if (style) {
      const category = subcategories.find((cat) => cat.slug === style);
      if (category) openModal(category, 0);
    }
  }, [subcategories]);

  const openModal = (category, imageIndex = 0) => {
    setSelectedCategory(category);
    setCurrentImageIndex(imageIndex);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setCurrentImageIndex(0);
  };

  const handlePrevImage = () => {
    if (selectedCategory) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedCategory.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedCategory) {
      setCurrentImageIndex((prev) => 
        prev === selectedCategory.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FFF5EE]">
        {/* Breadcrumb */}
        <div className="border-b border-[#2C1810]">
          <div className="container mx-auto px-6 md:px-8 lg:px-12 py-4">
            <button
              onClick={() => router.push('/gallery')}
              className="flex items-center gap-2 text-neutral-900 hover:text-neutral-600 transition-colors text-sm"
            >
              <ArrowLeft size={18} />
              <span className="uppercase tracking-wider">Back to Gallery</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 md:px-8 lg:px-12 py-10 md:py-14">
          {/* Title */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-[28px] md:text-[40px] font-light text-neutral-900 mb-2">
              {categoryName}
            </h1>
            <p className="text-sm text-neutral-600 uppercase tracking-wider">
              {description}
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {subcategories.map((category, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => openModal(category, 0)}
              >
                {/* Image Container with Border */}
                <div className="border-2 border-black p-4 mb-3 hover:border-neutral-600 transition-colors relative overflow-hidden">
                  <div className="aspect-[4/5] bg-neutral-200 overflow-hidden relative">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white text-sm uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-semibold">
                        Click to View
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mt-1">
                  <h3 className="text-[11px] md:text-[13px] uppercase tracking-[0.25em] text-neutral-900 font-semibold underline decoration-1 underline-offset-4 hover:decoration-2 transition-all mb-3">
                    {category.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/booking/${categorySlug}/${category.slug}`);
                    }}
                    className="inline-block bg-[#2C1810] text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold hover:bg-[#1a0f0a] transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for Image Viewing */}
        {isModalOpen && selectedCategory && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 text-white hover:text-gray-400 transition-colors z-20"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            {/* Modal Container */}
            <div className="bg-neutral-900/50 rounded-xl max-w-md w-full">
              {/* Header with Title */}
              <div className="flex items-center justify-center py-6 border-b border-white/10">
                <h2 className="text-base md:text-lg font-normal text-white">
                  {selectedCategory.name}
                </h2>
              </div>

              {/* Main Image Container */}
              <div className="p-4">
                <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden">
                {/* Main Image */}
                <img
                  src={selectedCategory.images[currentImageIndex]}
                  alt={`${selectedCategory.name} ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Navigation Arrows */}
                {selectedCategory.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}
                </div>
              </div>

              {/* Bottom Section - Thumbnails and Button */}
              <div className="pb-4 px-4">
              {/* Thumbnail Strip */}
              {selectedCategory.images.length > 1 && (
                <div className="flex gap-2 justify-center mb-4 overflow-x-auto pb-2">
                  {selectedCategory.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-14 h-16 rounded overflow-hidden ${
                        index === currentImageIndex
                          ? 'ring-2 ring-white'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Dot Indicators */}
              {selectedCategory.images.length > 1 && (
                <div className="flex gap-1.5 justify-center mb-6">
                  {selectedCategory.images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'w-6 bg-white'
                          : 'w-1.5 bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Book Now Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => router.push(`/booking/${categorySlug}/${selectedCategory.slug}`)}
                  className="bg-white text-black px-8 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-gray-100 transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
