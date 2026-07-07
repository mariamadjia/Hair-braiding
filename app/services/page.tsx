import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default function ServicesPage() {
    return (
        <>
            <Navbar />
            <Services />
            <Footer />
        </>
    );
}
