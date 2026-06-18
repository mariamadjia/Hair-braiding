'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────── */
const T = {
  bg:        '#0d0d0d',
  bgSection: 'linear-gradient(160deg, #0d0d0d 0%, #141414 100%)',
  rightPage: '#faf8f5',        // warm paper
  heading:   '#111111',
  body:      '#404040',
  accent:    '#C8714A',
  accentMid: '#d9896a',
  accentDim: 'rgba(200,113,74,0.15)',
  spine:     'linear-gradient(to right,#0e0e0e,#2b2b2b 30%,#383838 50%,#2b2b2b 70%,#0e0e0e)',
  tagBg:     '#C8714A',        // terracotta tag
  wearBg:    '#1a1410',        // dark warm
  title:     '#ffffff',
  sub:       'rgba(255,255,255,0.4)',
  dotOn:     '#ffffff',
  dotOff:    'rgba(255,255,255,0.16)',
  btnBg:     '#ffffff',
  btnText:   '#111111',
  pageNum:   '#b0a89e',
};

/* ─────────────────────────────────────────────
   Cover SVG
───────────────────────────────────────────── */
const CoverSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgCover" cx="50%" cy="40%">
        <stop offset="0%" stopColor="#1e1a17"/>
        <stop offset="100%" stopColor="#090909"/>
      </radialGradient>
      <radialGradient id="glowCover" cx="50%" cy="55%">
        <stop offset="0%" stopColor="#C8714A" stopOpacity="0.28"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
    </defs>

    {/* Background */}
    <rect width="360" height="480" fill="url(#bgCover)"/>

    {/* Outer decorative frame */}
    <rect x="14" y="14" width="332" height="452" fill="none" stroke="#C8714A" strokeWidth="0.7" opacity="0.45"/>
    {/* Inner frame */}
    <rect x="20" y="20" width="320" height="440" fill="none" stroke="#444" strokeWidth="0.4" opacity="0.22"/>
    {/* Corner ornaments */}
    <text x="17"  y="32"  fill="#C8714A" fontSize="10" opacity="0.55">✦</text>
    <text x="334" y="32"  fill="#C8714A" fontSize="10" opacity="0.55">✦</text>
    <text x="17"  y="465" fill="#C8714A" fontSize="10" opacity="0.55">✦</text>
    <text x="334" y="465" fill="#C8714A" fontSize="10" opacity="0.55">✦</text>

    {/* Title at top */}
    <text x="180" y="65" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="19" fontFamily="Georgia,serif" fontStyle="italic" letterSpacing="1.5">The Braid Book</text>
    <line x1="110" y1="74" x2="250" y2="74" stroke="#C8714A" strokeWidth="0.6" opacity="0.5"/>

    {/* Glow behind illustration */}
    <circle cx="180" cy="230" r="120" fill="url(#glowCover)"/>
    <circle cx="180" cy="230" r="108" fill="none" stroke="#C8714A" strokeWidth="0.6" strokeDasharray="4 7" opacity="0.28"/>
    <circle cx="180" cy="230" r="88"  fill="none" stroke="#555"    strokeWidth="0.4" opacity="0.18"/>

    {/* Head silhouette */}
    <ellipse cx="180" cy="182" rx="48" ry="54" fill="#1a1410"/>

    {/* Braid strands */}
    <path d="M149,232 Q128,280 139,322 Q150,362 133,402" stroke="#C8714A" strokeWidth="7.5" fill="none" strokeLinecap="round"/>
    <path d="M149,232 Q137,280 143,322 Q149,362 137,402" stroke="#777" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="7 11"/>
    <path d="M163,238 Q146,286 153,330 Q159,368 146,408" stroke="#f0f0f0" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
    <path d="M180,240 Q168,288 173,334 Q176,372 164,412" stroke="#d9896a" strokeWidth="7.5" fill="none" strokeLinecap="round"/>
    <path d="M197,238 Q210,285 202,330 Q193,368 202,408" stroke="#f0f0f0" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
    <path d="M211,232 Q226,278 215,320 Q204,360 215,400" stroke="#C8714A" strokeWidth="7.5" fill="none" strokeLinecap="round"/>

    {/* Bead accents */}
    <circle cx="139" cy="330" r="5" fill="#C8714A" opacity="0.95"/>
    <circle cx="153" cy="374" r="4" fill="#fff" opacity="0.6"/>
    <circle cx="168" cy="345" r="5" fill="#d9896a" opacity="0.95"/>
    <circle cx="202" cy="323" r="4" fill="#888" opacity="0.7"/>
    <circle cx="214" cy="368" r="5" fill="#C8714A" opacity="0.95"/>

    {/* Bottom tagline */}
    <line x1="110" y1="446" x2="250" y2="446" stroke="#C8714A" strokeWidth="0.6" opacity="0.4"/>
    <text x="180" y="460" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9.5" fontFamily="Georgia,serif" fontStyle="italic" letterSpacing="0.5">Open to begin your journey</text>
  </svg>
);

