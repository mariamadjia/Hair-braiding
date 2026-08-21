import "./globals.css"
import Navbar from "@/components/Navbar"
import Services from "@/components/Services"
import HeroWrapper from "@/components/HeroWrapper"
import Welcome from "@/components/Welcome"
import Gallery from "@/components/Gallery"
import FlipBook from "@/components/FlipBook3D"
import ReviewSpotlight from "@/components/ReviewSpotlight"
import FooterWrapper from "@/components/FooterWrapper"

export default function Home() {
  return (
    <>
      <Navbar />
      {/* <Services /> */}
      <HeroWrapper />
      <Welcome />
      <Gallery />
      <FlipBook />
      <ReviewSpotlight />
      <FooterWrapper />
    </>
  );
}
