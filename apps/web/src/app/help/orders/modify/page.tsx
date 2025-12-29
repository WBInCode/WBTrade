import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Zmiana zamówienia - Centrum pomocy - WBTrade',
  description: 'Dowiedz się jak zmienić szczegóły zamówienia w WBTrade',
};

export default function OrderModifyPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      <main className="py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-secondary-500 mb-8">
            <Link href="/" className="hover:text-primary-600">Strona główna</Link>
            <span>/</span>
            <Link href="/help" className="hover:text-primary-600">Centrum pomocy</Link>
            <span>/</span>
            <span className="text-secondary-900">Zmiana zamówienia</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Zmiana zamówienia
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Chcesz zmienić adres dostawy, metodę płatności lub produkty w zamówieniu? Sprawdź, jak to zrobić i jakie zmiany są możliwe.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Co można zmienić?
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">📍 Adres dostawy</h4>
                    <p className="text-secondary-600 text-sm">
                      Możliwa zmiana przed wysyłką. Po nadaniu paczki zmiana nie jest możliwa.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">📦 Punkt odbioru</h4>
                    <p className="text-secondary-600 text-sm">
                      Zmiana paczkomatu lub punktu odbioru możliwa przed wysyłką.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">💳 Metoda płatności</h4>
                    <p className="text-secondary-600 text-sm">
                      Zmiana możliwa tylko dla zamówień nieopłaconych.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">🛍️ Produkty w zamówieniu</h4>
                    <p className="text-secondary-600 text-sm">
                      Dodawanie/usuwanie produktów wymaga kontaktu z obsługą klienta.
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak zmienić adres dostawy?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto</li>
                  <li>Przejdź do "Moje konto" → "Zamówienia"</li>
                  <li>Wybierz zamówienie i kliknij "Szczegóły"</li>
                  <li>Kliknij "Edytuj adres dostawy" (jeśli dostępne)</li>
                  <li>Wprowadź nowe dane i zapisz zmiany</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak zmienić metodę płatności?
                </h2>
                <p className="text-secondary-600 mb-4">
                  Jeśli Twoje zamówienie oczekuje na płatność:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Przejdź do szczegółów zamówienia</li>
                  <li>Kliknij "Zmień metodę płatności"</li>
                  <li>Wybierz nową metodę płatności</li>
                  <li>Dokończ proces płatności</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Zmiana produktów
                </h2>
                <p className="text-secondary-600 mb-4">
                  Aby dodać lub usunąć produkty z zamówienia:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Skontaktuj się z obsługą klienta jak najszybciej</li>
                  <li>Podaj numer zamówienia i opisz potrzebne zmiany</li>
                  <li>Poczekaj na potwierdzenie możliwości wprowadzenia zmian</li>
                  <li>Jeśli zmienia się kwota - dopłać lub otrzymaj zwrot różnicy</li>
                </ol>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 mb-2">⏰ Czas ma znaczenie</h3>
                  <p className="text-yellow-700">
                    Im szybciej zgłosisz potrzebę zmiany, tym większa szansa na jej realizację. Po rozpoczęciu kompletowania zamówienia zmiany mogą być niemożliwe.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Kontakt z obsługą klienta
                </h2>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h4 className="font-medium text-primary-900 mb-1">📧 E-mail</h4>
                    <p className="text-primary-700 text-sm">kontakt@wbtrade.pl</p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h4 className="font-medium text-primary-900 mb-1">📞 Telefon</h4>
                    <p className="text-primary-700 text-sm">+48 123 456 789 (pon-pt 9-17)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/orders/cancel" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Anulowanie zamówienia
                </Link>
                <Link href="/help/orders/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Status zamówienia
                </Link>
                <Link href="/help/delivery/pickup" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Punkty odbioru
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
