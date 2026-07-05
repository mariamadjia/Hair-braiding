import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const MAX_HERO_IMAGES = 5;

function toPublicHeroImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null;

  // Already a full URL
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // New database format:
  // /api/gallery/image/filename.jpg
  if (imageUrl.startsWith("/api/gallery/image/")) {
    return `${BACKEND_API_URL}${imageUrl}`;
  }

  // Old database format:
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
        { cache: "no-store" }
      );

      if (backendRes.ok) {
        backendAvailable = true;

        const data = await backendRes.json();

        if (Array.isArray(data) && data.length > 0) {
          const images = data
            .map((item: { imageUrl?: string }) =>
              toPublicHeroImageUrl(item.imageUrl)
            )
            .filter((url: string | null): url is string => Boolean(url))
            .slice(0, MAX_HERO_IMAGES);

          return NextResponse.json({
            images,
            source: "backend",
          });
        }
      }
    } catch (error) {
      console.error("Backend unavailable:", error);
    }

    // Local fallback images
    const heroDirectory = path.join(process.cwd(), "public", "hero");

    if (fs.existsSync(heroDirectory)) {
      const files = fs.readdirSync(heroDirectory);

      const imageFiles = files
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
    console.error("Error reading hero images:", error);

    return NextResponse.json({
      images: [],
      source: "error",
    });
  }
}
