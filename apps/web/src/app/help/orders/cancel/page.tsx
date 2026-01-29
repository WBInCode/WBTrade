import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Anulowanie zamówienia - Centrum pomocy - WB Trade',
  description: 'Dowiedz się jak anulować zamówienie w WB Trade',
};

export default function OrderCancelPage() {
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
            <span className="text-secondary-900 dark:text-white">Anulowanie zamówienia</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Anulowanie zamówienia
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Możesz anulować zamówienie, jeśli nie zostało jeszcze wysłane. Poniżej znajdziesz instrukcje i informacje o warunkach anulowania.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Kiedy można anulować zamówienie?
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Można anulować</h4>
                    <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
                      <li>• Zamówienia oczekujące na płatność</li>
                      <li>• Zamówienia opłacone (przed wysyłką)</li>
                      <li>• Zamówienia w trakcie kompletowania</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">❌ Nie można anulować</h4>
                    <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                      <li>• Zamówienia już wysłane</li>
                      <li>• Zamówienia w trakcie dostawy</li>
                      <li>• Zamówienia dostarczone</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak anulować zamówienie?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-200 mt-6 mb-3">Krok po kroku:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-3 mb-6">
                  <li>Zaloguj się na swoje konto w WB Trade</li>
                  <li>Przejdź do sekcji "Moje konto" → "Zamówienia"</li>
                  <li>Znajdź zamówienie, które chcesz anulować</li>
                  <li>Kliknij przycisk "Szczegóły"</li>
                  <li>Wybierz opcję "Anuluj zamówienie"</li>
                  <li>Podaj powód anulowania (opcjonalnie)</li>
                  <li>Potwierdź anulowanie</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Zwrot pieniędzy
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Po anulowaniu opłaconego zamówienia:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>Płatność kartą:</strong> zwrot w ciągu 5-10 dni roboczych</li>
                  <li><strong>BLIK / przelew:</strong> zwrot w ciągu 3-5 dni roboczych</li>
                </ul>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Zwrot zostanie wykonany tą samą metodą płatności, którą użyto przy składaniu zamówienia.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Częściowe anulowanie
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli chcesz anulować tylko część zamówienia (pojedyncze produkty):
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Skontaktuj się z naszym działem obsługi klienta</li>
                  <li>Podaj numer zamówienia i produkty do anulowania</li>
                  <li>Poczekaj na potwierdzenie i korektę zamówienia</li>
                </ol>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Ważne</h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Po wysłaniu zamówienia nie można go anulować. W takim przypadku możesz skorzystać z prawa do zwrotu w ciągu 14 dni od otrzymania przesyłki.
                  </p>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Jeśli przycisk anulowania nie jest dostępny, oznacza to, że zamówienie jest już w trakcie wysyłki. Skontaktuj się z nami jak najszybciej.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/orders/modify" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zmiana zamówienia
                </Link>
                <Link href="/help/returns/policy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Polityka zwrotów
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
