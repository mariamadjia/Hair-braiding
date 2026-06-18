'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ─────────────────────────────────────────────
   Design tokens — Warm Earth Tones color scheme
   Inspired by natural hair colors and African earth pigments
─────────────────────────────────────────────  */
const T = {
  bg:        '#1a1412',        // Deep brown-black
  bgSection: 'linear-gradient(160deg, #1a1412 0%, #2d1f1a 100%)',
  rightPage: '#fefdfb',        // Warm off-white
  heading:   '#2d1f1a',        // Rich dark brown
  body:      '#5a4a42',        // Warm medium brown
  accent:    '#d4895f',        // Warm caramel
  accentMid: '#e8a77d',        // Light caramel
  accentDim: 'rgba(212,137,95,0.15)',
  spine:     'linear-gradient(to right,#2d1f1a,#3d2f2a,#2d1f1a)',
  tagBg:     '#2d1f1a',
  wearBg:    '#2d1f1a',
  title:     '#fefdfb',
  sub:       'rgba(254,253,251,0.55)',
  dotOn:     '#fefdfb',
  dotOff:    'rgba(254,253,251,0.22)',
  btnBg:     '#fefdfb',
  btnText:   '#2d1f1a',
  pageNum:   '#b8a89d',
};

/* ─────────────────────────────────────────────
   Cover & back-cover SVGs (updated palette)
───────────────────────────────────────────── */
const CoverSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgCover" cx="50%" cy="40%">
        <stop offset="0%" stopColor="#1a1a1a"/>
        <stop offset="100%" stopColor="#0a0a0a"/>
      </radialGradient>
      <radialGradient id="glowCover" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#C8714A" stopOpacity="0.25"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
    </defs>
    <rect width="360" height="480" fill="url(#bgCover)"/>
    <circle cx="180" cy="190" r="120" fill="url(#glowCover)"/>
    <circle cx="180" cy="190" r="110" fill="none" stroke="#C8714A" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35"/>
    <circle cx="180" cy="190" r="90"  fill="none" stroke="#888"    strokeWidth="0.5" opacity="0.2"/>
    <ellipse cx="180" cy="145" rx="52" ry="58" fill="#1a1a1a"/>
    <path d="M148,195 Q130,240 140,280 Q150,320 135,360 Q128,380 135,400" stroke="#C8714A" strokeWidth="8" fill="none" strokeLinecap="round"/>
    <path d="M148,195 Q138,240 145,280 Q152,320 140,360 Q133,380 138,400" stroke="#888" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="8 12"/>
    <path d="M163,200 Q148,245 155,290 Q162,330 150,370 Q143,390 148,410" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round"/>
    <path d="M180,202 Q170,248 175,295 Q178,335 168,375 Q162,395 168,415" stroke="#d9896a" strokeWidth="8" fill="none" strokeLinecap="round"/>
    <path d="M197,200 Q208,245 200,290 Q192,330 200,370 Q206,390 200,410" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round"/>
    <path d="M212,195 Q225,238 215,278 Q205,318 215,358 Q222,378 215,398" stroke="#C8714A" strokeWidth="8" fill="none" strokeLinecap="round"/>
    <circle cx="140" cy="295" r="5" fill="#C8714A" opacity="0.9"/>
    <circle cx="155" cy="340" r="4" fill="#ffffff" opacity="0.6"/>
    <circle cx="168" cy="310" r="5" fill="#d9896a" opacity="0.9"/>
    <circle cx="201" cy="285" r="4" fill="#888" opacity="0.7"/>
    <circle cx="213" cy="330" r="5" fill="#C8714A" opacity="0.9"/>
    <text x="180" y="440" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="Georgia,serif" fontStyle="italic">Open to begin your journey</text>
    <text x="60"  y="80"  fill="#C8714A" fontSize="12" opacity="0.5">✦</text>
    <text x="295" y="65"  fill="#888"    fontSize="9"  opacity="0.35">✦</text>
    <text x="310" y="110" fill="#C8714A" fontSize="7"  opacity="0.3">✦</text>
  </svg>
);

const BackCoverSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgBack" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#1a1a1a"/>
        <stop offset="100%" stopColor="#0a0a0a"/>
      </radialGradient>
    </defs>
    <rect width="360" height="480" fill="url(#bgBack)"/>
    <circle cx="180" cy="200" r="100" fill="none" stroke="#C8714A" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.3"/>
    <circle cx="180" cy="200" r="80"  fill="none" stroke="#444"    strokeWidth="0.5" opacity="0.2"/>
    <text x="180" y="160" textAnchor="middle" fill="#C8714A" fontSize="36" fontFamily="serif">✦</text>
    <text x="180" y="200" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="Georgia,serif">Your hair is your crown.</text>
    <text x="180" y="222" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="Georgia,serif">Wear it with pride.</text>
    <text x="180" y="262" textAnchor="middle" fill="#666" fontSize="10" fontFamily="Georgia,serif" fontStyle="italic">— The Braid Book</text>
    <text x="180" y="350" textAnchor="middle" fill="#C8714A" fontSize="10" opacity="0.4">✦  ✦  ✦</text>
  </svg>
);

/* ─────────────────────────────────────────────
   Photo left page with Next.js Image
───────────────────────────────────────────── */
const PhotoPage = ({ src, label, subtitle }) => (
  <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#111' }}>
    <Image 
      src={src} 
      alt={`${label} - ${subtitle || 'Protective hairstyle'}`} 
      fill
      style={{ objectFit: 'cover', objectPosition: 'center top' }}
      sizes="(max-width: 768px) 50vw, 390px"
      priority={label === 'Box Braids'}
    />
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)', padding: '52px 18px 16px' }}>
      {subtitle && <p style={{ fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: T.accentMid, marginBottom: 4 }}>{subtitle}</p>}
      <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(0.95rem,2.2vw,1.35rem)', color: '#fff', fontStyle: 'italic', lineHeight: 1.2 }}>{label}</p>
    </div>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)', pointerEvents: 'none' }}/>
  </div>
);

