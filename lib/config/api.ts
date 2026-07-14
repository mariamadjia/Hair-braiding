export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-hairbraiding.onrender.com';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SETUP: '/api/auth/setup',
  
  // Appointments
  APPOINTMENTS: '/api/appointments',
  APPOINTMENT_SETTINGS: '/api/appointments/settings',
  
  // Availability
  AVAILABILITY_SLOTS: '/api/availability/slots',
  AVAILABILITY_BUSINESS_HOURS: '/api/availability/business-hours',
  AVAILABILITY_BLOCKED_TIMES: '/api/availability/blocked-times',
  
  // Customers
  CUSTOMERS: '/api/customers',
  
  // Services
  SERVICES: '/api/services',
  
  // Gallery
  GALLERY: '/api/gallery',
  
  // Hero
  HERO_IMAGES: '/api/hero-images',
} as const;
