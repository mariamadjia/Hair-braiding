import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, Allura, Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Chatbot from "@/components/Chatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const allura = Allura({
  variable: "--font-allura",
  subsets: ["latin"],
  weight: ["400"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ahbraiding.com"),
  title: {
    default: "AH Braiding | Professional Hair Braiding in San Antonio",
    template: "%s | AH Braiding",
  },
  description:
    "Explore signature protective styles and request a professional braiding appointment with AH Braiding in San Antonio, Texas.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AH Braiding | The Art of Elegant Braiding",
    description:
      "Explore signature protective styles and book with AH Braiding in San Antonio, Texas.",
    url: "/",
    siteName: "AH Braiding",
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
    title: "AH Braiding | The Art of Elegant Braiding",
    description: "Professional protective styling in San Antonio, Texas.",
    images: ["/social/ah-braiding-cover.jpg"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/logo/logo2.PNG", apple: "/logo/logo2.PNG" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${allura.variable} ${playfair.variable} ${montserrat.variable} antialiased bg-[#F6F5F1]`}
      >
        <Providers>
          {children}
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}
