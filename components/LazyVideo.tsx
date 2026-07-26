"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

interface LazyVideoProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  delayMs?: number;
  ariaLabel?: string;
}

export default function LazyVideo({
  children,
  className,
  style,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  delayMs = 0,
  ariaLabel = "Decorative salon video",
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadTimer = setTimeout(() => {
            if (!hasLoadedRef.current) {
              video.preload = "metadata";
              video.load();
              hasLoadedRef.current = true;
            }
            if (autoPlay) {
              void video.play().catch(() => {
                // Autoplay can be blocked by browser or battery-saving settings.
              });
            }
          }, delayMs);
        } else {
          if (loadTimer) clearTimeout(loadTimer);
          video.pause();
        }
      },
      { rootMargin: "220px 0px", threshold: 0.05 },
    );

    observer.observe(video);

    return () => {
      if (loadTimer) clearTimeout(loadTimer);
      observer.disconnect();
      video.pause();
    };
  }, [autoPlay, delayMs]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      preload="none"
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      aria-label={ariaLabel}
    >
      {children}
    </video>
  );
}
