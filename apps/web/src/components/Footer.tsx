'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getLogoUrl, PAYMENT_LOGOS, SOCIAL_LOGOS } from '@/lib/logo-dev';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper component for conditional logo rendering
function LogoImage({ src, alt, width, height, className }: { src: string | null; alt: string; width: number; height: number; className?: string }) {
  if (!src) {
    return (
      <div 
        className={`bg-secondary-200 dark:bg-secondary-700 rounded flex items-center justify-center text-secondary-500 dark:text-secondary-400 text-xs font-medium ${className || ''}`}
        style={{ width, height }}
      >
        {alt.charAt(0)}
      </div>
    );
  }
  return <Image src={src} alt={alt} width={width} height={height} className={className} />;
}

interface FooterProps {
  hideTrustBadges?: boolean;
}

export default function Footer({ hideTrustBadges = false }: FooterProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Podaj poprawny adres email');
      return;
    }

    setStatus('loading');
    
    try {
      const response = await fetch(`${API_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Sprawdź swoją skrzynkę email!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Wystąpił błąd');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Wystąpił błąd połączenia');
    }
  };

  return (
    <footer className="bg-gradient-to-b from-secondary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-950 mt-12">
      {/* Trust Badges */}
      {!hideTrustBadges && (
        <div className="border-b border-secondary-200/50 dark:border-secondary-700/50">
          <div className="container-custom py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-3 md:gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">Ochrona Kupującego</h4>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">Gwarancja zwrotu pieniędzy</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-3 md:gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">Szybka Dostawa</h4>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">Wysyłka w ciągu 24-72h</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-3 md:gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">Bezpieczne Płatności</h4>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">Szyfrowane połączenie SSL</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-3 md:gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">Najwyższa Jakość</h4>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">Sprawdzone produkty</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-block mb-4">
              {/* Light mode logo */}
              <Image 
                src="/images/WB-TRADE-logo.png" 
                alt="WB Trade" 
                width={300} 
                height={180} 
                className="h-20 w-auto object-contain dark:hidden"
              />
              {/* Dark mode logo */}
              <Image 
                src="/images/wb-trade-bez-tla.png" 
                alt="WB Trade" 
                width={300} 
                height={180} 
                className="h-20 w-auto object-contain hidden dark:block"
              />
            </Link>
            {/* Social Media */}
            <div className="flex items-center gap-4 mt-4">
              <a href="https://www.facebook.com/people/WB-Trade/61578263513701/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.facebook)} alt="Facebook" width={28} height={28} className="object-contain" />
              </a>
              <a href="https://www.instagram.com/wbtrade.pl" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.instagram)} alt="Instagram" width={28} height={28} className="object-contain" />
              </a>
              <a href="https://linktr.ee/wbpartners" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.linktree)} alt="Linktree" width={28} height={28} className="object-contain rounded-lg" />
              </a>
            </div>
          </div>

          {/* Informacje */}
          <div className="lg:col-span-3">
            <h5 className="font-bold text-secondary-900 dark:text-secondary-100 mb-5 text-sm uppercase tracking-wider">Informacje</h5>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">O nas</Link></li>
              <li><Link href="/terms" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Regulamin</Link></li>
              <li><Link href="/cookies" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Polityka plików &quot;cookie&quot;</Link></li>
              <li><Link href="/rodo" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Polityka RODO</Link></li>
              <li><Link href="/privacy" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Polityka prywatności</Link></li>
            </ul>
          </div>

          {/* Centrum Pomocy */}
          <div className="lg:col-span-2">
            <h5 className="font-bold text-secondary-900 dark:text-secondary-100 mb-5 text-sm uppercase tracking-wider">Centrum Pomocy</h5>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Pomoc</Link></li>
              <li><Link href="/returns" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Zwroty i reklamacje</Link></li>
              <li><Link href="/shipping" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Dostawa</Link></li>
              <li><Link href="/faq" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          {/* Kontakt + Newsletter */}
          <div className="sm:col-span-2 lg:col-span-4">
            <h5 className="font-bold text-secondary-900 dark:text-secondary-100 mb-5 text-sm uppercase tracking-wider">Kontakt</h5>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-secondary-600 dark:text-secondary-400">+48 570 028 761</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-secondary-600 dark:text-secondary-400">support@wb-partners.pl</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-secondary-600 dark:text-secondary-400">
                  ul. Juliusza Słowackiego 24/11<br />
                  35-060 Rzeszów
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-secondary-600 dark:text-secondary-400">Pon. - Pt.: 9:00 - 17:00</span>
              </li>
            </ul>

            {/* Newsletter */}
            <div className="mt-6">
              <h6 className="font-bold text-secondary-900 dark:text-secondary-100 mb-3">Newsletter</h6>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Twój email" 
                    disabled={status === 'loading' || status === 'success'}
                    className="flex-1 px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {status === 'loading' ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : status === 'success' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                {message && (
                  <p className={`text-sm ${status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {message}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-secondary-200/50 dark:border-secondary-700/50">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">Akceptowane metody płatności</p>
            <div className="flex items-center gap-4">
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.visa)} alt="Visa" width={40} height={28} className="object-contain rounded-md" />
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.blik)} alt="BLIK" width={40} height={28} className="object-contain rounded-md" />
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.przelewy24)} alt="Przelewy24" width={40} height={28} className="object-contain rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="border-t border-secondary-200/50 dark:border-secondary-700/50">
        <div className="container-custom py-6">
          <div className="text-center space-y-1">
            <p className="font-semibold text-secondary-700 dark:text-secondary-300">WB Partners Sp. z o.o.</p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">NIP: 5170455185 | REGON: 540735769 | KRS: 0001151642</p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-700 dark:bg-secondary-950">
        <div className="container-custom py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300">
              © 2026 WB Trade. Wszelkie prawa zastrzeżone.
            </p>
            <p className="text-sm text-gray-300">
              Stworzone z <span className="text-red-400">❤</span> przez{' '}
              <a href="https://wb-incode.pl/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors">
                WBInCode
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
