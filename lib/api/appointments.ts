import { apiClient } from './client';

export interface AppointmentSettings {
  slotDurationMinutes: number;
  advanceBookingDays: number;
  maxAppointmentsPerSlot: number;
  requireApproval: boolean;
  allowSameDayBooking: boolean;
}

export interface Appointment {
  id: number;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  service?: {
    id: number;
    name: string;
    description: string;
  };
  selectedService?: string;
  selectedSize?: string;
  selectedLength?: string;
  price?: string;
  appointmentDateTime: string;
  status: string;
  notes?: string;
  adminNotes?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  appointmentDateTime: string;
  serviceId?: number | null;
  serviceName?: string | null;
  selectedSize?: string | null;
  selectedLength?: string | null;
  price?: string | null;
  notes?: string;
}

export const appointmentsApi = {
  // Get settings
  getSettings: async (): Promise<AppointmentSettings> => {
    return apiClient<AppointmentSettings>('/api/appointments/settings');
  },

  // Update settings
  updateSettings: async (settings: AppointmentSettings): Promise<AppointmentSettings> => {
    return apiClient<AppointmentSettings>('/api/appointments/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Get all appointments
  getAll: async (): Promise<Appointment[]> => {
    return apiClient<Appointment[]>('/api/appointments');
  },

  // Get appointments by status
  getByStatus: async (status: string): Promise<Appointment[]> => {
    return apiClient<Appointment[]>(`/api/appointments/status/${status}`);
  },

  // Create appointment
  create: async (data: CreateAppointmentRequest): Promise<Appointment> => {
    return apiClient<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Approve appointment
  approve: async (id: number, adminNotes?: string): Promise<Appointment> => {
    return apiClient<Appointment>(`/api/appointments/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes: adminNotes || '' }),
    });
  },

  // Deny appointment
  deny: async (id: number, adminNotes: string): Promise<Appointment> => {
    return apiClient<Appointment>(`/api/appointments/${id}/deny`, {
      method: 'PUT',
      body: JSON.stringify({ adminNotes }),
    });
  },
};
