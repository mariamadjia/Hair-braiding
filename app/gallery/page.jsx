'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cardImageIndexes, setCardImageIndexes] = useState({});
  const [isFlipping, setIsFlipping] = useState({});
  const [galleryImages, setGalleryImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch gallery images from backend
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        setLoading(true);
        const [imagesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/gallery`),
          fetch(`${API_BASE_URL}/api/categories`)
        ]);
        
        const images = await imagesRes.json();
        const categoriesData = await categoriesRes.json();
        
        setGalleryImages(images);
        setCategories(categoriesData.categories || []);
      } catch (error) {
        console.error('Failed to load gallery:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryData();
  }, []);

  const filterOptions = [
    'All',
    'Braids',
    'Twists',
    'Locs',
    'Crochet',
    'Protective Styles',
  ];

  // Transform backend data into gallery format
  const galleryCategories = categories.map(cat => {
    const categoryImages = galleryImages.filter(img => img.categoryId === cat.id);
    
    // Use actual subcategories from category data, enhanced with gallery images
    const subcategoryData = (cat.subcategories || []).map(sub => {
      // Find gallery images for this subcategory
      const subImages = categoryImages.filter(img => img.subcategoryId === sub.id);
      
      // Prioritize: subcategory.images > gallery images > single subcategory.image
      const imageArray = (sub.images && sub.images.length > 0) 
        ? sub.images 
        : (subImages.length > 0 ? subImages.map(img => img.imageUrl) : (sub.image ? [sub.image] : []));
      
      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        image: imageArray[0] || sub.image || (subImages[0] ? subImages[0].imageUrl : null),
        images: imageArray
      };
    });
    
    // Use flipping images from backend, or fallback to first 5 images
    const flippingImages = cat.flippingImages && cat.flippingImages.length > 0
      ? cat.flippingImages
      : categoryImages.slice(0, 5).map(img => img.imageUrl);
    const firstImage = categoryImages[0];
    
    return {
      id: cat.id,
      slug: cat.slug,
      title: cat.name,
      image: firstImage ? firstImage.imageUrl : cat.image,
      images: flippingImages.length > 0 ? flippingImages : (firstImage ? [firstImage.imageUrl] : []), // Images for flipping
      link: `/${cat.slug}`,
      tags: [cat.name, 'Protective Styles'],
      subcategoryData
    };
  });

  const fallbackGalleryCategories = [
    {
      title: 'Twists',
      image: '/Gallery/Twists/IMG_1585.JPG',
      link: '/twists',
      tags: ['Twists', 'Protective Styles'],
      subcategoryData: [
        { name: '2-Strands Twists', slug: '2-strands-twists', image: '/Gallery/Twists/2-strands-twists/IMG_9101.jpg', images: ['/Gallery/Twists/2-strands-twists/IMG_9101.jpg', '/Gallery/Twists/2-strands-twists/IMG_9102.jpg'] },
        { name: 'Bohemian Marley Twists', slug: 'bohemian-marley-twists', image: '/Gallery/Twists/Bohemian-marley twists/IMG_9054.jpg', images: ['/Gallery/Twists/Bohemian-marley twists/IMG_9054.jpg'] },
        { name: 'Havana Marley Twists', slug: 'havana-marley-twists', image: '/Gallery/Twists/Havana-marley-twists/IMG_9048.jpg', images: ['/Gallery/Twists/Havana-marley-twists/IMG_9048.jpg'] },
        { name: 'Islands Twists', slug: 'islands-twists', image: '/Gallery/Twists/Islands-Twists/IMG_9052.jpg', images: ['/Gallery/Twists/Islands-Twists/IMG_9052.jpg'] },
        { name: 'Kinky Twists', slug: 'kinky-twists', image: '/Gallery/Twists/kinky-twists/IMG_1602.JPG', images: ['/Gallery/Twists/kinky-twists/IMG_1602.JPG'] },
        { name: 'Passion Twists', slug: 'passion-twists', image: '/Gallery/Twists/passion-twists/IMG_9049.jpg', images: ['/Gallery/Twists/passion-twists/IMG_9049.jpg', '/Gallery/Twists/passion-twists/IMG_9105.jpg', '/Gallery/Twists/passion-twists/IMG_9106.jpg', '/Gallery/Twists/passion-twists/IMG_9126.jpg'] },
        { name: 'Senegalese Twists', slug: 'senegalese-twists', image: '/Gallery/Twists/senegalese-twists /IMG_9111.jpg', images: ['/Gallery/Twists/senegalese-twists /IMG_9111.jpg', '/Gallery/Twists/senegalese-twists /IMG_9120.jpg', '/Gallery/Twists/senegalese-twists /IMG_9121.jpg', '/Gallery/Twists/senegalese-twists /IMG_9122.jpg'] },
        { name: 'Spring Twists', slug: 'spring-twists', image: '/Gallery/Twists/spring-twists/IMG_9123.jpg', images: ['/Gallery/Twists/spring-twists/IMG_9123.jpg', '/Gallery/Twists/spring-twists/IMG_9124.jpg', '/Gallery/Twists/spring-twists/IMG_9125.jpg'] },
      ],
    },
    {
      title: 'Box Braids',
      image: '/Gallery/Box-Braids /IMG_9170.jpg',
      link: '/box-braids',
      tags: ['Braids', 'Protective Styles'],
      subcategoryData: [
        { name: 'Classic Box Braids', slug: 'classic-box-braids', image: '/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg', images: ['/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg', '/Gallery/Box-Braids /Box-Braids/IMG_9178.jpg', '/Gallery/Box-Braids /Box-Braids/IMG_9179.jpg', '/Gallery/Box-Braids /Box-Braids/IMG_9183.jpg'] },
        { name: 'Knotless', slug: 'knotless', image: '/Gallery/Box-Braids /knotless/IMG_9219.jpg', images: ['/Gallery/Box-Braids /knotless/IMG_9219.jpg', '/Gallery/Box-Braids /knotless/IMG_9220.jpg', '/Gallery/Box-Braids /knotless/IMG_9221.jpg', '/Gallery/Box-Braids /knotless/IMG_9222.jpg', '/Gallery/Box-Braids /knotless/IMG_9223.jpg'] },
        { name: 'Goddess Braids', slug: 'goddess-braids', image: '/Gallery/Box-Braids /goddess braids/IMG_9174.jpg', images: ['/Gallery/Box-Braids /goddess braids/IMG_9174.jpg', '/Gallery/Box-Braids /goddess braids/IMG_9175.jpg', '/Gallery/Box-Braids /goddess braids/IMG_9180.jpg', '/Gallery/Box-Braids /goddess braids/IMG_9220.jpg'] },
        { name: 'Bohemian French Curl', slug: 'bohemian-french-curl', image: '/Gallery/Box-Braids /Bohemian french curl/IMG_9190.jpg', images: ['/Gallery/Box-Braids /Bohemian french curl/IMG_9190.jpg', '/Gallery/Box-Braids /Bohemian french curl/IMG_9191.jpg', '/Gallery/Box-Braids /Bohemian french curl/IMG_9199.jpg'] },
        { name: 'French Curls', slug: 'french-curls', image: '/Gallery/Box-Braids /French curls/IMG_7654.JPEG', images: ['/Gallery/Box-Braids /French curls/IMG_7654.JPEG'] },
        { name: 'Bohemian', slug: 'bohemian', image: '/Gallery/Box-Braids /Bohemian/IMG_9207.jpg', images: ['/Gallery/Box-Braids /Bohemian/IMG_9207.jpg', '/Gallery/Box-Braids /Bohemian/IMG_9208.jpg', '/Gallery/Box-Braids /Bohemian/IMG_9213.jpg', '/Gallery/Box-Braids /Bohemian/IMG_9214.jpg', '/Gallery/Box-Braids /Bohemian/IMG_9216.jpg'] },
        { name: 'Bora Bora', slug: 'bora-bora', image: '/Gallery/Box-Braids /bora bora/IMG_9180.jpg', images: ['/Gallery/Box-Braids /bora bora/IMG_9180.jpg', '/Gallery/Box-Braids /bora bora/IMG_9181.jpg', '/Gallery/Box-Braids /bora bora/IMG_9189.jpg', '/Gallery/Box-Braids /bora bora/IMG_9190.jpg', '/Gallery/Box-Braids /bora bora/IMG_9191.jpg'] },
      ],
    },
    {
      title: 'Conrows',
      image: '/Gallery/Conrows/IMG_9321.jpg',
      link: '/conrows',
      tags: ['Braids', 'Protective Styles'],
      subcategoryData: [
        { name: 'Feedin Conrows', slug: 'feedin-conrows', image: '/Gallery/Conrows/Feedin Conrows/IMG_9325.jpg', images: ['/Gallery/Conrows/Feedin Conrows/IMG_9325.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9324.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9323.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_0112.JPG', '/Gallery/Conrows/Feedin Conrows/IMG_9304.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9305.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9310.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9311.jpg', '/Gallery/Conrows/Feedin Conrows/IMG_9312.jpg'] },
        { name: 'Flip-Over Conrows', slug: 'flip-over-conrows', image: '/Gallery/Conrows/Flip-Over Conrows/IMG_9316.jpg', images: ['/Gallery/Conrows/Flip-Over Conrows/IMG_9316.jpg', '/Gallery/Conrows/Flip-Over Conrows/IMG_9317.jpg'] },
        { name: 'Half-Half Conrows', slug: 'half-half-conrows', image: '/Gallery/Conrows/Half-Half Conrows/IMG_9303.jpg', images: ['/Gallery/Conrows/Half-Half Conrows/IMG_9303.jpg', '/Gallery/Conrows/Half-Half Conrows/IMG_9306.jpg', '/Gallery/Conrows/Half-Half Conrows/IMG_9307.jpg', '/Gallery/Conrows/Half-Half Conrows/IMG_9320.jpg', '/Gallery/Conrows/Half-Half Conrows/IMG_9321.jpg', '/Gallery/Conrows/Half-Half Conrows/IMG.JPEG'] },
        { name: 'Straight Back', slug: 'straight-back', image: '/Gallery/Conrows/Straight Back/IMG_1593.JPG', images: ['/Gallery/Conrows/Straight Back/IMG_1593.JPG', '/Gallery/Conrows/Straight Back/IMG_9299.jpg', '/Gallery/Conrows/Straight Back/IMG_9300.jpg', '/Gallery/Conrows/Straight Back/IMG_9301.jpg'] },
        { name: 'Updo Ponytail', slug: 'updo-ponytail', image: '/Gallery/Conrows/Updo Ponytail/IMG_9297.JPG', images: ['/Gallery/Conrows/Updo Ponytail/IMG_2688.JPG', '/Gallery/Conrows/Updo Ponytail/IMG_1296.JPG', '/Gallery/Conrows/Updo Ponytail/IMG_1556.JPG', '/Gallery/Conrows/Updo Ponytail/IMG_1570.JPG', '/Gallery/Conrows/Updo Ponytail/IMG_1594.JPG', '/Gallery/Conrows/Updo Ponytail/IMG_9295.jpg', '/Gallery/Conrows/Updo Ponytail/IMG_9296.jpg', '/Gallery/Conrows/Updo Ponytail/IMG_9297.jpg', '/Gallery/Conrows/Updo Ponytail/IMG_9308.jpg', '/Gallery/Conrows/Updo Ponytail/IMG_9309.jpg'] },
      ],
    },
    {
      title: 'Miracle Knots',
      image: '/Gallery/Miracle-knots/Miracle-weaves/IMG_9365.jpg',
      link: '/miracle-knots',
      tags: ['Braids', 'Protective Styles'],
      subcategoryData: [
        { name: 'Miracle Weaves', slug: 'miracle-weaves', image: '/Gallery/Miracle-knots/Miracle-weaves/IMG_9365.jpg', images: ['/Gallery/Miracle-knots/Miracle-weaves/IMG_9365.jpg', '/Gallery/Miracle-knots/Miracle-weaves/IMG_9362.jpg'] },
        { name: 'Magic Knots', slug: 'magic-knots', image: '/Gallery/Miracle-knots/Magic-knots/IMG_9355.jpg', images: ['/Gallery/Miracle-knots/Magic-knots/IMG_9355.jpg', '/Gallery/Miracle-knots/Magic-knots/IMG_9356.jpg', '/Gallery/Miracle-knots/Magic-knots/IMG_9354.jpg', '/Gallery/Miracle-knots/Magic-knots/IMG_9353.jpg'] },
      ],
    },
    {
      title: 'Crochets',
      image: '/Gallery/Crochets/Single/IMG_9381.jpg',
      link: '/crochets',
      tags: ['Crochet', 'Protective Styles'],
      subcategoryData: [
        { name: 'Single', slug: 'single', image: '/Gallery/Crochets/Single/IMG_9381.jpg', images: ['/Gallery/Crochets/Single/IMG_9381.jpg', '/Gallery/Crochets/Single/IMG_9380.jpg', '/Gallery/Crochets/Single/IMG_9382.jpg'] },
        { name: 'Pre-Braided', slug: 'pre-braided', image: '/Gallery/Crochets/pre-braided/IMG_9367.jpg', images: ['/Gallery/Crochets/pre-braided/IMG_9367.jpg', '/Gallery/Crochets/pre-braided/IMG_9372.jpg', '/Gallery/Crochets/pre-braided/IMG_9373.jpg', '/Gallery/Crochets/pre-braided/IMG_9374.jpg'] },
        { name: 'Loose Hair', slug: 'loose-hair', image: '/Gallery/Crochets/Loose hair/IMG_9366.jpg', images: ['/Gallery/Crochets/Loose hair/IMG_9366.jpg'] },
        { name: 'Pre-Twisted', slug: 'pre-twisted', image: '/Gallery/Crochets/pre-twisted/IMG_9375.jpg', images: ['/Gallery/Crochets/pre-twisted/IMG_9375.jpg'] },
        { name: 'Half & Half Crochet with Braids', slug: 'half-half-crochet-braids', image: '/Gallery/Crochets/half&half crochet with braids/IMG_9383.jpg', images: ['/Gallery/Crochets/half&half crochet with braids/IMG_9383.jpg', '/Gallery/Crochets/half&half crochet with braids/IMG_9384.jpg'] },
      ],
    },
    {
      title: 'Locs',
      image: '/Gallery/Locs/Butterfly/IMG_9387.jpg',
      link: '/locs',
      tags: ['Locs', 'Protective Styles'],
      subcategoryData: [
        { name: 'Butterfly', slug: 'butterfly', image: '/Gallery/Locs/Butterfly/IMG_9387.jpg', images: ['/Gallery/Locs/Butterfly/IMG_9387.jpg'] },
        { name: 'Soft', slug: 'soft', image: '/Gallery/Locs/Soft/IMG_9385.jpg', images: ['/Gallery/Locs/Soft/IMG_9385.jpg', '/Gallery/Locs/Soft/IMG_9386.jpg'] },
      ],
    },
    {
      title: 'Men',
      image: '/Gallery/Men/2-stranded-twist/IMG_0133.JPG',
      link: '/men',
      tags: ['Twists', 'Braids', 'Protective Styles'],
      images: ['/Gallery/Men/2-stranded-twist/IMG_0133.JPG', '/Gallery/Men/Conrows/IMG_9419.jpg'],
      subcategoryData: [
        { name: '2-Stranded Twist', slug: '2-stranded-twist', image: '/Gallery/Men/2-stranded-twist/IMG_0133.JPG', images: ['/Gallery/Men/2-stranded-twist/IMG_0133.JPG', '/Gallery/Men/2-stranded-twist/IMG_9450.jpg'] },
        { name: 'Conrows', slug: 'conrows', image: '/Gallery/Men/Conrows/IMG_9419.jpg', images: ['/Gallery/Men/Conrows/IMG_9419.jpg', '/Gallery/Men/Conrows/IMG_9444.jpg', '/Gallery/Men/Conrows/IMG_9445.jpg', '/Gallery/Men/Conrows/IMG_9446.jpg', '/Gallery/Men/Conrows/IMG_9447.jpg'] },
      ],
    },
  ];

  const getDisplayItems = () => {
    // If subcategories are selected via checkboxes, show only those
    if (selectedSubcategories.length > 0) {
      return selectedSubcategories.map((subcategoryId) => {
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
          type: 'subcategory',
          title: subcategory.name,
          image: subcategory.image,
          images: subcategory.images || [subcategory.image],
          link: subcategoryId,
          bookingLink: `/booking/${categorySlug}/${subcategorySlug}`,
          description: `${category.title} - ${subcategory.name}`,
          tags: category.tags,
        };
      }).filter(Boolean);
    }

    const matchesFilter = (cat) => selectedFilter === 'All' || cat.tags.includes(selectedFilter);

    if (!searchQuery) {
      return galleryCategories
        .filter(matchesFilter)
        .map((cat) => ({ 
          type: 'category', 
          ...cat,
          images: cat.images || cat.subcategoryData.map(sub => sub.image).slice(0, 4) // Use existing images or first 4 subcategory images for rotation
        }));
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
          link: `${category.link}?style=${sub.slug}`,
          bookingLink: `/booking/${categorySlug}/${sub.slug}`,
          description: `${category.title} - ${sub.name}`,
          tags: category.tags,
        });
      });
    });

    return items;
  };

  const displayItems = getDisplayItems();

  // Auto-rotate images for main category cards only
  useEffect(() => {
    const interval = setInterval(() => {
      displayItems.forEach((item, index) => {
        // Only rotate main category cards, not subcategories
        if (item.type === 'category' && item.images && item.images.length > 1) {
          setIsFlipping(prev => ({ ...prev, [index]: true }));
          
          setTimeout(() => {
            setCardImageIndexes(prev => {
              const currentIndex = prev[index] || 0;
              const newIndex = currentIndex === item.images.length - 1 ? 0 : currentIndex + 1;
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
  }, [displayItems]);

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
      <div className="min-h-screen bg-[#FFF5EE]">
        {/* Main Content with Sidebar and Gallery */}
        <div className="container mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar - Filters */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-[#2C1810] mb-5 uppercase tracking-[0.15em] pb-3 border-b border-neutral-100">
                  Filters
                </h2>
                
                {/* Filter Options */}
                <div className="space-y-2">
                  {/* All Filter */}
                  <button
                    onClick={() => setSelectedFilter('All')}
                    className={`w-full text-left px-4 py-2.5 text-xs uppercase tracking-[0.12em] transition-all rounded-lg ${
                      selectedFilter === 'All'
                        ? 'bg-[#2C1810] text-white font-semibold shadow-sm'
                        : 'bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    All
                  </button>

                  {/* Category Filters with Subcategories */}
                  {galleryCategories.map((category) => (
                    <div key={category.title} className="space-y-1">
                      {/* Main Category Button */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedFilter(category.title)}
                          className={`flex-1 text-left px-4 py-2.5 text-xs uppercase tracking-[0.12em] transition-all rounded-lg ${
                            selectedFilter === category.title
                              ? 'bg-[#2C1810] text-white font-semibold shadow-sm'
                              : 'bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                          }`}
                        >
                          {category.title}
                        </button>
                        
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleCategory(category.title)}
                          className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                          aria-label={expandedCategories[category.title] ? 'Collapse' : 'Expand'}
                        >
                          {expandedCategories[category.title] ? (
                            <Minus size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </button>
                      </div>

                      {/* Subcategories */}
                      {expandedCategories[category.title] && (
                        <div className="ml-4 space-y-1 mt-1">
                          {category.subcategoryData.map((sub) => {
                            const subcategoryId = `${category.link}?style=${sub.slug}`;
                            const isChecked = selectedSubcategories.includes(subcategoryId);
                            
                            return (
                              <label
                                key={sub.slug}
                                className="flex items-center gap-2 px-3 py-2 text-[10px] text-neutral-600 hover:bg-neutral-50 rounded-md transition-all cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSubcategory(category.link, sub.slug)}
                                  className="w-3.5 h-3.5 rounded border-neutral-300 text-[#2C1810] focus:ring-[#2C1810] focus:ring-offset-0 cursor-pointer"
                                />
                                <span className="uppercase tracking-wider group-hover:text-neutral-900">
                                  {sub.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Protective Styles Filter */}
                  <button
                    onClick={() => setSelectedFilter('Protective Styles')}
                    className={`w-full text-left px-4 py-2.5 text-xs uppercase tracking-[0.12em] transition-all rounded-lg ${
                      selectedFilter === 'Protective Styles'
                        ? 'bg-[#2C1810] text-white font-semibold shadow-sm'
                        : 'bg-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    Protective Styles
                  </button>
                </div>

                {/* Results Count */}
                <div className="mt-6 pt-5 border-t border-neutral-100">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-[0.15em] font-medium">
                    {displayItems.length} {displayItems.length === 1 ? 'Style' : 'Styles'} Found
                  </p>
                </div>
              </div>
            </aside>

            {/* Right Content - Search and Gallery */}
            <div className="flex-1">
              {/* Search Bar */}
              <div className="mb-8 max-w-md">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search for a style..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none border border-neutral-200 focus:border-[#2C1810] transition-all shadow-sm focus:shadow-md rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayItems.map((item, index) => {
                  const isSubcategory = selectedSubcategories.length > 0 || item.type === 'subcategory';
                  
                  // For subcategories, always show the main image (first image)
                  // For categories, use rotation index
                  const cardImageIndex = isSubcategory ? 0 : (cardImageIndexes[index] || 0);
                  const currentImage = item.images && item.images.length > 0 
                    ? item.images[cardImageIndex] 
                    : item.image;
                  
                  const itemId = item.link || `item-${index}`;
                  const isSelected = selectedItems.includes(itemId);
                  
                  return (
                    <div
                      key={index}
                      className="group cursor-pointer relative"
                      onClick={() => {
                        if (editMode) {
                          // In admin mode, open in new tab to avoid signing out
                          window.open(item.link, '_blank');
                        } else {
                          isSubcategory ? openModal(item, 0) : router.push(item.link);
                        }
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
                              transform: isFlipping[index] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                            }}
                          >
                            {currentImage ? (
                              <img
                                src={currentImage}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                style={{ backfaceVisibility: 'hidden' }}
                              />
                            ) : (
                              <div className="w-full h-full bg-neutral-300 flex items-center justify-center">
                                <span className="text-neutral-500 text-sm">No image</span>
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
            </div>
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
                  {selectedCategory.title}
                </h2>
              </div>

              {/* Main Image Container */}
              <div className="p-4">
                <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden">
                {/* Main Image */}
                <img
                  src={selectedCategory.images[currentImageIndex]}
                  alt={`${selectedCategory.title} ${currentImageIndex + 1}`}
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
                  onClick={() => router.push(selectedCategory.bookingLink)}
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
        <Footer />
      </div>
    </>
  );
}
