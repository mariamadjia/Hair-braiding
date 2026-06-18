import { apiClient } from './client';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/auth';
import { BlockedTime } from '../types/gallery';

export interface BusinessHours {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface TimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
}

export const availabilityApi = {
  // Get business hours
  getBusinessHours: async (): Promise<BusinessHours[]> => {
    const response = await fetch(`${API_BASE_URL}/api/availability/business-hours`);
    if (!response.ok) throw new Error('Failed to fetch business hours');
    return response.json();
  },

  // Save business hours
  saveBusinessHours: async (hours: BusinessHours): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/availability/business-hours`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hours),
    });
    if (!response.ok) throw new Error('Failed to save business hours');
  },

  // Get available slots for a date
  getAvailableSlots: async (date: string): Promise<AvailableSlot[]> => {
    const response = await fetch(`${API_BASE_URL}/api/availability/slots?date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch available slots');
    return response.json();
  },

  // Get time slots for a day
  getTimeSlots: async (dayOfWeek: string): Promise<TimeSlot[]> => {
    const response = await fetch(`${API_BASE_URL}/api/time-slots/${dayOfWeek}`);
    if (!response.ok) throw new Error('Failed to fetch time slots');
    return response.json();
  },

  // Save time slots for a day
  saveTimeSlots: async (dayOfWeek: string, slots: TimeSlot[]): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/time-slots/${dayOfWeek}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slots),
    });
    if (!response.ok) throw new Error('Failed to save time slots');
  },

  // Get blocked times
  getBlockedTimes: async (): Promise<BlockedTime[]> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/availability/blocked-times`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch blocked times');
    return response.json();
  },

  // Save blocked time
  saveBlockedTime: async (blockedTime: Omit<BlockedTime, 'id'>): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/availability/blocked-times`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blockedTime),
    });
    if (!response.ok) throw new Error('Failed to save blocked time');
  },

  // Delete blocked time
  deleteBlockedTime: async (id: number): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/availability/blocked-times/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to delete blocked time');
  },
};
