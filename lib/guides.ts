"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config/api";
import { toProxyUrl } from "@/lib/utils/image";

export type SizeGuideProfile = { id: number; guideKey: string; displayName: string; imageUrl?: string | null; displayOrder: number };
export type GuideSettings = { lengthGuideEnabled: boolean; sizeGuideEnabled: boolean; lengthGuideImageUrl?: string | null; sizes: SizeGuideProfile[] };

export function guideKeyForSize(name?: string | null) {
  const key = (name || "").toLowerCase().replace(/[^a-z]/g, "");
  if (key === "extrasmall" || key === "xs") return "xsmall";
  return key;
}

export function useGuideSettings() {
  const [guides, setGuides] = useState<GuideSettings | null>(null);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/guides`).then(response => response.ok ? response.json() : null).then(setGuides).catch(() => setGuides(null));
  }, []);
  return guides;
}

export function guideImageUrl(value?: string | null) { return value ? toProxyUrl(value) : ""; }
