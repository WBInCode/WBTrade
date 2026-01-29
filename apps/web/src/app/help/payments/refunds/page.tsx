import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Zwroty płatności - Centrum pomocy - WB Trade',
  description: 'Informacje o zwrotach płatności w WB Trade',
};

export default function RefundsPage() {
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
            <span className="text-secondary-900 dark:text-white">Zwroty płatności</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Zwroty płatności
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Dowiedz się, jak przebiega proces zwrotu pieniędzy i ile trwa w zależności od metody płatności.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Kiedy otrzymam zwrot?
                </h2>
                
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Zwrot pieniędzy realizujemy po:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Anulowaniu zamówienia (przed wysyłką)</li>
                  <li>Otrzymaniu zwróconego towaru i pozytywnej weryfikacji</li>
                  <li>Rozpatrzeniu reklamacji na korzyść klienta</li>
                  <li>Wykryciu nadpłaty na zamówieniu</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Czas realizacji zwrotu
                </h2>
                
                <div className="overflow-x-auto mb-8">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-secondary-100 dark:bg-secondary-700">
                        <th className="p-3 text-left font-medium text-secondary-900 dark:text-white border dark:border-secondary-600">Metoda płatności</th>
                        <th className="p-3 text-left font-medium text-secondary-900 dark:text-white border dark:border-secondary-600">Czas zwrotu</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">BLIK</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">1-3 dni robocze</td>
                      </tr>
                      <tr className="bg-secondary-50 dark:bg-secondary-700/50">
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">Karta płatnicza (Visa, Mastercard)</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">5-10 dni roboczych</td>
                      </tr>
                      <tr>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">Przelew online</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">3-5 dni roboczych</td>
                      </tr>
                      <tr className="bg-secondary-50 dark:bg-secondary-700/50">
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">Google Pay / Apple Pay</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">5-10 dni roboczych</td>
                      </tr>
                      <tr>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">PayPo</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">Automatyczne anulowanie zobowiązania</td>
                      </tr>
                      <tr>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">Przelew tradycyjny</td>
                        <td className="p-3 border dark:border-secondary-600 text-secondary-600 dark:text-secondary-400">3-5 dni roboczych</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak sprawdzić status zwrotu?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto</li>
                  <li>Przejdź do "Moje konto" → "Zwroty"</li>
                  <li>Znajdź odpowiedni zwrot na liście</li>
                  <li>Sprawdź status (przetwarzany / zrealizowany)</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Na jakie konto otrzymam zwrot?
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Zwrot realizujemy <strong>tą samą metodą płatności</strong>, którą użyto przy zamówieniu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>Karta:</strong> Na kartę, z której wykonano płatność</li>
                  <li><strong>BLIK/Przelew:</strong> Na konto bankowe, z którego wysłano przelew</li>
                  <li><strong>Za pobraniem:</strong> Na konto wskazane w formularzu zwrotu</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Zwrot nie dotarł?
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli minął podany termin i zwrot nie dotarł:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Sprawdź wyciąg bankowy za ostatnie dni</li>
                  <li>Upewnij się, że konto/karta nie zostały zamknięte</li>
                  <li>Sprawdź, czy nie ma opóźnień po stronie banku</li>
                  <li>Skontaktuj się z nami podając numer zamówienia</li>
                </ol>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Ważne informacje</h3>
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-2">
                    <li>• Zwrot za dostawę jest realizowany tylko przy zwrocie całego zamówienia</li>
                    <li>• Koszty odesłania towaru pokrywa klient (chyba że towar był wadliwy)</li>
                    <li>• Przy ratach - anulowanie może wymagać kontaktu z instytucją finansową</li>
                  </ul>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Przy płatności kartą zwrot może najpierw pojawić się jako "oczekująca transakcja" zanim zostanie zaksięgowany.
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
                <Link href="/help/orders/cancel" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Anulowanie zamówienia
                </Link>
                <Link href="/help/returns/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Status zwrotu
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
