import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
    "Braiding Gallery",
    "Browse knotless braids, box braids, twists, locs, cornrows, and other styles created by AH Braiding in San Antonio.",
    "/gallery",
);

export default function GalleryLayout({ children }: { children: ReactNode }) {
    return children;
}
