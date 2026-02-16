import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://wantokjobs.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'WantokJobs';

export default function PageHead({ title, description, image, type = 'website', noIndex = false }) {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Find Jobs in Papua New Guinea`;
  // Canonical URL: strip query parameters for cleaner indexing
  const canonicalUrl = `${BASE_URL}${location.pathname}`;
  const ogImage = image || DEFAULT_IMAGE;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('article:')) {
          el.setAttribute('property', property);
        } else {
          el.setAttribute('name', property);
        }
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    // Basic meta
    setMeta('description', description);

    // Canonical URL
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:title', fullTitle);
    setMeta('og:description', description);
    setMeta('og:url', canonicalUrl);
    setMeta('og:image', ogImage);
    setMeta('og:type', type);
    setMeta('og:site_name', SITE_NAME);
    setMeta('og:locale', 'en_PG');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Robots
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow');
    }

    return () => {
      // Cleanup noIndex on unmount
      if (noIndex) {
        const el = document.querySelector('meta[name="robots"]');
        if (el) el.remove();
      }
    };
  }, [fullTitle, description, canonicalUrl, ogImage, type, noIndex]);

  return null;
}
