import Footer from "@/components/Footer";

const DEFAULT_FOOTER_VIDEO = "/Footer/IMG_2004.m4v";

export default function FooterWrapper() {
  // Keep one stable, mobile-safe source for the lifetime of the footer.
  // Replacing it after hydration destroys the playing video element and the
  // backend MOV route is not safe behind CDN byte-range caching.
  return <Footer videoSrc={DEFAULT_FOOTER_VIDEO} />;
}
