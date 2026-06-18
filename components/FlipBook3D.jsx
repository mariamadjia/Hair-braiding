'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const T = {
  bg:        '#FFF5EE',
  bgSection: '#FFF5EE',
  rightPage: '#fefdfb',
  heading:   '#2d1f1a',
  body:      '#6a5a52',
  bodyLight: '#8a7a72',
  accent:    '#c8714a',
  accentMid: '#d4895f',
  accentDim: 'rgba(200,113,74,0.12)',
  spine:     'linear-gradient(to right,#2d1f1a,#3d2f2a,#2d1f1a)',
  tagBg:     '#f5f3f0',
  tagText:   '#c8714a',
  wearBg:    '#f8f6f4',
  title:     '#2d1f1a',
  sub:       'rgba(45,31,26,0.7)',
  dotOn:     '#2d1f1a',
  dotOff:    'rgba(45,31,26,0.22)',
  btnBg:     '#2d1f1a',
  btnText:   '#fefdfb',
  pageNum:   '#b8a89d',
};

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
      <clipPath id="coverPhotoClip">
        <circle cx="180" cy="190" r="82"/>
      </clipPath>
    </defs>
    <rect width="360" height="480" fill="url(#bgCover)"/>
    <circle cx="180" cy="190" r="120" fill="url(#glowCover)"/>
    <circle cx="180" cy="190" r="110" fill="none" stroke="#C8714A" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35"/>
    <circle cx="180" cy="190" r="90"  fill="none" stroke="#888"    strokeWidth="0.5" opacity="0.2"/>
    <circle cx="180" cy="190" r="84" fill="#111" stroke="rgba(200,113,74,0.65)" strokeWidth="1.2"/>
    <image
      href="/Gallery/Box-Braids%20/Bohemian%20french%20curl/IMG_9190.jpg"
      x="86"
      y="96"
      width="188"
      height="188"
      preserveAspectRatio="xMidYMid meet"
      clipPath="url(#coverPhotoClip)"
    />
    <circle cx="180" cy="190" r="84" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
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
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)', padding: '56px 22px 20px' }}>
      {subtitle && <p style={{ fontSize: '0.6rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontWeight: 500 }}>{subtitle}</p>}
      <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.1rem,2.5vw,1.6rem)', color: '#fff', lineHeight: 1.3, fontWeight: 400, letterSpacing: '-0.01em' }}>{label}</p>
    </div>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)', pointerEvents: 'none' }}/>
  </div>
);

