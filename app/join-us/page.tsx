'use client';

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from 'react';
import Image from 'next/image';
import { Armchair, CalendarDays, TrendingUp, Upload, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterWrapper from '@/components/FooterWrapper';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const benefits = [
  { icon: CalendarDays, title: 'Flexible Scheduling', copy: 'Choose shifts that fit your lifestyle.' },
  { icon: Armchair, title: 'Professional Studio', copy: 'Work in a clean, modern, fully equipped space.' },
  { icon: TrendingUp, title: 'Growth Opportunities', copy: 'Keep learning and grow your brand.' },
];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  yearsOfExperience: '',
  specialties: '',
  availability: '',
  portfolio: '',
  website: '',
};

export default function JoinUs() {
  const [formData, setFormData] = useState(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const validateFiles = (incoming: File[]) => {
    const next = [...photos, ...incoming];
    if (next.length > MAX_FILES) return `Upload no more than ${MAX_FILES} photos.`;
    if (next.some((file) => !ACCEPTED_TYPES.includes(file.type))) return 'Use JPG, PNG, or WebP photos only.';
    if (next.some((file) => file.size > MAX_FILE_BYTES)) return 'Each photo must be 2 MB or smaller.';
    if (next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return 'All photos together must be 4 MB or smaller.';
    setPhotos(next);
    setFileError('');
    return '';
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    validateFiles(Array.from(event.dataTransfer.files));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (fileError) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value.trim()));
      photos.forEach((photo) => payload.append('photos', photo));

      const response = await fetch('/api/join-us', { method: 'POST', body: payload });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Your application could not be submitted.');

      setResult({ type: 'success', message: 'Thank you! Your application was delivered. We’ll review it and contact you if there is a match.' });
      setFormData(initialForm);
      setPhotos([]);
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Your application could not be submitted. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = 'min-h-12 w-full rounded-lg border border-[#DCCEC2] bg-white/55 px-4 text-sm text-[#2C1810] outline-none transition placeholder:text-[#8F8882] focus:border-[#B86F4B] focus:bg-white/80 focus:ring-2 focus:ring-[#B86F4B]/20';

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.75),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(226,207,190,0.24),transparent_30%),#F7F1E9] text-[#2C1810]">
        <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 md:py-16 lg:px-16 lg:py-20 xl:px-20">
          <header className="mx-auto mb-12 max-w-3xl text-center lg:mb-16">
            <h1 className="font-serif text-5xl font-normal tracking-[-0.035em] sm:text-[3.5rem] lg:text-6xl">Join Our Team</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#4E4A47] sm:text-base">
              We’re looking for talented braiders who value beautiful work,<br className="hidden sm:block" />
              thoughtful service, and an elevated client experience.
            </p>
          </header>

          <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
            <article className="overflow-hidden rounded-[24px] border border-[#DDCFC4] bg-white/28 shadow-[0_18px_50px_rgba(73,42,28,0.06)]">
              <div className="relative aspect-[16/9] overflow-hidden bg-[#E9E0D6]">
                <Image src="/Gallery/Salon.JPG" alt="The bright, professional AH Braiding studio" fill priority sizes="(max-width: 1023px) 100vw, 48vw" className="object-cover" />
              </div>
              <div className="px-6 pb-7 pt-6 sm:px-9 sm:pb-9">
                <h2 className="font-serif text-3xl tracking-[-0.02em] sm:text-[2rem]">Build Your Career With Us</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#55504C] sm:text-base">
                  Join a polished, supportive studio where your talent is valued and your growth is encouraged.
                </p>
                <div className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-0">
                  {benefits.map(({ icon: Icon, title, copy }) => (
                    <div key={title} className="border-[#DDCFC4] sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0">
                      <Icon aria-hidden="true" className="mb-4 h-8 w-8 text-[#C56735]" strokeWidth={1.6} />
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-[#615B56]">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="rounded-[24px] border border-[#DDCFC4] bg-white/28 p-5 shadow-[0_18px_50px_rgba(73,42,28,0.06)] sm:p-8 lg:p-9">
              <h2 className="font-serif text-3xl tracking-[-0.02em] sm:text-[2rem]">Application Form</h2>

              {result && (
                <div role={result.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mb-5 mt-5 rounded-md border p-3 text-sm ${result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  {result.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name" id="firstName"><input id="firstName" name="firstName" autoComplete="given-name" required maxLength={80} value={formData.firstName} onChange={handleInputChange} placeholder="Enter your first name" className={fieldClass} /></Field>
                  <Field label="Last Name" id="lastName"><input id="lastName" name="lastName" autoComplete="family-name" required maxLength={80} value={formData.lastName} onChange={handleInputChange} placeholder="Enter your last name" className={fieldClass} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" id="email"><input id="email" name="email" type="email" autoComplete="email" required maxLength={160} value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={fieldClass} /></Field>
                  <Field label="Phone" id="phone"><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} value={formData.phone} onChange={handleInputChange} placeholder="(210) 555-0123" className={fieldClass} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Years of Braiding Experience" id="yearsOfExperience">
                    <select id="yearsOfExperience" name="yearsOfExperience" required value={formData.yearsOfExperience} onChange={handleInputChange} className={fieldClass}>
                      <option value="">Select experience</option>
                      <option value="Less than 1 year">Less than 1 year</option>
                      <option value="1–2 years">1–2 years</option>
                      <option value="3–5 years">3–5 years</option>
                      <option value="6–10 years">6–10 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </Field>
                  <Field label="Specialties" id="specialties"><input id="specialties" name="specialties" required maxLength={300} value={formData.specialties} onChange={handleInputChange} placeholder="Knotless, locs, twists…" className={fieldClass} /></Field>
                </div>
                <Field label="Availability" id="availability">
                  <select id="availability" name="availability" required value={formData.availability} onChange={handleInputChange} className={fieldClass}>
                    <option value="">Select availability</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </Field>

                <div>
                  <span className="block text-xs font-semibold">Upload photos of your work <span className="font-normal text-neutral-500">(optional)</span></span>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload portfolio photos"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                    onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center outline-none transition focus:ring-2 focus:ring-[#B86F4B]/30 ${isDragging ? 'border-[#B86F4B] bg-white' : 'border-[#D7A98E] bg-white/25 hover:bg-white/55'}`}
                  >
                    <Upload aria-hidden="true" className="mb-2 h-6 w-6 text-[#9A5D42]" strokeWidth={1.5} />
                    <p className="text-xs font-medium">Drag and drop files here or click to browse</p>
                    <p className="mt-1 text-[10px] text-neutral-500">JPG, PNG or WebP · up to 3 photos · 4 MB total</p>
                    <input ref={fileInputRef} className="sr-only" type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                  </div>
                  {fileError && <p role="alert" className="mt-2 text-xs text-red-700">{fileError}</p>}
                  {photos.length > 0 && (
                    <ul className="mt-2 space-y-1" aria-label="Selected photos">
                      {photos.map((photo, index) => (
                        <li key={`${photo.name}-${photo.lastModified}`} className="flex items-center justify-between rounded bg-white/60 px-3 py-2 text-xs">
                          <span className="min-w-0 truncate">{photo.name} · {(photo.size / 1024 / 1024).toFixed(1)} MB</span>
                          <button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[#E8D9CD]" aria-label={`Remove ${photo.name}`}><X className="h-4 w-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" value={formData.website} onChange={handleInputChange} />
                </div>

                <button type="submit" disabled={isSubmitting || Boolean(fileError)} className="flex min-h-14 w-full items-center justify-center rounded-lg bg-[linear-gradient(90deg,#492513,#6A351B,#492513)] px-5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#2C1810] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                  {isSubmitting ? 'Sending Application…' : 'Submit Application'}
                </button>
                <p className="text-center text-[10px] leading-4 text-neutral-500">Your information and portfolio are used only to review your application.</p>
              </form>
            </div>
          </div>
        </section>
      </main>
      <FooterWrapper />
    </>
  );
}

function Field({ label, id, optional = false, children }: { label: string; id: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold">
        {label} {!optional && <span aria-hidden="true">*</span>}
        {optional && <span className="font-normal text-neutral-500"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}
