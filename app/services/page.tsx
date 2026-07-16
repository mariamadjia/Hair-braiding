import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import FooterWrapper from "@/components/FooterWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ServicesPage() {
    return (
        <>
            <Navbar />
            <Services />
            <FooterWrapper />
        </>
    );
}