/* ─────────────────────────────────────────────
   Back cover SVG
───────────────────────────────────────────── */
const BackCoverSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 360 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgBack" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#1e1a17"/>
        <stop offset="100%" stopColor="#090909"/>
      </radialGradient>
    </defs>
    <rect width="360" height="480" fill="url(#bgBack)"/>
    <rect x="14" y="14" width="332" height="452" fill="none" stroke="#C8714A" strokeWidth="0.7" opacity="0.38"/>
    <rect x="20" y="20" width="320" height="440" fill="none" stroke="#444" strokeWidth="0.4" opacity="0.18"/>
    <text x="17"  y="32"  fill="#C8714A" fontSize="10" opacity="0.45">✦</text>
    <text x="334" y="32"  fill="#C8714A" fontSize="10" opacity="0.45">✦</text>
    <text x="17"  y="465" fill="#C8714A" fontSize="10" opacity="0.45">✦</text>
    <text x="334" y="465" fill="#C8714A" fontSize="10" opacity="0.45">✦</text>
    <circle cx="180" cy="210" r="95" fill="none" stroke="#C8714A" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.28"/>
    <circle cx="180" cy="210" r="74" fill="none" stroke="#444"    strokeWidth="0.4" opacity="0.18"/>
    <text x="180" y="172" textAnchor="middle" fill="#C8714A" fontSize="30" fontFamily="serif">✦</text>
    <text x="180" y="214" textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize="13.5" fontFamily="Georgia,serif" letterSpacing="0.5">Your hair is your crown.</text>
    <text x="180" y="236" textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize="13.5" fontFamily="Georgia,serif" letterSpacing="0.5">Wear it with pride.</text>
    <text x="180" y="272" textAnchor="middle" fill="#666" fontSize="10" fontFamily="Georgia,serif" fontStyle="italic">— The Braid Book</text>
    <text x="180" y="360" textAnchor="middle" fill="#C8714A" fontSize="9" opacity="0.38">✦  ✦  ✦</text>
  </svg>
);

/* ─────────────────────────────────────────────
   Photo left page
───────────────────────────────────────────── */
const PhotoPage = ({ src, label, subtitle }) => (
  <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#111' }}>
    <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}/>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)', padding: '52px 18px 16px' }}>
      {subtitle && <p style={{ fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: T.accentMid, marginBottom: 4 }}>{subtitle}</p>}
      <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(0.95rem,2.2vw,1.35rem)', color: '#fff', fontStyle: 'italic', lineHeight: 1.2 }}>{label}</p>
    </div>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)', pointerEvents: 'none' }}/>
  </div>
);

