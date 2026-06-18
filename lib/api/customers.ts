import { apiClient } from './client';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastAppointmentDate: string | null;
  totalAppointments: number;
  totalSpent: number;
}

export interface CustomerDetail extends Customer {
  firstAppointmentDate: string | null;
  averageAppointmentValue: number;
  appointments: Array<{
    id: number;
    serviceName: string;
    appointmentDateTime: string;
    status: string;
    amountPaid: number;
  }>;
  notes: string | null;
}

export const customersApi = {
  // Get all customers
  getAll: async (): Promise<Customer[]> => {
    return apiClient<Customer[]>('/api/customers');
  },

  // Get customer by ID
  getById: async (id: number): Promise<CustomerDetail> => {
    return apiClient<CustomerDetail>(`/api/customers/${id}`);
  },

  // Search customers
  search: async (query: string): Promise<Customer[]> => {
    return apiClient<Customer[]>(`/api/customers/search?q=${encodeURIComponent(query)}`);
  },
};
