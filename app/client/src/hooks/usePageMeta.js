import { useEffect } from 'react';

/**
 * Custom hook to dynamically update page meta tags
 * @param {Object} meta - Meta tag configuration
 * @param {string} meta.title - Page title
 * @param {string} meta.description - Page description
 * @param {string} meta.image - OG image URL
 * @param {string} meta.url - Canonical URL
 * @param {string} meta.type - OG type (website, article, profile, etc.)
 */
export function usePageMeta({ title, description, image, url, type = 'website' }) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper to update or create meta tag
    const updateMetaTag = (selector, content) => {
      if (!content) return;
      
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        const [attr, value] = selector.replace(/[\[\]]/g, '').split('=');
        tag.setAttribute(attr, value.replace(/"/g, ''));
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Update standard meta tags
    updateMetaTag('meta[name="description"]', description);
    
    // Update Open Graph tags
    updateMetaTag('meta[property="og:title"]', title);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:image"]', image);
    updateMetaTag('meta[property="og:url"]', url);
    updateMetaTag('meta[property="og:type"]', type);

    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:title"]', title);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', image);
    updateMetaTag('meta[name="twitter:url"]', url);

    // Update canonical link
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    }

    // Cleanup: reset to default on unmount
    return () => {
      document.title = 'WantokJobs - PNG & Pacific Islands Jobs';
      updateMetaTag('meta[name="description"]', 'Find jobs across Papua New Guinea and the Pacific Islands. AI-powered matching, transparent hiring.');
    };
  }, [title, description, image, url, type]);
}

/**
 * Hook to fetch and apply meta tags from API
 * @param {string} type - 'job' or 'company'
 * @param {string|number} id - Entity ID
 */
export function useApiPageMeta(type, id) {
  useEffect(() => {
    if (!type || !id) return;

    const fetchMeta = async () => {
      try {
        const response = await fetch(`/api/meta/${type}/${id}`);
        if (response.ok) {
          const meta = await response.json();
          
          // Update meta tags
          if (meta.title) document.title = meta.title;
          
          const updateMetaTag = (selector, content) => {
            if (!content) return;
            let tag = document.querySelector(selector);
            if (!tag) {
              tag = document.createElement('meta');
              const [attr, value] = selector.replace(/[\[\]]/g, '').split('=');
              tag.setAttribute(attr, value.replace(/"/g, ''));
              document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
          };

          updateMetaTag('meta[name="description"]', meta.description);
          updateMetaTag('meta[property="og:title"]', meta.title);
          updateMetaTag('meta[property="og:description"]', meta.description);
          updateMetaTag('meta[property="og:image"]', meta.image);
          updateMetaTag('meta[property="og:url"]', meta.url);
          updateMetaTag('meta[property="og:type"]', meta.type);
          updateMetaTag('meta[name="twitter:title"]', meta.title);
          updateMetaTag('meta[name="twitter:description"]', meta.description);
          updateMetaTag('meta[name="twitter:image"]', meta.image);
        }
      } catch (error) {
        console.error('Failed to fetch meta tags:', error);
      }
    };

    fetchMeta();
  }, [type, id]);
}

export default usePageMeta;