/* ─────────────────────────────────────────────
   Spread data
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
    id: 1, title: 'Box Braids', quote: 'A symbol of cultural pride, braided into every strand.',
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
  },
  {
    id: 2, title: 'Cornrows', quote: 'Resistance, heritage, and beauty — mapped in hair.',
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
  },
  {
    id: 3, title: 'Senegalese Twists', quote: 'Sleek, silky, and rooted in African grace.',
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
  },
  {
    id: 4, title: 'Passion Twists', quote: 'Effortless beauty with a bohemian spirit.',
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
  },
  {
    id: 5, title: 'Knotless Braids', quote: 'Seamless roots. Less tension. More freedom.',
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
  },
  {
    id: 6, title: 'Goddess Braids', quote: 'Bold, sculptural, and regal by design.',
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
  },
  {
    id: 7, title: 'Bohemian Twists', quote: 'Polished structure meets free-spirited flow.',
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
  },
  {
    id: 8, title: 'Crochet Braids', quote: 'Voluminous results, rooted in Caribbean craft.',
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
   Right-page content
───────────────────────────────────────────── */
function RightPageContent({ s }) {
  if (s.rightContent) return s.rightContent;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Origin — small all-caps label, no pill */}
      {s.originTag && (
        <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: T.accent, fontWeight: 700, marginBottom: 10 }}>
          {s.originTag}
        </div>
      )}

      {/* Style name — large editorial serif italic */}
      <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.3rem,2.8vw,2rem)', color: T.heading, lineHeight: 1.08, marginBottom: 14, fontStyle: 'italic' }}>
        {s.name}
      </div>

      {/* Pull quote — left accent border */}
      {s.quote && (
        <div style={{ borderLeft: `2px solid ${T.accent}`, paddingLeft: 10, marginBottom: 14 }}>
          <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(0.68rem,1.4vw,0.86rem)', color: T.accent, fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
            &ldquo;{s.quote}&rdquo;
          </p>
        </div>
      )}

      {/* Story body */}
      <div style={{ flex: 1 }}>
        {s.story?.map((para, i) => (
          <p key={i} style={{ fontSize: 'clamp(0.58rem,1.2vw,0.73rem)', color: T.body, lineHeight: 1.8, marginBottom: 7 }}>
            {para}
          </p>
        ))}
      </div>

      {/* Divider */}
      {s.wearTime && (
        <div style={{ height: 1, background: 'rgba(0,0,0,0.09)', margin: '12px 0 10px' }}/>
      )}

      {/* Wear time — clean editorial, no dark box */}
      {s.wearTime && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: '0.48rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: T.accent, fontWeight: 700 }}>Wear Time</span>
            <span style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(0.8rem,1.6vw,0.98rem)', color: T.heading }}>{s.wearTime}</span>
          </div>
          <p style={{ fontSize: 'clamp(0.55rem,1.1vw,0.68rem)', color: '#888', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>{s.wearTip}</p>
        </div>
      )}
    </div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button onClick={() => changePage(-1)} disabled={current === 0 || isAnimating}
          style={{ background: current === 0 ? 'rgba(255,255,255,0.07)' : T.btnBg, color: current === 0 ? 'rgba(255,255,255,0.2)' : T.btnText, border: 'none', padding: '10px 26px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 700, cursor: current === 0 ? 'default' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
          ← Prev
        </button>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.14em', minWidth: 120, textAlign: 'center', textTransform: 'uppercase' }}>
          {spreads[current].title}
        </div>
        <button onClick={() => changePage(1)} disabled={current === total - 1 || isAnimating}
          style={{ background: current === total-1 ? 'rgba(255,255,255,0.07)' : T.btnBg, color: current === total-1 ? 'rgba(255,255,255,0.2)' : T.btnText, border: 'none', padding: '10px 26px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 700, cursor: current === total-1 ? 'default' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
          Next →
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {spreads.map((_, i) => (
          <button key={i} onClick={() => { if (i !== current && !isAnimating) changePage(i > current ? 1 : -1); }}
            style={{ width: i === current ? 22 : 6, height: 6, borderRadius: i === current ? 3 : '50%', background: i === current ? T.accent : T.dotOff, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}/>
        ))}
      </div>
    </>
  );

  /* ── Header ── */
  const Header = () => (
    <>
      <div style={{ color: T.accent, fontSize: '0.85rem', marginBottom: 10, opacity: 0.9 }}>✦</div>
      <h2 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.6rem,4vw,2.8rem)', color: T.title, textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>
        The Braid Book
      </h2>
      <p style={{ color: T.sub, textAlign: 'center', fontSize: '0.68rem', marginBottom: 36, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
        A Journey Through Protective Styles
      </p>
    </>
  );

  return (
    <section style={{ background: T.bgSection, padding: '72px 20px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient warm glow behind the book */}
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse, rgba(200,113,74,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }}/>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Header />

        {/* ── Book container ── */}
        <div
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ perspective: '1400px', width: 'min(780px,96vw)', height: 'min(520px,66vw)', position: 'relative', minHeight: 260 }}>

          {/* Page stack (fore-edge depth) — behind right half */}
          <div style={{ position: 'absolute', top: 3,  right: -4, bottom: 3,  left: '50%', background: '#ede9e2', borderRadius: '0 15px 15px 0', zIndex: 0 }}/>
          <div style={{ position: 'absolute', top: 6,  right: -7, bottom: 6,  left: '50%', background: '#e4dfd7', borderRadius: '0 13px 13px 0', zIndex: -1 }}/>
          <div style={{ position: 'absolute', top: 9,  right: -10, bottom: 9, left: '50%', background: '#dbd5cc', borderRadius: '0 11px 11px 0', zIndex: -2 }}/>

          {/* Left cover stack (spine edge) */}
          <div style={{ position: 'absolute', top: 2, left: -3, bottom: 2, right: '50%', background: '#181410', zIndex: 0 }}/>
          <div style={{ position: 'absolute', top: 4, left: -5, bottom: 4, right: '50%', background: '#100e0c', zIndex: -1 }}/>

          {/* Inner book — slightly tilted for depth */}
          <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: 'rotateX(2deg)', zIndex: 1 }}>

            {/* Spine */}
            <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 26, height: '100%', background: T.spine, zIndex: 100, borderRadius: '2px', boxShadow: '0 0 36px rgba(0,0,0,0.98), 0 2px 12px rgba(0,0,0,0.85)' }}>
              {/* Highlight seam */}
              <div style={{ position: 'absolute', left: 4, top: 0, width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent 4%, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 75%, transparent 96%)' }}/>
              {/* Shadow seam */}
              <div style={{ position: 'absolute', right: 4, top: 0, width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent 4%, rgba(0,0,0,0.45) 25%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.45) 75%, transparent 96%)' }}/>
            </div>

            {/* Spreads */}
            {spreads.map((s, i) => (
              <div key={s.id} style={{ width: '100%', height: '100%', display: 'flex', borderRadius: '3px 16px 16px 3px', overflow: 'hidden', position: 'absolute', top: 0, left: 0, opacity: i === current ? 1 : 0, pointerEvents: i === current ? 'all' : 'none', transition: 'opacity 0.05s', boxShadow: i === current ? '0 28px 72px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4)' : 'none' }}>
                {/* Left page */}
                <div style={{ width: '50%', height: '100%', background: '#111', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {s.leftEl}
                </div>
                {/* Right page */}
                <div style={{ width: '50%', height: '100%', flexShrink: 0, background: T.rightPage, padding: 'clamp(14px,2.8vw,26px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {/* Gutter shadow */}
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 32, height: '100%', background: 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.02), transparent)', pointerEvents: 'none' }}/>
                  {/* Top shadow */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), transparent)', pointerEvents: 'none' }}/>
                  {/* Bottom shadow */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to top, rgba(0,0,0,0.04), transparent)', pointerEvents: 'none' }}/>
                  <RightPageContent s={s} />
                  <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.56rem', color: T.pageNum, letterSpacing: '0.08em' }}>{s.pageNum}</div>
                </div>
              </div>
            ))}

            {/* Flip overlay — with curl shadow gradients */}
            {flipVisible && (
              <div className={flipAnimating ? (flipDir > 0 ? 'flip-forward' : 'flip-back') : ''}
                style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%', transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: 50 }}>
                {/* Front face (leaving page) */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '0 16px 16px 0', background: T.rightPage, boxShadow: '-6px 0 24px rgba(0,0,0,0.22)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 18%, transparent 48%)', pointerEvents: 'none' }}/>
                </div>
                {/* Back face (arriving page) */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '0 16px 16px 0', background: '#f0ece6', boxShadow: '6px 0 24px rgba(0,0,0,0.22)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.04) 18%, transparent 48%)', pointerEvents: 'none' }}/>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Book shadow */}
        <div style={{ width: 'min(680px,88vw)', height: 48, background: 'radial-gradient(ellipse 75% 100% at 50% 0%, rgba(0,0,0,0.7) 0%, rgba(200,113,74,0.04) 55%, transparent 100%)', marginTop: -6, filter: 'blur(14px)', transform: 'scaleY(0.45)', flexShrink: 0 }}/>

        <Nav />
      </div>
    </section>
  );
}
