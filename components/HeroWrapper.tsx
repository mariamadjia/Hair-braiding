"use client";

import { useState, useEffect } from "react";
import Hero from "./Hero";
import { getHomepageSettings } from "@/lib/homepage-settings";
import { API_BASE_URL } from "@/lib/config/api";

function resolveVideoUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('/api/gallery/image/')) return `${API_BASE_URL}${value}`;
  if (value.startsWith('/Gallery/uploads/')) {
    const filename = value.split('/').pop();
    return filename ? `${API_BASE_URL}/api/gallery/image/${encodeURIComponent(filename)}` : '';
  }
  return value;
}

export default function HeroWrapper() {
  const [heroVideoSrc, setHeroVideoSrc] = useState<string>('');
  const [useHeroVideo, setUseHeroVideo] = useState(false);

  useEffect(() => {
    // Load hero settings from API
    const loadHeroSettings = async () => {
      try {
        const data = await getHomepageSettings();

        if (data.heroVideoSrc) {
          setHeroVideoSrc(resolveVideoUrl(data.heroVideoSrc));
        }
        if (data.useHeroVideo === true) {
          setUseHeroVideo(true);
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
      }
    };

    loadHeroSettings();
  }, []);

  return <Hero videoSrc={heroVideoSrc} useVideo={useHeroVideo} />;
}
