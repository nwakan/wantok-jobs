import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://wantokjobs.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'WantokJobs';
const DEFAULT_DESCRIPTION = 'Find jobs in Papua New Guinea. Browse thousands of opportunities from top PNG employers. Your Wantok in the job market.';

/**
 * PageHead — manages document <head> meta for SEO, Open Graph, and structured data.
 * 
 * Props:
 *   title       — Page title (appended with site name)
 *   description — Meta description (max ~155 chars recommended)
 *   image       — OG/Twitter image URL
 *   type        — OG type: website, article, etc.
 *   noIndex     — Set robots to noindex
 *   jsonLd      — Structured data object (JSON-LD), injected as <script type="application/ld+json">
 *   keywords    — Optional meta keywords (comma-separated)
 */
export default function PageHead({
  title,
  description,
  image,
  type = 'website',
  noIndex = false,
  jsonLd = null,
  keywords = null,
}) {
  const location = useLocation();
  const fullTitle = title
    ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`)
    : `${SITE_NAME} — Find Jobs in Papua New Guinea`;
  const canonicalUrl = `${BASE_URL}${location.pathname}`;
  const ogImage = image || DEFAULT_IMAGE;
  const metaDescription = description || DEFAULT_DESCRIPTION;

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
    setMeta('description', metaDescription);
    if (keywords) setMeta('keywords', keywords);

    // Canonical URL
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:title', fullTitle);
    setMeta('og:description', metaDescription);
    setMeta('og:url', canonicalUrl);
    setMeta('og:image', ogImage);
    setMeta('og:type', type);
    setMeta('og:site_name', SITE_NAME);
    setMeta('og:locale', 'en_PG');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', metaDescription);
    setMeta('twitter:image', ogImage);

    // Robots
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow');
    }

    // JSON-LD Structured Data
    let jsonLdScript = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'page-jsonld';
      jsonLdScript.text = JSON.stringify(jsonLd);
      // Remove existing one first
      const existing = document.getElementById('page-jsonld');
      if (existing) existing.remove();
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      if (noIndex) {
        const el = document.querySelector('meta[name="robots"]');
        if (el) el.remove();
      }
      if (jsonLdScript) {
        const el = document.getElementById('page-jsonld');
        if (el) el.remove();
      }
    };
  }, [fullTitle, metaDescription, canonicalUrl, ogImage, type, noIndex, jsonLd, keywords]);

  return null;
}
