import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Ochrona prywatności - Centrum pomocy - WB Trade',
  description: 'Jak chronimy Twoje dane osobowe w WB Trade',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      
      <main className="py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400 mb-8">
            <Link href="/" className="hover:text-primary-600">Strona główna</Link>
            <span>/</span>
            <Link href="/help" className="hover:text-primary-600">Centrum pomocy</Link>
            <span>/</span>
            <span className="text-secondary-900 dark:text-white">Ochrona prywatności</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Ochrona prywatności
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Dbamy o Twoją prywatność i chronimy Twoje dane osobowe zgodnie z RODO. Dowiedz się, jak przetwarzamy Twoje dane i jakie masz prawa.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jakie dane zbieramy?
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">📋 Dane podane przez Ciebie</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Imię i nazwisko</li>
                      <li>• Adres e-mail i telefon</li>
                      <li>• Adres dostawy</li>
                      <li>• Dane do faktury (opcjonalnie)</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🛒 Dane z aktywności</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Historia zamówień</li>
                      <li>• Przeglądane produkty</li>
                      <li>• Wyszukiwania w sklepie</li>
                      <li>• Lista życzeń</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🌐 Dane techniczne</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Adres IP</li>
                      <li>• Typ przeglądarki i urządzenia</li>
                      <li>• Pliki cookies</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Do czego używamy Twoich danych?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Realizacja zamówień i dostaw</li>
                  <li>Obsługa zwrotów i reklamacji</li>
                  <li>Kontakt w sprawie zamówień</li>
                  <li>Wysyłka newslettera (za zgodą)</li>
                  <li>Personalizacja rekomendacji produktów</li>
                  <li>Analiza i ulepszanie serwisu</li>
                  <li>Wykrywanie i zapobieganie oszustwom</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Twoje prawa (RODO)
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">👁️ Prawo dostępu</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz uzyskać kopię swoich danych</p>
                  </div>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">✏️ Prawo do sprostowania</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz poprawić nieprawidłowe dane</p>
                  </div>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">🗑️ Prawo do usunięcia</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz żądać usunięcia danych</p>
                  </div>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">📤 Prawo do przenoszenia</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz pobrać swoje dane</p>
                  </div>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">🚫 Prawo do sprzeciwu</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz sprzeciwić się przetwarzaniu</p>
                  </div>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                    <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">⏸️ Prawo do ograniczenia</h4>
                    <p className="text-primary-700 dark:text-primary-300 text-sm">Możesz ograniczyć przetwarzanie</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak zarządzać prywatnością?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-200 mt-6 mb-3">Ustawienia konta:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Zaloguj się na konto</li>
                  <li>Przejdź do "Moje konto" → "Prywatność"</li>
                  <li>Zarządzaj zgodami marketingowymi</li>
                  <li>Pobierz lub usuń swoje dane</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-200 mt-6 mb-3">Ustawienia cookies:</h3>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Kliknij "Ustawienia cookies" w stopce strony</li>
                  <li>Wybierz które cookies akceptujesz</li>
                  <li>Cookies niezbędne są zawsze aktywne</li>
                  <li>Możesz też zarządzać cookies w przeglądarce</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Komu udostępniamy dane?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>Firmy kurierskie:</strong> do realizacji dostaw</li>
                  <li><strong>Operatorzy płatności:</strong> do przetwarzania transakcji</li>
                  <li><strong>Sprzedawcy:</strong> dane niezbędne do realizacji zamówienia</li>
                  <li><strong>Organy państwowe:</strong> jeśli wymaga tego prawo</li>
                </ul>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  <strong>Nigdy nie sprzedajemy Twoich danych!</strong>
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak długo przechowujemy dane?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>Dane konta:</strong> do czasu usunięcia konta</li>
                  <li><strong>Historia zamówień:</strong> 5 lat (wymogi prawne)</li>
                  <li><strong>Dane marketingowe:</strong> do cofnięcia zgody</li>
                  <li><strong>Logi techniczne:</strong> 12 miesięcy</li>
                </ul>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">📧 Kontakt w sprawie prywatności</h3>
                  <p className="text-primary-700 dark:text-primary-300 mb-2">
                    Inspektor Ochrony Danych: <strong>iod@wbtrade.pl</strong>
                  </p>
                  <p className="text-primary-700 dark:text-primary-300 text-sm">
                    Możesz też złożyć skargę do UODO (Urzędu Ochrony Danych Osobowych).
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/security/shopping" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Bezpieczeństwo zakupów
                </Link>
                <Link href="/help/account/delete" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Usunięcie konta
                </Link>
                <Link href="/help/account/update" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zmiana danych konta
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
