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
  poster?: string;
  eager?: boolean;
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
  poster,
  eager = false,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (eager) {
      video.preload = "auto";
      video.load();
      hasLoadedRef.current = true;
      if (autoPlay) void video.play().catch(() => {});
      return () => video.pause();
    }

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
      // Start early enough for the first frame to be ready when the user
      // reaches a footer, while still avoiding video work near page load.
      { rootMargin: "800px 0px", threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      if (loadTimer) clearTimeout(loadTimer);
      observer.disconnect();
      video.pause();
    };
  }, [autoPlay, delayMs, eager]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      preload={eager ? "auto" : "none"}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      aria-label={ariaLabel}
      poster={poster}
    >
      {children}
    </video>
  );
}
