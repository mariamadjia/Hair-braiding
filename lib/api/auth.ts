import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminSetupRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface LoginResponse {
  token: string;
  admin: {
    id: number;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  // Admin setup (first-time setup)
  setupAdmin: async (data: AdminSetupRequest): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.admin));
    }
    
    return response;
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('admin_user');
    }
  },

  // Change password (requires authentication)
  changePassword: async (data: ChangePasswordRequest): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Forgot password
  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset password
  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('admin_user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  },
};
