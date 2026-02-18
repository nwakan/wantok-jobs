import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Back to Top button - appears when user scrolls down
 */
export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-[5.5rem] right-5 z-50 bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:bottom-[4.5rem]"
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
