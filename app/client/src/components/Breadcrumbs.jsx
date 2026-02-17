import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs component for navigation hierarchy
 * @param {Array} items - Array of {label, href} objects
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {/* Home link */}
        <li>
          <Link 
            to="/" 
            className="text-gray-500 hover:text-primary-600 transition-colors flex items-center"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              
              {isLast || !item.href ? (
                <span className="text-gray-700 font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.href} 
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
