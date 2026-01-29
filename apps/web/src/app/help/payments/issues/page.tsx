import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Problemy z płatnością - Centrum pomocy - WB Trade',
  description: 'Rozwiązywanie problemów z płatnościami w WB Trade',
};

export default function PaymentIssuesPage() {
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
            <span className="text-secondary-900 dark:text-white">Problemy z płatnością</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Problemy z płatnością
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Masz problem z finalizacją płatności? Poniżej znajdziesz rozwiązania najczęstszych problemów.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Płatność została odrzucona
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border-l-4 border-red-500 dark:border-red-400">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Możliwe przyczyny:</h4>
                    <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                      <li>• Niewystarczające środki na koncie</li>
                      <li>• Przekroczony limit dzienny karty</li>
                      <li>• Karta wygasła lub jest zablokowana</li>
                      <li>• Błędne dane karty (numer, data, CVV)</li>
                      <li>• Bank odrzucił transakcję (brak autoryzacji 3D Secure)</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500 dark:border-green-400">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Co zrobić:</h4>
                    <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
                      <li>• Sprawdź stan konta i limit dzienny</li>
                      <li>• Upewnij się, że karta jest aktywna</li>
                      <li>• Spróbuj innej metody płatności (np. BLIK)</li>
                      <li>• Skontaktuj się z bankiem w sprawie odblokowania</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  BLIK nie działa
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Upewnij się, że masz aktywny BLIK w aplikacji bankowej</li>
                  <li>Sprawdź, czy wpisałeś prawidłowy 6-cyfrowy kod</li>
                  <li>Kod BLIK jest ważny tylko 2 minuty - wygeneruj nowy</li>
                  <li>Potwierdź transakcję w aplikacji mobilnej banku</li>
                  <li>Sprawdź czy masz wystarczające środki na koncie</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Pobrano pieniądze, ale zamówienie nie zostało złożone
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli środki zostały pobrane, ale nie otrzymałeś potwierdzenia zamówienia:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Sprawdź folder SPAM w skrzynce e-mail</li>
                  <li>Zaloguj się na konto i sprawdź sekcję "Zamówienia"</li>
                  <li>Poczekaj 15-30 minut - czasem potwierdzenie jest opóźnione</li>
                  <li>Jeśli zamówienia nadal nie ma - skontaktuj się z nami</li>
                </ol>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  <strong>Ważne:</strong> Pieniądze są czasami tylko zablokowane (nie pobrane). Blokada zostanie automatycznie zwolniona w ciągu 7 dni.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Strona płatności się nie ładuje
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Wyczyść cache i cookies przeglądarki</li>
                  <li>Wyłącz blokady reklam (AdBlock) dla naszej strony</li>
                  <li>Spróbuj w innej przeglądarce lub trybie incognito</li>
                  <li>Sprawdź połączenie internetowe</li>
                  <li>Odśwież stronę i spróbuj ponownie</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Problemy z PayPo lub ratami
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>PayPo:</strong> Minimalna kwota zamówienia to 40 zł</li>
                  <li><strong>Raty:</strong> Wymagana jest pozytywna weryfikacja kredytowa</li>
                  <li>Sprawdź, czy podane dane osobowe są poprawne</li>
                  <li>W razie odrzucenia - skontaktuj się bezpośrednio z PayPo lub PayU</li>
                </ul>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Podwójna płatność</h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Jeśli przypadkowo zapłaciłeś dwa razy za to samo zamówienie, skontaktuj się z nami. Nadpłata zostanie zwrócona w ciągu 5-7 dni roboczych.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Kontakt w sprawie płatności
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Podaj nam następujące informacje:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Numer zamówienia (jeśli istnieje)</li>
                  <li>Data i godzina próby płatności</li>
                  <li>Użyta metoda płatności</li>
                  <li>Komunikat błędu (jeśli się pojawił)</li>
                  <li>Zrzut ekranu błędu (opcjonalnie)</li>
                </ul>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/payments/methods" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Metody płatności
                </Link>
                <Link href="/help/payments/refunds" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zwroty płatności
                </Link>
                <Link href="/help/orders/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Status zamówienia
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
