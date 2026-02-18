import { useState, useCallback } from 'react';

/**
 * Hook for optional location detection via multiple signals:
 * 1. Browser GPS (if user permits)
 * 2. IP geolocation (automatic fallback)
 * 
 * Returns detected location + a trigger function.
 * Never blocks UI — purely optional enhancement.
 */
export default function useLocationDetect() {
  const [location, setLocation] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);

  const detect = useCallback(async ({ useGPS = true } = {}) => {
    setDetecting(true);
    setError(null);

    try {
      let lat = null, lng = null;

      // Try browser GPS first (if allowed and requested)
      if (useGPS && 'geolocation' in navigator) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000, // 5 min cache
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (gpsErr) {
          // User denied or timeout — that's fine, fall through to IP
        }
      }

      // Send whatever we have to server (IP is detected server-side)
      const body = {};
      if (lat != null) { body.lat = lat; body.lng = lng; }

      const response = await fetch('/api/location/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json());

      if (response.success && response.country) {
        const result = {
          country: response.country,
          code: response.code,
          city: response.city,
          province: response.province,
          flag: response.flag,
          confidence: response.confidence,
          method: response.method,
        };
        setLocation(result);
        setDetecting(false);
        return result;
      }

      setDetecting(false);
      return null;
    } catch (err) {
      setError(err.message);
      setDetecting(false);
      return null;
    }
  }, []);

  // Quick IP-only detection (no GPS prompt)
  const detectFromIP = useCallback(() => detect({ useGPS: false }), [detect]);

  return { location, detecting, error, detect, detectFromIP };
}
