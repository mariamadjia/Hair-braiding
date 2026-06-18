interface FooterProps {
  videoSrc?: string;
}

export default function Footer({ videoSrc = '/Footer/IMG_2004.mov' }: FooterProps = {}) {
  return (
    <footer className="bg-[#2C1810] text-white w-full">
      
      {/* Mobile Layout */}
      <div className="lg:hidden px-6 pt-12 pb-10">
        {/* Centered Branding */}
        <h2 className="text-2xl font-semibold tracking-[0.25em] mb-8 text-center">
          BY AH BRAIDING
        </h2>

        {/* Large Centered Video */}
        <div className="w-full max-w-xs mx-auto mb-8">
          <div className="aspect-[4/5] overflow-hidden">
            <video
              src={videoSrc}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>

        {/* Centered Social Links */}
        <div className="flex flex-wrap justify-center gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
          <a
            href="https://www.instagram.com/ah_braiding"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            INSTAGRAM
          </a>
          <a
            href="https://www.tiktok.com/@ah.braiding"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            TIKTOK
          </a>
          <a
            href="https://www.facebook.com/adjias.braiding"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            FACEBOOK
          </a>
         
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block w-full px-12 md:px-16 lg:px-24 pt-14 pb-10">
        <div className="flex items-center justify-between">
          {/* Left: Brand + Social */}
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-[0.25em] mb-6">
              BY AH BRAIDING
            </h2>

            <div className="flex flex-wrap gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
              <a
                href="https://www.instagram.com/ah_braiding"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                INSTAGRAM
              </a>
              <a
                href="https://www.tiktok.com/@ah.braiding"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                TIKTOK
              </a>
              <a
                href="https://www.facebook.com/adjias.braiding"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                FACEBOOK
              </a>
            </div>
          </div>

          {/* Right: Video */}
          <div>
            <div className="w-[300px] md:w-[380px] lg:w-[450px] aspect-[6/5] overflow-hidden">
              <video
                src={videoSrc}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 30%' }}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white"></div>

      {/* Bottom Bar */}
      <div className="px-6 py-6">
        {/* Mobile: Centered Credit */}
        <div className="lg:hidden text-center text-[10px] uppercase tracking-[0.15em] opacity-100">
          DESIGNED BY Gloria Djonret
        </div>

        {/* Desktop: Navigation + Credit */}
        <div className="hidden lg:flex flex-wrap justify-between items-center gap-4">
          <nav className="flex flex-wrap gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
            <a href="/" className="hover:opacity-70 transition-opacity">HOME</a>
            <a href="/gallery" className="hover:opacity-70 transition-opacity">GALLERY</a>
            <a href="/services" className="hover:opacity-70 transition-opacity">SERVICES</a>
            <a href="/contact" className="hover:opacity-70 transition-opacity">CONTACT</a>
          </nav>

          <div className="text-[10px] uppercase tracking-[0.15em] opacity-100">
             {""}
            <a
                href="https://www.gloria-djonret.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
            >
               DESIGNED BY Gloria Djonret
            </a>
          </div>
        </div>
      </div>

    </footer>
  );
}