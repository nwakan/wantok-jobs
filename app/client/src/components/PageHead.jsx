import { useEffect } from 'react';

export default function PageHead({ title, description }) {
  useEffect(() => {
    // Set document title
    document.title = title ? `${title} - WantokJobs` : 'WantokJobs - Find Jobs in Papua New Guinea and the Pacific';
    
    // Update meta description if provided
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
    }
  }, [title, description]);

  return null;
}
