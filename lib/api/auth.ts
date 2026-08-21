import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  rememberDevice?: boolean;
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
  confirmPassword: string;
}

export interface LoginResponse {
  token?: string;
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
    
    return response;
  },

  loginWithGoogle: async (credential: string, rememberDevice: boolean): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, rememberDevice }),
    });
  },

  session: async (): Promise<{ authenticated: boolean; admin: LoginResponse['admin'] }> => {
    return apiClient('/api/auth/session', { method: 'GET' });
  },

  // Logout
  logout: async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");

      localStorage.removeItem("admin_user");
      sessionStorage.removeItem("admin_user");
    }
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

};
