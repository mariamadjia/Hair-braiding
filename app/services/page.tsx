import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import FooterWrapper from "@/components/FooterWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Book Your Braiding Appointment",
    description: "Explore AH Braiding services and book your next braiding appointment in San Antonio, Texas.",
    alternates: { canonical: "/services" },
    openGraph: {
        title: "Book Your Braiding Appointment",
        description: "Choose your braiding service and book now with AH Braiding.",
        url: "/services",
        type: "website",
        images: [
            {
                url: "/social/ah-braiding-cover.jpg",
                width: 1200,
                height: 630,
                alt: "A client wearing silver braids styled by AH Braiding",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Book Your Braiding Appointment",
        description: "Choose your braiding service and book now with AH Braiding.",
        images: ["/social/ah-braiding-cover.jpg"],
    },
};

export default function ServicesPage() {
    return (
        <>
            <Navbar />
            <Services />
            <FooterWrapper />
        </>
    );
}
