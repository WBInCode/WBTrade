import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { CartProvider } from '../contexts/CartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { WishlistProvider } from '../contexts/WishlistContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { GoogleTagManager, GoogleTagManagerNoScript } from '../components/analytics/GoogleTagManager';
import LazyOverlays from '../components/LazyOverlays';
import { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'WB Trade - Shop Everything',
  description: 'Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie. Kupuj teraz.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'WB Trade - Shop Everything',
    description: 'Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie.',
    url: 'https://www.wb-trade.pl',
    siteName: 'WB Trade',
    locale: 'pl_PL',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to critical origins for faster resource fetching */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('wb-trade-theme')||'system';var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t==='system'&&d))document.documentElement.classList.add('dark')})()`,
          }}
        />
        <GoogleTagManager />
      </head>
      <body className="font-sans">
        <GoogleTagManagerNoScript />
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                {children}
                <LazyOverlays />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}