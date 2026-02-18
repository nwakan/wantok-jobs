/**
 * CSRF Token Utility
 * 
 * Provides CSRF-protected fetch wrapper for all state-changing requests
 */

let csrfToken = null;

/**
 * Fetch CSRF token from server
 */
export async function fetchCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include', // Important: send cookies
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    csrfToken = data.token;
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get current CSRF token (fetch if needed)
 */
export async function getCsrfToken() {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * CSRF-protected fetch wrapper
 * 
 * Usage:
 *   import { csrfFetch } from '@/utils/csrf';
 *   
 *   const response = await csrfFetch('/api/jobs', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   });
 */
export async function csrfFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  
  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await getCsrfToken();
    
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }
  
  // Ensure credentials are included (for cookies)
  options.credentials = options.credentials || 'include';
  
  try {
    const response = await fetch(url, options);
    
    // If CSRF token is invalid, fetch a new one and retry once
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'CSRF_INVALID') {
        console.warn('CSRF token invalid, fetching new token and retrying...');
        await fetchCsrfToken();
        
        // Retry with new token
        options.headers['X-CSRF-Token'] = csrfToken;
        return fetch(url, options);
      }
    }
    
    return response;
  } catch (error) {
    console.error('CSRF fetch error:', error);
    throw error;
  }
}

/**
 * Initialize CSRF protection (call on app load)
 */
export async function initCsrfProtection() {
  try {
    await fetchCsrfToken();
    console.log('CSRF protection initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
}

// Export default fetch for convenience
export default csrfFetch;
