'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { X, Send, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config/api';
import { IMAGE_UPLOAD_ACCEPT, normalizeImageForUpload } from '@/lib/utils/imageUpload';

export default function Chatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPlayedGreeting = useRef(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Let the assistant peek in once, then quietly return to the idle launcher.
  useEffect(() => {
    if (!isMounted || isOpen || pathname === '/checkout' || hasPlayedGreeting.current) return;

    hasPlayedGreeting.current = true;
    const appearTimer = window.setTimeout(() => setShowPrompt(true), 4500);
    const disappearTimer = window.setTimeout(() => setShowPrompt(false), 11000);

    return () => {
      window.clearTimeout(appearTimer);
      window.clearTimeout(disappearTimer);
    };
  }, [isOpen, isMounted, pathname]);

  // Don't render on admin pages (after all hooks)
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Don't render anything on server (after all hooks)
  if (!isMounted) {
    return null;
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const uploadFile = await normalizeImageForUpload(file);
        setPhoto(uploadFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(uploadFile);
      } catch (conversionError) {
        setError(conversionError instanceof Error ? conversionError.message : 'Photo conversion failed.');
        e.target.value = '';
      }
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || !customerPhone || !message) {
      setError('Please fill in all required fields');
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('customerName', customerName);
      formData.append('customerEmail', customerEmail);
      formData.append('customerPhone', customerPhone);
      formData.append('message', message);
      
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setMessage('');
        removePhoto();
        
        // Close after 2 seconds
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 2000);
      } else {
        const responseBody = await res.json().catch(() => null);
        setError(responseBody?.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <>
        {/* Assistant peeks in, greets the visitor, then fades back to idle. */}
        {showPrompt && pathname !== '/checkout' && (
          <div className="chat-assistant-peek fixed bottom-7 right-3 z-40 h-[310px] w-[235px] origin-bottom-right motion-reduce:animate-none sm:right-5">
            <div className="absolute bottom-[164px] right-0 z-20 w-[200px] rounded-2xl rounded-br-md border border-[#eadfd4] bg-[#fffaf5] px-4 py-3 shadow-[0_12px_35px_rgba(44,24,16,.16)]">
              <button
                onClick={() => setShowPrompt(false)}
                className="absolute -right-2 -top-2 rounded-full border border-[#eadfd4] bg-white p-1 text-[#6b5143] shadow-sm transition-colors hover:bg-[#f5ece5]"
                aria-label="Close prompt"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-sm font-semibold text-[#2c1810]">Have a question?</p>
              <p className="mt-0.5 text-sm text-[#725c50]">We&apos;re here to help.</p>
              <span className="absolute -bottom-2 right-[70px] h-4 w-4 rotate-45 border-b border-r border-[#eadfd4] bg-[#fffaf5]" />
            </div>
            <div className="absolute bottom-0 right-0 h-[215px] w-[215px]">
              <Image
                src="/chatbot-robot-peek.png"
                alt="AH Braiding virtual assistant peeking in"
                width={170}
                height={170}
                className="absolute bottom-1 right-1 z-10 h-auto w-[172px] drop-shadow-[0_12px_16px_rgba(44,24,16,.2)]"
              />
            </div>
          </div>
        )}
        
        {/* Chat Button */}
        <button
          onClick={() => {
            setIsOpen(true);
            setShowWelcome(true);
            setShowPrompt(false);
          }}
          className={`fixed bottom-6 z-50 rounded-full border border-white/20 bg-gradient-to-br from-[#2C1810] to-[#4a3828] p-4 text-white shadow-[0_10px_28px_rgba(44,24,16,.3)] transition-all duration-500 hover:scale-110 hover:shadow-2xl ${showPrompt ? 'right-[158px]' : 'right-6'}`}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
        </button>
      </>
    );
  }

  return (
    <div key={isMounted ? 'mounted' : 'unmounted'} className="fixed bottom-3 left-3 right-3 z-50 w-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-[520px] sm:max-w-[calc(100vw-3rem)]">
      <div className="overflow-hidden rounded-[28px] border border-[#d7b477] bg-[#fffdfb] shadow-[0_24px_70px_rgba(44,24,16,.28)]">
        {/* Header */}
        <div className="relative bg-[radial-gradient(circle_at_75%_0%,#743814_0%,#482414_38%,#2c160e_100%)] px-6 pb-11 pt-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-full bg-[#fff7ed] shadow-[0_8px_24px_rgba(0,0,0,.24)] ring-2 ring-[#f2d5a4]">
                <Image
                  src="/chatbot-robot.png"
                  alt=""
                  fill
                  sizes="72px"
                  className="scale-[1.45] object-contain object-top"
                />
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.22em] text-[#f1c989]">Chat with</p>
                <h3 className="[font-family:var(--font-playfair)] text-[30px] leading-none font-medium">AH Braiding</h3>
                <div className="mt-3 flex items-center gap-2 text-sm text-[#f5ddbd]">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,.12)]" />
                  <span>Online now</span>
                  <span className="text-[#cfad86]">•</span>
                  <span className="text-[#d8b994]">Ready to help</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-[#f2c98e] transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-7 w-7" strokeWidth={1.5} />
            </button>
          </div>
          <div className="absolute -bottom-5 -left-[5%] h-10 w-[110%] rounded-[50%_50%_0_0] border-t border-[#e7c27f] bg-[#fffdfb]" />
        </div>

        {/* Content */}
        <div className="max-h-[min(650px,calc(100vh-210px))] overflow-y-auto bg-[#fffdfb] px-6 pb-6 pt-5">
          {success ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#eadbc9] bg-[#f9f1e8]">
                <Send className="h-8 w-8 text-[#a86d35]" />
              </div>
              <h4 className="mb-2 [font-family:var(--font-playfair)] text-2xl font-medium text-[#2c1810]">
                Message Sent!
              </h4>
              <p className="text-[#806c5f]">
                We'll get back to you soon.
              </p>
            </div>
          ) : showWelcome ? (
            <div className="space-y-4 py-2">
              <div className="flex w-fit max-w-[88%] items-center gap-4 rounded-[22px] border border-[#eee1d4] bg-[linear-gradient(135deg,#fffaf5,#f8f0e8)] p-5 shadow-[0_8px_22px_rgba(59,33,20,.08)]">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-[#eadbc9] bg-[#f8eee3] text-3xl" aria-hidden="true">👋</div>
                <p className="text-base leading-relaxed text-[#2f1b12]">
                  Hi there! If you need any assistance, I'm always here.
                </p>
              </div>
              <div className="flex items-start gap-4 rounded-[22px] border border-[#eee1d4] bg-[linear-gradient(135deg,#fffaf5,#f8f0e8)] p-5 shadow-[0_8px_22px_rgba(59,33,20,.08)]">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-[#eadbc9] bg-[#f8eee3] text-[#bd8043]" aria-hidden="true">
                  <MessageCircle className="h-7 w-7" strokeWidth={1.7} />
                </div>
                <div>
                  <p className="mb-2 text-base font-semibold leading-relaxed text-[#2f1b12]">
                  Have a question about our services or a style in mind?
                  </p>
                  <p className="text-sm leading-relaxed text-[#8b7769]">
                    Send us a message and we'll get back to you as soon as possible.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#d99a43] bg-[linear-gradient(100deg,#351a0e,#783812,#351a0e)] py-4 text-base font-semibold text-white shadow-[0_10px_24px_rgba(71,34,16,.2)] transition-all duration-200 hover:brightness-110"
              >
                <MessageCircle className="h-6 w-6" strokeWidth={1.7} />
                Start Chatting
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-1">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5e4638]">
                  Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-[#dfd0c5] bg-[#fffaf6] px-4 py-3 text-[#2f1b12] transition-colors placeholder:text-[#a49388] focus:border-[#b77b3f] focus:outline-none focus:ring-2 focus:ring-[#d9a566]/20"
                  placeholder="Your full name"
                  maxLength={100}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5e4638]">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#dfd0c5] bg-[#fffaf6] px-4 py-3 text-[#2f1b12] transition-colors placeholder:text-[#a49388] focus:border-[#b77b3f] focus:outline-none focus:ring-2 focus:ring-[#d9a566]/20"
                  placeholder="your@email.com"
                  maxLength={100}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5e4638]">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-[#dfd0c5] bg-[#fffaf6] px-4 py-3 text-[#2f1b12] transition-colors placeholder:text-[#a49388] focus:border-[#b77b3f] focus:outline-none focus:ring-2 focus:ring-[#d9a566]/20"
                  placeholder="(123) 456-7890"
                  maxLength={20}
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5e4638]">
                  Your Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-none rounded-xl border border-[#dfd0c5] bg-[#fffaf6] px-4 py-3 text-[#2f1b12] transition-colors placeholder:text-[#a49388] focus:border-[#b77b3f] focus:outline-none focus:ring-2 focus:ring-[#d9a566]/20"
                  rows={4}
                  maxLength={5000}
                  placeholder="Tell us about your question or the style you're looking for..."
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5e4638]">
                  Style Photo (Optional)
                </label>
                <p className="mb-3 text-xs text-[#8b7769]">
                  Have a style in mind? Attach a photo for reference.
                </p>
                
                {!photoPreview ? (
                  <div className="rounded-xl border-2 border-dashed border-[#ddc9b7] bg-[#fffaf6] p-5 text-center transition-colors hover:border-[#b77b3f]">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#eadbc9] bg-[#f8eee3]">
                        <ImageIcon className="h-6 w-6 text-[#b77b3f]" />
                      </div>
                      <span className="mb-1 text-sm font-medium text-[#5e4638]">
                        Click to upload a photo
                      </span>
                      <span className="text-xs text-[#8b7769]">
                        PNG, JPG up to 10MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-[#dfd0c5]">
                    <img
                      src={photoPreview}
                      alt="Style preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center rounded-2xl border-2 border-[#d99a43] bg-[linear-gradient(100deg,#351a0e,#783812,#351a0e)] py-4 font-semibold text-white shadow-[0_10px_24px_rgba(71,34,16,.2)] transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
