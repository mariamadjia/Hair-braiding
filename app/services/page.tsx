import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import Footer from "@/components/Footer";

export const dynamic = 'force-dynamic';

export default function ServicesPage() {
    return (
        <>
            <Navbar />
            <Services />
            <Footer />
        </>
    );
}
