'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config/api';

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
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show prompt after 3 seconds on page load
  useEffect(() => {
    if (!isMounted) return;
    
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, isMounted]);

  // Don't render on admin pages (after all hooks)
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Don't render anything on server (after all hooks)
  if (!isMounted) {
    return null;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
        setError('Failed to send message. Please try again.');
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
        {/* Prompt Bubble */}
        {showPrompt && (
          <div className="fixed bottom-6 right-24 z-50 animate-bounce">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-br-sm shadow-2xl p-4 max-w-sm border border-neutral-200 dark:border-neutral-700 relative">
              <button
                onClick={() => setShowPrompt(false)}
                className="absolute -top-2 -right-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full p-1 transition-colors"
                aria-label="Close prompt"
              >
                <X className="h-3 w-3 text-neutral-600 dark:text-neutral-300" />
              </button>
              <div className="flex items-start gap-3">
                {/* Assistant Character */}
                <div className="w-16 h-16 flex-shrink-0">
                  {imageError ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-[#2C1810] to-[#4a3828] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                      AH
                    </div>
                  ) : (
                    <img
                      src="/chatbot-assistant.png"
                      alt="Customer Service Assistant"
                      className="w-full h-full object-cover rounded-full border-2 border-[#2C1810] shadow-md"
                      onError={() => setImageError(true)}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                    Have a question? 👋
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    We're here to help! Click to chat with us.
                  </p>
                </div>
              </div>
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
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-[#2C1810] to-[#4a3828] text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-200"
          aria-label="Open chat"
        >
          <Send className="h-6 w-6" />
        </button>
      </>
    );
  }

  return (
    <div key={isMounted ? 'mounted' : 'unmounted'} className="fixed bottom-6 right-6 z-50 w-full max-w-md mx-6 sm:mx-0">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2C1810] via-[#3d2416] to-[#4a3828] text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#2C1810] font-bold text-xl shadow-md">
                AH
              </div>
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Chat with</p>
                <h3 className="text-xl font-bold">BY AH Braiding</h3>
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
                      accept="image/*"
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
