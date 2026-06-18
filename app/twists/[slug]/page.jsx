'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';

const twistCategoriesData = {
  '2-strands-twists': {
    name: '2-Strands Twists',
    images: [
      '/Gallery/Twists/2-strands-twists/IMG_9101.jpg',
      '/Gallery/Twists/2-strands-twists/IMG_9102.jpg',
    ],
  },
  'bohemian-marley-twists': {
    name: 'Bohemian Marley Twists',
    images: ['/Gallery/Twists/Bohemian-marley twists/IMG_9054.jpg'],
  },
  'havana-marley-twists': {
    name: 'Havana Marley Twists',
    images: ['/Gallery/Twists/Havana-marley-twists/IMG_9048.jpg'],
  },
  'islands-twists': {
    name: 'Islands Twists',
    images: ['/Gallery/Twists/Islands-Twists/IMG_9052.jpg'],
  },
  'kinky-twists': {
    name: 'Kinky Twists',
    images: ['/Gallery/Twists/kinky-twists/IMG_1602.JPG'],
  },
  'passion-twists': {
    name: 'Passion Twists',
    images: [
      '/Gallery/Twists/passion-twists/IMG_9049.jpg',
      '/Gallery/Twists/passion-twists/IMG_9105.jpg',
      '/Gallery/Twists/passion-twists/IMG_9106.jpg',
      '/Gallery/Twists/passion-twists/IMG_9126.jpg',
    ],
  },
  'senegalese-twists': {
    name: 'Senegalese Twists',
    images: [
      '/Gallery/Twists/senegalese-twists /IMG_9111.jpg',
      '/Gallery/Twists/senegalese-twists /IMG_9120.jpg',
      '/Gallery/Twists/senegalese-twists /IMG_9121.jpg',
      '/Gallery/Twists/senegalese-twists /IMG_9122.jpg',
    ],
  },
  'spring-twists': {
    name: 'Spring Twists',
    images: [
      '/Gallery/Twists/spring-twists/IMG_9123.jpg',
      '/Gallery/Twists/spring-twists/IMG_9124.jpg',
      '/Gallery/Twists/spring-twists/IMG_9125.jpg',
    ],
  },
};

export default function TwistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  const category = twistCategoriesData[slug];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5EE]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <button
            onClick={() => router.push('/twists')}
            className="text-blue-600 hover:underline"
          >
            Return to Twists
          </button>
        </div>
      </div>
    );
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? category.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === category.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleModalPrev = () => {
    setModalImageIndex((prev) => 
      prev === 0 ? category.images.length - 1 : prev - 1
    );
  };

  const handleModalNext = () => {
    setModalImageIndex((prev) => 
      prev === category.images.length - 1 ? 0 : prev + 1
    );
  };

  const openModal = (index) => {
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FFF5EE]">
        {/* Breadcrumb */}
        <div className="border-b border-[#2C1810]">
          <div className="container mx-auto px-6 md:px-8 lg:px-12 py-4">
            <button
              onClick={() => router.push('/twists')}
              className="flex items-center gap-2 text-neutral-900 hover:text-neutral-600 transition-colors text-sm"
            >
              <ArrowLeft size={18} />
              <span className="uppercase tracking-wider">Back to Twists</span>
            </button>
          </div>
        </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 md:px-8 lg:px-12 py-10 md:py-14">
        {/* Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-[28px] md:text-[40px] font-light text-neutral-900 mb-2">
            {category.name}
          </h1>
          <p className="text-sm text-neutral-600 uppercase tracking-wider">
            {category.images.length} {category.images.length === 1 ? 'Image' : 'Images'}
          </p>
        </div>

        {/* Main Image Display */}
        {category.images.length > 0 && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="relative border-2 border-black p-6">
              <div className="aspect-[4/5] bg-neutral-200 overflow-hidden relative">
                <img
                  src={category.images[currentImageIndex]}
                  alt={`${category.name} ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => openModal(currentImageIndex)}
                />
                
                {/* Navigation Arrows */}
                {category.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-3 rounded-full transition-all"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-3 rounded-full transition-all"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>
              
              {/* Image Counter */}
              {category.images.length > 1 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-neutral-600">
                    {currentImageIndex + 1} / {category.images.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thumbnail Grid */}
        {category.images.length > 1 && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-sm uppercase tracking-wider text-neutral-900 mb-6">
              All Images
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {category.images.map((image, index) => (
                <div
                  key={index}
                  className={`border-2 p-2 cursor-pointer transition-all ${
                    index === currentImageIndex
                      ? 'border-black'
                      : 'border-neutral-300 hover:border-neutral-500'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <div className="aspect-[4/5] bg-neutral-200 overflow-hidden">
                    <img
                      src={image}
                      alt={`${category.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Full-Screen View */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <X size={32} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={category.images[modalImageIndex]}
              alt={`${category.name} ${modalImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {category.images.length > 1 && (
              <>
                <button
                  onClick={handleModalPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  onClick={handleModalNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {modalImageIndex + 1} / {category.images.length}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
