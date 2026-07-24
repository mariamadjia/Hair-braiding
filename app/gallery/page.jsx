'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, SlidersHorizontal, X, Pencil } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterWrapper from '@/components/FooterWrapper';
import { toProxyUrl } from '@/lib/utils/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * @param {{
 *   editMode?: boolean,
 *   onEdit?: (item: any) => void,
 *   onDelete?: (item: any) => void,
 *   onToggleFeatured?: (item: any) => void,
 *   selectedItems?: string[],
 *   onToggleSelection?: (itemId: string) => void,
 * }} [props]
 */
export default function GalleryPage({ 
  editMode = false,
  onEdit = null,
  onDelete = null,
  onToggleFeatured = null,
  selectedItems = [],
  onToggleSelection = null
} = {}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [sortOrder, setSortOrder] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cardImageIndexes, setCardImageIndexes] = useState({});
  const [isFlipping, setIsFlipping] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [filtersReady, setFiltersReady] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const reduceMotion = useReducedMotion();
  const rotationTimers = useRef([]);
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('q') || '');
    setSelectedFilter(params.get('category') || 'All');
    setSelectedSubcategories(params.getAll('style'));
    setSortOrder(params.get('sort') || 'featured');
    setFiltersReady(true);
  }, []);

  // Fetch gallery images from backend
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const categoriesRes = await fetch(
          `${API_BASE_URL}/api/categories/gallery`
        );

        if (!categoriesRes.ok) {
          throw new Error("Failed to load Gallery categories");
        }

        const categoriesData = await categoriesRes.json();

        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Failed to load gallery:', error);
        setCategories([]);
        setLoadError('The gallery could not be loaded. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryData();
  }, [retryCount]);

  // Transform backend data into gallery format
  const galleryCategories = useMemo(() => categories.map((cat) => {
    const subcategoryData = (cat.subcategories || []).map((sub) => {
      const rawImages =
        Array.isArray(sub.images) && sub.images.length > 0
          ? sub.images
          : sub.image
            ? [sub.image]
            : [];

      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        rawImages,
        imageAltTexts: Array.isArray(sub.imageAltTexts) ? sub.imageAltTexts : rawImages.map(() => sub.name),
        image: rawImages[0] ? toProxyUrl(rawImages[0]) : "",
        images: rawImages.map(toProxyUrl),
      };
    });

    const fallbackImages = subcategoryData
      .flatMap((subcategory) => subcategory.rawImages)
      .filter(Boolean)
      .slice(0, 5);

    const rawCardImages =
      cat.flippingImages?.length > 0
        ? cat.flippingImages
        : fallbackImages;

    return {
      id: cat.id,
      displayOrder: cat.displayOrder ?? 0,
      slug: cat.slug,
      title: cat.name,
      image: rawCardImages[0] ? toProxyUrl(rawCardImages[0]) : "",
      images: rawCardImages.map(toProxyUrl),
      link: `/${cat.slug}`,
      tags: [cat.name],
      subcategoryData,
    };
  }).filter((category) =>
    category.images.length > 0 ||
    category.subcategoryData.some((subcategory) => subcategory.images.length > 0)
  ), [categories]);


  const displayItems = useMemo(() => {
    const sortItems = (items) => [...items].sort((a, b) => {
      if (sortOrder === 'newest') return (b.id ?? 0) - (a.id ?? 0);
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });

    // If subcategories are selected via checkboxes, show only those
    if (selectedSubcategories.length > 0) {
      return sortItems(selectedSubcategories.map((subcategoryId) => {
        // Parse the subcategoryId to get category and subcategory info
        const [categoryLink, queryString] = subcategoryId.split('?');
        const subcategorySlug = queryString.replace('style=', '');
        
        // Find the category
        const category = galleryCategories.find(cat => cat.link === categoryLink);
        if (!category) return null;
        
        // Find the subcategory
        const subcategory = category.subcategoryData.find(sub => sub.slug === subcategorySlug);
        if (!subcategory) return null;
        
        // Extract category name from link (e.g., '/box-braids' -> 'box-braids')
        const categorySlug = categoryLink.replace('/', '');
        
        return {
          id: subcategory.id,
          displayOrder: category.displayOrder,
          type: 'subcategory',
          title: subcategory.name,
          image: subcategory.image,
          images: subcategory.images || [subcategory.image],
          imageAltTexts: subcategory.imageAltTexts,
          link: subcategoryId,
          bookingLink: `/booking/${categorySlug}/${subcategorySlug}`,
          description: `${category.title} - ${subcategory.name}`,
          tags: category.tags,
        };
      }).filter(Boolean));
    }

    const matchesFilter = (cat) =>
      selectedFilter === 'All' || cat.tags.includes(selectedFilter);

    if (!searchQuery) {
      return sortItems(galleryCategories
        .filter(matchesFilter)
        .map((cat) => ({ 
          type: 'category', 
          ...cat,
          images: cat.images || cat.subcategoryData.map(sub => sub.image).slice(0, 4) // Use existing images or first 4 subcategory images for rotation
        })));
    }

    const searchLower = searchQuery.toLowerCase();
    const items = [];

    galleryCategories.forEach((category) => {
      if (!matchesFilter(category)) return;

      const matchesTitle =
        category.title.toLowerCase().includes(searchLower) ||
        (category.description && category.description.toLowerCase().includes(searchLower));

      if (matchesTitle) {
        items.push({ type: 'category', ...category });
        return;
      }

      // Check for matching subcategories
      const matchingSubcategories = category.subcategoryData.filter((sub) =>
        sub.name.toLowerCase().includes(searchLower)
      );

      // Add each matching subcategory as its own card
      matchingSubcategories.forEach((sub) => {
        const categorySlug = category.link.replace('/', '');
        items.push({
          type: 'subcategory',
          title: sub.name,
          image: sub.image,
          images: sub.images || [sub.image],
          imageAltTexts: sub.imageAltTexts,
          link: `${category.link}?style=${sub.slug}`,
          bookingLink: `/booking/${categorySlug}/${sub.slug}`,
          description: `${category.title} - ${sub.name}`,
          tags: category.tags,
          displayOrder: category.displayOrder,
        });
      });
    });

    return sortItems(items);
  }, [galleryCategories, selectedSubcategories, selectedFilter, sortOrder, searchQuery]);

  // Auto-rotate images for main category cards only
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      displayItems.forEach((item) => {
        const key = item.id ?? item.link;
        // Only rotate main category cards, not subcategories
        if (item.type === 'category' && item.images && item.images.length > 1) {
          setIsFlipping(prev => ({ ...prev, [key]: true }));
          
          const changeTimer = setTimeout(() => {
            setCardImageIndexes(prev => {
              const currentIndex = Math.min(prev[key] || 0, item.images.length - 1);
              const newIndex = currentIndex === item.images.length - 1 ? 0 : currentIndex + 1;
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
  }, [displayItems, reduceMotion]);

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedFilter !== 'All') params.set('category', selectedFilter);
    if (sortOrder !== 'featured') params.set('sort', sortOrder);
    selectedSubcategories.forEach((subcategory) => params.append('style', subcategory));
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/gallery?${query}` : '/gallery');
  }, [filtersReady, searchQuery, selectedFilter, sortOrder, selectedSubcategories]);

  useEffect(() => {
    if (!isModalOpen) return;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeModal();
      if (event.key === 'ArrowLeft') handlePrevImage();
      if (event.key === 'ArrowRight') handleNextImage();
      if (event.key === 'Tab') {
        const focusable = Array.from(modalRef.current?.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])') || []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus?.();
    };
  }, [isModalOpen, selectedCategory]);

  const toggleCategory = (categoryTitle) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle]
    }));
  };

  const toggleSubcategory = (categoryLink, subcategorySlug) => {
    const subcategoryId = `${categoryLink}?style=${subcategorySlug}`;
    setSelectedSubcategories(prev => {
      if (prev.includes(subcategoryId)) {
        return prev.filter(id => id !== subcategoryId);
      } else {
        return [...prev, subcategoryId];
      }
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('All');
    setSelectedSubcategories([]);
    setSortOrder('featured');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedFilter !== 'All' ||
    selectedSubcategories.length > 0 ||
    sortOrder !== 'featured';

  const renderFilters = () => (
    <>
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#2C1810]">
          Browse Styles
        </h2>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="text-[10px] font-semibold uppercase tracking-wider text-[#7A4935] underline underline-offset-4">
            Clear
          </button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <button
          onClick={() => { setSelectedFilter('All'); setSelectedSubcategories([]); }}
          className={`w-full rounded-lg px-4 py-2.5 text-left text-xs uppercase tracking-[0.12em] transition-all ${
            selectedFilter === 'All' && selectedSubcategories.length === 0
              ? 'bg-[#2C1810] font-semibold text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <span className="flex items-center justify-between"><span>All styles</span><span>{galleryCategories.length}</span></span>
        </button>

        {galleryCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            <div className={`flex items-center rounded-lg ${selectedFilter === category.title ? 'bg-[#2C1810] text-white' : 'hover:bg-neutral-50'}`}>
              <button
                onClick={() => { setSelectedFilter(category.title); setSelectedSubcategories([]); }}
                className="flex min-h-11 flex-1 items-center justify-between px-4 text-left text-xs uppercase tracking-[0.12em]"
              >
                <span>{category.title}</span>
                <span className={selectedFilter === category.title ? 'text-white/70' : 'text-neutral-400'}>{category.subcategoryData.length}</span>
              </button>
              {category.subcategoryData.length > 0 && (
                <button
                  onClick={() => toggleCategory(category.title)}
                  className="mr-1 flex h-10 w-10 items-center justify-center rounded-lg"
                  aria-expanded={Boolean(expandedCategories[category.title])}
                  aria-label={`${expandedCategories[category.title] ? 'Collapse' : 'Expand'} ${category.title}`}
                >
                  {expandedCategories[category.title] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
            </div>

            {expandedCategories[category.title] && (
              <div className="ml-3 space-y-1 border-l border-[#E4D8CE] pl-3">
                {category.subcategoryData.filter((sub) => sub.images.length > 0).map((sub) => {
                  const subcategoryId = `${category.link}?style=${sub.slug}`;
                  const isChecked = selectedSubcategories.includes(subcategoryId);
                  return (
                    <label key={sub.slug} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 text-[10px] uppercase tracking-wider transition ${isChecked ? 'bg-[#EFE5DC] text-[#2C1810]' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSubcategory(category.link, sub.slug)} className="h-4 w-4 rounded border-neutral-300 text-[#2C1810] focus:ring-[#2C1810]" />
                      <span className="flex-1">{sub.name}</span>
                      <span className="text-neutral-400">{sub.images.length}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-neutral-100 pt-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-500">
          {displayItems.length} {displayItems.length === 1 ? 'style' : 'styles'} found
        </p>
      </div>
    </>
  );

  const openModal = (item, imageIndex = 0) => {
    setSelectedCategory(item);
    setCurrentImageIndex(imageIndex);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setCurrentImageIndex(0);
  };

  const handlePrevImage = () => {
    if (selectedCategory && selectedCategory.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedCategory.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedCategory && selectedCategory.images) {
      setCurrentImageIndex((prev) => 
        prev === selectedCategory.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <>
      {!editMode && <Navbar />}
      <div className="min-h-screen bg-[#F6F5F1]">
        {/* Main Content with Sidebar and Gallery */}
        <div className="container mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar - Filters */}
            <aside className="hidden w-72 flex-shrink-0 lg:block">
              <div className="sticky top-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                {renderFilters()}
              </div>
            </aside>

            {/* Right Content - Search and Gallery */}
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative w-full xl:max-w-md">
                  <label htmlFor="gallery-search" className="sr-only">Search gallery styles</label>
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    id="gallery-search"
                    type="text"
                    placeholder="Search for a style..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none border border-neutral-200 focus:border-[#2C1810] transition-all shadow-sm focus:shadow-md rounded-xl text-sm"
                  />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMobileFiltersOpen(true)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider lg:hidden">
                      <SlidersHorizontal className="h-4 w-4" /> Filter & Sort
                    </button>
                    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-xs text-neutral-600 shadow-sm">
                      <span className="whitespace-nowrap font-semibold uppercase tracking-wider">Sort by</span>
                      <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="bg-transparent text-[#2C1810] outline-none">
                        <option value="featured">Featured</option>
                        <option value="newest">Newest</option>
                      </select>
                    </label>
                  </div>
                </div>

              </div>

              {/* Gallery Grid */}
              {loadError && (
                <div role="alert" className="mb-8 border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                  <p>{loadError}</p>
                  <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-3 min-h-11 border border-red-800 px-5 text-xs font-semibold uppercase tracking-wider">Retry</button>
                </div>
              )}
              {loading && (
                <div role="status" aria-label="Loading gallery" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="animate-pulse">
                      <div className="aspect-[4/5] border-2 border-neutral-200 bg-neutral-200" />
                      <div className="mx-auto mt-4 h-3 w-28 rounded bg-neutral-200" />
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayItems.map((item, index) => {
                  const itemKey = item.id ? `${item.type}-${item.id}` : item.link || `item-${index}`;
                  const isSubcategory = selectedSubcategories.length > 0 || item.type === 'subcategory';
                  
                  // For subcategories, always show the main image (first image)
                  // For categories, use rotation index
                  const stableKey = item.id ?? item.link;
                  const cardImageIndex = isSubcategory ? 0 : Math.min(cardImageIndexes[stableKey] || 0, Math.max(0, (item.images?.length || 1) - 1));
                  const currentImage = item.images && item.images.length > 0 
                    ? item.images[cardImageIndex] 
                    : item.image;
                  
                  const itemId = item.link || `item-${index}`;
                  const isSelected = selectedItems.includes(itemId);
                  
                  return (
                    <div
                      key={itemKey}
                      className="group cursor-pointer relative"
                      role="link"
                      tabIndex={0}
                      aria-label={`${isSubcategory ? 'View' : 'Explore'} ${item.title}`}
                      onClick={() => {
                        if (editMode) {
                          // In admin mode, open in new tab to avoid signing out
                          window.open(item.link, '_blank');
                        } else {
                          isSubcategory ? openModal(item, 0) : router.push(item.link);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        isSubcategory ? openModal(item, 0) : router.push(item.link);
                      }}
                    >
                      {/* Selection Checkbox (Edit Mode) */}
                      {editMode && onToggleSelection && (
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleSelection(itemId);
                            }}
                            className="h-5 w-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Edit Controls (Edit Mode) */}
                      {editMode && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          {onEdit && !isSubcategory && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                              }}
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-neutral-100 transition-colors"
                              title={`Edit ${item.title}`}
                              aria-label={`Edit ${item.title}`}
                            >
                              <Pencil className="h-4 w-4 text-neutral-700" />
                            </button>
                          )}
                          {onToggleFeatured && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFeatured(item);
                              }}
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-neutral-100 transition-colors"
                              title="Toggle Featured"
                            >
                              <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                              }}
                              className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Image Container with Border */}
                      <div className={`border-2 border-black p-4 mb-3 hover:border-neutral-600 transition-colors relative overflow-hidden ${isSelected ? 'ring-4 ring-blue-500' : ''}`}>
                        <div 
                          className="aspect-[4/5] bg-neutral-200 overflow-hidden relative"
                          style={{ perspective: '1000px' }}
                        >
                          <div
                            className="w-full h-full transition-transform duration-600"
                            style={{
                              transformStyle: 'preserve-3d',
                              transform: isFlipping[stableKey] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                            }}
                          >
                            {currentImage && !failedImages.has(currentImage) ? (
                              <Image
                                src={currentImage}
                                alt={item.title}
                                fill
                                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                style={{ backfaceVisibility: 'hidden' }}
                                onError={() => setFailedImages((previous) => new Set(previous).add(currentImage))}
                              />
                            ) : (
                              <div className="w-full h-full bg-neutral-300 flex items-center justify-center">
                                <span className="text-neutral-500 text-sm">Image unavailable</span>
                              </div>
                            )}
                          </div>
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                            <span className="text-white text-sm uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-semibold">
                              {isSubcategory ? 'Click to View' : 'View Gallery'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Title and Button */}
                      <div className="text-center mt-1">
                        <h3 className={`uppercase tracking-[0.25em] text-neutral-900 font-semibold mb-3 ${
                          isSubcategory 
                            ? 'text-[11px] md:text-[13px] underline decoration-1 underline-offset-4 hover:decoration-2 transition-all' 
                            : 'text-[13px] md:text-[15px] mb-2'
                        }`}>
                          {item.title}
                        </h3>
                        
                        {!isSubcategory && (
                          <p className="text-xs text-neutral-600 mb-4">
                            {item.description}
                          </p>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editMode) {
                              // In admin mode, open in new tab to avoid signing out
                              window.open(isSubcategory && item.bookingLink ? item.bookingLink : item.link, '_blank');
                            } else {
                              router.push(isSubcategory && item.bookingLink ? item.bookingLink : item.link);
                            }
                          }}
                          className="inline-block bg-[#2C1810] text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold hover:bg-[#1a0f0a] transition-colors"
                        >
                          {isSubcategory ? 'Book Now' : 'Explore'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!loading && !loadError && displayItems.length === 0 && (
                <div className="border border-neutral-200 bg-white p-10 text-center">
                  <h2 className="text-lg font-medium text-[#2C1810]">No styles found</h2>
                  <p className="mt-2 text-sm text-neutral-600">Try a different search or clear your selected filters.</p>
                  <button type="button" onClick={clearFilters} className="mt-5 min-h-11 bg-[#2C1810] px-6 text-xs font-semibold uppercase tracking-wider text-white">Clear filters</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/45 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-gallery-filters" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false); }}>
            <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-white px-5 pb-7 pt-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="mobile-gallery-filters" className="font-serif text-2xl text-[#2C1810]">Filter & Sort</h2>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100" aria-label="Close filters"><X className="h-5 w-5" /></button>
              </div>
              <label className="mb-5 block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Sort by
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm font-normal normal-case tracking-normal text-[#2C1810]">
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              {renderFilters()}
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="sticky bottom-0 mt-6 min-h-12 w-full rounded-lg bg-[#2C1810] px-5 text-xs font-semibold uppercase tracking-[0.15em] text-white">
                Show {displayItems.length} results
              </button>
            </div>
          </div>
        )}

        {/* Modal for Image Viewing */}
        {isModalOpen && selectedCategory && (
          <div ref={modalRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="gallery-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
            {/* Close Button */}
            <button
              onClick={closeModal}
              ref={closeButtonRef}
              className="absolute top-6 right-6 text-white hover:text-gray-400 transition-colors z-20"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            {/* Modal Container */}
            <div className="bg-neutral-900/50 rounded-xl max-w-md w-full">
              {/* Header with Title */}
              <div className="flex items-center justify-center py-6 border-b border-white/10">
                  <h2 id="gallery-dialog-title" className="text-base md:text-lg font-normal text-white">
                  {selectedCategory.title}
                </h2>
              </div>

              {/* Main Image Container */}
              <div className="p-4">
                <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden">
                {/* Main Image */}
                {!failedImages.has(selectedCategory.images[currentImageIndex]) ? <Image
                  src={selectedCategory.images[currentImageIndex]}
                  alt={selectedCategory.imageAltTexts?.[currentImageIndex] || `${selectedCategory.title} hairstyle ${currentImageIndex + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 448px"
                  className="w-full h-full object-cover"
                  onError={() => setFailedImages((previous) => new Set(previous).add(selectedCategory.images[currentImageIndex]))}
                /> : <div className="flex h-full items-center justify-center text-sm text-white">Image unavailable</div>}

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
                      className={`relative flex-shrink-0 w-14 h-16 rounded overflow-hidden ${
                        index === currentImageIndex
                          ? 'ring-2 ring-white'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={selectedCategory.imageAltTexts?.[index] || `${selectedCategory.title} thumbnail ${index + 1}`}
                        fill
                        sizes="56px"
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
                  onClick={() => router.push(selectedCategory.bookingLink ?? selectedCategory.link)}
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
      <div className="mt-16 md:mt-24">
        <FooterWrapper />
      </div>
    </>
  );
}
