import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
    "Book a Braiding Appointment",
    "Choose a braiding style, size, and length, then request your appointment with AH Braiding in San Antonio.",
    "/services",
);

export default function BookingLayout({ children }: { children: ReactNode }) {
    return children;
}
