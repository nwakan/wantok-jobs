import { Star } from 'lucide-react';

/**
 * StarRating Component
 * @param {number} rating - Current rating (0-5)
 * @param {function} onChange - Callback when rating changes (optional, for interactive mode)
 * @param {number} size - Size of stars (default: 5)
 * @param {boolean} readonly - Display only mode (default: true)
 */
export default function StarRating({ 
  rating = 0, 
  onChange, 
  size = 5, 
  readonly = true,
  className = ''
}) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  
  const handleClick = (value) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  const getStarClass = (starValue) => {
    const baseSize = size === 4 ? 'w-4 h-4' : size === 6 ? 'w-6 h-6' : 'w-5 h-5';
    const filled = starValue <= rating;
    const color = filled ? 'text-yellow-400 fill-current' : 'text-gray-300';
    const cursor = readonly ? '' : 'cursor-pointer hover:scale-110 transition-transform';
    
    return `${baseSize} ${color} ${cursor}`;
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readonly}
          className={readonly ? 'cursor-default' : 'focus:outline-none'}
          aria-label={`Rate ${star} stars`}
        >
          <Star className={getStarClass(star)} />
        </button>
      ))}
    </div>
  );
}
