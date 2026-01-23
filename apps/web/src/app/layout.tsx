import '../styles/globals.css';
import { CartProvider } from '../contexts/CartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { WishlistProvider } from '../contexts/WishlistContext';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WBTrade - Shop Everything',
  description: 'Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie. Kupuj teraz.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'WBTrade - Shop Everything',
    description: 'Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie.',
    url: 'https://www.wb-trade.pl',
    siteName: 'WBTrade',
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
    <html lang="pl">
      <body className="font-sans">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}