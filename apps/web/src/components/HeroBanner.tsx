'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Slide {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  titleHighlight?: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  bgGradient: string;
  bgImage: string;
}

const slides: Slide[] = [
  {
    id: 1,
    badge: 'Wszystkie produkty',
    badgeColor: 'bg-secondary-700',
    title: 'Tysiące',
    titleHighlight: 'Produktów',
    description: 'Przeglądaj naszą pełną ofertę produktów. Od elektroniki przez zabawki po artykuły domowe - znajdziesz tu wszystko.',
    buttonText: 'Przeglądaj',
    buttonLink: '/products',
    bgGradient: 'from-slate-100 to-gray-100',
    bgImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
  },
  {
    id: 2,
    badge: 'Bestsellery',
    badgeColor: 'bg-rose-500',
    title: 'Najchętniej',
    titleHighlight: 'Kupowane',
    description: 'Najpopularniejsze produkty wybrane przez naszych klientów. Dołącz do tysięcy zadowolonych kupujących.',
    buttonText: 'Zobacz bestsellery',
    buttonLink: '/products/bestsellers',
    bgGradient: 'from-rose-100 to-pink-100',
    bgImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
  },
  {
    id: 3,
    badge: 'Przecenione',
    badgeColor: 'bg-primary-500',
    title: 'Super',
    titleHighlight: 'Promocje',
    description: 'Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie.',
    buttonText: 'Zobacz promocje',
    buttonLink: '/products?tab=discounted',
    bgGradient: 'from-amber-100 to-orange-100',
    bgImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  },
  {
    id: 4,
    badge: 'Nowości',
    badgeColor: 'bg-emerald-500',
    title: 'Świeże',
    titleHighlight: 'Produkty',
    description: 'Odkryj najnowsze produkty w naszej ofercie. Codziennie dodajemy nowe artykuły z najlepszych hurtowni.',
    buttonText: 'Zobacz nowości',
    buttonLink: '/products?tab=new',
    bgGradient: 'from-emerald-100 to-teal-100',
    bgImage: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800',
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const nextSlide = useCallback(() => {
    setDirection('right');
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection('left');
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 'right' : 'left');
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume autoplay after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 8000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section className="mb-6 sm:mb-8">
      {/* Container with navigation arrows outside */}
      <div className="relative">
        {/* Navigation arrows - outside the banner */}
        <button
          onClick={() => { prevSlide(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
          className="absolute -left-4 sm:-left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 items-center justify-center hover:bg-gray-50 dark:hover:bg-secondary-700 shadow-md transition-all hover:scale-105 z-10 hidden lg:flex"
          aria-label="Poprzedni slajd"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          onClick={() => { nextSlide(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
          className="absolute -right-4 sm:-right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 items-center justify-center hover:bg-gray-50 dark:hover:bg-secondary-700 shadow-md transition-all hover:scale-105 z-10 hidden lg:flex"
          aria-label="Następny slajd"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Main Banner */}
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[320px] lg:min-h-[380px]">
        {/* Background slides */}
        {slides.map((s, index) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out bg-gradient-to-r ${s.bgGradient}
              ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url('${s.bgImage}')` }}
            />
          </div>
        ))}

        {/* Content */}
        <div className="relative p-6 sm:p-8 lg:p-12 h-full flex flex-col justify-center min-h-[280px] sm:min-h-[320px] lg:min-h-[380px]">
          {/* Text backdrop for better readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/60 to-transparent dark:from-secondary-900/90 dark:via-secondary-900/70 dark:to-transparent"></div>
          <div
            key={currentSlide}
            className="animate-fadeIn relative z-10"
          >
            <span className={`inline-block ${slide.badgeColor} text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full mb-3 sm:mb-4`}>
              {slide.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-secondary-900 dark:text-white mb-2 sm:mb-3">
              {slide.title}<br />{slide.titleHighlight}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-200 text-sm sm:text-base mb-4 sm:mb-6 max-w-md font-medium">
              {slide.description}
            </p>
            <Link 
              href={slide.buttonLink}
              className="inline-flex items-center gap-2 bg-secondary-900 dark:bg-white text-white dark:text-secondary-900 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-secondary-800 dark:hover:bg-gray-100 transition-colors w-fit shadow-sm text-sm sm:text-base"
            >
              {slide.buttonText}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full
                ${index === currentSlide 
                  ? 'w-6 sm:w-8 h-2 sm:h-2.5 bg-primary-500' 
                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/60 hover:bg-white/80'
                }`}
              aria-label={`Przejdź do slajdu ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        {isAutoPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
            <div 
              key={currentSlide}
              className="h-full bg-primary-500 animate-progress"
            />
          </div>
        )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(${direction === 'right' ? '20px' : '-20px'});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 8s linear;
        }
      `}</style>
    </section>
  );
}
