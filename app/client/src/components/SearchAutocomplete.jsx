import { useState, useEffect, useRef } from 'react';
import { Search, Briefcase, Building2 } from 'lucide-react';

/**
 * Search autocomplete component with keyword and company suggestions
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onSelect - Selection handler
 * @param {string} props.placeholder - Input placeholder
 */
export default function SearchAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = 'Job title, keywords, or company' 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        // Fetch both keyword and company suggestions
        const [keywordRes, companyRes] = await Promise.all([
          fetch(`/api/jobs/suggestions?q=${encodeURIComponent(value)}&type=keyword`).then(r => r.json()),
          fetch(`/api/jobs/suggestions?q=${encodeURIComponent(value)}&type=company`).then(r => r.json())
        ]);

        const combined = [
          ...(keywordRes.data || []).map(s => ({ text: s, type: 'keyword' })),
          ...(companyRes.data || []).map(s => ({ text: s, type: 'company' }))
        ].slice(0, 8); // Limit to 8 total suggestions

        setSuggestions(combined);
        setIsOpen(combined.length > 0);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex].text);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleSelect = (suggestion) => {
    onChange({ target: { value: suggestion } });
    if (onSelect) onSelect(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          autoComplete="off"
        />
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion.text)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index === activeIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
            >
              {suggestion.type === 'keyword' ? (
                <Briefcase className="w-4 h-4 text-gray-400" />
              ) : (
                <Building2 className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-gray-900 dark:text-gray-100">
                {suggestion.text}
              </span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {suggestion.type === 'keyword' ? 'Job' : 'Company'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
