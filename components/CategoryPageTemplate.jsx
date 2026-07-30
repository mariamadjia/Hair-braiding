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

  useEffect(() => {
    if (!isModalOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeModal();
      if (event.key === 'ArrowLeft') handlePrevImage();
      if (event.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, selectedCategory]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F6F5F1]">
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
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-3 gap-y-6 md:gap-6 lg:grid-cols-3">
            {subcategories.map((category, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => openModal(category, 0)}
              >
                {/* Image Container with Border */}
                <div className="relative mb-2 overflow-hidden border border-[#2C1810] p-1.5 transition-colors hover:border-neutral-600 md:mb-3 md:border-2 md:border-black md:p-4">
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
                  <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-900 underline decoration-1 underline-offset-4 transition-all hover:decoration-2 md:text-[13px] md:tracking-[0.25em]">
                    {category.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/booking/${categorySlug}/${category.slug}`);
                    }}
                    className="inline-block bg-[#2C1810] px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1a0f0a] md:px-4 md:text-xs"
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
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-5 lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label={`${selectedCategory.name} photo viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
            <div className="relative my-auto w-full max-w-md overflow-hidden rounded-xl bg-[#F6F5F1] lg:grid lg:max-w-7xl lg:rounded-[5px] lg:border lg:border-[#D4BDAA] lg:bg-[#F8F1E8] lg:shadow-[0_30px_90px_rgba(0,0,0,0.45)] lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
              <button onClick={closeModal} className="absolute right-8 top-8 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F5F1]/95 text-[#161616] transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1810] lg:right-6 lg:top-6 lg:h-11 lg:w-11 lg:border lg:border-[#B8754E] lg:bg-[#FBF6EF]/95 lg:text-[#2C1810] lg:hover:bg-white lg:focus:ring-[#B8754E] lg:focus:ring-offset-2" aria-label="Close gallery viewer">
                <X size={18} />
              </button>

              <div className="border-b border-[#D8D5CF] px-6 pb-5 pt-6 pr-16 lg:hidden">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6B6864]">{categoryName} Styles</p>
                <h2 className="mt-3 font-serif text-[30px] leading-[1.05] tracking-[-0.02em] text-[#2C1810] sm:text-[32px]">
                  {selectedCategory.name}
                </h2>
              </div>

              <div className="border-b border-[#D8D5CF] p-5 pb-0 lg:border-b-0 lg:border-r lg:border-[#E3D4C8] lg:p-8">
                <div className="relative mx-auto aspect-[3/4] w-[78%] overflow-hidden bg-[#E8E5DF] lg:mx-0 lg:aspect-[5/4] lg:w-full lg:rounded-[3px] lg:bg-[#E8DED4]">
                  <img src={selectedCategory.images[currentImageIndex]} alt={`${selectedCategory.name} ${currentImageIndex + 1}`} className="h-full w-full object-cover lg:object-contain" />

                  {selectedCategory.images.length > 1 && (
                    <>
                      <button onClick={handlePrevImage} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#F6F5F1]/90 text-[#161616] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1810] lg:left-5 lg:h-11 lg:w-11 lg:border lg:border-[#B8754E] lg:bg-[#FBF6EF]/90 lg:text-[#B0633E] lg:hover:bg-white" aria-label="Previous image">
                        <ChevronLeft size={20} />
                      </button>
                      <button onClick={handleNextImage} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#F6F5F1]/90 text-[#161616] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1810] lg:right-5 lg:h-11 lg:w-11 lg:border lg:border-[#B8754E] lg:bg-[#FBF6EF]/90 lg:text-[#B0633E] lg:hover:bg-white" aria-label="Next image">
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex min-h-20 items-center gap-3 py-4 lg:mt-4 lg:min-h-16 lg:justify-between lg:gap-4 lg:py-0">
                  <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1 lg:justify-center">
                    {selectedCategory.images.length > 1 && selectedCategory.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-[3px] transition lg:h-20 lg:w-[72px] ${
                            index === currentImageIndex
                              ? 'ring-1 ring-[#2C1810] ring-offset-2 ring-offset-[#F6F5F1] lg:ring-2 lg:ring-[#B8754E] lg:ring-offset-[#F8F1E8]'
                              : 'opacity-65 hover:opacity-100'
                          }`}
                          aria-label={`View image ${index + 1} of ${selectedCategory.images.length}`}
                          aria-current={index === currentImageIndex ? 'true' : undefined}
                        >
                          <img src={image} alt={`${selectedCategory.name} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                    ))}
                  </div>
                  <p className="flex-shrink-0 pr-1 text-sm tracking-[0.08em] text-[#6B6864]">
                    <span className="lg:font-semibold lg:text-[#B0633E]">{String(currentImageIndex + 1).padStart(2, '0')}</span>
                    {' / '}
                    {String(selectedCategory.images.length).padStart(2, '0')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col px-5 pb-5 pt-6 lg:hidden">
                <button onClick={() => router.push(`/booking/${categorySlug}/${selectedCategory.slug}`)} className="mx-auto min-h-12 w-full max-w-[240px] bg-[#2C1810] px-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#45271B] focus:outline-none focus:ring-2 focus:ring-[#2C1810] focus:ring-offset-2">
                  Book This Style
                </button>
              </div>

              <div className="hidden min-h-0 flex-col justify-center px-12 py-16 lg:flex">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#B0633E]">{categoryName} Styles</p>
                <h2 className="mt-6 max-w-md font-serif text-6xl leading-[0.98] tracking-[-0.03em] text-[#2C1810]">
                  {selectedCategory.name}
                </h2>
                <span aria-hidden="true" className="mt-8 h-0.5 w-14 bg-[#B8754E]" />

                <p className="mt-16 text-sm tracking-[0.08em] text-[#5E4D44]">
                  <span className="font-semibold text-[#B0633E]">{String(currentImageIndex + 1).padStart(2, '0')}</span>
                  {' / '}
                  {String(selectedCategory.images.length).padStart(2, '0')}
                </p>
                <button onClick={() => router.push(`/booking/${categorySlug}/${selectedCategory.slug}`)} className="mt-6 min-h-14 w-full max-w-xs bg-[#2C1810] px-8 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#45271B] focus:outline-none focus:ring-2 focus:ring-[#B8754E] focus:ring-offset-2">
                  Book This Style
                </button>
                <button type="button" onClick={closeModal} className="mt-7 w-fit border-b border-[#B8754E] pb-1 text-sm text-[#4E3A31] transition-colors hover:text-[#B0633E]">
                  Back to {categoryName} Gallery
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
