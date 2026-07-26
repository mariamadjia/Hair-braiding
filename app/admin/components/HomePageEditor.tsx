"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Plus, Edit, X, ChevronLeft, ChevronRight } from "lucide-react";
import Hero from "@/components/Hero";
import Welcome from "@/components/Welcome";
import Gallery from "@/components/Gallery";
import Footer from "@/components/Footer";
import FlipBook3D from "@/components/FlipBook3D";
import { API_BASE_URL } from "@/lib/config/api";
import { BRAID_BOOK_COVER, BRAID_BOOK_END_PAGE, BRAID_BOOK_STYLES } from "@/lib/braid-book-data";
import {
  fetchCategoryDisplayPhotos,
  getDisplayImages,
  saveCategoryFlippingImages,
} from "@/lib/api/categoryDisplayPhotos";
import { IMAGE_UPLOAD_ACCEPT, normalizeImageForUpload } from "@/lib/utils/imageUpload";

interface WelcomeItem {
  type: 'video' | 'image';
  src: string;
  label: string;
  alt: string;
  link: string;
}

interface GalleryCollection {
  id: number;
  title: string;
  images: string[];
  slug: string;
}

interface HeroImage {
  id: number;
  imageUrl: string;
}

interface BraidBookStyle {
  id: number;
  title: string;
  name: string;
  image: string;
  subtitle: string;
  wearTime: string;
  styleLink: string;
  preserveTips: string[];
  bestFor: string[];
}

