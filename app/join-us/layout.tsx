import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
    "Join Our Braiding Team",
    "Apply to join the AH Braiding team in San Antonio and work in a professional salon with flexible scheduling.",
    "/join-us",
);

export default function JoinUsLayout({ children }: { children: ReactNode }) {
    return children;
}
