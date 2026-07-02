"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Plus, Edit, X, ChevronLeft, ChevronRight } from "lucide-react";
import Hero from "@/components/Hero";
import Welcome from "@/components/Welcome";
import Gallery from "@/components/Gallery";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/config/api";

interface WelcomeItem {
  type: 'video' | 'image';
  src: string;
  label: string;
  alt: string;
  link: string;
}

interface GalleryCollection {
  title: string;
  images: string[];
  slug: string;
}

export function HomePageEditor() {
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroVideoSrc, setHeroVideoSrc] = useState<string>('');
  const [useHeroVideo, setUseHeroVideo] = useState(false);
  const [heroVideoUploading, setHeroVideoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWelcomeItemIndex, setEditingWelcomeItemIndex] = useState<number | null>(null);
  const [isGalleryEditOpen, setIsGalleryEditOpen] = useState(false);
  const [editingCollectionIndex, setEditingCollectionIndex] = useState<number | null>(null);
  const [galleryCollections, setGalleryCollections] = useState<GalleryCollection[]>([]);
  const [footerVideoSrc, setFooterVideoSrc] = useState('/Footer/IMG_2004.mov');
  const [isFooterVideoEditOpen, setIsFooterVideoEditOpen] = useState(false);
  const [footerVideoUploading, setFooterVideoUploading] = useState(false);
  const [welcomeItems, setWelcomeItems] = useState<WelcomeItem[]>([
    { type: 'video', src: '/welcome/video1.MOV', label: 'Join us Today', alt: 'In-studio bookings', link: '/join-us' },
    { type: 'video', src: '/welcome/video2.MOV', label: 'Book us now', alt: 'Book us now', link: '/services' },
    { type: 'video', src: '/welcome/video4.MOV', label: 'Explore gallery', alt: 'Explore gallery', link: '/gallery' }
  ]);
  const [welcomeItemUploading, setWelcomeItemUploading] = useState(false);
  const [tempWelcomeItemSrc, setTempWelcomeItemSrc] = useState<string>('');
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [allCollections, setAllCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionIndices, setSelectedCollectionIndices] = useState<number[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});
  const [isFlipping, setIsFlipping] = useState<Record<number, boolean>>({});

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  };

  // Automatic flipping for collections
  useEffect(() => {
    const interval = setInterval(() => {
      allCollections.forEach((collection, index) => {
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
  }, [allCollections]);

  const handlePrevImage = (collectionIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const collection = allCollections[collectionIndex];
    const currentIndex = currentImageIndex[collectionIndex] || 0;
    const newIndex = currentIndex === 0 ? collection.images.length - 1 : currentIndex - 1;
    setCurrentImageIndex({ ...currentImageIndex, [collectionIndex]: newIndex });
  };

  const handleNextImage = (collectionIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const collection = allCollections[collectionIndex];
    const currentIndex = currentImageIndex[collectionIndex] || 0;
    const newIndex = currentIndex === collection.images.length - 1 ? 0 : currentIndex + 1;
    setCurrentImageIndex({ ...currentImageIndex, [collectionIndex]: newIndex });
  };

  useEffect(() => {
    loadHeroImages();
    loadGalleryCollections();
    loadWelcomeItems();
    // Load hero video settings from localStorage
    if (typeof window !== 'undefined') {
      const savedVideoSrc = localStorage.getItem('hero_video_src');
      const savedUseVideo = localStorage.getItem('hero_use_video');
      if (savedVideoSrc) {
        setHeroVideoSrc(savedVideoSrc);
      }
      if (savedUseVideo === 'true') {
        setUseHeroVideo(true);
      }
    }
  }, []);

  // Save hero video settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('hero_video_src', heroVideoSrc);
    localStorage.setItem('hero_use_video', String(useHeroVideo));
  }, [heroVideoSrc, useHeroVideo]);

  const loadHeroImages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/homepage-settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.heroImages) {
          const images = JSON.parse(data.heroImages);
          setHeroImages(images);
        }
      }
    } catch (error) {
      console.error('Failed to load hero images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWelcomeItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/homepage-settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.welcomeItems) {
          const items = JSON.parse(data.welcomeItems);
          if (items.length > 0) {
            setWelcomeItems(items);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load welcome items:', error);
    }
  };

  const loadGalleryCollections = async () => {
    try {
      const res = await fetch('/api/gallery-collections');
      const data = await res.json();
      if (data.collections) {
        setGalleryCollections(data.collections);
      }
    } catch (error) {
      console.error('Failed to load gallery collections:', error);
    }
  };

  const loadAllCollections = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        // Transform categories to collection format
        const collections = (data.categories || []).map((cat: any) => ({
          title: cat.name,
          slug: cat.slug,
          images: cat.flippingImages && cat.flippingImages.length > 0 ? cat.flippingImages : (cat.image ? [cat.image] : []),
        }));
        setAllCollections(collections);
        // Set selected indices based on current featured collections by matching titles
        const featuredIndices = collections
          .map((c: GalleryCollection, index: number) => galleryCollections.some(g => g.title === c.title) ? index : -1)
          .filter((i: number): i is number => i !== -1);
        setSelectedCollectionIndices(featuredIndices);
      }
    } catch (error) {
      console.error('Failed to load all collections:', error);
    }
  };

  const saveHomepageSettings = async (
    nextHeroVideoSrc = heroVideoSrc,
    nextUseHeroVideo = useHeroVideo
  ) => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/homepage-settings/hero-video`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          heroVideoSrc: nextHeroVideoSrc,
          useHeroVideo: nextUseHeroVideo,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save homepage settings: ${res.status}`);
      }
    } catch (error) {
      console.error('Failed to save homepage settings:', error);
      alert('Hero video uploaded, but the homepage setting was not saved.');
    }
  };

  const saveGalleryCollections = async (collections: GalleryCollection[]) => {
    try {
      await fetch('/api/gallery-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections }),
      });
    } catch (error) {
      console.error('Failed to save gallery collections:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if maximum limit of 5 images is reached
    if (heroImages.length >= 5) {
      alert('Maximum of 5 hero images allowed. Please delete some images before uploading more.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/upload-hero-image', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.path || data.imageUrl || data.url;
        
        // Add the new image to heroImages array
        const updatedImages = [...heroImages, imageUrl];
        setHeroImages(updatedImages);
        
        // Save to backend
        await fetch(`${API_BASE_URL}/api/homepage-settings/hero-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ heroImages: JSON.stringify(updatedImages) }),
        });
      } else {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, collectionIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-hero-image', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.url || data.path;
        
        // Add the new image to the collection
        const newCollections = [...galleryCollections];
        newCollections[collectionIndex].images.push(imageUrl);
        setGalleryCollections(newCollections);
        
        // Save to API
        await saveGalleryCollections(newCollections);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    }
  };

  const handleFooterVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFooterVideoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-welcome-video', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const videoUrl = data.url || data.path;
        setFooterVideoSrc(videoUrl);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video');
    } finally {
      setFooterVideoUploading(false);
    }
  };

  const handleWelcomeItemUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWelcomeItemUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-welcome-video', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const videoUrl = data.url || data.path;
        // Only update temporary state, not actual welcomeItems
        setTempWelcomeItemSrc(videoUrl);
        // Increment timestamp to force video reload
        setVideoTimestamp(Date.now());
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video');
    } finally {
      setWelcomeItemUploading(false);
    }
  };

  const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeroVideoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-welcome-video', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const videoUrl = data.url || data.path;
        setHeroVideoSrc(videoUrl);
        setUseHeroVideo(true); // Automatically enable video mode
        // Save to database
        await saveHomepageSettings(videoUrl, true);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload hero video');
    } finally {
      setHeroVideoUploading(false);
    }
  };

  const handleDeleteImage = async (imagePath: string) => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Remove from local state
      const updatedImages = heroImages.filter(img => img !== imagePath);
      setHeroImages(updatedImages);

      // Delete from filesystem
      await fetch('/api/delete-hero-image', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ imagePath }),
      });

      // Update backend homepage settings
      await fetch(`${API_BASE_URL}/api/homepage-settings/hero-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ heroImages: JSON.stringify(updatedImages) }),
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900">
        <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-8 py-6 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Hero Section Preview
            </p>
          </div>
        </div>

        {/* Hero Preview */}
        <div className="flex-1 overflow-y-auto bg-[#FFF5EE] dark:bg-neutral-900">
          <div className="relative">
            <Hero videoSrc={heroVideoSrc} useVideo={useHeroVideo} />
            {/* Edit button overlay */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm text-neutral-900 dark:text-white text-sm rounded-sm hover:bg-white dark:hover:bg-neutral-700 transition-colors shadow-lg"
            >
              <Edit className="h-4 w-4" />
              Edit Hero
            </button>
          </div>

          {/* Welcome Section Preview */}
          <div className="relative">
            {/* @ts-ignore - Welcome.jsx doesn't have TypeScript definitions */}
            <Welcome items={welcomeItems} editMode={true} onEditItem={(index: number) => {
              setEditingWelcomeItemIndex(index);
              setTempWelcomeItemSrc('');
              setVideoTimestamp(Date.now());
            }} />
          </div>

          {/* Gallery Collection Section */}
          <div className="relative">
            <Gallery />
            {/* Edit button overlays */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="container mx-auto px-6 md:px-8 lg:px-12 h-full flex flex-col justify-center">
                {/* Header Edit Button */}
                <div className="flex justify-end mb-6 md:mb-10 pointer-events-auto">
                  <button
                    onClick={async () => {
                      await loadAllCollections();
                      setIsGalleryEditOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors shadow-lg"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Gallery
                  </button>
                </div>
                
                {/* Individual Collection Edit Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pointer-events-auto">
                  {galleryCollections.map((collection, index) => (
                    <div key={index} className="aspect-[4/5] relative">
                      <button
                        onClick={() => setEditingCollectionIndex(index)}
                        className="absolute top-6 right-6 z-10 p-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-full shadow-lg transition-colors"
                        title={`Edit ${collection.title}`}
                      >
                        <Edit className="h-4 w-4 text-neutral-900 dark:text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="relative">
            <Footer videoSrc={footerVideoSrc} />
            {/* Edit button overlay for footer video - positioned over video area */}
            <div className="lg:hidden absolute top-32 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={() => setIsFooterVideoEditOpen(true)}
                className="inline-flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm text-neutral-900 dark:text-white rounded-full hover:bg-white dark:hover:bg-neutral-700 transition-colors shadow-lg"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden lg:block absolute top-14 right-12 md:right-16 lg:right-24 z-20">
              <button
                onClick={() => setIsFooterVideoEditOpen(true)}
                className="inline-flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm text-neutral-900 dark:text-white rounded-full hover:bg-white dark:hover:bg-neutral-700 transition-colors shadow-lg"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Manage Hero Section</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {useHeroVideo ? 'Background video mode' : `${heroImages.length} ${heroImages.length === 1 ? 'image' : 'images'} in carousel`}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-neutral-900 dark:text-white">Background Video</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Use a video background instead of image carousel
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const nextUseHeroVideo = !useHeroVideo;
                        setUseHeroVideo(nextUseHeroVideo);
                        await saveHomepageSettings(heroVideoSrc, nextUseHeroVideo);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useHeroVideo ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useHeroVideo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Video Upload Section */}
                {useHeroVideo && (
                  <div className="space-y-4">
                    <label className="block">
                      <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-blue-50/50 dark:bg-blue-900/20">
                        <Upload className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                        <p className="text-neutral-600 dark:text-neutral-300 font-medium mb-1">
                          {heroVideoUploading ? 'Uploading video...' : heroVideoSrc ? 'Change hero video' : 'Upload hero video'}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          MP4, MOV, or WebM • Max 50MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleHeroVideoUpload}
                        disabled={heroVideoUploading}
                        className="hidden"
                      />
                    </label>

                    {/* Video Preview */}
                    {heroVideoSrc && (
                      <div className="relative rounded-lg overflow-hidden bg-black">
                        <video
                          key={heroVideoSrc}
                          src={heroVideoSrc}
                          className="w-full h-108 object-cover"
                          controls
                        />
                        <button
                          onClick={async () => {
                            setHeroVideoSrc('');
                            setUseHeroVideo(false);
                            await saveHomepageSettings('', false);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Upload Section */}
                {!useHeroVideo && (
                  <>
                    {/* Upload Button */}
                    <label className="block">
                      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        heroImages.length >= 5
                          ? 'border-neutral-300 dark:border-neutral-600 opacity-50 cursor-not-allowed'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer'
                      }`}>
                        <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                        <p className="text-neutral-600 dark:text-neutral-300 font-medium mb-1">
                          {heroImages.length >= 5
                            ? 'Maximum 5 images reached'
                            : uploading
                            ? 'Uploading...'
                            : 'Click to upload image'}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Recommended: 800x1000px (4:5 ratio) • Max 5 images
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading || heroImages.length >= 5}
                      />
                    </label>

                    {/* Image Grid */}
                    {heroImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {heroImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative group aspect-[4/5] bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-600"
                          >
                            <img
                              src={image}
                              alt={`Hero image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDeleteImage(image)}
                                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                            
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Item Edit Modal */}
      {editingWelcomeItemIndex !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Edit Welcome Item
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {welcomeItems[editingWelcomeItemIndex]?.label || 'Item ' + (editingWelcomeItemIndex + 1)}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingWelcomeItemIndex(null);
                  setTempWelcomeItemSrc('');
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Upload New Video
                  </label>
                  <label className="block">
                    <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-900">
                      <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium mb-1">
                        {welcomeItemUploading ? 'Uploading...' : 'Click to upload new video'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        MP4, MOV, or WebM
                      </p>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleWelcomeItemUpload(e, editingWelcomeItemIndex!)}
                        disabled={welcomeItemUploading}
                        className="hidden"
                      />
                    </div>
                  </label>
                  {tempWelcomeItemSrc && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      New: {tempWelcomeItemSrc}
                    </p>
                  )}
                  {!tempWelcomeItemSrc && welcomeItems[editingWelcomeItemIndex]?.src && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      Current: {welcomeItems[editingWelcomeItemIndex]?.src}
                    </p>
                  )}
                </div>

                {/* Current Video Preview - Smaller */}
                {(tempWelcomeItemSrc || welcomeItems[editingWelcomeItemIndex]?.src) && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Preview
                    </label>
                    <div className="aspect-[3/5] w-full max-w-xs bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden">
                      {welcomeItems[editingWelcomeItemIndex]?.type === 'video' ? (
                        <video
                          key={videoTimestamp}
                          src={`${tempWelcomeItemSrc || welcomeItems[editingWelcomeItemIndex]?.src}?t=${videoTimestamp}`}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          key={videoTimestamp}
                          src={`${tempWelcomeItemSrc || welcomeItems[editingWelcomeItemIndex]?.src}?t=${videoTimestamp}`}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setEditingWelcomeItemIndex(null);
                  setTempWelcomeItemSrc('');
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Only update if a new video was uploaded
                  if (tempWelcomeItemSrc) {
                    const newItems = [...welcomeItems];
                    newItems[editingWelcomeItemIndex!].src = tempWelcomeItemSrc;
                    setWelcomeItems(newItems);
                    // Save to backend
                    try {
                      const token = getAuthToken();
                      const headers: HeadersInit = { 'Content-Type': 'application/json' };
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }

                      await fetch(`${API_BASE_URL}/api/homepage-settings/welcome-items`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ welcomeItems: JSON.stringify(newItems) }),
                      });
                    } catch (error) {
                      console.error('Failed to save welcome items:', error);
                      alert('Failed to save welcome items');
                    }
                  }
                  setEditingWelcomeItemIndex(null);
                  setTempWelcomeItemSrc('');
                }}
                className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Collection Edit Modal */}
      {editingCollectionIndex !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Edit {galleryCollections[editingCollectionIndex].title}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {galleryCollections[editingCollectionIndex].images.length} images
                </p>
              </div>
              <button
                onClick={() => setEditingCollectionIndex(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Collection Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Collection Title
                  </label>
                  <input
                    type="text"
                    value={galleryCollections[editingCollectionIndex].title}
                    onChange={(e) => {
                      const newCollections = [...galleryCollections];
                      newCollections[editingCollectionIndex].title = e.target.value;
                      setGalleryCollections(newCollections);
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400"
                  />
                </div>

                {/* Collection Slug */}
                {/*<div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={galleryCollections[editingCollectionIndex].slug}
                    onChange={(e) => {
                      const newCollections = [...galleryCollections];
                      newCollections[editingCollectionIndex].slug = e.target.value;
                      setGalleryCollections(newCollections);
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400"
                    placeholder="e.g., twists, box-braids"
                  />
                </div>*/}

                {/* Images Grid */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Images
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {galleryCollections[editingCollectionIndex].images.map((image, imgIndex) => (
                      <div key={imgIndex} className="relative group aspect-[4/5] bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                        <img
                          src={image}
                          alt={`Image ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            const newCollections = [...galleryCollections];
                            newCollections[editingCollectionIndex].images.splice(imgIndex, 1);
                            setGalleryCollections(newCollections);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                          {imgIndex + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Image Button */}
                    <label className="aspect-[4/5] border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
                      <div className="text-center">
                        <Plus className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Add Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleGalleryImageUpload(e, editingCollectionIndex)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0 flex gap-3">
              <button
                onClick={() => setEditingCollectionIndex(null)}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await saveGalleryCollections(galleryCollections);
                  setEditingCollectionIndex(null);
                }}
                className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Selection Modal */}
      {isGalleryEditOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Manage Gallery Collections
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Select exactly 4 collections to feature on homepage
                </p>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-2">
                  Selected: {selectedCollectionIndices.length}/4 (must select exactly 4)
                </p>
              </div>
              <button
                onClick={() => setIsGalleryEditOpen(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Selected Collections Preview */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Selected Collections Preview
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, index) => {
                      const selectedCollection = allCollections[selectedCollectionIndices[index]];
                      return (
                        <div
                          key={index}
                          className="aspect-[4/5] bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-600"
                        >
                          {selectedCollection ? (
                            <div className="relative w-full h-full">
                              {selectedCollection.images[0] && (
                                <img
                                  src={selectedCollection.images[0]}
                                  alt={selectedCollection.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-center">
                                <p className="text-xs font-medium truncate">{selectedCollection.title}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                              <span className="text-sm">Empty</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Collections Grid */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    All Collections ({allCollections.length})
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {allCollections.map((collection, index) => {
                      const currentIndex = currentImageIndex[index] || 0;
                      const hasMultipleImages = collection.images.length > 1;
                      return (
                        <div
                          key={index}
                          className="aspect-[4/5] relative bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCollectionIndices.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedCollectionIndices.length < 4) {
                                  setSelectedCollectionIndices([...selectedCollectionIndices, index]);
                                }
                              } else {
                                setSelectedCollectionIndices(selectedCollectionIndices.filter(i => i !== index));
                              }
                            }}
                            className="absolute top-2 right-2 z-10 w-6 h-6 rounded bg-white/90 dark:bg-neutral-800/90 border-2 border-neutral-300 dark:border-neutral-600 cursor-pointer"
                            disabled={!selectedCollectionIndices.includes(index) && selectedCollectionIndices.length >= 4}
                          />
                          <div
                            className="w-full h-full relative"
                            style={{ perspective: '1000px' }}
                          >
                            <div
                              className="w-full h-full transition-transform duration-600"
                              style={{
                                transformStyle: 'preserve-3d',
                                transform: isFlipping[index] ? 'rotateY(90deg)' : 'rotateY(0deg)',
                              }}
                            >
                              {collection.images[currentIndex] && (
                                <img
                                  src={collection.images[currentIndex]}
                                  alt={collection.title}
                                  className="w-full h-full object-cover"
                                  style={{ backfaceVisibility: 'hidden' }}
                                />
                              )}
                            </div>
                            
                            {/* Navigation Arrows - Only show if multiple images */}
                            {hasMultipleImages && (
                              <>
                                <button
                                  onClick={(e) => handlePrevImage(index, e)}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10"
                                  aria-label="Previous image"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <button
                                  onClick={(e) => handleNextImage(index, e)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10"
                                  aria-label="Next image"
                                >
                                  <ChevronRight size={16} />
                                </button>
                                
                                {/* Image Indicators */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                  {collection.images.map((_, imgIndex) => (
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
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-center">
                            <p className="text-xs font-medium truncate">{collection.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0 flex gap-3">
              <button
                onClick={() => setIsGalleryEditOpen(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const selectedCollections = selectedCollectionIndices.map(i => allCollections[i]);
                  setGalleryCollections(selectedCollections);
                  setIsGalleryEditOpen(false);
                }}
                disabled={selectedCollectionIndices.length !== 4}
                className={`flex-1 px-4 py-2 text-white text-sm rounded-sm transition-colors ${
                  selectedCollectionIndices.length === 4
                    ? 'bg-neutral-900 dark:bg-neutral-700 hover:bg-neutral-800 dark:hover:bg-neutral-600'
                    : 'bg-neutral-300 dark:bg-neutral-600 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Video Edit Modal */}
      {isFooterVideoEditOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Edit Footer Video</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Upload a new video for the footer section
                </p>
              </div>
              <button
                onClick={() => setIsFooterVideoEditOpen(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Upload Button */}
                <label className="block">
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-8 text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer">
                    <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <p className="text-neutral-600 dark:text-neutral-300 font-medium mb-1">
                      {footerVideoUploading ? 'Uploading...' : 'Click to upload video'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      MP4, MOV, or WebM (Max 50MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFooterVideoUpload}
                    className="hidden"
                    disabled={footerVideoUploading}
                  />
                </label>

                {/* Video Preview */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Current Video
                  </label>
                  <div className="aspect-[6/5] bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                    <video
                      src={footerVideoSrc}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'center 30%' }}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0">
              <button
                onClick={() => setIsFooterVideoEditOpen(false)}
                className="w-full px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
