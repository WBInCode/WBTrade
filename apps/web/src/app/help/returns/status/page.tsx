import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Status zwrotu - Centrum pomocy - WB Trade',
  description: 'Sprawdź status zwrotu lub reklamacji w WB Trade',
};

export default function ReturnStatusPage() {
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
            <span className="text-secondary-900 dark:text-white">Status zwrotu</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Status zwrotu i reklamacji
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Sprawdź, jak śledzić status zgłoszenia zwrotu lub reklamacji i jakie są możliwe statusy.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak sprawdzić status?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto WB Trade</li>
                  <li>Przejdź do sekcji "Moje konto"</li>
                  <li>Wybierz zakładkę "Zwroty i reklamacje"</li>
                  <li>Znajdź swoje zgłoszenie na liście</li>
                  <li>Kliknij "Szczegóły" aby zobaczyć pełne informacje</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Statusy zwrotu
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Zgłoszony</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Twoje zgłoszenie zostało przyjęte i czeka na weryfikację.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Zaakceptowany</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Zwrot został zaakceptowany. Oczekujemy na przesyłkę z produktem.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Przesyłka w drodze</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Twoja przesyłka zwrotna jest w transporcie do naszego magazynu.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Otrzymano</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Towar dotarł do magazynu i oczekuje na weryfikację.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Weryfikacja</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Sprawdzamy stan zwróconego towaru.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Przetwarzanie zwrotu</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Zwrot pieniędzy jest w trakcie realizacji.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Zakończony</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Zwrot został zrealizowany. Pieniądze są w drodze na Twoje konto.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Odrzucony</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Zwrot nie został zaakceptowany. Sprawdź szczegóły w powiadomieniu.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Statusy reklamacji
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Nowa reklamacja</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Zgłoszenie zostało przyjęte do rozpatrzenia.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">W trakcie rozpatrywania</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Analizujemy Twoje zgłoszenie (maks. 14 dni).</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Oczekuje na produkt</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Czekamy na przesłanie produktu do weryfikacji.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Uznana</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Reklamacja została rozpatrzona pozytywnie.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Nieuznana</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">Reklamacja nie została uwzględniona. Sprawdź uzasadnienie.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Powiadomienia
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Otrzymasz powiadomienie e-mail przy każdej zmianie statusu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Potwierdzenie przyjęcia zgłoszenia</li>
                  <li>Akceptacja lub odrzucenie wniosku</li>
                  <li>Potwierdzenie otrzymania przesyłki</li>
                  <li>Informacja o realizacji zwrotu pieniędzy</li>
                </ul>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Sprawdzaj folder SPAM jeśli nie otrzymujesz powiadomień. Możesz też włączyć powiadomienia SMS w ustawieniach konta.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/returns/policy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Polityka zwrotów
                </Link>
                <Link href="/help/returns/complaint" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Reklamacja
                </Link>
                <Link href="/help/payments/refunds" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zwroty płatności
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
