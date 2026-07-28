'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { BRAID_BOOK_CARE_RITUALS, BRAID_BOOK_COVER, BRAID_BOOK_END_PAGE, BRAID_BOOK_STYLES } from '@/lib/braid-book-data';
import { API_BASE_URL } from '@/lib/config/api';

const T = {
  bg:        '#F6F5F1',
  bgSection: '#F6F5F1',
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

const CoverSVG = ({ image = BRAID_BOOK_COVER.image }) => (
  <div aria-hidden="true" style={{ width: '100%', height: '100%', position: 'relative', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 40%,#1a1a1a,#0a0a0a 72%)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: '68%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,113,74,0.25),transparent 68%)' }} />
    <div style={{ position: 'relative', width: '47%', aspectRatio: '1', borderRadius: '50%', border: '1px solid rgba(200,113,74,0.65)', padding: 3, boxShadow: '0 0 0 10px rgba(200,113,74,0.06), 0 0 0 26px rgba(200,113,74,0.04)', overflow: 'hidden' }}>
      <Image src={image} alt="" fill sizes="(max-width: 640px) 45vw, 210px" style={{ objectFit: 'cover' }} />
    </div>
    <span style={{ position: 'absolute', left: '16%', top: '15%', color: '#C8714A', opacity: 0.5 }}>✦</span>
    <span style={{ position: 'absolute', right: '16%', top: '12%', color: '#888', opacity: 0.35 }}>✦</span>
    <span style={{ position: 'absolute', bottom: '8%', color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 'clamp(0.62rem,1.5vw,0.78rem)' }}>Open to begin your journey</span>
  </div>
);

const CoverContent = ({ cover, editMode = false, onChange = null }) => (
  <div className="braid-book-cover-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%', maxWidth: 320, margin: '0 auto', padding: '0 20px' }}>
    {editMode ? <input className="braid-book-cover-title" aria-label="Cover title" value={cover.title} onChange={(event) => onChange?.('title', event.target.value)} style={{ width: '100%', border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', textAlign: 'center', fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.5rem,4vw,3.2rem)', color: T.heading, fontStyle: 'italic' }} /> :
      <div className="braid-book-cover-title" style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(2.2rem,4.5vw,3.2rem)', color: T.heading, marginBottom: 20, lineHeight: 1, fontWeight: 300, letterSpacing: '-0.03em', fontStyle: 'italic' }}>{cover.title}</div>}
    {editMode ? <input className="braid-book-cover-subtitle" aria-label="Cover subtitle" value={cover.subtitle} onChange={(event) => onChange?.('subtitle', event.target.value)} style={{ width: '100%', margin: '12px 0', border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', textAlign: 'center', color: T.accent, fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase' }} /> :
      <div className="braid-book-cover-subtitle" style={{ fontSize: '0.68rem', color: T.accent, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 24 }}>{cover.subtitle}</div>}
    <div className="braid-book-cover-divider" style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, marginBottom: 20 }}/>
    {editMode ? <textarea className="braid-book-cover-description" aria-label="Cover description" value={cover.description} onChange={(event) => onChange?.('description', event.target.value)} rows={5} style={{ width: '100%', border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', color: T.body, textAlign: 'center', fontSize: 'clamp(.65rem,1.4vw,.95rem)', lineHeight: 1.5 }} /> :
      <p className="braid-book-cover-description" style={{ fontSize: 'clamp(0.88rem,1.6vw,1.05rem)', color: T.body, lineHeight: 1.8, marginBottom: 8, fontWeight: 300, fontStyle: 'italic' }}>{cover.description}</p>}
    {editMode ? <input className="braid-book-cover-footer" aria-label="Cover footer" value={cover.footer} onChange={(event) => onChange?.('footer', event.target.value)} style={{ width: '100%', marginTop: 14, border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', textAlign: 'center', color: T.bodyLight, fontSize: '0.62rem', letterSpacing: '0.13em', textTransform: 'uppercase' }} /> :
      <p className="braid-book-cover-footer" style={{ fontSize: '0.72rem', color: T.bodyLight, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginTop: 20, opacity: 0.8 }}>{cover.footer}</p>}
  </div>
);

const BackCoverSVG = ({ endPage = BRAID_BOOK_END_PAGE }) => (
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
    <foreignObject x="105" y="174" width="150" height="64">
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Georgia,serif', textAlign: 'center', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{endPage.backQuote}</div>
    </foreignObject>
    <foreignObject x="115" y="242" width="130" height="28">
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#666', fontSize: 9, fontFamily: 'Georgia,serif', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{endPage.backAttribution}</div>
    </foreignObject>
    <text x="180" y="350" textAnchor="middle" fill="#C8714A" fontSize="10" opacity="0.4">✦  ✦  ✦</text>
  </svg>
);

const EndPageContent = ({ endPage, editMode = false, onChange = null }) => {
  const rituals = endPage.rituals || BRAID_BOOK_CARE_RITUALS;
  return (
    <div className="braid-book-end-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', maxWidth: 320, margin: '0 auto', padding: '0 20px' }}>
      {editMode ? <input className="braid-book-end-title" aria-label="Care page title" value={endPage.title} onChange={(event) => onChange?.('title', event.target.value)} style={{ width: '100%', border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', textAlign: 'center', fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1rem,3vw,2.2rem)', color: T.heading }} /> :
        <div className="braid-book-end-title" style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.6rem,3.2vw,2.2rem)', color: T.heading, marginBottom: 12, fontWeight: 300, fontStyle: 'italic' }}>{endPage.title}</div>}
      {editMode ? <input className="braid-book-end-subtitle" aria-label="Care page subtitle" value={endPage.subtitle} onChange={(event) => onChange?.('subtitle', event.target.value)} style={{ width: '100%', margin: '8px 0 14px', border: '1px dashed rgba(200,113,74,.55)', background: 'transparent', textAlign: 'center', color: T.accent, fontSize: '.65rem', letterSpacing: '.16em', textTransform: 'uppercase' }} /> :
        <div className="braid-book-end-subtitle" style={{ fontSize: '0.68rem', color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 28 }}>{endPage.subtitle}</div>}
      {rituals.map(([verb, detail], index) => (
        editMode ? <div key={`ritual-${index}`} style={{ display: 'grid', gridTemplateColumns: '30% 1fr', gap: 5, width: '100%', marginBottom: 8 }}>
          <input aria-label={`Ritual ${index + 1} heading`} value={verb} onChange={(event) => { const next = rituals.map((item) => [...item]); next[index][0] = event.target.value; onChange?.('rituals', next); }} style={{ minWidth: 0, border: '1px dashed rgba(200,113,74,.4)', background: 'transparent', color: T.accent, fontSize: '.62rem', fontWeight: 700 }} />
          <input aria-label={`Ritual ${index + 1} detail`} value={detail} onChange={(event) => { const next = rituals.map((item) => [...item]); next[index][1] = event.target.value; onChange?.('rituals', next); }} style={{ minWidth: 0, border: '1px dashed rgba(200,113,74,.4)', background: 'transparent', color: T.body, fontSize: '.62rem' }} />
        </div> :
        <p className="braid-book-end-ritual" key={`ritual-${index}`} style={{ fontSize: 'clamp(0.78rem,1.45vw,0.92rem)', color: T.body, lineHeight: 1.8, marginBottom: 14, textAlign: 'left', width: '100%', fontWeight: 300 }}><strong style={{ color: T.accent }}>{verb}</strong> <span style={{ fontStyle: 'italic' }}>{detail}</span></p>
      ))}
      {editMode ? <input aria-label="Care page footer" value={endPage.footer} onChange={(event) => onChange?.('footer', event.target.value)} style={{ width: '100%', marginTop: 12, border: '1px dashed rgba(200,113,74,.4)', background: 'transparent', textAlign: 'center', color: T.bodyLight, fontSize: '.65rem' }} /> :
        <p className="braid-book-end-footer" style={{ marginTop: 24, fontSize: '0.72rem', color: T.bodyLight, fontStyle: 'italic' }}>{endPage.footer}</p>}
    </div>
  );
};

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

const layoutSpreads = [
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
      'Box braids are an iconic protective style in Black hair culture, connected to longstanding braiding traditions across African communities and the diaspora.',
      'Named for the square "box" sections created during parting, this style became a symbol of cultural pride in the 1990s. Today they are a declaration of heritage, identity, and versatility.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Moisturize scalp weekly with a light oil. Remove by 8 weeks to prevent breakage.',
    pageNum: '01',
    styleLink: '/booking/box-braids/classic-box-braids',
  },
  {
    id: 2, title: 'Cornrows',
    leftEl: <PhotoPage src="/Gallery/Conrows/Feedin Conrows/IMG_9304.jpg" label="Cornrows" subtitle="Sub-Saharan Africa" />,
    quote: 'Resistance, heritage, and beauty — mapped in hair.',
    originTag: 'Sub-Saharan Africa',
    name: 'Cornrows',
    story: [
      'Cornrows belong to longstanding African braiding traditions and have carried cultural, artistic, and practical meaning across generations.',
      'Oral traditions describe braiding patterns as forms of communication and resistance during slavery; these accounts should be presented as oral history rather than settled documentary fact.',
    ],
    wearTime: '2 – 4 Weeks',
    wearTip: 'Re-moisturize your edges every few days. Wrap at night with a satin scarf.',
    pageNum: '02',
    styleLink: '/booking/conrows/feedin-conrows',
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
    styleLink: '/booking/twists/senegalese-twists',
  },
  {
    id: 4, title: 'Passion Twists',
    leftEl: <PhotoPage src="/Gallery/Twists/passion-twists/IMG_9105.jpg" label="Passion Twists" subtitle="Modern Classic" />,
    quote: 'Effortless beauty with a bohemian spirit.',
    originTag: 'Modern Classic',
    name: 'Passion Twists',
    story: [
      'Popularized in 2018, passion twists combine a two-strand twist technique with springy, curly extensions for a soft, bohemian finish.',
      'They remain one of the most requested styles today, loved for their effortless beauty and the freedom they give the wearer.',
    ],
    wearTime: '4 – 6 Weeks',
    wearTip: 'Protect with a satin bonnet each night. Avoid heavy products that weigh down the curls.',
    pageNum: '04',
    styleLink: '/booking/twists/passion-twists',
  },
  {
    id: 5, title: 'Knotless Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /knotless/IMG_9219.jpg" label="Knotless Braids" subtitle="Modern Innovation" />,
    quote: 'Seamless roots. Less tension. More freedom.',
    originTag: 'Modern Innovation',
    name: 'Knotless Braids',
    story: [
      'Knotless braids start with your natural hair and gradually feed in extensions — resulting in a flat, seamless root with significantly less tension than traditional box braids.',
      'The feed-in method can create a flatter foundation, but every braided style should be installed without pain or excessive tension.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Moisturize weekly, avoid painful tension, and remove the style by eight weeks.',
    pageNum: '05',
    styleLink: '/booking/box-braids/knotless',
  },
  {
    id: 6, title: 'Goddess Braids',
    leftEl: <PhotoPage src="/Gallery/Box-Braids /goddess braids/IMG_9174.jpg" label="Goddess Braids" subtitle="African Diaspora" />,
    quote: 'Bold, sculptural, and regal by design.',
    originTag: 'African Diaspora',
    name: 'Goddess Braids',
    story: [
      'This Goddess Braids service combines individual braids with loose curls for a soft, dimensional finish.',
      'Customers can choose a Regular or Knotless foundation when that option is enabled for the selected size.',
    ],
    wearTime: '4 – 8 Weeks',
    wearTip: 'Protect curls with satin, refresh lightly, and avoid pulling on the perimeter.',
    pageNum: '06',
    styleLink: '/booking/box-braids/goddess-braids',
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
    styleLink: '/booking/twists/bohemian-marley-twists',
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
    styleLink: '/booking/crochets/single',
  },
  {
    id: 9, title: 'Care Guide',
    leftEl: <BackCoverSVG />,
    rightContent: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', maxWidth: 320, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 'clamp(1.6rem,3.2vw,2.2rem)', color: T.heading, marginBottom: 12, fontWeight: 300, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Care for Your Braids</div>
        <div style={{ fontSize: '0.68rem', color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 28 }}>Essential Rituals</div>
        <div style={{ width: 60, height: 2, background: `linear-gradient(to right, transparent, ${T.accent}, transparent)`, marginBottom: 26, opacity: 0.6 }}/>
        {BRAID_BOOK_CARE_RITUALS.map(([b, r], i) => (
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

const braidBookStyleById = new Map(BRAID_BOOK_STYLES.map((style) => [style.id, style]));
const buildSpreads = (styles = BRAID_BOOK_STYLES, cover = BRAID_BOOK_COVER, endPage = BRAID_BOOK_END_PAGE) => {
  const styleSpreads = styles
    .map((configuredStyle) => {
      const id = Number(configuredStyle.id);
      const spread = layoutSpreads.find((candidate) => candidate.id === id);
      const fallback = braidBookStyleById.get(id);
      const style = { ...fallback, ...configuredStyle, id };
      if (!spread || !style.name || !style.image) return null;
      return {
        ...spread,
        ...style,
        leftEl: <PhotoPage src={style.image} label={style.name} subtitle={style.subtitle} />,
      };
    })
    .filter(Boolean);
  const coverSpread = {
    ...layoutSpreads[0],
    leftEl: <CoverSVG image={cover.image} />,
    rightContent: <CoverContent cover={cover} />,
    cover,
  };
  const endSpread = {
    ...layoutSpreads[layoutSpreads.length - 1],
    leftEl: <BackCoverSVG endPage={endPage} />,
    rightContent: <EndPageContent endPage={endPage} />,
    endPage,
  };
  return [coverSpread, ...styleSpreads, endSpread];
};

const spreads = buildSpreads();

function RightPageContent({ s, mobile = false, editMode = false, onChange = null }) {
  if (s.rightContent) return s.rightContent;

  const care = s.preserveTips && s.bestFor ? s : (styleCare[s.name] || {});
  const preserveTips = care.preserveTips || [s.wearTip].filter(Boolean);
  const bestFor = care.bestFor || (s.quote ? [s.quote] : []);
  const bestForContent = bestFor.length > 0 && (
    <div style={{
      paddingTop: 'clamp(1px, 0.5vw, 4px)'
    }}>
      <div style={{
        fontSize: mobile ? '0.72rem' : 'clamp(0.44rem, 1vw, 0.55rem)',
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
        {bestFor.map((tag, index) => (
          <span
            key={`best-for-${index}`}
            draggable={editMode}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
            onDragOver={(event) => editMode && event.preventDefault()}
            onDrop={(event) => {
              if (!editMode) return;
              event.preventDefault();
              const from = Number(event.dataTransfer.getData('text/plain'));
              if (!Number.isInteger(from) || from === index) return;
              const reordered = [...bestFor];
              const [moved] = reordered.splice(from, 1);
              reordered.splice(index, 0, moved);
              onChange?.('bestFor', reordered);
            }}
            style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 'clamp(20px, 3.5vw, 27px)',
            padding: '0 clamp(6px, 1.7vw, 11px)',
            border: `1px solid ${T.accentDim}`,
            borderRadius: 999,
            background: T.rightPage,
            color: T.heading,
            fontSize: mobile ? '0.72rem' : 'clamp(0.48rem, 1.2vw, 0.62rem)',
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            {editMode ? (
              <>
                <input
                  aria-label={`Best for label ${index + 1}`}
                  value={tag}
                  onChange={(event) => {
                    const next = [...bestFor];
                    next[index] = event.target.value;
                    onChange?.('bestFor', next);
                  }}
                  style={{ width: `${Math.max(7, tag.length)}ch`, maxWidth: 100, border: 0, outline: 0, background: 'transparent', color: 'inherit', font: 'inherit' }}
                />
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange?.('bestFor', bestFor.filter((_, itemIndex) => itemIndex !== index))}
                  style={{ border: 0, background: 'transparent', color: T.accent, cursor: 'pointer', padding: '0 0 0 3px' }}
                >×</button>
              </>
            ) : tag}
          </span>
        ))}
        {editMode && (
          <button
            type="button"
            onClick={() => onChange?.('bestFor', [...bestFor, 'New label'])}
            style={{ minHeight: 24, border: `1px dashed ${T.accent}`, borderRadius: 999, background: 'transparent', color: T.accent, fontSize: '0.55rem', cursor: 'pointer' }}
          >+ Label</button>
        )}
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
        {editMode ? <input
          aria-label="Style title"
          value={s.name}
          onChange={(event) => onChange?.('name', event.target.value)}
          style={{
            width: '100%',
            border: '1px dashed rgba(200,113,74,0.55)',
            background: 'rgba(255,255,255,0.65)',
            fontFamily: 'var(--font-playfair,Georgia,serif)',
            fontSize: mobile ? '1.8rem' : 'clamp(1rem, 4vw, 2.25rem)',
            color: T.heading,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        /> : <h3 style={{
          fontFamily: 'var(--font-playfair,Georgia,serif)',
          fontSize: mobile ? '1.8rem' : 'clamp(1rem, 4vw, 2.25rem)',
          color: T.heading,
          margin: 0,
          lineHeight: 1.05,
          fontWeight: 500,
          letterSpacing: '-0.015em'
        }}>{s.name}</h3>}
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
          fontSize: mobile ? '0.72rem' : 'clamp(0.44rem, 1vw, 0.55rem)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 700
        }}>
          Wear Time
        </div>
        {editMode ? <input
          aria-label="Wear time"
          value={s.wearTime}
          onChange={(event) => onChange?.('wearTime', event.target.value)}
          style={{ width: '100%', border: '1px dashed rgba(200,113,74,0.55)', background: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-playfair,Georgia,serif)', color: T.heading, fontSize: 'clamp(0.75rem, 2vw, 1.05rem)', fontWeight: 600 }}
        /> : <div style={{
          fontFamily: 'var(--font-playfair,Georgia,serif)',
          color: T.heading,
          fontSize: mobile ? '1rem' : 'clamp(0.75rem, 2vw, 1.05rem)',
          fontWeight: 600,
          lineHeight: 1
        }}>
          {s.wearTime}
        </div>}
      </div>

      {bestForContent}

      <div>
        <div style={{
          fontSize: mobile ? '0.72rem' : 'clamp(0.48rem, 1.1vw, 0.6rem)',
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
            <div key={`care-tip-${i}`} style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(16px, 3vw, 26px) 1fr',
              gap: 'clamp(6px, 1.6vw, 12px)',
              alignItems: 'start',
              position: 'relative',
              paddingRight: editMode ? 16 : 0
            }}>
              <span style={{
                color: T.accent,
                fontFamily: 'var(--font-playfair,Georgia,serif)',
                fontSize: mobile ? '0.9rem' : 'clamp(0.62rem, 1.7vw, 0.92rem)',
                lineHeight: 1.15
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {editMode ? <input
                aria-label={`Care tip ${i + 1}`}
                value={tip}
                onChange={(event) => {
                  const next = [...preserveTips];
                  next[i] = event.target.value;
                  onChange?.('preserveTips', next);
                }}
                style={{ width: '100%', border: '1px dashed rgba(200,113,74,0.4)', background: 'rgba(255,255,255,0.6)', color: T.body, fontSize: 'clamp(0.52rem, 1.55vw, 0.75rem)', lineHeight: 1.3 }}
              /> : <span style={{
                color: T.body,
                fontSize: mobile ? '0.86rem' : 'clamp(0.52rem, 1.55vw, 0.75rem)',
                lineHeight: 1.3,
                fontWeight: 300
              }}>
                {tip}
              </span>}
              {editMode && (
                <button
                  type="button"
                  aria-label={`Remove care tip ${i + 1}`}
                  onClick={() => onChange?.('preserveTips', preserveTips.filter((_, tipIndex) => tipIndex !== i))}
                  style={{ position: 'absolute', right: 0, border: 0, background: 'transparent', color: T.accent, cursor: 'pointer' }}
                >×</button>
              )}
            </div>
          ))}
          {editMode && preserveTips.length < 5 && (
            <button
              type="button"
              onClick={() => onChange?.('preserveTips', [...preserveTips, 'New care tip'])}
              style={{ justifySelf: 'start', border: `1px dashed ${T.accent}`, background: 'transparent', color: T.accent, fontSize: '0.55rem', cursor: 'pointer' }}
            >+ Care tip</button>
          )}
        </div>
      </div>

      {editMode ? (
        <label
          data-no-page-flip
          style={{
            display: 'grid',
            gap: 4,
            alignSelf: 'end',
            width: '100%',
            color: T.accent,
            fontSize: '0.5rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Photo label
          <input
            data-no-page-flip
            aria-label="Photo label"
            value={s.subtitle || ''}
            onChange={(event) => onChange?.('subtitle', event.target.value)}
            style={{
              width: '100%',
              minHeight: 28,
              border: '1px dashed rgba(200,113,74,0.55)',
              background: 'rgba(255,255,255,0.72)',
              color: T.heading,
              padding: '4px 7px',
              fontSize: '0.58rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          />
        </label>
      ) : <div style={{ height: 'clamp(30px, 5vw, 38px)' }} />}
    </div>
  );
}

/**
 * @param {{
 *   editMode?: boolean;
 *   styles?: Array<Record<string, any>> | null;
 *   onEditStyle?: ((style: Record<string, any>) => void) | null;
 *   onChangeStyle?: ((id: number, field: string, value: any) => void) | null;
 *   onImageFile?: ((id: number, file: File) => void) | null;
 *   onSave?: (() => void) | null;
 *   isSaving?: boolean;
 *   cover?: Record<string, any> | null;
 *   onChangeCover?: ((field: string, value: any) => void) | null;
 *   endPage?: Record<string, any> | null;
 *   onChangeEndPage?: ((field: string, value: any) => void) | null;
 * }} props
 */
export default function FlipBook3D({
  editMode = false,
  styles = null,
  onEditStyle = null,
  onChangeStyle = null,
  onImageFile = null,
  onSave = null,
  isSaving = false,
  cover = null,
  onChangeCover = null,
  endPage = null,
  onChangeEndPage = null,
} = {}) {
  const [persistedSpreads, setPersistedSpreads] = useState(spreads);
  const activeSpreads = editMode
    ? buildSpreads(styles || BRAID_BOOK_STYLES, cover || BRAID_BOOK_COVER, endPage || BRAID_BOOK_END_PAGE)
    : persistedSpreads;
  const [current, setCurrent] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showFlipPage, setShowFlipPage] = useState(false);
  const [flipDirection, setFlipDirection] = useState(1);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const prevCurrentRef = useRef(0);
  const nextCurrentRef = useRef(0);
  const flipTimersRef = useRef([]);
  const reduceMotion = useReducedMotion();
  const total = activeSpreads.length;
  const currentStyleLink = activeSpreads[current].styleLink;
  const pagePaddingTop = 'clamp(24px,5.5vw,32px)';
  const pagePaddingBottom = 'clamp(10px,2.6vw,32px)';
  const pagePaddingOuter = 'clamp(10px,2.6vw,32px)';
  const pagePaddingGutter = 'clamp(22px,4.5vw,44px)';
  const editCurrentStyle = (field, value) => {
    const id = Number(activeSpreads[current]?.id);
    if (id >= 1 && id <= 8) onChangeStyle?.(id, field, value);
  };

  const clearFlipTimers = useCallback(() => {
    flipTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    flipTimersRef.current = [];
  }, []);

  useEffect(() => clearFlipTimers, [clearFlipTimers]);

  useEffect(() => {
    if (editMode) {
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/homepage-settings`)
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (cancelled || !settings?.braidBookStyles) return;
        const parsed = JSON.parse(settings.braidBookStyles);
        const parsedStyles = Array.isArray(parsed) ? parsed : parsed?.styles;
        const parsedCover = !Array.isArray(parsed) && parsed?.cover ? parsed.cover : BRAID_BOOK_COVER;
        const parsedEndPage = !Array.isArray(parsed) && parsed?.endPage ? parsed.endPage : BRAID_BOOK_END_PAGE;
        if (!Array.isArray(parsedStyles) || parsedStyles.length === 0) return;
        const validStyles = parsedStyles.filter((style) =>
          style && Number.isFinite(Number(style.id)) && style.name && style.image
        );
        if (validStyles.length > 0) setPersistedSpreads(buildSpreads(validStyles, { ...BRAID_BOOK_COVER, ...parsedCover }, { ...BRAID_BOOK_END_PAGE, ...parsedEndPage }));
      })
      .catch(() => {
        // The built-in book remains available if homepage settings are offline.
      });
    return () => { cancelled = true; };
  }, [editMode, styles]);

  const goToPage = useCallback((next) => {
    if (isFlipping) return;
    if (next < 0 || next >= total || next === current) return;

    prevCurrentRef.current = current;
    nextCurrentRef.current = next;
    if (activeSpreads[next]?.image) {
      const preload = new window.Image();
      preload.src = activeSpreads[next].image;
    }
    setFlipDirection(next > current ? 1 : -1);

    if (reduceMotion) {
      clearFlipTimers();
      setCurrent(next);
      setShowFlipPage(false);
      setIsFlipping(false);
      return;
    }

    setIsFlipping(true);
    setShowFlipPage(true);

    clearFlipTimers();
    const changeTimer = window.setTimeout(() => {
      setCurrent(next);
    }, 350);

    const finishTimer = window.setTimeout(() => {
      setShowFlipPage(false);
      setIsFlipping(false);
      flipTimersRef.current = [];
    }, 700);
    flipTimersRef.current = [changeTimer, finishTimer];
  }, [activeSpreads, clearFlipTimers, current, isFlipping, reduceMotion, total]);

  const changePage = useCallback((dir) => {
    goToPage(current + dir);
  }, [current, goToPage]);

  useEffect(() => {
    [current - 1, current + 1].forEach((index) => {
      const src = activeSpreads[index]?.image;
      if (!src) return;
      const preload = new window.Image();
      preload.src = src;
    });
  }, [activeSpreads, current]);

  const handleBookKeyDown = (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      changePage(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      changePage(-1);
    }
  };

  const onTouchStart = (e) => { 
    if (e.target instanceof Element && e.target.closest('[data-no-page-flip], input, textarea, select, button, a')) return;
    touchX.current = e.touches[0].clientX; 
    touchY.current = e.touches[0].clientY; 
  };
  
  const onTouchEnd = (e) => {
    if (e.target instanceof Element && e.target.closest('[data-no-page-flip], input, textarea, select, button, a')) return;
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 44 && dy < 80) changePage(dx > 0 ? 1 : -1);
  };

  const Nav = () => (
    <>
      <div className="braid-book-nav" style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
        <button 
          className="braid-book-nav-button"
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
        <div className="braid-book-nav-title" style={{
          color: 'rgba(255,255,255,0.75)', 
          fontSize: '0.7rem', 
          letterSpacing: '0.12em', 
          minWidth: 140, 
          textAlign: 'center', 
          textTransform: 'uppercase',
          fontWeight: 500
        }}>
          {activeSpreads[current].title}
        </div>
        <button 
          className="braid-book-nav-button"
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
      <div className="braid-book-dots" style={{ display: 'flex', gap: 0, marginTop: 3 }}>
        {activeSpreads.map((_, i) => (
          <button 
            key={i} 
            onClick={() => goToPage(i)}
            aria-label={`Go to page ${i + 1}`}
            aria-current={i === current ? 'true' : 'false'}
            style={{ 
              width: 24,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.3s', 
              padding: 0 
            }}
          >
            <span aria-hidden="true" style={{
              display: 'block',
              width: i === current ? 20 : 6,
              height: 6,
              borderRadius: i === current ? 3 : '50%',
              background: i === current ? T.dotOn : T.dotOff,
            }} />
          </button>
        ))}
      </div>
    </>
  );

  const Header = () => (
    <>
      <div style={{ fontSize: '1.2rem', marginBottom: 16, opacity: 0.7 }}>✦</div>
      <h2 className="braid-book-heading" style={{
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
        Focus the book and use arrow keys, buttons, or a swipe
      </p>
    </>
  );

  return (
    <>
      <style jsx>{`
        .braid-book-nav { display: flex; align-items: center; gap: 20px; margin-top: 24px; }
        .braid-book-dots { display: flex; flex-wrap: wrap; justify-content: center; margin-top: 3px; }
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
        className="braid-book-section"
        style={{ 
          background: T.bgSection, 
          padding: '60px 20px 50px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          overflowX: 'clip'
        }}
        aria-label="The Braid Book - Interactive guide to protective hairstyles"
        onKeyDown={handleBookKeyDown}
      >
        <Header />

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Page {current + 1} of {total}: {activeSpreads[current].title}
        </p>

        <div
          className="braid-book-stage"
          onTouchStart={onTouchStart} 
          onTouchEnd={onTouchEnd}
          style={{ 
            perspective: '2500px', 
            perspectiveOrigin: '50% 50%',
            width: 'min(900px,calc(100vw - 72px))',
            height: 'clamp(420px,70vw,600px)', 
            position: 'relative', 
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          role="region"
          aria-label={`Page ${current + 1} of ${total}: ${activeSpreads[current].title}`}
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
                }}
                role={current === 0 ? undefined : 'button'}
                tabIndex={current === 0 ? -1 : 0}
                aria-label={current === 0 ? undefined : 'Previous page'}
                onKeyDown={(event) => {
                  if (event.target instanceof Element && event.target.closest('[data-no-page-flip], input, textarea, select, button, a')) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    changePage(-1);
                  }
                }}>
                {activeSpreads[current].leftEl}
                {editMode && activeSpreads[current]?.id === 0 && (
                  <label data-no-page-flip style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.14)', color: '#fff', cursor: 'pointer' }}>
                    <span style={{ padding: '10px 14px', background: 'rgba(45,31,26,.88)', fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>Replace cover image</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heif,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onImageFile?.(0, file);
                      event.target.value = '';
                    }} />
                  </label>
                )}
                {editMode && activeSpreads[current]?.id >= 1 && activeSpreads[current]?.id <= 8 && (
                  <div
                    data-no-page-flip
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 40,
                      background: 'rgba(0,0,0,0.16)',
                      color: '#fff',
                    }}
                  >
                    <label style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                      <span style={{ padding: '10px 14px', background: 'rgba(45,31,26,0.88)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Replace image
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heif,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
                        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onImageFile?.(Number(activeSpreads[current].id), file);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
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

                {editMode && activeSpreads[current]?.id === 0
                  ? <CoverContent cover={cover || BRAID_BOOK_COVER} editMode onChange={onChangeCover} />
                  : editMode && activeSpreads[current]?.id === 9
                    ? <EndPageContent endPage={endPage || BRAID_BOOK_END_PAGE} editMode onChange={onChangeEndPage} />
                  : <RightPageContent s={activeSpreads[current]} editMode={editMode} onChange={editCurrentStyle} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: 16, 
                  right: 20, 
                  fontSize: '0.58rem', 
                  color: T.pageNum, 
                  letterSpacing: 1,
                  fontFamily: 'Georgia, serif'
                }}>
                  {activeSpreads[current].pageNum}
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
              const toIdx   = Math.max(0, Math.min(total - 1, nextCurrentRef.current));
              const from    = activeSpreads[fromIdx];
              const to      = activeSpreads[toIdx];
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

          <div
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              changePage(1);
            }}
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
          </div>

          {currentStyleLink && !isFlipping && !editMode && (
            <a
              href={currentStyleLink}
              aria-label={`Select ${activeSpreads[current].name} for booking`}
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
              Select This Style
            </a>
          )}

          {editMode && onEditStyle && activeSpreads[current]?.id >= 1 && activeSpreads[current]?.id <= 8 && !isFlipping && (
            <button
              type="button"
              data-no-page-flip
              onClick={(event) => {
                event.stopPropagation();
                onEditStyle?.(activeSpreads[current]);
              }}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                zIndex: 1200,
                minHeight: 44,
                padding: '10px 16px',
                border: '1px solid rgba(45,31,26,0.25)',
                borderRadius: 3,
                background: '#fffdf9',
                color: T.heading,
                boxShadow: '0 8px 24px rgba(45,31,26,0.18)',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              ✎ Edit spread
            </button>
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

        {editMode && (
          <div
            data-no-page-flip
            style={{
              position: 'sticky',
              bottom: 16,
              zIndex: 1500,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 12,
              padding: '12px 14px',
              border: '1px solid rgba(45,31,26,0.18)',
              borderRadius: 6,
              background: 'rgba(255,253,249,0.96)',
              boxShadow: '0 12px 34px rgba(45,31,26,0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span style={{ color: T.body, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>Editing {activeSpreads[current]?.name || activeSpreads[current]?.title}</span>
            {activeSpreads[current]?.id >= 1 && activeSpreads[current]?.id <= 8 && (
              <label style={{ display: 'grid', gap: 3, minWidth: 220 }}>
                <span style={{ color: T.bodyLight, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Booking link</span>
                <input
                  aria-label="Booking link"
                  value={activeSpreads[current].styleLink || ''}
                  onChange={(event) => editCurrentStyle('styleLink', event.target.value)}
                  style={{ minHeight: 34, border: '1px solid rgba(45,31,26,0.2)', borderRadius: 3, background: '#fff', color: T.heading, padding: '0 8px', fontSize: '0.68rem' }}
                />
              </label>
            )}
            {activeSpreads[current]?.id === 9 && (
              <>
                <input aria-label="Back cover quote" value={(endPage || BRAID_BOOK_END_PAGE).backQuote} onChange={(event) => onChangeEndPage?.('backQuote', event.target.value)} style={{ minHeight: 34, minWidth: 220, border: '1px solid rgba(45,31,26,.2)', borderRadius: 3, padding: '0 8px', fontSize: '.68rem' }} />
                <input aria-label="Back cover attribution" value={(endPage || BRAID_BOOK_END_PAGE).backAttribution} onChange={(event) => onChangeEndPage?.('backAttribution', event.target.value)} style={{ minHeight: 34, minWidth: 150, border: '1px solid rgba(45,31,26,.2)', borderRadius: 3, padding: '0 8px', fontSize: '.68rem' }} />
              </>
            )}
            <button type="button" onClick={() => onSave?.()} disabled={isSaving} style={{ minHeight: 42, border: 0, borderRadius: 3, padding: '0 18px', background: T.btnBg, color: T.btnText, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>
              {isSaving ? 'Saving…' : 'Save Braid Book'}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