export function HomePageEditor() {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
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
  const [footerVideoSrc, setFooterVideoSrc] = useState('/Footer/IMG_2004.m4v');
  const [isFooterVideoEditOpen, setIsFooterVideoEditOpen] = useState(false);
  const [footerVideoUploading, setFooterVideoUploading] = useState(false);
  const [braidBookStyles, setBraidBookStyles] = useState<BraidBookStyle[]>(
    () => structuredClone(BRAID_BOOK_STYLES) as BraidBookStyle[]
  );
  const [braidBookCover, setBraidBookCover] = useState(() => ({ ...BRAID_BOOK_COVER }));
  const [braidBookEndPage, setBraidBookEndPage] = useState(() => structuredClone(BRAID_BOOK_END_PAGE));
  const [savingBraidBook, setSavingBraidBook] = useState(false);
  const [expandedBraidStyle, setExpandedBraidStyle] = useState<number | null>(null);
  const [welcomeItems, setWelcomeItems] = useState<WelcomeItem[]>([
    { type: 'video', src: '/welcome/video1.m4v', label: 'Join us Today', alt: 'In-studio bookings', link: '/join-us' },
    { type: 'video', src: '/welcome/video2.m4v', label: 'Book us now', alt: 'Book us now', link: '/services' },
    { type: 'video', src: '/welcome/video4.m4v', label: 'Explore gallery', alt: 'Explore gallery', link: '/gallery' }
  ]);
  const [welcomeItemUploading, setWelcomeItemUploading] = useState(false);
  const [tempWelcomeItemSrc, setTempWelcomeItemSrc] = useState<string>('');
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [allCollections, setAllCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionIndices, setSelectedCollectionIndices] = useState<number[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});
  const [isFlipping, setIsFlipping] = useState<Record<number, boolean>>({});
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [savingGalleryCollections, setSavingGalleryCollections] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingHeroDeleteId, setPendingHeroDeleteId] = useState<number | null>(null);
  const collectionSnapshotRef = useRef<GalleryCollection[] | null>(null);
  const selectionSnapshotRef = useRef<number[] | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tempWelcomeItemSrcRef = useRef('');

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  };

  const validateVideo = (file: File) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.type)) return 'Only MP4, MOV, and WebM videos are supported.';
    if (file.size > 50 * 1024 * 1024) return 'Video must be 50MB or smaller.';
    return '';
  };

  const validateImage = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''];
    const isHeicName = /\.(heic|heif)$/i.test(file.name);
    if (!allowed.includes(file.type) && !isHeicName) return 'Only JPEG, PNG, WebP, HEIC, and HEIF images are supported.';
    if (file.size > 10 * 1024 * 1024) return 'Image must be 10MB or smaller.';
    return '';
  };

  const deleteUnusedVideo = async (url: string) => {
    if (!url) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/upload/welcome-video?path=${encodeURIComponent(url)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to clean up unused video:', error);
    }
  };

  // Helper function to convert media URLs to backend URLs
  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return "";

    // Already a full Render URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // New saved format
    if (url.startsWith("/api/gallery/image/")) {
      return `${API_BASE_URL}${url}`;
    }

    // Old saved format
    if (url.startsWith("/Gallery/uploads/")) {
      const filename = url.split("/").filter(Boolean).pop();

      return filename
        ? `${API_BASE_URL}/api/gallery/image/${encodeURIComponent(filename)}`
        : "";
    }

    // Keep frontend public files unchanged, such as /welcome/video1.m4v
    return url;
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
    const load = async () => {
      setLoading(true);
      setLoadErrors([]);
      const results = await Promise.allSettled([
        loadHeroImages(),
        loadGalleryCollections(),
        loadWelcomeItems(),
      ]);
      const labels = ['Hero media', 'Gallery', 'Homepage settings'];
      setLoadErrors(results.flatMap((result, index) =>
        result.status === 'rejected' ? [`${labels[index]} could not be loaded.`] : []
      ));
      setLoading(false);
    };
    void load();
  }, []);

  const modalOpen = isEditModalOpen || editingWelcomeItemIndex !== null ||
    isGalleryEditOpen || editingCollectionIndex !== null || isFooterVideoEditOpen;

  useEffect(() => {
    tempWelcomeItemSrcRef.current = tempWelcomeItemSrc;
  }, [tempWelcomeItemSrc]);

  useEffect(() => {
    if (!modalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void deleteUnusedVideo(tempWelcomeItemSrcRef.current);
        setTempWelcomeItemSrc('');
        if (collectionSnapshotRef.current) setGalleryCollections(collectionSnapshotRef.current);
        if (selectionSnapshotRef.current) setSelectedCollectionIndices(selectionSnapshotRef.current);
        collectionSnapshotRef.current = null;
        selectionSnapshotRef.current = null;
        setIsEditModalOpen(false);
        setEditingWelcomeItemIndex(null);
        setIsGalleryEditOpen(false);
        setEditingCollectionIndex(null);
        setIsFooterVideoEditOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleModalKeyDown);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] button')?.focus());
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [modalOpen]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!tempWelcomeItemSrc && !collectionSnapshotRef.current && !selectionSnapshotRef.current) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tempWelcomeItemSrc, editingCollectionIndex, isGalleryEditOpen]);

  const loadHeroImages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/gallery?isHero=true`);
      if (!res.ok) throw new Error(`Hero request failed (${res.status})`);

      if (res.ok) {
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const convertedImages: HeroImage[] = data
            .map((image: any) => {
              const rawUrl = image.imageUrl;

              if (!rawUrl || image.id == null) {
                return null;
              }

              let displayUrl = "";

              if (rawUrl.startsWith("/api/gallery/image/")) {
                displayUrl = `${API_BASE_URL}${rawUrl}`;
              } else if (rawUrl.startsWith("/Gallery/uploads/")) {
                const filename = rawUrl.split("/").filter(Boolean).pop();

                displayUrl = filename
                  ? `${API_BASE_URL}/api/gallery/image/${encodeURIComponent(filename)}`
                  : "";
              } else if (rawUrl.startsWith("/")) {
                displayUrl = `${API_BASE_URL}${rawUrl}`;
              } else {
                displayUrl = rawUrl;
              }

              return displayUrl
                ? {
                    id: image.id,
                    imageUrl: displayUrl,
                  }
                : null;
            })
            .filter((image): image is HeroImage => image !== null);

          setHeroImages(convertedImages);
        } else {
          setHeroImages([]);
        }
      }
    } catch (error) {
      console.error("Failed to load hero images:", error);
      throw error;
    }
  };

  const loadWelcomeItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/homepage-settings`);

      if (!res.ok) {
        throw new Error(`Homepage settings request failed (${res.status})`);
      }

      const data = await res.json();
      setLastSavedAt(data.updatedAt || null);

      // Load video settings from the database, not old browser storage.
      setHeroVideoSrc(resolveMediaUrl(data.heroVideoSrc));
      setUseHeroVideo(Boolean(data.useHeroVideo));

      setFooterVideoSrc(
        data.footerVideoSrc
          ? resolveMediaUrl(data.footerVideoSrc)
          : "/Footer/IMG_2004.mov"
      );

      if (data.welcomeItems) {
        const items = JSON.parse(data.welcomeItems);

        if (Array.isArray(items) && items.length > 0) {
          setWelcomeItems(
            items.map((item: WelcomeItem) => ({
              ...item,
              src: resolveMediaUrl(item.src),
            }))
          );
        }
      }

      if (data.braidBookStyles) {
        const parsed = JSON.parse(data.braidBookStyles);
        const styles = Array.isArray(parsed) ? parsed : parsed?.styles;
        if (Array.isArray(styles) && styles.length > 0) {
          setBraidBookStyles(styles);
        }
        if (!Array.isArray(parsed) && parsed?.cover) {
          setBraidBookCover({ ...BRAID_BOOK_COVER, ...parsed.cover });
        }
        if (!Array.isArray(parsed) && parsed?.endPage) {
          setBraidBookEndPage({ ...BRAID_BOOK_END_PAGE, ...parsed.endPage });
        }
      }
    } catch (error) {
      console.error("Failed to load homepage settings:", error);
      throw error;
    }
  };

  const loadGalleryCollections = async () => {
    try {
      const [categories, settingsRes] = await Promise.all([
        fetchCategoryDisplayPhotos(),
        fetch(`${API_BASE_URL}/api/homepage-settings`),
      ]);

      let featuredIds: number[] = [];
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        try {
          const parsed = JSON.parse(settings.galleryCollections || '[]');
          if (Array.isArray(parsed)) featuredIds = parsed.map(Number).filter(Number.isFinite);
        } catch {
          featuredIds = [];
        }
      }

      const availableCollections: GalleryCollection[] = categories
        .map((category) => ({
          id: category.id,
          title: category.name,
          slug: category.slug,
          images: getDisplayImages(category),
        }))
        .filter((collection) => collection.images.length > 0);

      const collections = featuredIds.length > 0
        ? featuredIds
            .map((id) => availableCollections.find((collection) => collection.id === id))
            .filter((collection): collection is GalleryCollection => Boolean(collection))
            .slice(0, 4)
        : availableCollections.slice(0, 4);

      setGalleryCollections(collections);
    } catch (error) {
      console.error('Failed to load gallery collections:', error);
      throw error;
    }
  };

  const resolveGalleryCollectionImage = (url?: string) => {
    if (!url) return "";

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // Older Render-upload paths need the backend image endpoint.
    if (url.startsWith("/Gallery/uploads/")) {
      const filename = url.split("/").filter(Boolean).pop();

      return filename
        ? `/api/gallery/image/${encodeURIComponent(filename)}`
        : "";
    }

    // /Gallery/... legacy files are now served directly by Vercel.
    // /api/gallery/image/... is rewritten to Render by next.config.ts.
    return url;
  };

  const loadAllCollections = async () => {
    setLoadingCollections(true);

    try {
      const categories = await fetchCategoryDisplayPhotos();

      const collections: GalleryCollection[] = categories
        .map((category) => ({
          id: category.id,
          title: category.name,
          slug: category.slug,
          images: getDisplayImages(category),
        }))
        .filter((collection) => collection.images.length > 0);

      setAllCollections(collections);
      setCurrentImageIndex({});
      setIsFlipping({});

      const featuredIndices = collections
        .map((collection, index) =>
          galleryCollections.some((featured) => featured.id === collection.id)
            ? index
            : -1
        )
        .filter((index): index is number => index !== -1);

      setSelectedCollectionIndices(featuredIndices);
    } catch (error) {
      console.error("Failed to load all collections:", error);
      setAllCollections([]);
      setStatusMessage('Gallery collections could not be loaded. Please retry.');
    } finally {
      setLoadingCollections(false);
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
      const saved = await res.json();
      setLastSavedAt(saved.updatedAt || new Date().toISOString());
      setStatusMessage('Hero settings saved.');
      return true;
    } catch (error) {
      console.error('Failed to save homepage settings:', error);
      setStatusMessage('Hero settings could not be saved. Please retry.');
      return false;
    }
  };

  const saveFeaturedCollections = async (collections: GalleryCollection[]) => {
    const token = getAuthToken();
    if (!token) throw new Error('Admin session expired. Please sign in again.');
    const res = await fetch(`${API_BASE_URL}/api/homepage-settings/gallery-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ galleryCollections: JSON.stringify(collections.map(({ id }) => id)) }),
    });
    if (!res.ok) throw new Error(`Featured gallery save failed (${res.status})`);
    const saved = await res.json();
    setLastSavedAt(saved.updatedAt || new Date().toISOString());
  };

  const saveGalleryCollections = async (collections: GalleryCollection[]) => {
    if (savingGalleryCollections) return false;

    setSavingGalleryCollections(true);

    try {
      await Promise.all(collections.map((collection) =>
        saveCategoryFlippingImages(collection.id, collection.images)
      ));

      setLastSavedAt(new Date().toISOString());
      setStatusMessage('Gallery changes saved.');
      return true;
    } catch (error) {
      console.error('Failed to save gallery collections:', error);
      setStatusMessage('Gallery changes could not be saved. Please retry.');
      return false;
    } finally {
      setSavingGalleryCollections(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if maximum limit of 5 images is reached
    if (heroImages.length >= 5) {
      setStatusMessage('Maximum of 5 Hero images allowed. Delete an image before uploading another.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''];
    if (!allowedTypes.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      setStatusMessage('Invalid file type. Upload a JPEG, PNG, WebP, HEIC, or HEIF image.');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setStatusMessage('Image must be 10MB or smaller.');
      return;
    }

    setUploading(true);
    let uploadFile: File;
    try {
      uploadFile = await normalizeImageForUpload(file);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'HEIC image conversion failed.');
      setUploading(false);
      e.target.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadFile.name);
    formData.append('isHero', 'true');

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload directly to backend for faster performance
      const res = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (res.ok) {
        await loadHeroImages();
        setStatusMessage('Hero image uploaded successfully.');
      } else {
        const error = await res.json().catch(() => ({
          error: "Upload failed",
        }));

        setStatusMessage(error.error || 'Hero image could not be uploaded.');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      setStatusMessage('Hero image could not be uploaded.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, collectionIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImage(file);
    if (validationError) {
      setStatusMessage(validationError);
      e.target.value = '';
      return;
    }

    try {
      const uploadFile = await normalizeImageForUpload(file);
      const formData = new FormData();
      formData.append('file', uploadFile);
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.url || data.path || data.imageUrl;

        // Add the new image to the collection
        setGalleryCollections((collections) => collections.map((collection, index) =>
          index === collectionIndex
            ? { ...collection, images: [...collection.images, imageUrl] }
            : collection
        ));
        setStatusMessage('Image uploaded. Select Save Changes to publish it.');
      } else {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        setStatusMessage(error.error || 'Gallery image could not be uploaded.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setStatusMessage('Gallery image could not be uploaded.');
    } finally {
      e.target.value = '';
    }
  };

  const handleFooterVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;
    const validationError = validateVideo(file);
    if (validationError) {
      setStatusMessage(validationError);
      e.target.value = '';
      return;
    }

    setFooterVideoUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    let uploadedVideoPath = '';
    try {
      const token = getAuthToken();

      const uploadHeaders: HeadersInit = {};

      if (token) {
        uploadHeaders["Authorization"] = `Bearer ${token}`;
      }

      // Direct upload to Render — avoids Vercel's 413 file-size limit.
      const uploadRes = await fetch(
        `${API_BASE_URL}/api/upload/welcome-video`,
        {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const message = await uploadRes.text();
        throw new Error(message || "Footer video upload failed.");
      }

      const uploadData = await uploadRes.json();

      const savedVideoPath =
        uploadData.url || uploadData.path || uploadData.videoPath;

      if (!savedVideoPath) {
        throw new Error("No video URL was returned from the upload.");
      }
      uploadedVideoPath = savedVideoPath;

      const resolvedVideoUrl = resolveMediaUrl(savedVideoPath);

      const saveRes = await fetch(
        `${API_BASE_URL}/api/homepage-settings/footer-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            footerVideoSrc: savedVideoPath,
          }),
        }
      );

      if (!saveRes.ok) {
        const message = await saveRes.text();
        throw new Error(
          message || "Video uploaded, but Footer setting could not be saved."
        );
      }

      setFooterVideoSrc(resolvedVideoUrl);

      setStatusMessage('Footer video uploaded and saved successfully.');
    } catch (error) {
      console.error("Footer video upload failed:", error);

      if (uploadedVideoPath) await deleteUnusedVideo(uploadedVideoPath);

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Footer video upload failed."
      );
    } finally {
      setFooterVideoUploading(false);
      e.target.value = '';
    }
  };

  const handleWelcomeItemUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateVideo(file);
    if (validationError) {
      setStatusMessage(validationError);
      e.target.value = '';
      return;
    }

    setWelcomeItemUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('index', String(index));

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload directly to backend to bypass Vercel 4.5MB limit
      const res = await fetch(`${API_BASE_URL}/api/upload/welcome-video`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();

        const rawVideoUrl = data.url || data.path || data.videoPath;
        const resolvedVideoUrl = resolveMediaUrl(rawVideoUrl);

        if (!resolvedVideoUrl) {
          throw new Error("No usable video URL returned from upload");
        }

        setTempWelcomeItemSrc(resolvedVideoUrl);
        setVideoTimestamp(Date.now());
      } else {
        throw new Error(`Upload failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setStatusMessage('Welcome video could not be uploaded.');
    } finally {
      setWelcomeItemUploading(false);
      e.target.value = '';
    }
  };

  const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateVideo(file);
    if (validationError) {
      setStatusMessage(validationError);
      e.target.value = '';
      return;
    }

    setHeroVideoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload directly to backend to bypass Vercel 4.5MB limit
      const res = await fetch(`${API_BASE_URL}/api/upload/welcome-video`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const videoUrl = data.url || data.path || data.videoPath;

        const resolvedVideoUrl = resolveMediaUrl(videoUrl);

        if (!resolvedVideoUrl) {
          throw new Error("No usable video URL returned from upload");
        }

        setHeroVideoSrc(resolvedVideoUrl);
        setUseHeroVideo(true);

        const saved = await saveHomepageSettings(resolvedVideoUrl, true);
        if (!saved) {
          await deleteUnusedVideo(videoUrl);
          setHeroVideoSrc('');
          setUseHeroVideo(false);
        }
      } else {
        throw new Error(`Upload failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setStatusMessage('Hero video could not be uploaded.');
    } finally {
      setHeroVideoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (image: HeroImage) => {
    if (pendingHeroDeleteId !== image.id) {
      setPendingHeroDeleteId(image.id);
      setStatusMessage('Select the highlighted delete button again to permanently remove this Hero image.');
      return;
    }

    try {
      const token = getAuthToken();

      const headers: HeadersInit = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/gallery/${image.id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to delete Hero image");
      }

      await loadHeroImages();

      setPendingHeroDeleteId(null);
      setStatusMessage('Hero image permanently deleted.');
    } catch (error) {
      console.error("Failed to delete Hero image:", error);
      setStatusMessage('The Hero image could not be deleted.');
    }
  };

  const updateBraidBookStyle = (
    index: number,
    field: keyof BraidBookStyle,
    value: string | string[]
  ) => {
    setBraidBookStyles((styles) =>
      styles.map((style, styleIndex) =>
        styleIndex === index
          ? { ...style, [field]: value, ...(field === 'name' ? { title: value as string } : {}) }
          : style
      )
    );
  };

  const saveBraidBookStyles = async () => {
    setSavingBraidBook(true);
    setStatusMessage('');
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/homepage-settings/braid-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ braidBookStyles: JSON.stringify({ cover: braidBookCover, styles: braidBookStyles, endPage: braidBookEndPage }) }),
      });
      if (!response.ok) throw new Error(`Braid Book save failed (${response.status})`);
      const saved = await response.json();
      setLastSavedAt(saved.updatedAt || new Date().toISOString());
      setStatusMessage('Braid Book saved.');
    } catch (error) {
      console.error('Failed to save Braid Book:', error);
      setStatusMessage('The Braid Book could not be saved. Please retry.');
    } finally {
      setSavingBraidBook(false);
    }
  };

  const uploadBraidBookImage = async (styleId: number, file: File) => {
    setStatusMessage('Uploading Braid Book image…');
    try {
      const uploadFile = await normalizeImageForUpload(file);
      const body = new FormData();
      body.append('file', uploadFile);
      const token = getAuthToken();
      body.append('title', `Braid Book style ${styleId}`);
      body.append('altText', `Braid Book style ${styleId}`);
      const response = await fetch(`${API_BASE_URL}/api/gallery/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!response.ok) throw new Error(`Image upload failed (${response.status})`);
      const uploaded = await response.json();
      const imageUrl = uploaded.imageUrl || uploaded.url;
      if (styleId === 0) {
        setBraidBookCover((current) => ({ ...current, image: imageUrl }));
      } else {
        const index = braidBookStyles.findIndex((style) => style.id === styleId);
        if (index >= 0) updateBraidBookStyle(index, 'image', imageUrl);
      }
      setStatusMessage('Image uploaded. Save the Braid Book to publish it.');
    } catch (error) {
      console.error('Failed to upload Braid Book image:', error);
      setStatusMessage('The Braid Book image could not be uploaded.');
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
        <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 md:px-8 py-3 shrink-0">
          <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
            {statusMessage || (lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : 'Manage homepage sections')}
          </p>
          {loadErrors.length > 0 && (
            <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <span>{loadErrors.join(' ')}</span>
              <button type="button" className="underline" onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
        </div>

        {/* Hero Preview */}
        <div className="flex-1 overflow-y-auto bg-[#F6F5F1] dark:bg-neutral-900">
          <div className="relative">
            <Hero videoSrc={heroVideoSrc} useVideo={useHeroVideo} previewImages={heroImages.map(({ imageUrl }) => imageUrl)} />
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
            <Gallery previewCollections={galleryCollections} interactive={false} />
            {/* Edit button overlays */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="container mx-auto px-6 md:px-8 lg:px-12 h-full flex flex-col justify-center">
                {/* Header Edit Button */}
                <div className="flex justify-end mb-6 md:mb-10 pointer-events-auto">
                  <button
                    onClick={async () => {
                      await loadAllCollections();
                      selectionSnapshotRef.current = [...selectedCollectionIndices];
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
                        onClick={() => {
                          collectionSnapshotRef.current = structuredClone(galleryCollections);
                          setEditingCollectionIndex(index);
                        }}
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

          {/* Braid Book Editor */}
          <section className="border-y border-neutral-200 bg-white px-4 py-8 dark:border-neutral-700 dark:bg-neutral-800 md:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                    Homepage
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                    Braid Book Editor
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Edit the eight public book spreads, care tips, images, and booking destinations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveBraidBookStyles()}
                  disabled={savingBraidBook}
                  className="min-h-11 rounded-sm bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {savingBraidBook ? 'Saving…' : 'Save Braid Book'}
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-[#F6F5F1] dark:border-neutral-700">
                {/* @ts-ignore - shared JavaScript component exposes admin-only props */}
                <FlipBook3D
                  editMode
                  styles={braidBookStyles}
                  cover={braidBookCover}
                  onChangeCover={(field: string, value: string) => setBraidBookCover((current) => ({ ...current, [field]: value }))}
                  endPage={braidBookEndPage}
                  onChangeEndPage={(field: string, value: string | string[][]) => setBraidBookEndPage((current) => ({ ...current, [field]: value }))}
                  onChangeStyle={(id: number, field: string, value: string | string[]) => {
                    const index = braidBookStyles.findIndex((style) => style.id === id);
                    if (index >= 0) updateBraidBookStyle(index, field as keyof BraidBookStyle, value);
                  }}
                  onImageFile={(id: number, file: File) => void uploadBraidBookImage(id, file)}
                  onSave={() => void saveBraidBookStyles()}
                  isSaving={savingBraidBook}
                />
              </div>

              {expandedBraidStyle !== null && (() => {
                const index = braidBookStyles.findIndex((style) => style.id === expandedBraidStyle);
                const style = braidBookStyles[index];
                if (!style || index < 0) return null;
                return (
                  <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Edit {style.name}</h3>
                        <p className="text-xs text-neutral-500">Changes appear in the book immediately.</p>
                      </div>
                      <button type="button" onClick={() => setExpandedBraidStyle(null)} aria-label="Close spread editor" className="h-10 w-10 rounded border border-neutral-300 dark:border-neutral-600">×</button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                          {([
                            ['name', 'Style name'],
                            ['subtitle', 'Photo subtitle'],
                            ['wearTime', 'Wear time'],
                            ['image', 'Image URL'],
                            ['styleLink', 'Booking link'],
                          ] as const).map(([field, label]) => (
                            <label key={field} className={field === 'image' || field === 'styleLink' ? 'md:col-span-2' : ''}>
                              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
                              <input
                                value={style[field]}
                                onChange={(event) => updateBraidBookStyle(index, field, event.target.value)}
                                className="min-h-11 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                              />
                            </label>
                          ))}
                          <label>
                            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">Best for — one per line</span>
                            <textarea
                              rows={4}
                              value={style.bestFor.join('\n')}
                              onChange={(event) => updateBraidBookStyle(index, 'bestFor', event.target.value.split('\n').filter(Boolean))}
                              className="w-full rounded border border-neutral-300 bg-white p-3 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                            />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">Care tips — one per line</span>
                            <textarea
                              rows={4}
                              value={style.preserveTips.join('\n')}
                              onChange={(event) => updateBraidBookStyle(index, 'preserveTips', event.target.value.split('\n').filter(Boolean))}
                              className="w-full rounded border border-neutral-300 bg-white p-3 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                            />
                          </label>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => setBraidBookStyles((items) => {
                            const next = [...items];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          })}
                          className="min-h-11 rounded border border-neutral-300 px-4 text-sm disabled:opacity-30 dark:border-neutral-600"
                        >Move earlier</button>
                        <button
                          type="button"
                          disabled={index === braidBookStyles.length - 1}
                          onClick={() => setBraidBookStyles((items) => {
                            const next = [...items];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            return next;
                          })}
                          className="min-h-11 rounded border border-neutral-300 px-4 text-sm disabled:opacity-30 dark:border-neutral-600"
                        >Move later</button>
                      </div>
                      <button type="button" onClick={() => void saveBraidBookStyles()} disabled={savingBraidBook} className="min-h-11 rounded bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
                        {savingBraidBook ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Footer Section */}
          <div className="relative">
            <Footer videoSrc={footerVideoSrc} />
            {/* Edit button overlay for footer video - positioned over video area */}
            <div className="lg:hidden absolute top-32 left-1/2 -translate-x-1/2 z-20">
              <button
                type="button"
                aria-label="Edit Footer video"
                onClick={() => setIsFooterVideoEditOpen(true)}
                className="inline-flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm text-neutral-900 dark:text-white rounded-full hover:bg-white dark:hover:bg-neutral-700 transition-colors shadow-lg"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden lg:block absolute top-14 right-12 md:right-16 lg:right-24 z-20">
              <button
                type="button"
                aria-label="Edit Footer video"
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
        <div role="dialog" aria-modal="true" aria-label="Manage Hero Section" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                type="button"
                aria-label="Close Hero editor"
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
                      type="button"
                      role="switch"
                      aria-checked={useHeroVideo}
                      aria-label="Use a background video"
                      onClick={async () => {
                        const nextUseHeroVideo = !useHeroVideo;
                        setUseHeroVideo(nextUseHeroVideo);
                        const saved = await saveHomepageSettings(heroVideoSrc, nextUseHeroVideo);
                        if (!saved) setUseHeroVideo(!nextUseHeroVideo);
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
                          MP4, MOV, or WebM • Max 200MB
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
                            const previousVideoSrc = heroVideoSrc;
                            setHeroVideoSrc('');
                            setUseHeroVideo(false);
                            const saved = await saveHomepageSettings('', false);
                            if (!saved) {
                              setHeroVideoSrc(previousVideoSrc);
                              setUseHeroVideo(true);
                            }
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
                        accept={IMAGE_UPLOAD_ACCEPT}
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
                            key={image.id}
                            className="relative group aspect-[4/5] bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-600"
                          >
                            <img
                              src={image.imageUrl}
                              alt={`Hero image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDeleteImage(image)}
                                className={`p-3 text-white rounded-full transition-colors ${pendingHeroDeleteId === image.id ? 'bg-red-800 ring-4 ring-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                                aria-label={pendingHeroDeleteId === image.id
                                  ? `Confirm permanent deletion of Hero image ${index + 1}`
                                  : `Permanently delete Hero image ${index + 1}`}
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
        <div role="dialog" aria-modal="true" aria-label="Edit Welcome Item" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                type="button"
                aria-label="Close Welcome item editor"
                onClick={() => {
                  void deleteUnusedVideo(tempWelcomeItemSrc);
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
                type="button"
                aria-label="Cancel Welcome item changes"
                onClick={() => {
                  void deleteUnusedVideo(tempWelcomeItemSrc);
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
                    // Save to backend
                    try {
                      const token = getAuthToken();
                      const headers: HeadersInit = { 'Content-Type': 'application/json' };
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }

                      const response = await fetch(`${API_BASE_URL}/api/homepage-settings/welcome-items`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ welcomeItems: JSON.stringify(newItems) }),
                      });
                      if (!response.ok) {
                        throw new Error(`Welcome items save failed (${response.status})`);
                      }
                      const saved = await response.json();
                      setWelcomeItems(newItems);
                      setLastSavedAt(saved.updatedAt || new Date().toISOString());
                      setStatusMessage('Welcome item saved.');
                    } catch (error) {
                      console.error('Failed to save welcome items:', error);
                      setStatusMessage('Welcome item could not be saved. Please retry.');
                      return;
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
        <div role="dialog" aria-modal="true" aria-label="Edit Gallery Collection" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                type="button"
                aria-label="Close Gallery collection editor"
                onClick={() => {
                  if (collectionSnapshotRef.current) setGalleryCollections(collectionSnapshotRef.current);
                  collectionSnapshotRef.current = null;
                  setEditingCollectionIndex(null);
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
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
                            if (editingCollectionIndex === null) return;

                            setGalleryCollections((prev) =>
                              prev.map((collection, collectionIndex) =>
                                collectionIndex === editingCollectionIndex
                                  ? {
                                      ...collection,
                                      images: collection.images.filter(
                                        (_, currentImageIndex) => currentImageIndex !== imgIndex
                                      ),
                                    }
                                  : collection
                              )
                            );
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          aria-label={`Remove image ${imgIndex + 1}`}
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
                        accept={IMAGE_UPLOAD_ACCEPT}
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
                type="button"
                disabled={savingGalleryCollections}
                onClick={() => {
                  if (collectionSnapshotRef.current) setGalleryCollections(collectionSnapshotRef.current);
                  collectionSnapshotRef.current = null;
                  setEditingCollectionIndex(null);
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingGalleryCollections}
                onClick={async () => {
                  if (savingGalleryCollections) return;

                  const saved = await saveGalleryCollections(galleryCollections);

                  if (!saved) return;

                  setEditingCollectionIndex(null);
                  collectionSnapshotRef.current = null;

                  void loadGalleryCollections();
                  void loadAllCollections();
                }}
                className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm rounded-sm hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingGalleryCollections ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Selection Modal */}
      {isGalleryEditOpen && (
        <div role="dialog" aria-modal="true" aria-label="Manage Featured Gallery Collections" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                type="button"
                aria-label="Close featured Gallery editor"
                onClick={() => {
                  if (selectionSnapshotRef.current) setSelectedCollectionIndices(selectionSnapshotRef.current);
                  selectionSnapshotRef.current = null;
                  setIsGalleryEditOpen(false);
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingCollections ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-neutral-500 dark:text-neutral-400">Loading collections...</div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0 flex gap-3">
              <button
                type="button"
                disabled={savingGalleryCollections}
                onClick={() => {
                  if (selectionSnapshotRef.current) setSelectedCollectionIndices(selectionSnapshotRef.current);
                  selectionSnapshotRef.current = null;
                  setIsGalleryEditOpen(false);
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingGalleryCollections || selectedCollectionIndices.length !== 4}
                onClick={async () => {
                  if (savingGalleryCollections) return;

                  const selectedCollections = selectedCollectionIndices.map(i => allCollections[i]);

                  setGalleryCollections(selectedCollections);

                  const saved = await saveGalleryCollections(selectedCollections);

                  if (!saved) return;

                  try {
                    await saveFeaturedCollections(selectedCollections);
                  } catch (error) {
                    console.error('Failed to save featured gallery selection:', error);
                    setStatusMessage('Gallery images saved, but the featured selection was not saved. Please retry.');
                    return;
                  }

                  setIsGalleryEditOpen(false);
                  selectionSnapshotRef.current = null;

                  void loadGalleryCollections();
                  void loadAllCollections();
                }}
                className={`flex-1 px-4 py-2 text-white text-sm rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedCollectionIndices.length === 4
                    ? 'bg-neutral-900 dark:bg-neutral-700 hover:bg-neutral-800 dark:hover:bg-neutral-600'
                    : 'bg-neutral-300 dark:bg-neutral-600 cursor-not-allowed'
                }`}
              >
                {savingGalleryCollections ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Video Edit Modal */}
      {isFooterVideoEditOpen && (
        <div role="dialog" aria-modal="true" aria-label="Edit Footer Video" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                type="button"
                aria-label="Close Footer video editor"
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
