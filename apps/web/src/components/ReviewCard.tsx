'use client';

import StarRating from './StarRating';
import { ShieldCheck } from 'lucide-react';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title?: string;
    content: string;
    createdAt: string;
    isVerifiedPurchase: boolean;
    user: {
      firstName: string;
      lastName: string;
    };
    helpfulCount?: number;
  };
  onHelpful?: (reviewId: string) => void;
  showHelpful?: boolean;
}

/**
 * ReviewCard - Display a single product review
 */
export default function ReviewCard({
  review,
  onHelpful,
  showHelpful = true,
}: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
            {getInitials(review.user.firstName, review.user.lastName)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">
                {review.user.firstName} {review.user.lastName.charAt(0)}.
              </p>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Zweryfikowany zakup
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        {/* Rating */}
        <StarRating rating={review.rating} size="sm" />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Content */}
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
        {review.content}
      </p>

      {/* Footer - Helpful button */}
      {showHelpful && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => onHelpful?.(review.id)}
            className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            Czy ta opinia była pomocna?
            {review.helpfulCount !== undefined && review.helpfulCount > 0 && (
              <span className="ml-1 font-medium">({review.helpfulCount})</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