const spreads = [
  {
    id: 0, title: 'Cover',
    leftEl: <CoverSVG />,
    rightContent: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%', maxWidth: 320, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(2.2rem,4.5vw,3.2rem)', color: T.heading, marginBottom: 20, lineHeight: 1, fontWeight: 300, letterSpacing: '-0.03em', fontStyle: 'italic' }}>The Braid Book</div>
        <div style={{ fontSize: '0.68rem', color: T.accent, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 24 }}>Style, Heritage & Care</div>
        <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, marginBottom: 28 }}/>
        <p style={{ fontSize: 'clamp(0.88rem,1.6vw,1.05rem)', color: T.body, lineHeight: 1.8, marginBottom: 8, fontWeight: 300, fontStyle: 'italic' }}>
          Explore signature protective styles, learn the story behind each look, and discover the care details that help your braids wear beautifully.
        </p>
        <p style={{ fontSize: '0.72rem', color: T.bodyLight, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginTop: 20, opacity: 0.8 }}>Flip Through 8 Signature Styles</p>
      </div>
    ),
    pageNum: 'i',
  },
  {
    id: 1, title: 'Box Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /Box-Braids/IMG_9176.jpg" label="Box Braids" subtitle="West African Origin" />,
    quote: 'A symbol of cultural pride, braided into every strand.',
    originTag: 'West African Origin',
    name: 'Box Braids',
    story: [
      'Box braids are one of the most iconic protective styles in Black hair culture, with roots stretching back over 3,000 years to ancient Egypt and Sub-Saharan Africa.',
      'Named for the square "box" sections created during parting, this style became a symbol of cultural pride in the 1990s. Today they are a declaration of heritage, identity, and versatility.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Moisturize scalp weekly with a light oil. Remove by 8 weeks to prevent breakage.',
    pageNum: '01',
    styleLink: '/box-braids?style=classic-box-braids',
  },
  {
    id: 2, title: 'Cornrows',
    leftEl: <PhotoPage src="/Gallery/Conrows/Feedin Conrows/IMG_9304.jpg" label="Cornrows" subtitle="Sub-Saharan Africa" />,
    quote: 'Resistance, heritage, and beauty — mapped in hair.',
    originTag: 'Sub-Saharan Africa',
    name: 'Cornrows',
    story: [
      'Among the oldest recorded hairstyles in the world, cornrows date back at least 3,000 years. Cave paintings in the Sahara depict styles remarkably similar to modern cornrows.',
      'During the transatlantic slave trade, enslaved Africans used cornrow patterns to map escape routes — a powerful act of resistance braided into hair.',
    ],
    wearTime: '2 – 4 Weeks',
    wearTip: 'Re-moisturize your edges every few days. Wrap at night with a satin scarf.',
    pageNum: '02',
    styleLink: '/conrows?style=feedin-conrows',
  },
  {
    id: 3, title: 'Senegalese Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/senegalese-twists /IMG_9111.jpg" label="Senegalese Twists" subtitle="Senegal, West Africa" />,
    quote: 'Sleek, silky, and rooted in African grace.',
    originTag: 'Senegal, West Africa',
    name: 'Senegalese Twists',
    story: [
      'These elegant two-strand twists use a rope-twist technique — two strands coiled around each other — creating a smooth, silky texture that lies beautifully.',
      'Their sleek finish makes them one of the most polished-looking protective styles, perfect for professional settings while rooted in African heritage.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Spray scalp with diluted tea tree oil to prevent buildup. Unravel gently.',
    pageNum: '03',
    styleLink: '/twists/senegalese-twists',
  },
  {
    id: 4, title: 'Passion Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/passion-twists/IMG_9105.jpg" label="Passion Twists" subtitle="Modern Classic" />,
    quote: 'Effortless beauty with a bohemian spirit.',
    originTag: 'Modern Classic',
    name: 'Passion Twists',
    story: [
      'Created by Miami stylist Keya Neal in 2018, passion twists combine the look of Senegalese twists with springy, curly extensions — giving a soft, bohemian finish that moves naturally.',
      'They remain one of the most requested styles today, loved for their effortless beauty and the freedom they give the wearer.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Protect with a satin bonnet each night. Avoid heavy products that weigh down the curls.',
    pageNum: '04',
    styleLink: '/twists/passion-twists',
  },
  {
    id: 5, title: 'Knotless Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /knotless/IMG_9219.jpg" label="Knotless Braids" subtitle="Modern Innovation" />,
    quote: 'Seamless roots. Less tension. More freedom.',
    originTag: 'Modern Innovation',
    name: 'Knotless Braids',
    story: [
      'Knotless braids start with your natural hair and gradually feed in extensions — resulting in a flat, seamless root with significantly less tension than traditional box braids.',
      'Widely praised by trichologists for being gentler on the hairline and causing less traction alopecia.',
    ],
    wearTime: '6 – 10 Weeks',
    wearTip: 'Scalp-friendly! Still moisturize weekly. Looser tension means you can go longer.',
    pageNum: '05',
    styleLink: '/box-braids?style=knotless',
  },
  {
    id: 6, title: 'Goddess Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /goddess braids/IMG_9174.jpg" label="Goddess Braids" subtitle="African Diaspora" />,
    quote: 'Bold, sculptural, and regal by design.',
    originTag: 'African Diaspora',
    name: 'Goddess Braids',
    story: [
      'Extra-thick, chunky cornrows raised slightly off the scalp, styled into dramatic sweeping patterns. Their bold scale and sculptural quality give them a regal quality — hence the name.',
      'Crowned with gold rings, shells, flowers, and beads, they transform hair into an art form. No two goddess braid styles are alike.',
    ],
    wearTime: '2 – 4 Weeks',
    wearTip: 'Re-braid the perimeter at week 2. Larger braids unravel faster at the edges.',
    pageNum: '06',
    styleLink: '/box-braids?style=goddess-braids',
  },
  {
    id: 7, title: 'Bohemian Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/Bohemian-marley twists/IMG_9054.jpg" label="Bohemian Twists" subtitle="Free-Spirited Style" />,
    quote: 'Polished structure meets free-spirited flow.',
    originTag: 'Free-Spirited Style',
    name: 'Bohemian Twists',
    story: [
      'Bohemian twists blend the structure of Marley twists with loose, curly ends that flow freely — creating a relaxed look that feels both polished and natural.',
      'Styled with curly extension hair peeking from every twist, giving that coveted "undone" bohemian energy with full protective benefits.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Refresh curly ends with water and leave-in conditioner spray. Style into a bun for variety.',
    pageNum: '07',
    styleLink: '/twists/bohemian-marley-twists',
  },
  {
    id: 8, title: 'Crochet Braids',
    leftEl: <PhotoPage src="/Gallery/Crochets/Single/IMG_9380.jpg" label="Crochet Braids" subtitle="Caribbean & African Roots" />,
    quote: 'Voluminous results, rooted in Caribbean craft.',
    originTag: 'Caribbean & African Roots',
    name: 'Crochet Braids',
    story: [
      'Cornrows are braided flat as a base, then extensions are looped through using a small crochet needle. Rooted in the Caribbean, this style achieves voluminous results in a fraction of the time.',
      'They can use virtually any texture — loose waves, Marley twists, loc extensions, or kinky puffs.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Reinstall loose extensions near the perimeter at week 3. Co-wash every 1–2 weeks.',
    pageNum: '08',
    styleLink: '/crochets?style=single',
  },
  {
    id: 9, title: 'Care Guide',
    leftEl: <BackCoverSVG />,
    rightContent: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', maxWidth: 320, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.6rem,3.2vw,2.2rem)', color: T.heading, marginBottom: 12, fontWeight: 300, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Care for Your Braids</div>
        <div style={{ fontSize: '0.68rem', color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 28 }}>Essential Rituals</div>
        <div style={{ width: 60, height: 2, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, marginBottom: 26, opacity: 0.6 }}/>
        {[['Moisturize','scalp weekly — jojoba, argan, or castor oil.'],['Protect','with a satin or silk bonnet each night.'],['Refresh','edges every few days with edge control.'],['Remove','gently — detangle from ends to roots.'],['Rest','between installs with a deep conditioning treatment.']].map(([b, r], i) => (
          <p key={i} style={{ fontSize: 'clamp(0.78rem,1.45vw,0.92rem)', color: T.body, lineHeight: 1.8, marginBottom: 14, textAlign: 'left', width: '100%', fontWeight: 300 }}>
            <strong style={{ color: T.accent, fontWeight: 600, letterSpacing: '0.02em' }}>{b}</strong> <span style={{ fontStyle: 'italic' }}>{r}</span>
          </p>
        ))}
        <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, marginTop: 24, opacity: 0.4 }}/>
        <p style={{ marginTop: 24, fontSize: '0.72rem', color: T.bodyLight, letterSpacing: '0.05em', fontStyle: 'italic' }}>Your hair tells a story</p>
      </div>
    ),
    pageNum: '✦',
  },
];

const styleCare = {
  'Box Braids': {
    preserveTips: [
      'Moisturize scalp weekly with light oil.',
      'Wrap with satin nightly.',
      'Avoid heavy gels and product buildup.',
      'Remove by 8 weeks to protect your edges.',
    ],
    bestFor: ['Long Wear', 'Low Maintenance', 'Classic Look'],
  },
  Cornrows: {
    preserveTips: [
      'Oil exposed parts every few days.',
      'Tie down with a satin scarf at night.',
      'Keep edges soft; avoid tight ponytails.',
      'Refresh the perimeter if wearing longer.',
    ],
    bestFor: ['Scalp Access', 'Sporty Styles', 'Clean Parts'],
  },
  'Senegalese Twists': {
    preserveTips: [
      'Oil between parts weekly.',
      'Wrap or pineapple at night to reduce frizz.',
      'Cleanse the scalp gently without soaking.',
      'Unravel slowly from the ends during takedown.',
    ],
    bestFor: ['Sleek Finish', 'Lightweight Feel', 'Polished Looks'],
  },
  'Passion Twists': {
    preserveTips: [
      'Sleep in a satin bonnet.',
      'Mist curls lightly with water or leave-in.',
      'Avoid heavy creams that weigh curls down.',
      'Separate tangles gently with your fingers.',
    ],
    bestFor: ['Soft Volume', 'Vacation Styles', 'Natural Texture'],
  },
  'Knotless Braids': {
    preserveTips: [
      'Moisturize the scalp weekly.',
      'Protect edges from high-tension styles.',
      'Sleep in a satin scarf or bonnet.',
      'Cleanse the scalp without rough rubbing.',
    ],
    bestFor: ['Scalp Comfort', 'Flexible Styling', 'Lightweight Wear'],
  },
  'Goddess Braids': {
    preserveTips: [
      'Tie down edges nightly.',
      'Refresh loose curls with light leave-in.',
      'Avoid pulling chunky braids too tightly.',
      'Re-braid the perimeter if needed.',
    ],
    bestFor: ['Soft Curls', 'Glam Looks', 'Statement Style'],
  },
  'Bohemian Twists': {
    preserveTips: [
      'Mist curly ends lightly.',
      'Finger-detangle loose pieces.',
      'Sleep in a satin bonnet.',
      'Use light product to avoid buildup.',
    ],
    bestFor: ['Full Volume', 'Textured Finish', 'Effortless Look'],
  },
  'Crochet Braids': {
    preserveTips: [
      'Keep the cornrow base moisturized.',
      'Secure loose pieces early.',
      'Co-wash only when the texture allows.',
      'Do not neglect the scalp under the install.',
    ],
    bestFor: ['Quick Install', 'Full Styles', 'Easy Change'],
  },
};

function RightPageContent({ s }) {
  if (s.rightContent) return s.rightContent;

  const care = styleCare[s.name] || {};
  const preserveTips = care.preserveTips || [s.wearTip].filter(Boolean);
  const bestFor = care.bestFor || (s.quote ? [s.quote] : []);
  const bestForContent = bestFor.length > 0 && (
    <div style={{
      paddingTop: 'clamp(1px, 0.5vw, 4px)'
    }}>
      <div style={{
        fontSize: 'clamp(0.44rem, 1vw, 0.55rem)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: T.accent,
        fontWeight: 700,
        marginBottom: 5
      }}>
        Best For
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'clamp(5px, 1.2vw, 8px)'
      }}>
        {bestFor.map((tag) => (
          <span key={tag} style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 'clamp(20px, 3.5vw, 27px)',
            padding: '0 clamp(6px, 1.7vw, 11px)',
            border: `1px solid ${T.accentDim}`,
            borderRadius: 999,
            background: T.rightPage,
            color: T.heading,
            fontSize: 'clamp(0.48rem, 1.2vw, 0.62rem)',
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto auto auto 1fr auto',
      height: '100%',
      gap: 'clamp(6px, 1.7vw, 15px)'
    }}>
      <div>
        <h3 style={{
          fontFamily: 'var(--font-playfair,Georgia,serif)',
          fontSize: 'clamp(1rem, 4vw, 2.25rem)',
          color: T.heading,
          margin: 0,
          lineHeight: 1.05,
          fontWeight: 500,
          letterSpacing: '-0.015em'
        }}>
          {s.name}
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 'clamp(8px, 2vw, 18px)',
        alignItems: 'end',
        paddingBottom: 'clamp(6px, 1.8vw, 14px)',
        borderBottom: `1px solid ${T.accentDim}`
      }}>
        <div style={{
          fontSize: 'clamp(0.44rem, 1vw, 0.55rem)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 700
        }}>
          Wear Time
        </div>
        <div style={{
          fontFamily: 'var(--font-playfair,Georgia,serif)',
          color: T.heading,
          fontSize: 'clamp(0.75rem, 2vw, 1.05rem)',
          fontWeight: 600,
          lineHeight: 1
        }}>
          {s.wearTime}
        </div>
      </div>

      {bestForContent}

      <div>
        <div style={{
          fontSize: 'clamp(0.48rem, 1.1vw, 0.6rem)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 700,
          marginBottom: 'clamp(6px, 1.8vw, 14px)'
        }}>
          Preserve Your Hair
        </div>
        <div style={{
          display: 'grid',
          gap: 'clamp(5px, 1.5vw, 11px)'
        }}>
          {preserveTips.map((tip, i) => (
            <div key={tip} style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(16px, 3vw, 26px) 1fr',
              gap: 'clamp(6px, 1.6vw, 12px)',
              alignItems: 'start'
            }}>
              <span style={{
                color: T.accent,
                fontFamily: 'var(--font-playfair,Georgia,serif)',
                fontSize: 'clamp(0.62rem, 1.7vw, 0.92rem)',
                lineHeight: 1.15
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{
                color: T.body,
                fontSize: 'clamp(0.52rem, 1.55vw, 0.75rem)',
                lineHeight: 1.3,
                fontWeight: 300
              }}>
                {tip}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 'clamp(30px, 5vw, 38px)' }} />
    </div>
  );
}