/* ─────────────────────────────────────────────
   Spread data with booking links
───────────────────────────────────────────── */
const spreads = [
  {
    id: 0, title: 'Cover',
    leftEl: <CoverSVG />,
    rightContent: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%', maxWidth: 260, margin: '0 auto' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>🪢</div>
        <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.4rem,3vw,2rem)', color: T.heading, marginBottom: 16, lineHeight: 1.2 }}>The Braid Book</div>
        <div style={{ width: 40, height: 2, background: T.accent, marginBottom: 16 }}/>
        <p style={{ fontSize: 'clamp(0.7rem,1.3vw,0.83rem)', color: T.body, lineHeight: 1.75, fontStyle: 'italic' }}>
          Explore signature protective styles, learn the story behind each look, and discover the care details that help your braids wear beautifully.
        </p>
        <div style={{ width: 40, height: 2, background: T.accent, marginTop: 16, opacity: 0.4 }}/>
        <p style={{ marginTop: 14, fontSize: '0.6rem', color: '#999', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Flip Through 8 Signature Styles</p>
      </div>
    ),
    pageNum: 'i',
  },
  {
    id: 1, title: 'Box Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg" label="Box Braids" subtitle="West African Origin" />,
    originTag: 'West African Origin',
    name: 'Box Braids',
    story: [
      'Box braids are one of the most iconic protective styles in Black hair culture, with roots stretching back over 3,000 years to ancient Egypt and Sub-Saharan Africa.',
      'Named for the square "box" sections created during parting, this style became a symbol of cultural pride in the 1990s. Today they are a declaration of heritage, identity, and versatility.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Moisturize scalp weekly with a light oil. Remove by 8 weeks to prevent breakage.',
    pageNum: '01',
    bookingLink: '/booking/box-braids',
  },
  {
    id: 2, title: 'Cornrows',
    leftEl: <PhotoPage src="/Gallery/Conrows/Feedin Conrows/IMG_9304.jpg" label="Cornrows" subtitle="Sub-Saharan Africa" />,
    originTag: 'Sub-Saharan Africa',
    name: 'Cornrows',
    story: [
      'Among the oldest recorded hairstyles in the world, cornrows date back at least 3,000 years. Cave paintings in the Sahara depict styles remarkably similar to modern cornrows.',
      'During the transatlantic slave trade, enslaved Africans used cornrow patterns to map escape routes — a powerful act of resistance braided into hair.',
    ],
    wearTime: '2 – 4 Weeks',
    wearTip: 'Re-moisturize your edges every few days. Wrap at night with a satin scarf.',
    pageNum: '02',
    bookingLink: '/booking/conrows',
  },
  {
    id: 3, title: 'Senegalese Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/senegalese-twists /IMG_9111.jpg" label="Senegalese Twists" subtitle="Senegal, West Africa" />,
    originTag: 'Senegal, West Africa',
    name: 'Senegalese Twists',
    story: [
      'These elegant two-strand twists use a rope-twist technique — two strands coiled around each other — creating a smooth, silky texture that lies beautifully.',
      'Their sleek finish makes them one of the most polished-looking protective styles, perfect for professional settings while rooted in African heritage.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Spray scalp with diluted tea tree oil to prevent buildup. Unravel gently.',
    pageNum: '03',
    bookingLink: '/booking/twists',
  },
  {
    id: 4, title: 'Passion Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/passion-twists/IMG_9105.jpg" label="Passion Twists" subtitle="Modern Classic" />,
    originTag: 'Modern Classic',
    name: 'Passion Twists',
    story: [
      'Created by Miami stylist Keya Neal in 2018, passion twists combine the look of Senegalese twists with springy, curly extensions — giving a soft, bohemian finish that moves naturally.',
      'They remain one of the most requested styles today, loved for their effortless beauty and the freedom they give the wearer.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Protect with a satin bonnet each night. Avoid heavy products that weigh down the curls.',
    pageNum: '04',
    bookingLink: '/booking/twists',
  },
  {
    id: 5, title: 'Knotless Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /knotless/IMG_9219.jpg" label="Knotless Braids" subtitle="Modern Innovation" />,
    originTag: 'Modern Innovation',
    name: 'Knotless Braids',
    story: [
      'Knotless braids start with your natural hair and gradually feed in extensions — resulting in a flat, seamless root with significantly less tension than traditional box braids.',
      'Widely praised by trichologists for being gentler on the hairline and causing less traction alopecia.',
    ],
    wearTime: '6 – 10 Weeks',
    wearTip: 'Scalp-friendly! Still moisturize weekly. Looser tension means you can go longer.',
    pageNum: '05',
    bookingLink: '/booking/box-braids',
  },
  {
    id: 6, title: 'Goddess Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /goddess braids/IMG_9174.jpg" label="Goddess Braids" subtitle="African Diaspora" />,
    originTag: 'African Diaspora',
    name: 'Goddess Braids',
    story: [
      'Extra-thick, chunky cornrows raised slightly off the scalp, styled into dramatic sweeping patterns. Their bold scale and sculptural quality give them a regal quality — hence the name.',
      'Crowned with gold rings, shells, flowers, and beads, they transform hair into an art form. No two goddess braid styles are alike.',
    ],
    wearTime: '2 – 4 Weeks',
    wearTip: 'Re-braid the perimeter at week 2. Larger braids unravel faster at the edges.',
    pageNum: '06',
    bookingLink: '/booking/box-braids',
  },
  {
    id: 7, title: 'Bohemian Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/Bohemian-marley twists/IMG_9054.jpg" label="Bohemian Twists" subtitle="Free-Spirited Style" />,
    originTag: 'Free-Spirited Style',
    name: 'Bohemian Twists',
    story: [
      'Bohemian twists blend the structure of Marley twists with loose, curly ends that flow freely — creating a relaxed look that feels both polished and natural.',
      'Styled with curly extension hair peeking from every twist, giving that coveted "undone" bohemian energy with full protective benefits.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Refresh curly ends with water and leave-in conditioner spray. Style into a bun for variety.',
    pageNum: '07',
    bookingLink: '/booking/twists',
  },
  {
    id: 8, title: 'Crochet Braids',
    leftEl: <PhotoPage src="/Gallery/Crochets/Single/IMG_9380.jpg" label="Crochet Braids" subtitle="Caribbean & African Roots" />,
    originTag: 'Caribbean & African Roots',
    name: 'Crochet Braids',
    story: [
      'Cornrows are braided flat as a base, then extensions are looped through using a small crochet needle. Rooted in the Caribbean, this style achieves voluminous results in a fraction of the time.',
      'They can use virtually any texture — loose waves, Marley twists, loc extensions, or kinky puffs.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Reinstall loose extensions near the perimeter at week 3. Co-wash every 1–2 weeks.',
    pageNum: '08',
    bookingLink: '/booking/crochets',
  },
  {
    id: 9, title: 'Care Guide',
    leftEl: <BackCoverSVG />,
    rightContent: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', maxWidth: 260, margin: '0 auto' }}>
        <div style={{ fontSize: '1.4rem', marginBottom: 14 }}>💛</div>
        <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: '1.15rem', color: T.heading, marginBottom: 12 }}>Care for Your Braids</div>
        <div style={{ width: 40, height: 2, background: T.accent, marginBottom: 16 }}/>
        {[['✓ Moisturize','scalp weekly — jojoba, argan, or castor oil.'],['✓ Protect','with a satin or silk bonnet each night.'],['✓ Refresh','edges every few days with edge control.'],['✓ Remove','gently — detangle from ends to roots.'],['✓ Rest','between installs with a deep conditioning treatment.']].map(([b, r], i) => (
          <p key={i} style={{ fontSize: 'clamp(0.65rem,1.3vw,0.78rem)', color: T.body, lineHeight: 1.7, marginBottom: 7, textAlign: 'left', width: '100%' }}>
            <strong style={{ color: T.heading }}>{b}</strong> {r}
          </p>
        ))}
        <div style={{ width: 40, height: 2, background: T.accent, marginTop: 14, opacity: 0.4 }}/>
        <p style={{ marginTop: 12, fontSize: '0.68rem', color: '#999', fontStyle: 'italic' }}>Thank you for flipping through ✦</p>
      </div>
    ),
    pageNum: '✦',
  },
];

/* ─────────────────────────────────────────────
   Right-page renderer with booking button
───────────────────────────────────────────── */
function RightPageContent({ s }) {
  if (s.rightContent) return s.rightContent;
  return (
    <>
      {s.originTag && (
        <span style={{ display: 'inline-block', background: T.tagBg, color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
          {s.originTag}
        </span>
      )}
      <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.05rem,2.4vw,1.6rem)', color: T.heading, marginBottom: 8, lineHeight: 1.2 }}>
        {s.name}
      </div>
      <div style={{ width: 36, height: 2, background: T.accent, marginBottom: 10 }}/>
      {s.story?.map((para, i) => (
        <p key={i} style={{ fontSize: 'clamp(0.6rem,1.3vw,0.78rem)', color: T.body, lineHeight: 1.72, marginBottom: 8 }}>
          {para}
        </p>
      ))}
      {s.bookingLink && (
        <Link 
          href={s.bookingLink} 
          style={{ 
            display: 'inline-block', 
            background: T.accent, 
            color: '#fff', 
            padding: '8px 18px', 
            borderRadius: 4, 
            fontSize: '0.65rem', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            marginTop: 12, 
            marginBottom: 8, 
            fontWeight: 700, 
            textDecoration: 'none', 
            transition: 'all 0.2s', 
            boxShadow: '0 2px 8px rgba(200,113,74,0.3)' 
          }}
          onMouseEnter={(e) => { 
            e.target.style.background = T.accentMid; 
            e.target.style.transform = 'translateY(-1px)'; 
            e.target.style.boxShadow = '0 4px 12px rgba(200,113,74,0.4)'; 
          }}
          onMouseLeave={(e) => { 
            e.target.style.background = T.accent; 
            e.target.style.transform = 'translateY(0)'; 
            e.target.style.boxShadow = '0 2px 8px rgba(200,113,74,0.3)'; 
          }}>
          Book This Style →
        </Link>
      )}
      {s.wearTime && (
        <div style={{ background: T.wearBg, borderRadius: 8, padding: '10px 14px', marginTop: 'auto' }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: T.accentMid, marginBottom: 4 }}>Wear Time</div>
          <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(0.82rem,1.8vw,1.05rem)', color: '#fff', marginBottom: 3 }}>{s.wearTime}</div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{s.wearTip}</div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function FlipBook() {
  const [current,       setCurrent]      = useState(0);
  const [flipVisible,   setFlipVisible]  = useState(false);
  const [flipAnimating, setFlipAnimating]= useState(false);
  const [flipDir,       setFlipDir]      = useState(1);
  const [isAnimating,   setIsAnimating]  = useState(false);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const total  = spreads.length;

  const changePage = useCallback((dir) => {
    if (isAnimating) return;
    const next = current + dir;
    if (next < 0 || next >= total) return;
    setFlipDir(dir);
    setIsAnimating(true);
    setFlipVisible(true);
    setTimeout(() => setFlipAnimating(true), 30);
    setTimeout(() => setCurrent(next), 420);
    setTimeout(() => { setFlipVisible(false); setFlipAnimating(false); setIsAnimating(false); }, 850);
  }, [isAnimating, current, total]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') changePage(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   changePage(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [changePage]);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; };
  const onTouchEnd   = (e) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 44 && dy < 80) changePage(dx > 0 ? 1 : -1);
  };

  /* ── Nav ── */
  const Nav = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
        <button 
          onClick={() => changePage(-1)} 
          disabled={current === 0 || isAnimating}
          aria-label="Previous page"
          style={{ background: current === 0 ? 'rgba(255,255,255,0.08)' : T.btnBg, color: current === 0 ? 'rgba(255,255,255,0.25)' : T.btnText, border: 'none', padding: '10px 24px', borderRadius: 3, fontSize: '0.8rem', fontWeight: 700, cursor: current === 0 ? 'default' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
          ← Prev
        </button>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', letterSpacing: '0.12em', minWidth: 120, textAlign: 'center', textTransform: 'uppercase' }}>
          {spreads[current].title}
        </div>
        <button 
          onClick={() => changePage(1)} 
          disabled={current === total - 1 || isAnimating}
          aria-label="Next page"
          style={{ background: current === total-1 ? 'rgba(255,255,255,0.08)' : T.btnBg, color: current === total-1 ? 'rgba(255,255,255,0.25)' : T.btnText, border: 'none', padding: '10px 24px', borderRadius: 3, fontSize: '0.8rem', fontWeight: 700, cursor: current === total-1 ? 'default' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
          Next →
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {spreads.map((_, i) => (
          <button 
            key={i} 
            onClick={() => { if (i !== current && !isAnimating) changePage(i > current ? 1 : -1); }}
            aria-label={`Go to page ${i + 1}`}
            aria-current={i === current ? 'true' : 'false'}
            style={{ width: i === current ? 20 : 6, height: 6, borderRadius: i === current ? 3 : '50%', background: i === current ? T.dotOn : T.dotOff, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}/>
        ))}
      </div>
    </>
  );

  /* ── Header ── */
  const Header = () => (
    <>
      <h2 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.6rem,4vw,2.8rem)', color: T.title, textAlign: 'center', marginBottom: 6, letterSpacing: 1 }}>
        The Braid Book
      </h2>
      <p style={{ color: T.sub, textAlign: 'center', fontSize: '0.7rem', marginBottom: 12, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        A Journey Through Protective Styles
      </p>
      <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontSize: '0.62rem', marginBottom: 28, fontStyle: 'italic' }}>
        Use arrow keys or swipe to navigate • Click styles to book
      </p>
    </>
  );
  
  return (
    <section 
      style={{ background: T.bgSection, padding: '60px 20px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      aria-label="The Braid Book - Interactive guide to protective hairstyles"
    >
      <Header />

      {/* Book */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ perspective: '2000px', width: 'min(780px,96vw)', height: 'min(520px,66vw)', position: 'relative', minHeight: 260 }}
        role="region"
        aria-label={`Page ${current + 1} of ${total}: ${spreads[current].title}`}
        tabIndex="0"
      >
        <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}>

          {/* Spine */}
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 20, height: '100%', background: T.spine, zIndex: 100, borderRadius: 2, boxShadow: '0 0 24px rgba(0,0,0,0.9)' }}/>

          {/* Spreads */}
          {spreads.map((s, i) => (
            <div key={s.id} style={{ width: '100%', height: '100%', display: 'flex', borderRadius: '3px 16px 16px 3px', overflow: 'hidden', position: 'absolute', top: 0, left: 0, opacity: i === current ? 1 : 0, pointerEvents: i === current ? 'all' : 'none', transition: 'opacity 0.05s', boxShadow: i === current ? '0 24px 64px rgba(0,0,0,0.6)' : 'none' }}>
              {/* Left */}
              <div style={{ width: '50%', height: '100%', background: '#111', position: 'relative', overflow: 'hidden', borderRight: '1px solid #1e1e1e', flexShrink: 0 }}>
                {s.leftEl}
              </div>
              {/* Right */}
              <div style={{ width: '50%', height: '100%', flexShrink: 0, background: T.rightPage, padding: 'clamp(16px,3vw,28px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: 24, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.06),transparent)', pointerEvents: 'none' }}/>
                <RightPageContent s={s} />
                <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.58rem', color: T.pageNum, letterSpacing: 1 }}>{s.pageNum}</div>
              </div>
            </div>
          ))}

          {/* Flip overlay */}
          {flipVisible && (
            <div className={flipAnimating ? (flipDir > 0 ? 'flip-forward' : 'flip-back') : ''}
              style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%', transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: 50 }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '0 16px 16px 0', background: T.rightPage, boxShadow: '-4px 0 20px rgba(0,0,0,0.2)' }}/>
              <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '0 16px 16px 0', background: T.rightPage, boxShadow: '4px 0 20px rgba(0,0,0,0.2)' }}/>
            </div>
          )}
        </div>
      </div>

      {/* Shadow */}
      <div style={{ width: 'min(680px,88vw)', height: 32, background: 'radial-gradient(ellipse,rgba(0,0,0,0.6) 0%,transparent 70%)', marginTop: -8, filter: 'blur(10px)' }}/>
      <Nav />
    </section>
  );
}
