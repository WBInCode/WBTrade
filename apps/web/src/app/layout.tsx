import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { CartProvider } from '../contexts/CartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { WishlistProvider } from '../contexts/WishlistContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'WBTrade - Shop Everything',
  description: 'Discover amazing products at great prices on WBTrade',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
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