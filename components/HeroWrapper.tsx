"use client";

import { useState, useEffect } from "react";
import Hero from "./Hero";
import { getHomepageSettings } from "@/lib/homepage-settings";

export default function HeroWrapper() {
  const [heroVideoSrc, setHeroVideoSrc] = useState<string>('');
  const [useHeroVideo, setUseHeroVideo] = useState(false);

  useEffect(() => {
    // Load hero settings from API
    const loadHeroSettings = async () => {
      try {
        const data = await getHomepageSettings();

        if (data.heroVideoSrc) {
          setHeroVideoSrc(data.heroVideoSrc);
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
