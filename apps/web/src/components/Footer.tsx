import Link from 'next/link';

interface FooterProps {
  hideTrustBadges?: boolean;
}

export default function Footer({ hideTrustBadges = false }: FooterProps) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      {/* Trust Badges */}
      {!hideTrustBadges && (
        <div className="border-b border-gray-100">
          <div className="container-custom py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Ochrona Kupującego</h4>
                  <p className="text-sm text-secondary-500">Pełny zwrot, jeśli nie otrzymasz zamówienia</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Szybka Dostawa</h4>
                  <p className="text-sm text-secondary-500">Miliony produktów z dostawą następnego dnia</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-900">Bezpieczne Płatności</h4>
                  <p className="text-sm text-secondary-500">Bezpieczny i szyfrowany proces płatności</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="container-custom py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <h5 className="font-semibold text-secondary-900 mb-4">WBTrade</h5>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-secondary-500 hover:text-primary-500">O nas</Link></li>
              <li><Link href="/careers" className="text-sm text-secondary-500 hover:text-primary-500">Kariera</Link></li>
              <li><Link href="/press" className="text-sm text-secondary-500 hover:text-primary-500">Dla prasy</Link></li>
              <li><Link href="/sustainability" className="text-sm text-secondary-500 hover:text-primary-500">Zrównoważony rozwój</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-secondary-900 mb-4">Pomoc</h5>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-sm text-secondary-500 hover:text-primary-500">Centrum pomocy</Link></li>
              <li><Link href="/returns" className="text-sm text-secondary-500 hover:text-primary-500">Zwroty i reklamacje</Link></li>
              <li><Link href="/contact" className="text-sm text-secondary-500 hover:text-primary-500">Kontakt</Link></li>
              <li><Link href="/report" className="text-sm text-secondary-500 hover:text-primary-500">Zgłoś błąd</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-secondary-900 mb-4">Sprzedaż</h5>
            <ul className="space-y-2">
              <li><Link href="/sell" className="text-sm text-secondary-500 hover:text-primary-500">Zacznij sprzedawać</Link></li>
              <li><Link href="/seller-guidelines" className="text-sm text-secondary-500 hover:text-primary-500">Zasady dla sprzedawców</Link></li>
              <li><Link href="/ads" className="text-sm text-secondary-500 hover:text-primary-500">Reklama dla sprzedawców</Link></li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-2">
            <h5 className="font-semibold text-secondary-900 mb-4">Aplikacja mobilna</h5>
            <div className="flex flex-col gap-3">
              <a href="#" className="inline-flex items-center gap-2 bg-secondary-900 text-white px-4 py-2 rounded-lg hover:bg-secondary-800 w-fit">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Pobierz z</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-2 bg-secondary-900 text-white px-4 py-2 rounded-lg hover:bg-secondary-800 w-fit">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v17c0 .83-.67 1.5-1.5 1.5S3 21.33 3 20.5zM16.5 12L6 3.5v17l10.5-8.5zm4.5 0L10 22l5-5 5 5 1-10z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Pobierz z</div>
                  <div className="text-sm font-semibold -mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-400">
              © 2024 WBTrade Sp. z o.o. Wszelkie prawa zastrzeżone.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-secondary-400 hover:text-secondary-600">Polityka prywatności</Link>
              <Link href="/terms" className="text-sm text-secondary-400 hover:text-secondary-600">Regulamin</Link>
              <Link href="/cookies" className="text-sm text-secondary-400 hover:text-secondary-600">Ustawienia cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
