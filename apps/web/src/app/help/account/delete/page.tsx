import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Usunięcie konta - Centrum pomocy - WB Trade',
  description: 'Jak usunąć konto w WB Trade',
};

export default function DeleteAccountPage() {
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
            <span className="text-secondary-900 dark:text-white">Usunięcie konta</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Usunięcie konta
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Chcesz usunąć swoje konto? Przeczytaj poniższe informacje zanim podejmiesz decyzję.
                </p>

                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-8">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Ważne ostrzeżenie</h3>
                  <p className="text-red-700 dark:text-red-300">
                    Usunięcie konta jest <strong>nieodwracalne</strong>. Wszystkie Twoje dane, historia zamówień, punkty lojalnościowe i zapisane adresy zostaną trwale usunięte.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Co zostanie usunięte?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Dane osobowe (imię, nazwisko, e-mail, telefon)</li>
                  <li>Historia zamówień</li>
                  <li>Zapisane adresy dostawy</li>
                  <li>Lista życzeń</li>
                  <li>Historia wyszukiwania</li>
                  <li>Zapisane metody płatności</li>
                  <li>Opinie i recenzje produktów</li>
                  <li>Zgromadzone punkty lojalnościowe</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Co zostanie zachowane?
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Zgodnie z przepisami prawa, musimy przechowywać niektóre dane:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Faktury i dokumenty księgowe (przez 5 lat)</li>
                  <li>Dane niezbędne do rozpatrywania reklamacji</li>
                  <li>Informacje wymagane przez prawo podatkowe</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Warunki usunięcia konta
                </h2>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3 p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <span className="text-xl">📦</span>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Brak aktywnych zamówień</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                        Wszystkie zamówienia muszą być zakończone (dostarczone lub anulowane).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <span className="text-xl">↩️</span>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Zakończone zwroty</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                        Wszystkie zwroty i reklamacje muszą być rozpatrzone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <span className="text-xl">💰</span>
                    <div>
                      <h4 className="font-medium text-secondary-900 dark:text-white">Brak zaległych płatności</h4>
                      <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                        Wszelkie płatności za pobraniem i zobowiązania muszą być uregulowane.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak usunąć konto?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-200 mt-6 mb-3">Metoda 1: Przez panel klienta</h3>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto</li>
                  <li>Przejdź do "Moje konto" → "Ustawienia"</li>
                  <li>Przewiń do sekcji "Usunięcie konta"</li>
                  <li>Kliknij "Usuń moje konto"</li>
                  <li>Potwierdź decyzję wpisując hasło</li>
                  <li>Kliknij link potwierdzający w e-mailu</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-200 mt-6 mb-3">Metoda 2: Przez kontakt z obsługą</h3>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Wyślij e-mail na adres: kontakt@wbtrade.pl</li>
                  <li>Temat: "Żądanie usunięcia konta"</li>
                  <li>Podaj adres e-mail przypisany do konta</li>
                  <li>Otrzymasz potwierdzenie w ciągu 30 dni</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Czas realizacji
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Po złożeniu wniosku o usunięcie konta:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li><strong>24 godziny:</strong> Możliwość anulowania żądania</li>
                  <li><strong>7 dni:</strong> Konto zostaje dezaktywowane</li>
                  <li><strong>30 dni:</strong> Dane zostają trwale usunięte</li>
                </ul>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💭 Może zamiast tego...</h3>
                  <p className="text-blue-700 dark:text-blue-300 mb-3">
                    Jeśli nie chcesz otrzymywać powiadomień, ale chcesz zachować konto:
                  </p>
                  <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                    <li>• Wyłącz newsletter w ustawieniach powiadomień</li>
                    <li>• Zrezygnuj z powiadomień promocyjnych</li>
                    <li>• Konto pozostanie dostępne do przyszłych zakupów</li>
                  </ul>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">📞 Potrzebujesz pomocy?</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Jeśli masz pytania dotyczące usunięcia konta lub przetwarzania danych, skontaktuj się z nami: kontakt@wbtrade.pl
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/security/privacy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Ochrona prywatności
                </Link>
                <Link href="/help/account/update" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zmiana danych konta
                </Link>
                <Link href="/help/account/register" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Rejestracja konta
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
