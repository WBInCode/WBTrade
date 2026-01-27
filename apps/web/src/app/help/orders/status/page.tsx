import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Status zamówienia - Centrum pomocy - WB Trade',
  description: 'Dowiedz się jak sprawdzić status swojego zamówienia w WB Trade',
};

export default function OrderStatusPage() {
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
            <span className="text-secondary-900">Status zamówienia</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Sprawdzanie statusu zamówienia
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Śledzenie zamówienia pozwala na bieżąco monitorować etap realizacji. Poniżej znajdziesz informacje o statusach i sposobach sprawdzania zamówienia.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak sprawdzić status zamówienia?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Dla zalogowanych użytkowników:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto</li>
                  <li>Przejdź do sekcji "Moje konto" → "Zamówienia"</li>
                  <li>Znajdź zamówienie na liście</li>
                  <li>Kliknij "Szczegóły" aby zobaczyć pełne informacje</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Dla gości (bez konta):</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Otwórz e-mail z potwierdzeniem zamówienia</li>
                  <li>Kliknij link "Śledź zamówienie"</li>
                  <li>Lub wpisz numer zamówienia i adres e-mail na stronie śledzenia</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Znaczenie statusów zamówienia
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Oczekuje na płatność</h4>
                      <p className="text-secondary-600 text-sm">Zamówienie zostało złożone, oczekujemy na potwierdzenie płatności.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Opłacone</h4>
                      <p className="text-secondary-600 text-sm">Płatność została potwierdzona, zamówienie czeka na realizację.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">W realizacji</h4>
                      <p className="text-secondary-600 text-sm">Zamówienie jest przygotowywane do wysyłki.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Wysłane</h4>
                      <p className="text-secondary-600 text-sm">Paczka została przekazana kurierowi. Możesz śledzić przesyłkę.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Dostarczone</h4>
                      <p className="text-secondary-600 text-sm">Zamówienie zostało dostarczone do odbiorcy.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Anulowane</h4>
                      <p className="text-secondary-600 text-sm">Zamówienie zostało anulowane.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Powiadomienia e-mail
                </h2>
                <p className="text-secondary-600 mb-4">
                  Automatycznie wysyłamy powiadomienia e-mail przy każdej zmianie statusu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Potwierdzenie złożenia zamówienia</li>
                  <li>Potwierdzenie płatności</li>
                  <li>Informacja o wysyłce z numerem śledzenia</li>
                  <li>Potwierdzenie dostarczenia</li>
                </ul>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Sprawdź folder SPAM jeśli nie otrzymujesz powiadomień. Dodaj nasz adres do kontaktów.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/delivery/tracking" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Śledzenie przesyłki
                </Link>
                <Link href="/help/orders/cancel" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Anulowanie zamówienia
                </Link>
                <Link href="/help/delivery/issues" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Problemy z dostawą
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
