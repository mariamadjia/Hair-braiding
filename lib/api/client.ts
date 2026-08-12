// API client configuration
import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Timeout configuration for different operation types
const TIMEOUTS = {
  read: 15000,      // 15s for GET requests
  write: 30000,     // 30s for POST/PUT/DELETE
  upload: 120000,   // 2min for file uploads
  default: 30000,   // 30s default
} as const;

// Generate a unique request ID for debugging
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Determine timeout based on request method and presence of FormData
function getTimeout(options: RequestInit): number {
  const method = options.method?.toUpperCase() || 'GET';
  const isUpload = options.body instanceof FormData;
  
  if (isUpload) return TIMEOUTS.upload;
  if (method === 'GET') return TIMEOUTS.read;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return TIMEOUTS.write;
  return TIMEOUTS.default;
}

// Retry configuration for idempotent operations
const RETRY_CONFIG = {
  maxRetries: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryDelay: 1000, // 1s initial delay
};

function isRetryableError(status: number): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const requestId = generateRequestId();
  const url = `${API_BASE_URL}${endpoint}`;
  const timeout = getTimeout(options);
  const method = options.method?.toUpperCase() || 'GET';
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] API Request:`, method, url, `timeout: ${timeout}ms`);
  }
  
  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, {
      ...config,
      signal: AbortSignal.timeout(timeout)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (process.env.NODE_ENV === 'development') {
        console.error(`[${requestId}] API Error:`, response.status, errorData);
      }
      
      // Retry logic for idempotent operations on retryable errors
      const isIdempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method);
      if (isIdempotent && isRetryableError(response.status) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${requestId}] Retrying after ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        }
        await sleep(delay);
        return apiClient<T>(endpoint, options, retryCount + 1);
      }
      
      // Enhanced error messages
      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      if (response.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (response.status === 409) {
        errorMessage = errorData.message || errorData.error || 'This resource already exists or has a conflict.';
      } else if (response.status === 413) {
        errorMessage = 'The file you are trying to upload is too large.';
      } else if (response.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        errorMessage = 'The server encountered an error. Please try again later.';
      }
      
      throw new ApiError(errorMessage, response.status, errorData, requestId);
    }

    const data = await response.json();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${requestId}] API Success:`, method, url);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Please check your connection and try again.',
        0,
        { timeout },
        requestId
      );
    }
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${requestId}] Network error connecting to backend:`, API_BASE_URL, error);
    }
    throw new ApiError(
      'Network error: Unable to connect to the server. Please check your internet connection and try again.',
      0,
      error,
      requestId
    );
  }
}
