import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import FooterWrapper from "@/components/FooterWrapper";
import { pageMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = pageMetadata(
    "Book Your Braiding Appointment",
    "Explore AH Braiding services, choose your style, and book your next braiding appointment in San Antonio, Texas.",
    "/services",
);

export default function ServicesPage() {
    return (
        <>
            <Navbar />
            <Services />
            <FooterWrapper />
        </>
    );
}
