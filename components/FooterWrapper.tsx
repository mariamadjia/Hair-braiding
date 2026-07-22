"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/config/api";
import { getHomepageSettings } from "@/lib/homepage-settings";

const DEFAULT_FOOTER_VIDEO = "/Footer/IMG_2004.mov";

function resolveMediaUrl(url?: string | null) {
  if (!url) {
    return DEFAULT_FOOTER_VIDEO;
  }

  // Already a full URL, such as a Render URL.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // New database format.
  if (url.startsWith("/api/gallery/image/")) {
    return `${API_BASE_URL}${url}`;
  }

  // Older database format.
  if (url.startsWith("/Gallery/uploads/")) {
    const filename = url.split("/").filter(Boolean).pop();

    return filename
      ? `${API_BASE_URL}/api/gallery/image/${encodeURIComponent(filename)}` 
      : DEFAULT_FOOTER_VIDEO;
  }

  // Frontend public-file fallback.
  return url;
}

export default function FooterWrapper() {
  const [footerVideoSrc, setFooterVideoSrc] = useState(
    DEFAULT_FOOTER_VIDEO
  );

  useEffect(() => {
    const loadFooterVideo = async () => {
      try {
        const data = await getHomepageSettings();

        setFooterVideoSrc(
          resolveMediaUrl(data.footerVideoSrc)
        );
      } catch (error) {
        console.error("Failed to load Footer video:", error);
        // Keep the local default Footer video.
      }
    };

    loadFooterVideo();
  }, []);

  return <Footer videoSrc={footerVideoSrc} />;
}
