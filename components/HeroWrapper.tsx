"use client";

import { useState, useEffect } from "react";
import Hero from "./Hero";

export default function HeroWrapper() {
  const [heroVideoSrc, setHeroVideoSrc] = useState<string>('');
  const [useHeroVideo, setUseHeroVideo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load hero settings from API
    const loadHeroSettings = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/homepage-settings');
        
        if (!res.ok) {
          console.error('API request failed:', res.status);
          return;
        }

        const text = await res.text();
        if (!text) {
          console.log('No settings data available, using defaults');
          return;
        }

        const data = JSON.parse(text);
        
        if (data.heroVideoSrc) {
          setHeroVideoSrc(data.heroVideoSrc);
        }
        if (data.useHeroVideo === true) {
          setUseHeroVideo(true);
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHeroSettings();
  }, []);

  if (loading) {
    return <div className="min-h-[85vh] bg-[#FFF5EE]" />;
  }

  return <Hero videoSrc={heroVideoSrc} useVideo={useHeroVideo} />;
}
