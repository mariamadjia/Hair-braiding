'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function JoinUs() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    yearsOfExperience: '',
    photos: null as File[] | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData((prev) => ({
        ...prev,
        photos: Array.from(e.target.files || []),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('yearsOfExperience', formData.yearsOfExperience);
      
      if (formData.photos) {
        formData.photos.forEach((photo) => {
          formDataToSend.append('photos', photo);
        });
      }

      const response = await fetch('/api/join-us', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        setSubmitMessage('Thank you for your application! We will review it and get back to you soon.');
        setFormData({
          firstName: '',
          lastName: '',
          yearsOfExperience: '',
          photos: null,
        });
      } else {
        setSubmitMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setSubmitMessage('Error submitting form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FFF5EE]">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 py-12 md:py-24">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-light text-neutral-900 mb-8 text-center">
              Join Our Team
            </h1>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="aspect-[4/3] relative overflow-hidden rounded-lg">
                  <Image
                    src="/Gallery/Salon.JPG"
                    alt="Our Salon"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="text-center lg:text-left">
                  <h2 className="text-xl font-light text-neutral-900 mb-3">
                    Become Part of Our Studio
                  </h2>
                  <p className="text-[15px] leading-relaxed text-neutral-700 font-light">
                    We're looking for talented braiders to join our luxury studio. 
                    If you have a passion for braiding and want to be part of an 
                    exceptional team, we'd love to hear from you.
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-light text-neutral-900 mb-6">
                  Application Form
                </h2>

                {submitMessage && (
                  <div
                    className={`mb-6 p-4 rounded-md ${
                      submitMessage.includes('Thank you')
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="yearsOfExperience"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Years of Braiding Experience *
                    </label>
                    <input
                      type="number"
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="photos"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Upload Photos (Optional)
                    </label>
                    <input
                      type="file"
                      id="photos"
                      name="photos"
                      onChange={handleFileChange}
                      multiple
                      accept="image/*"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      You can upload multiple photos of your work
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-neutral-900 text-white hover:bg-neutral-800 py-3"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
