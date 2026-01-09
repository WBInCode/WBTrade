'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

/**
 * StarRating - Readonly star rating display component
 * Displays filled/half/empty stars based on rating value
 */
export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= maxRating; i++) {
      if (i <= fullStars) {
        // Full star
        stars.push(
          <Star
            key={i}
            className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        // Half star
        stars.push(
          <div key={i} className="relative">
            <Star className={`${sizeClasses[size]} text-gray-300`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`} />
            </div>
          </div>
        );
      } else {
        // Empty star
        stars.push(
          <Star
            key={i}
            className={`${sizeClasses[size]} text-gray-300`}
          />
        );
      }
    }

    return stars;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {renderStars()}
      </div>
      {showValue && (
        <span className={`${textSizeClasses[size]} text-gray-700 font-medium ml-1`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
