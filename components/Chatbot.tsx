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
    <div key={isMounted ? 'mounted' : 'unmounted'} className="fixed bottom-3 left-3 right-3 z-50 w-auto max-w-md sm:bottom-6 sm:left-auto sm:right-6">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2C1810] via-[#3d2416] to-[#4a3828] text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[#f8efe7] shadow-md ring-2 ring-white/30">
                <Image
                  src="/chatbot-robot.png"
                  alt=""
                  fill
                  sizes="56px"
                  className="scale-[1.45] object-contain object-top"
                />
              </div>
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Chat with</p>
                <h3 className="text-xl font-bold">AH Braiding</h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-all duration-200"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-sm text-white/95 font-medium">We're online and ready to help!</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Message Sent!
              </h4>
              <p className="text-neutral-600 dark:text-neutral-400">
                We'll get back to you soon.
              </p>
            </div>
          ) : showWelcome ? (
            <div className="py-2">
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600 rounded-2xl rounded-tl-sm p-4 mb-3 max-w-[90%] shadow-sm">
                <p className="text-neutral-900 dark:text-white text-base leading-relaxed">
                  Hi there 👋 If you need any assistance, I'm always here.
                </p>
              </div>
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600 rounded-2xl rounded-tl-sm p-4 mb-8 max-w-[90%] shadow-sm">
                <p className="text-neutral-900 dark:text-white text-base leading-relaxed mb-2">
                  Have a question about our services or a style in mind?
                </p>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                  Send us a message and we'll get back to you as soon as possible.
                </p>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="w-full bg-gradient-to-r from-[#2C1810] to-[#3d2416] text-white py-3.5 rounded-xl hover:from-[#3d2a1f] hover:to-[#4a3828] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Start Chatting
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:border-[#2C1810] dark:focus:border-[#4a3828] dark:bg-neutral-700 dark:text-white transition-colors"
                  placeholder="Your full name"
                  maxLength={100}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:border-[#2C1810] dark:focus:border-[#4a3828] dark:bg-neutral-700 dark:text-white transition-colors"
                  placeholder="your@email.com"
                  maxLength={100}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:border-[#2C1810] dark:focus:border-[#4a3828] dark:bg-neutral-700 dark:text-white transition-colors"
                  placeholder="(123) 456-7890"
                  maxLength={20}
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:border-[#2C1810] dark:focus:border-[#4a3828] dark:bg-neutral-700 dark:text-white resize-none transition-colors"
                  rows={4}
                  maxLength={5000}
                  placeholder="Tell us about your question or the style you're looking for..."
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Style Photo (Optional)
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  Have a style in mind? Attach a photo for reference.
                </p>
                
                {!photoPreview ? (
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center hover:border-[#2C1810] dark:hover:border-[#4a3828] transition-colors bg-neutral-50 dark:bg-neutral-700/50">
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
                      <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-600 rounded-full flex items-center justify-center mb-3">
                        <ImageIcon className="h-6 w-6 text-neutral-500 dark:text-neutral-300" />
                      </div>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Click to upload a photo
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        PNG, JPG up to 10MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-600">
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
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-[#2C1810] to-[#3d2416] text-white py-3.5 rounded-xl hover:from-[#3d2a1f] hover:to-[#4a3828] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
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
