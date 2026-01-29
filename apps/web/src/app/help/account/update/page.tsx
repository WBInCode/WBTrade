import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Zmiana danych konta - Centrum pomocy - WB Trade',
  description: 'Jak zmienić dane konta w WB Trade',
};

export default function UpdateAccountPage() {
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
            <span className="text-secondary-900 dark:text-white">Zmiana danych konta</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Zmiana danych konta
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Zmień dane osobowe, hasło, adresy dostawy i inne ustawienia swojego konta.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak zmienić dane osobowe?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Zaloguj się na swoje konto</li>
                  <li>Kliknij na swoje imię w prawym górnym rogu</li>
                  <li>Wybierz "Moje konto" → "Dane osobowe"</li>
                  <li>Edytuj potrzebne informacje</li>
                  <li>Kliknij "Zapisz zmiany"</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Co można zmienić?
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">👤 Dane podstawowe</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Imię i nazwisko</li>
                      <li>• Numer telefonu</li>
                      <li>• Data urodzenia</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">📧 Adres e-mail</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Zmiana wymaga potwierdzenia nowego adresu</li>
                      <li>• Na stary adres otrzymasz powiadomienie o zmianie</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🔒 Hasło</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Podaj aktualne hasło</li>
                      <li>• Wprowadź nowe hasło (min. 8 znaków)</li>
                      <li>• Potwierdź nowe hasło</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🏠 Adresy dostawy</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Dodawanie nowych adresów</li>
                      <li>• Edycja istniejących adresów</li>
                      <li>• Ustawienie adresu domyślnego</li>
                      <li>• Usuwanie nieużywanych adresów</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🧾 Dane do faktur</h4>
                    <ul className="text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                      <li>• Nazwa firmy</li>
                      <li>• NIP</li>
                      <li>• Adres siedziby firmy</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak zmienić hasło?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Przejdź do "Moje konto" → "Bezpieczeństwo"</li>
                  <li>Kliknij "Zmień hasło"</li>
                  <li>Wpisz aktualne hasło</li>
                  <li>Wpisz nowe hasło dwukrotnie</li>
                  <li>Kliknij "Zapisz"</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak zmienić adres e-mail?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Przejdź do "Moje konto" → "Dane osobowe"</li>
                  <li>Kliknij "Zmień e-mail"</li>
                  <li>Wpisz nowy adres e-mail</li>
                  <li>Potwierdź hasłem do konta</li>
                  <li>Kliknij link w e-mailu wysłanym na nowy adres</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Ustawienia powiadomień
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  W sekcji "Powiadomienia" możesz zarządzać:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Powiadomienia e-mail o promocjach</li>
                  <li>Newsletter</li>
                  <li>Powiadomienia SMS</li>
                  <li>Powiadomienia o dostępności produktów</li>
                  <li>Podsumowania zakupów</li>
                </ul>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Nie pamiętasz hasła?</h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Kliknij "Zapomniałem hasła" na stronie logowania. Wyślemy link do resetowania hasła na Twój adres e-mail.
                  </p>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Regularnie aktualizuj swoje dane kontaktowe, aby mieć pewność, że otrzymujesz wszystkie ważne powiadomienia o zamówieniach.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/account/register" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Rejestracja konta
                </Link>
                <Link href="/help/account/delete" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Usunięcie konta
                </Link>
                <Link href="/help/security/privacy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Ochrona prywatności
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
