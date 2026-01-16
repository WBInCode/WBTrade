import Link from 'next/link';
import Image from 'next/image';
import { getLogoUrl, PAYMENT_LOGOS, SOCIAL_LOGOS } from '@/lib/logo-dev';

// Helper component for conditional logo rendering
function LogoImage({ src, alt, width, height, className }: { src: string | null; alt: string; width: number; height: number; className?: string }) {
  if (!src) {
    return (
      <div 
        className={`bg-secondary-200 rounded flex items-center justify-center text-secondary-500 text-xs ${className || ''}`}
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
  return (
    <footer className="bg-gradient-to-b from-secondary-50 to-secondary-100 mt-12">
      {/* Trust Badges */}
      {!hideTrustBadges && (
        <div className="border-b border-secondary-200/50">
          <div className="container-custom py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Ochrona Kupującego</h4>
                  <p className="text-sm text-secondary-500">Gwarancja zwrotu pieniędzy</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Szybka Dostawa</h4>
                  <p className="text-sm text-secondary-500">Nawet następnego dnia</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Bezpieczne Płatności</h4>
                  <p className="text-sm text-secondary-500">Szyfrowane połączenie SSL</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Najwyższa Jakość</h4>
                  <p className="text-sm text-secondary-500">Sprawdzone produkty</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-block mb-6">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                WBTrade
              </span>
            </Link>
            <p className="text-secondary-600 mb-6 leading-relaxed">
              Twoja platforma e-commerce z tysiącami produktów od sprawdzonych sprzedawców. 
              Kupuj bezpiecznie i wygodnie.
            </p>
            {/* Social Media */}
            <div className="flex items-center gap-4">
              <a href="#" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.facebook)} alt="Facebook" width={28} height={28} className="object-contain" />
              </a>
              <a href="#" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.instagram)} alt="Instagram" width={28} height={28} className="object-contain" />
              </a>
              <a href="#" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.twitter)} alt="X" width={28} height={28} className="object-contain" />
              </a>
              <a href="#" className="hover:opacity-70 transition-opacity">
                <LogoImage src={getLogoUrl(SOCIAL_LOGOS.linkedin)} alt="LinkedIn" width={28} height={28} className="object-contain" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="col-span-1 md:col-span-2">
            <h5 className="font-bold text-secondary-900 mb-5 text-sm uppercase tracking-wider">O firmie</h5>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-secondary-600 hover:text-primary-500 transition-colors">O nas</Link></li>
              {/* <li><Link href="/careers" className="text-secondary-600 hover:text-primary-500 transition-colors">Kariera</Link></li> */}
              {/* <li><Link href="/press" className="text-secondary-600 hover:text-primary-500 transition-colors">Dla prasy</Link></li> */}
              {/* <li><Link href="/sustainability" className="text-secondary-600 hover:text-primary-500 transition-colors">Zrównoważony rozwój</Link></li> */}
              {/* <li><Link href="/blog" className="text-secondary-600 hover:text-primary-500 transition-colors">Blog</Link></li> */}
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h5 className="font-bold text-secondary-900 mb-5 text-sm uppercase tracking-wider">Pomoc</h5>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-secondary-600 hover:text-primary-500 transition-colors">Centrum pomocy</Link></li>
              <li><Link href="/returns" className="text-secondary-600 hover:text-primary-500 transition-colors">Zwroty i reklamacje</Link></li>
              <li><Link href="/shipping" className="text-secondary-600 hover:text-primary-500 transition-colors">Dostawa</Link></li>
              <li><Link href="/contact" className="text-secondary-600 hover:text-primary-500 transition-colors">Kontakt</Link></li>
              <li><Link href="/faq" className="text-secondary-600 hover:text-primary-500 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h5 className="font-bold text-secondary-900 mb-5 text-sm uppercase tracking-wider">Kontakt</h5>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-secondary-600">kontakt@wbtrade.pl</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-secondary-600">+48 800 123 456</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-secondary-600">Pon-Pt: 9:00 - 17:00</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-secondary-200/50">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-500">Akceptowane metody płatności</p>
            <div className="flex items-center gap-4">
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.visa)} alt="Visa" width={40} height={28} className="object-contain rounded-md" />
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.blik)} alt="BLIK" width={40} height={28} className="object-contain rounded-md" />
              <LogoImage src={getLogoUrl(PAYMENT_LOGOS.przelewy24)} alt="Przelewy24" width={40} height={28} className="object-contain rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-700">
        <div className="container-custom py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300">
              © 2025 WBTrade. Wszelkie prawa zastrzeżone.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">Polityka prywatności</Link>
              <Link href="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">Regulamin</Link>
              <Link href="/cookies" className="text-sm text-gray-300 hover:text-white transition-colors">Cookies</Link>
              <Link href="/accessibility" className="text-sm text-gray-300 hover:text-white transition-colors">Dostępność</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
