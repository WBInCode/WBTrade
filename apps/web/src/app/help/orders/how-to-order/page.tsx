import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Jak złożyć zamówienie? - Centrum pomocy - WBTrade',
  description: 'Dowiedz się jak złożyć zamówienie w sklepie WBTrade krok po kroku',
};

export default function HowToOrderPage() {
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
            <Link href="/help" className="hover:text-primary-600">Zamówienia</Link>
            <span>/</span>
            <span className="text-secondary-900">Jak złożyć zamówienie?</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Jak złożyć zamówienie?
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Składanie zamówień w WBTrade jest proste i intuicyjne. Poniżej znajdziesz szczegółową instrukcję krok po kroku.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 1: Znajdź produkt
                </h2>
                <p className="text-secondary-600 mb-4">
                  Możesz znaleźć produkty na kilka sposobów:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Użyj wyszukiwarki na górze strony</li>
                  <li>Przeglądaj kategorie produktów</li>
                  <li>Sprawdź promocje i oferty specjalne</li>
                  <li>Przejrzyj produkty polecane</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 2: Dodaj do koszyka
                </h2>
                <p className="text-secondary-600 mb-4">
                  Po znalezieniu produktu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Kliknij na produkt, aby zobaczyć szczegóły</li>
                  <li>Wybierz wariant (jeśli dostępne - rozmiar, kolor itp.)</li>
                  <li>Określ ilość produktów</li>
                  <li>Kliknij przycisk "Dodaj do koszyka"</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 3: Przejdź do koszyka
                </h2>
                <p className="text-secondary-600 mb-4">
                  Gdy dodasz wszystkie produkty:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Kliknij ikonę koszyka w prawym górnym rogu</li>
                  <li>Sprawdź zawartość koszyka</li>
                  <li>Możesz zmienić ilość lub usunąć produkty</li>
                  <li>Kliknij "Przejdź do kasy"</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 4: Wypełnij dane dostawy
                </h2>
                <p className="text-secondary-600 mb-4">
                  Podaj informacje niezbędne do realizacji zamówienia:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Dane odbiorcy (imię, nazwisko)</li>
                  <li>Adres dostawy lub punkt odbioru</li>
                  <li>Numer telefonu kontaktowego</li>
                  <li>Adres e-mail do powiadomień</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 5: Wybierz metodę dostawy
                </h2>
                <p className="text-secondary-600 mb-4">
                  Dostępne opcje dostawy:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Kurier InPost</li>
                  <li>Paczkomat InPost</li>
                  <li>Wysyłka gabaryt (dla dużych produktów)</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 6: Wybierz metodę płatności
                </h2>
                <p className="text-secondary-600 mb-4">
                  Akceptujemy różne formy płatności:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>BLIK</li>
                  <li>Karta płatnicza (Visa, Mastercard)</li>
                  <li>Przelew online (PayU)</li>
                  <li>Płatność przy odbiorze (dla wybranych zamówień)</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Krok 7: Potwierdź zamówienie
                </h2>
                <p className="text-secondary-600 mb-4">
                  Ostatni krok:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Sprawdź podsumowanie zamówienia</li>
                  <li>Zaakceptuj regulamin</li>
                  <li>Kliknij "Złóż zamówienie"</li>
                  <li>Dokończ płatność (jeśli wybrana)</li>
                </ul>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Załóż konto, aby śledzić zamówienia, zapisać adresy dostawy i otrzymywać spersonalizowane oferty.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/orders/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Sprawdzanie statusu zamówienia
                </Link>
                <Link href="/help/payments/methods" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Metody płatności
                </Link>
                <Link href="/shipping" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Opcje dostawy
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