export default function FlipBook3D() {
  const [current, setCurrent] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showFlipPage, setShowFlipPage] = useState(false);
  const [flipDirection, setFlipDirection] = useState(1);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const prevCurrentRef = useRef(0);
  const total = spreads.length;
  const currentStyleLink = spreads[current].styleLink;
  const pagePaddingTop = 'clamp(24px,5.5vw,32px)';
  const pagePaddingBottom = 'clamp(10px,2.6vw,32px)';
  const pagePaddingOuter = 'clamp(10px,2.6vw,32px)';
  const pagePaddingGutter = 'clamp(22px,4.5vw,44px)';

  const changePage = useCallback((dir) => {
    if (isFlipping) return;
    const next = current + dir;
    if (next < 0 || next >= total) return;

    prevCurrentRef.current = current;
    setFlipDirection(dir);
    setIsFlipping(true);
    setShowFlipPage(true);
    
    setTimeout(() => {
      setCurrent(next);
    }, 350);
    
    setTimeout(() => {
      setShowFlipPage(false);
      setIsFlipping(false);
    }, 700);
  }, [isFlipping, current, total]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') changePage(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') changePage(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [changePage]);

  const onTouchStart = (e) => { 
    touchX.current = e.touches[0].clientX; 
    touchY.current = e.touches[0].clientY; 
  };
  
  const onTouchEnd = (e) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 44 && dy < 80) changePage(dx > 0 ? 1 : -1);
  };

  const Nav = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
        <button 
          onClick={() => changePage(-1)} 
          disabled={current === 0 || isFlipping}
          aria-label="Previous page"
          style={{ 
            background: current === 0 ? 'transparent' : T.btnBg, 
            color: current === 0 ? 'rgba(255,255,255,0.2)' : T.btnText, 
            border: current === 0 ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${T.heading}`, 
            padding: '11px 22px', 
            borderRadius: 2, 
            fontSize: '0.68rem', 
            fontWeight: 500, 
            cursor: current === 0 ? 'default' : 'pointer', 
            letterSpacing: '0.1em', 
            textTransform: 'uppercase', 
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => {
            if (current !== 0 && !isFlipping) {
              e.currentTarget.style.background = T.heading;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (current !== 0) {
              e.currentTarget.style.background = T.btnBg;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}>
          ← Prev
        </button>
        <div style={{ 
          color: 'rgba(255,255,255,0.75)', 
          fontSize: '0.7rem', 
          letterSpacing: '0.12em', 
          minWidth: 140, 
          textAlign: 'center', 
          textTransform: 'uppercase',
          fontWeight: 500
        }}>
          {spreads[current].title}
        </div>
        <button 
          onClick={() => changePage(1)} 
          disabled={current === total - 1 || isFlipping}
          aria-label="Next page"
          style={{ 
            background: current === total-1 ? 'transparent' : T.btnBg, 
            color: current === total-1 ? 'rgba(255,255,255,0.2)' : T.btnText, 
            border: current === total-1 ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${T.heading}`, 
            padding: '11px 22px', 
            borderRadius: 2, 
            fontSize: '0.68rem', 
            fontWeight: 500, 
            cursor: current === total-1 ? 'default' : 'pointer', 
            letterSpacing: '0.1em', 
            textTransform: 'uppercase', 
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => {
            if (current !== total - 1 && !isFlipping) {
              e.currentTarget.style.background = T.heading;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (current !== total - 1) {
              e.currentTarget.style.background = T.btnBg;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}>
          Next →
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {spreads.map((_, i) => (
          <button 
            key={i} 
            onClick={() => { if (i !== current && !isFlipping) changePage(i > current ? 1 : -1); }}
            aria-label={`Go to page ${i + 1}`}
            aria-current={i === current ? 'true' : 'false'}
            style={{ 
              width: i === current ? 20 : 6, 
              height: 6, 
              borderRadius: i === current ? 3 : '50%', 
              background: i === current ? T.dotOn : T.dotOff, 
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.3s', 
              padding: 0 
            }}
          />
        ))}
      </div>
    </>
  );

  const Header = () => (
    <>
      <div style={{ fontSize: '1.2rem', marginBottom: 16, opacity: 0.7 }}>✦</div>
      <h2 style={{ 
        fontFamily: 'var(--font-playfair,Georgia,serif)', 
        fontSize: 'clamp(2.6rem,5.5vw,4.2rem)', 
        color: T.title, 
        textAlign: 'center', 
        marginBottom: 16, 
        letterSpacing: '-0.03em',
        fontWeight: 300,
        fontStyle: 'italic',
        lineHeight: 1
      }}>
        The Braid Book
      </h2>
        <div style={{ fontSize: '0.72rem', color: T.accent, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 24 }}>Style, Heritage & Care</div>
      <div style={{ width: 80, height: 2, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, margin: '0 auto 28px', opacity: 0.6 }}/>
      <p style={{ 
        color: T.sub, 
        textAlign: 'center', 
        fontSize: '0.78rem', 
        marginBottom: 10, 
        letterSpacing: '0.18em', 
        textTransform: 'uppercase',
        fontWeight: 500
      }}>
        Signature Protective Styles
      </p>
      <p style={{ 
        color: T.bodyLight, 
        textAlign: 'center', 
        fontSize: '0.7rem', 
        marginBottom: 40,
        fontWeight: 300,
        fontStyle: 'italic'
      }}>
        Open the book with arrow keys or a swipe
      </p>
    </>
  );

  return (
    <>
      <style jsx>{`
        @keyframes pageFlipForward {
          0%   { transform: perspective(1400px) rotateY(0deg)    translateZ(0px);  transform-origin: left center; filter: drop-shadow(-3px 4px 10px rgba(0,0,0,0.2)); }
          18%  { transform: perspective(1400px) rotateY(-35deg)  translateZ(10px); transform-origin: left center; filter: drop-shadow(-14px 8px 22px rgba(0,0,0,0.55)); }
          50%  { transform: perspective(1400px) rotateY(-90deg)  translateZ(14px); transform-origin: left center; filter: drop-shadow(0px 14px 32px rgba(0,0,0,0.65)); }
          82%  { transform: perspective(1400px) rotateY(-148deg) translateZ(10px); transform-origin: left center; filter: drop-shadow(10px 8px 20px rgba(0,0,0,0.45)); }
          100% { transform: perspective(1400px) rotateY(-180deg) translateZ(0px);  transform-origin: left center; filter: drop-shadow(0px 0px 0px rgba(0,0,0,0)); }
        }

        @keyframes pageFlipBackward {
          0%   { transform: perspective(1400px) rotateY(0deg)   translateZ(0px);  transform-origin: right center; filter: drop-shadow(3px 4px 10px rgba(0,0,0,0.2)); }
          18%  { transform: perspective(1400px) rotateY(35deg)  translateZ(10px); transform-origin: right center; filter: drop-shadow(14px 8px 22px rgba(0,0,0,0.55)); }
          50%  { transform: perspective(1400px) rotateY(90deg)  translateZ(14px); transform-origin: right center; filter: drop-shadow(0px 14px 32px rgba(0,0,0,0.65)); }
          82%  { transform: perspective(1400px) rotateY(148deg) translateZ(10px); transform-origin: right center; filter: drop-shadow(-10px 8px 20px rgba(0,0,0,0.45)); }
          100% { transform: perspective(1400px) rotateY(180deg) translateZ(0px);  transform-origin: right center; filter: drop-shadow(0px 0px 0px rgba(0,0,0,0)); }
        }

        .flipping-page-forward {
          animation: pageFlipForward 0.75s cubic-bezier(0.5, 0, 0.3, 1) forwards;
          will-change: transform, filter;
        }

        .flipping-page-backward {
          animation: pageFlipBackward 0.75s cubic-bezier(0.5, 0, 0.3, 1) forwards;
          will-change: transform, filter;
        }

        @keyframes shadowSweepForward {
          0%   { opacity: 0;   transform: scaleX(0.02); transform-origin: left center; }
          25%  { opacity: 1;   transform: scaleX(0.55); }
          60%  { opacity: 0.7; transform: scaleX(0.9);  }
          100% { opacity: 0;   transform: scaleX(1);    }
        }
        @keyframes shadowSweepBackward {
          0%   { opacity: 0;   transform: scaleX(0.02); transform-origin: right center; }
          25%  { opacity: 1;   transform: scaleX(0.55); }
          60%  { opacity: 0.7; transform: scaleX(0.9);  }
          100% { opacity: 0;   transform: scaleX(1);    }
        }
        .shadow-sweep-forward  { animation: shadowSweepForward  0.75s ease-out forwards; }
        .shadow-sweep-backward { animation: shadowSweepBackward 0.75s ease-out forwards; }

        @keyframes sheenMove {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%);  }
        }
        .page-sheen { animation: sheenMove 0.75s cubic-bezier(0.5, 0, 0.3, 1) forwards; }
      `}</style>

      <section 
        style={{ 
          background: T.bgSection, 
          padding: '60px 20px 50px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
        aria-label="The Braid Book - Interactive guide to protective hairstyles"
      >
        <Header />

        <div
          onTouchStart={onTouchStart} 
          onTouchEnd={onTouchEnd}
          style={{ 
            perspective: '2500px', 
            perspectiveOrigin: '50% 50%',
            width: 'min(900px,96vw)', 
            height: 'clamp(420px,70vw,600px)', 
            position: 'relative', 
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          role="region"
          aria-label={`Page ${current + 1} of ${total}: ${spreads[current].title}`}
          tabIndex="0"
        >
          {/* Book container with 3D transform */}
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative', 
              transformStyle: 'preserve-3d',
              transform: 'rotateX(5deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Page thickness layers - right side */}
            {[...Array(12)].map((_, i) => (
              <div 
                key={`right-${i}`}
                style={{ 
                  position: 'absolute', 
                  top: i * 2, 
                  right: -(i * 2) - 4, 
                  bottom: i * 2, 
                  left: '50%', 
                  background: `rgb(${237 - i * 8}, ${233 - i * 8}, ${226 - i * 8})`, 
                  borderRadius: '0 12px 12px 0',
                  zIndex: -i - 1,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                }}
              />
            ))}

            {/* Page thickness layers - left side (cover) */}
            {[...Array(8)].map((_, i) => (
              <div 
                key={`left-${i}`}
                style={{ 
                  position: 'absolute', 
                  top: i * 2, 
                  left: -(i * 2) - 4, 
                  bottom: i * 2, 
                  right: '50%', 
                  background: `rgb(${30 - i * 2}, ${26 - i * 2}, ${22 - i * 2})`, 
                  borderRadius: '12px 0 0 12px',
                  zIndex: -i - 1
                }}
              />
            ))}

            {/* Main book spread */}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              position: 'relative',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.6)',
              background: '#000'
            }}>
              {/* Spine */}
              <div style={{ 
                position: 'absolute', 
                left: '50%', 
                top: 0, 
                transform: 'translateX(-50%)', 
                width: 28, 
                height: '100%', 
                background: T.spine, 
                zIndex: 200,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.9)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                borderRight: '1px solid rgba(0,0,0,0.5)'
              }}>
                {/* Spine highlight */}
                <div style={{ 
                  position: 'absolute', 
                  left: 6, 
                  top: 0, 
                  width: 2, 
                  height: '100%', 
                  background: 'linear-gradient(to bottom, transparent 5%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.15) 70%, transparent 95%)' 
                }}/>
              </div>

              {/* Left page */}
              <div
                onClick={(e) => {
                  if (e.target instanceof Element && e.target.closest('[data-no-page-flip], a, button')) return;
                  changePage(-1);
                }}
                style={{
                  width: '50%',
                  height: '100%',
                  background: '#0a0a0a',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRight: '1px solid #000',
                  boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.5)',
                  cursor: current === 0 ? 'default' : 'pointer'
                }}>
                {spreads[current].leftEl}
              </div>

              {/* Right page */}
              <div
                style={{
	                  width: '50%',
	                  height: '100%',
	                  background: T.rightPage,
	                  paddingTop: pagePaddingTop,
	                  paddingRight: pagePaddingOuter,
	                  paddingBottom: pagePaddingBottom,
	                  paddingLeft: pagePaddingGutter,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 20px 0 40px rgba(0,0,0,0.08), inset 0 10px 20px rgba(0,0,0,0.03)',
                  cursor: 'default'
                }}>
                {/* Gutter shadow */}
                <div style={{ 
                  position: 'absolute', 
                  left: 0, 
                  top: 0, 
                  width: 60, 
                  height: '100%', 
                  background: 'linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.05) 50%, transparent)', 
                  pointerEvents: 'none' 
                }}/>
                
                {/* Page curl effect - top right */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.08) 100%)',
                  pointerEvents: 'none'
                }}/>

                {/* Page curl effect - bottom right */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(45deg, transparent 45%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.08) 100%)',
                  pointerEvents: 'none'
                }}/>

                <RightPageContent s={spreads[current]} />
                <div style={{ 
                  position: 'absolute', 
                  bottom: 16, 
                  right: 20, 
                  fontSize: '0.58rem', 
                  color: T.pageNum, 
                  letterSpacing: 1,
                  fontFamily: 'Georgia, serif'
                }}>
                  {spreads[current].pageNum}
                </div>
              </div>
            </div>

            {/* Shadow swept onto the static page beneath the turning page */}
            {showFlipPage && (
              <div
                className={flipDirection > 0 ? 'shadow-sweep-forward' : 'shadow-sweep-backward'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: flipDirection > 0 ? '50%' : 0,
                  width: '50%',
                  height: '100%',
                  zIndex: 250,
                  pointerEvents: 'none',
                  background: flipDirection > 0
                    ? 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)'
                    : 'linear-gradient(to left,  rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
                }}
              />
            )}

            {/* Flipping page overlay */}
            {showFlipPage && (() => {
              const fromIdx = prevCurrentRef.current;
              const toIdx   = Math.max(0, Math.min(total - 1, fromIdx + flipDirection));
              const from    = spreads[fromIdx];
              const to      = spreads[toIdx];
              // forward: right page turns; backward: left page turns
              const isForward = flipDirection > 0;
              return (
                <div
                  className={isForward ? 'flipping-page-forward' : 'flipping-page-backward'}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: isForward ? '50%' : '0',
                    width: '50%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    zIndex: 300,
                    pointerEvents: 'none',
                  }}
                >
                  {/* ── Front face ── */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    background: isForward ? T.rightPage : '#0a0a0a',
                    borderRadius: isForward ? '0 12px 12px 0' : '12px 0 0 12px',
                    overflow: 'hidden',
                  }}>
                    {isForward ? (
                      /* right-page content of the spread we're leaving */
	                      <div style={{ width: '100%', height: '100%', paddingTop: pagePaddingTop, paddingRight: pagePaddingOuter, paddingBottom: pagePaddingBottom, paddingLeft: pagePaddingGutter, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        <RightPageContent s={from} />
                        <div style={{ position: 'absolute', bottom: 16, right: 20, fontSize: '0.58rem', color: T.pageNum, letterSpacing: 1, fontFamily: 'Georgia,serif' }}>{from.pageNum}</div>
                      </div>
                    ) : (
                      /* left-page photo of the spread we're leaving */
                      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        {from.leftEl}
                      </div>
                    )}
                    {/* moving sheen highlight */}
                    <div className="page-sheen" style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)',
                    }}/>
                    {/* edge shadow at hinge */}
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: isForward
                        ? 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 18%)'
                        : 'linear-gradient(to left,  rgba(0,0,0,0.12) 0%, transparent 18%)',
                    }}/>
                  </div>

                  {/* ── Back face ── */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: isForward ? '#0a0a0a' : T.rightPage,
                    borderRadius: isForward ? '12px 0 0 12px' : '0 12px 12px 0',
                    overflow: 'hidden',
                  }}>
                    {isForward ? (
                      /* left-page photo of the spread we're arriving at */
                      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        {to.leftEl}
                      </div>
                    ) : (
                      /* right-page content of the spread we're arriving at */
	                      <div style={{ width: '100%', height: '100%', paddingTop: pagePaddingTop, paddingRight: pagePaddingOuter, paddingBottom: pagePaddingBottom, paddingLeft: pagePaddingGutter, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        <RightPageContent s={to} />
                        <div style={{ position: 'absolute', bottom: 16, right: 20, fontSize: '0.58rem', color: T.pageNum, letterSpacing: 1, fontFamily: 'Georgia,serif' }}>{to.pageNum}</div>
                      </div>
                    )}
                    {/* edge shadow at hinge (mirrored) */}
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: isForward
                        ? 'linear-gradient(to left,  rgba(0,0,0,0.18) 0%, transparent 22%)'
                        : 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 22%)',
                    }}/>
                  </div>
                </div>
              );
            })()}
          </div>

          <button
            type="button"
            aria-label="Next page"
            onClick={(e) => {
              e.stopPropagation();
              changePage(1);
            }}
            disabled={current === total - 1 || isFlipping}
            style={{
              position: 'absolute',
              top: '6%',
              right: 'clamp(8px, 1.8vw, 18px)',
              width: 'clamp(34px, 5vw, 46px)',
              height: '88%',
              zIndex: 900,
              border: 'none',
              borderRadius: '0 10px 10px 0',
              background: 'linear-gradient(to left, rgba(45,31,26,0.08), transparent)',
              color: current === total - 1 ? 'transparent' : 'rgba(45,31,26,0.32)',
              cursor: current === total - 1 ? 'default' : 'pointer',
              fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 8px 0 0',
              pointerEvents: current === total - 1 || isFlipping ? 'none' : 'auto',
            }}
          >
            ›
          </button>

          {currentStyleLink && !isFlipping && (
            <a
              href={currentStyleLink}
              aria-label={`View gallery images for ${spreads[current].name}`}
              data-no-page-flip
              style={{
                position: 'absolute',
	                left: `calc(50% + ${pagePaddingGutter})`,
                bottom: 'clamp(28px, 5vw, 46px)',
                zIndex: 1000,
                background: T.btnBg,
                color: T.btnText,
                border: `1px solid ${T.heading}`,
                borderRadius: 2,
                padding: 'clamp(9px, 2vw, 11px) clamp(14px, 3vw, 18px)',
                fontSize: 'clamp(0.58rem, 1.3vw, 0.66rem)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                lineHeight: 1,
                textDecoration: 'none',
                textTransform: 'uppercase',
                transition: 'background 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.accent;
                e.currentTarget.style.borderColor = T.accent;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.btnBg;
                e.currentTarget.style.borderColor = T.heading;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View This Style
            </a>
          )}

        </div>

        {/* Enhanced shadow under book */}
        <div style={{ 
          width: 'min(800px,90vw)', 
          height: 60, 
          background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)', 
          marginTop: -20, 
          filter: 'blur(20px)',
          transform: 'scaleY(0.5)'
        }}/>

        <Nav />
      </section>
    </>
  );
}
