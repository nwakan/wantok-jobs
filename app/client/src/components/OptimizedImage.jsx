import { useState, useCallback } from 'react';

/**
 * OptimizedImage — lazy-loaded image with skeleton placeholder & error fallback.
 *
 * Props:
 *  src, alt, width, height, className — standard <img> attributes
 *  eager  — set true for above-the-fold images (disables lazy loading)
 *  fallback — custom fallback element on error
 */
export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  className = '',
  eager = false,
  fallback,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => { setError(true); setLoaded(true); }, []);

  if (error) {
    if (fallback) return fallback;
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Skeleton placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-inherit" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'auto' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        {...rest}
      />
    </div>
  );
}
