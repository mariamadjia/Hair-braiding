import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

console.log('BACKEND_API_URL:', BACKEND_API_URL);

const MAX_HERO_IMAGES = 5;

type BackendImage = {
  imageUrl?: string;
};

function toPublicHeroImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) {
    return null;
  }

  // Supports a full URL if the backend ever returns one.
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://")
  ) {
    return imageUrl;
  }

  // New database format:
  // /api/gallery/image/filename.jpg
  if (imageUrl.startsWith("/api/gallery/image/")) {
    return `${BACKEND_API_URL}${imageUrl}`;
  }

  // Existing database format:
  // /Gallery/uploads/filename.jpg
  const filename = imageUrl.split("/").filter(Boolean).pop();

  if (!filename) {
    return null;
  }

  return `${BACKEND_API_URL}/api/gallery/image/${encodeURIComponent(filename)}`;
}

export async function GET() {
  try {
    let backendAvailable = false;

    try {
      const backendRes = await fetch(
        `${BACKEND_API_URL}/api/gallery?isHero=true`,
        {
          cache: "no-store",
        }
      );

      if (backendRes.ok) {
        backendAvailable = true;

        const data: BackendImage[] = await backendRes.json();

        const images = Array.isArray(data)
          ? data
              .map((item) => toPublicHeroImageUrl(item.imageUrl))
              .filter((url): url is string => Boolean(url))
              .slice(0, MAX_HERO_IMAGES)
          : [];

        if (images.length > 0) {
          return NextResponse.json({
            images,
            source: "backend",
          });
        }
      }
    } catch (error) {
      console.error("Hero backend request failed:", error);
    }

    // Local fallback images only when the backend is unavailable
    // or there are no Hero images in the backend.
    const heroDirectory = path.join(process.cwd(), "public", "hero");

    if (fs.existsSync(heroDirectory)) {
      const imageFiles = fs
        .readdirSync(heroDirectory)
        .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .slice(0, MAX_HERO_IMAGES);

      if (imageFiles.length > 0) {
        return NextResponse.json({
          images: imageFiles.map((file) => `/hero/${file}`),
          source: backendAvailable
            ? "filesystem-fallback"
            : "filesystem",
        });
      }
    }

    return NextResponse.json({
      images: [],
      source: "none",
    });
  } catch (error) {
    console.error("Error loading hero images:", error);

    return NextResponse.json({
      images: [],
      source: "error",
    });
  }
}
