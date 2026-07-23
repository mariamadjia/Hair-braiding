'use client';

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from 'react';
import Image from 'next/image';
import { CalendarDays, CheckCircle2, TrendingUp, Upload, Users, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterWrapper from '@/components/FooterWrapper';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const benefits = [
  { icon: CalendarDays, title: 'Flexible scheduling', copy: 'Choose shifts that fit your lifestyle.' },
  { icon: CheckCircle2, title: 'Professional studio', copy: 'Work in a clean, modern and fully equipped space.' },
  { icon: Users, title: 'Established clientele', copy: 'Step into a steady flow of loyal clients.' },
  { icon: TrendingUp, title: 'Growth opportunities', copy: 'Continue learning and grow your brand.' },
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

  const fieldClass = 'min-h-11 w-full rounded-md border border-[#D8C9BC] bg-white/80 px-3 text-sm text-[#2C1810] outline-none transition placeholder:text-neutral-400 focus:border-[#9A5D42] focus:ring-2 focus:ring-[#B86F4B]/20';

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F7F3EC] text-[#2C1810]">
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-14 lg:px-12">
          <header className="mx-auto mb-9 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B86F4B]">Careers at AH Braiding</p>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.025em] sm:text-5xl">Join Our Team</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              We’re looking for passionate braiders who value beautiful work, thoughtful service, and an elevated client experience.
            </p>
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.02fr] lg:gap-10">
            <div>
              <div className="relative aspect-[16/11] overflow-hidden rounded-lg bg-[#E9E0D6]">
                <Image src="/Gallery/Salon.JPG" alt="The bright, professional AH Braiding studio" fill priority sizes="(max-width: 1023px) 100vw, 48vw" className="object-cover" />
              </div>
              <div className="pt-6">
                <h2 className="font-serif text-2xl">Become Part of Our Studio</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                  Bring your talent into a polished, welcoming studio with the tools, environment, and clientele to help you do your best work.
                </p>
                <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                  {benefits.map(({ icon: Icon, title, copy }) => (
                    <div key={title} className="border-l border-[#DFCFC2] pl-3 first:border-l-0 first:pl-0">
                      <Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[#B86F4B]" strokeWidth={1.6} />
                      <h3 className="text-xs font-semibold">{title}</h3>
                      <p className="mt-1 text-[11px] leading-4 text-neutral-500">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#DFCFC2] bg-[#F2E9DE] p-5 shadow-[0_14px_35px_rgba(44,24,16,0.06)] sm:p-7">
              <h2 className="font-serif text-2xl">Application Form</h2>
              <div className="mb-5 mt-3 h-px w-10 bg-[#B86F4B]" />

              {result && (
                <div role={result.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mb-5 rounded-md border p-3 text-sm ${result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  {result.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name" id="firstName"><input id="firstName" name="firstName" autoComplete="given-name" required maxLength={80} value={formData.firstName} onChange={handleInputChange} className={fieldClass} /></Field>
                  <Field label="Last Name" id="lastName"><input id="lastName" name="lastName" autoComplete="family-name" required maxLength={80} value={formData.lastName} onChange={handleInputChange} className={fieldClass} /></Field>
                </div>
                <Field label="Email" id="email"><input id="email" name="email" type="email" autoComplete="email" required maxLength={160} value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={fieldClass} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone" id="phone"><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} value={formData.phone} onChange={handleInputChange} placeholder="(210) 555-0123" className={fieldClass} /></Field>
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Specialties" id="specialties"><input id="specialties" name="specialties" required maxLength={300} value={formData.specialties} onChange={handleInputChange} placeholder="Knotless, locs, twists…" className={fieldClass} /></Field>
                  <Field label="Availability" id="availability">
                    <select id="availability" name="availability" required value={formData.availability} onChange={handleInputChange} className={fieldClass}>
                      <option value="">Select availability</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Weekends">Weekends</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </Field>
                </div>
                <Field label="Instagram or Portfolio" id="portfolio" optional><input id="portfolio" name="portfolio" maxLength={300} value={formData.portfolio} onChange={handleInputChange} placeholder="@username or portfolio link" className={fieldClass} /></Field>

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
                    className={`mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 text-center outline-none transition focus:ring-2 focus:ring-[#B86F4B]/30 ${isDragging ? 'border-[#B86F4B] bg-white' : 'border-[#CDB9A9] bg-white/45 hover:bg-white/75'}`}
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

                <button type="submit" disabled={isSubmitting || Boolean(fileError)} className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#2C1810] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#47271C] focus:outline-none focus:ring-2 focus:ring-[#2C1810] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
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
