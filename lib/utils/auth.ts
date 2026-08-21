export const getAuthToken = (): string | null => {
  // Authentication is carried only by the HttpOnly same-origin session cookie.
  // Keep this compatibility helper while legacy callers finish migrating.
  return null;
};

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
};
