'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * StarRatingInput - Interactive star rating input component
 * Allows users to select a rating by clicking stars
 */
export default function StarRatingInput({
  value,
  onChange,
  maxRating = 5,
  size = 'lg',
  disabled = false,
  required = false,
  className = '',
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const renderStars = () => {
    const stars = [];
    const activeRating = hoverRating || value;

    for (let i = 1; i <= maxRating; i++) {
      const isFilled = i <= activeRating;
      const isHovering = hoverRating > 0;

      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => handleClick(i)}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
          className={`
            transition-all duration-150
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded
          `}
          aria-label={`${i} ${i === 1 ? 'gwiazdka' : i < 5 ? 'gwiazdki' : 'gwiazdek'}`}
        >
          <Star
            className={`
              ${sizeClasses[size]}
              transition-colors duration-150
              ${
                isFilled
                  ? isHovering
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-gray-400'
              }
            `}
          />
        </button>
      );
    }

    return stars;
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        {renderStars()}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-600 font-medium">
            {value} / {maxRating}
          </span>
        )}
      </div>
      {required && value === 0 && (
        <p className="text-xs text-red-500 mt-1">Oceń produkt</p>
      )}
    </div>
  );
}
