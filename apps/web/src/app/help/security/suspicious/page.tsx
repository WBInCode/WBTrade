import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Podejrzana aktywność - Centrum pomocy - WB Trade',
  description: 'Co zrobić w przypadku podejrzanej aktywności na koncie WB Trade',
};

export default function SuspiciousPage() {
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
            <span className="text-secondary-900 dark:text-white">Podejrzana aktywność</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Podejrzana aktywność na koncie
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Zauważyłeś coś niepokojącego na swoim koncie? Działaj szybko! Poniżej znajdziesz informacje, jak reagować na podejrzaną aktywność.
                </p>

                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-8">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">🚨 Działaj natychmiast!</h3>
                  <p className="text-red-700 dark:text-red-300">
                    Jeśli podejrzewasz, że ktoś ma dostęp do Twojego konta, natychmiast zmień hasło i skontaktuj się z nami.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Sygnały ostrzegawcze
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">📧 Nieznane zamówienia</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">Otrzymujesz potwierdzenia zamówień, których nie składałeś.</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">🔑 Zmiana hasła bez Twojej wiedzy</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">Otrzymałeś e-mail o zmianie hasła, której nie inicjowałeś.</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">📍 Nieznane adresy dostawy</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">W zamówieniach pojawiają się adresy, których nie dodawałeś.</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">💳 Nieautoryzowane płatności</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">Na koncie bankowym widzisz płatności do WB Trade, których nie wykonywałeś.</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">👤 Zmienione dane konta</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">Twoje dane osobowe, e-mail lub telefon zostały zmienione.</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Co zrobić natychmiast?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-3 mb-6">
                  <li>
                    <strong>Zmień hasło:</strong> Zaloguj się i natychmiast zmień hasło na silne i unikalne.
                  </li>
                  <li>
                    <strong>Sprawdź zamówienia:</strong> Przejrzyj historię zamówień i anuluj nieznane.
                  </li>
                  <li>
                    <strong>Sprawdź adresy:</strong> Usuń nieznane adresy dostawy z konta.
                  </li>
                  <li>
                    <strong>Sprawdź dane:</strong> Zweryfikuj czy dane kontaktowe nie zostały zmienione.
                  </li>
                  <li>
                    <strong>Skontaktuj się z nami:</strong> Zgłoś incydent na bezpieczenstwo@wbtrade.pl
                  </li>
                  <li>
                    <strong>Sprawdź bank:</strong> Przejrzyj wyciąg bankowy i zgłoś podejrzane transakcje.
                  </li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Nie możesz się zalogować?
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli ktoś zmienił hasło do Twojego konta:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Kliknij "Zapomniałem hasła" na stronie logowania</li>
                  <li>Użyj adresu e-mail przypisanego do konta</li>
                  <li>Jeśli e-mail też został zmieniony - skontaktuj się z nami pilnie</li>
                  <li>Przygotuj dowód tożsamości do weryfikacji</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Fałszywe e-maile (phishing)
                </h2>
                <div className="bg-secondary-50 dark:bg-secondary-900 p-4 rounded-lg mb-6">
                  <p className="text-secondary-700 dark:text-secondary-300 mb-3">
                    <strong>Nigdy nie wysyłamy e-maili z prośbą o:</strong>
                  </p>
                  <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 text-sm space-y-1">
                    <li>Podanie hasła</li>
                    <li>Dane karty płatniczej w odpowiedzi na e-mail</li>
                    <li>Kliknięcie w link do "weryfikacji konta"</li>
                    <li>Pobranie załącznika z "fakturą"</li>
                  </ul>
                </div>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Jeśli otrzymałeś taki e-mail - <strong>NIE KLIKAJ w linki</strong>. Prześlij go do nas: bezpieczenstwo@wbtrade.pl
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak się chronić w przyszłości?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Używaj silnego, unikalnego hasła (min. 12 znaków)</li>
                  <li>Włącz weryfikację dwuetapową (2FA)</li>
                  <li>Nie używaj tego samego hasła w innych serwisach</li>
                  <li>Nie loguj się na publicznych komputerach</li>
                  <li>Regularnie sprawdzaj historię aktywności konta</li>
                  <li>Wylogowuj się po zakończeniu sesji</li>
                </ul>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">📞 Pilny kontakt</h3>
                  <p className="text-primary-700 dark:text-primary-300 mb-3">
                    W sprawach bezpieczeństwa konta:
                  </p>
                  <ul className="text-primary-700 dark:text-primary-300 text-sm space-y-1">
                    <li>📧 E-mail: bezpieczenstwo@wbtrade.pl</li>
                    <li>📞 Telefon: +48 123 456 789 (pon-pt 9-17)</li>
                    <li>⏰ Odpowiadamy na zgłoszenia bezpieczeństwa w ciągu 4 godzin</li>
                  </ul>
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
                <Link href="/help/account/update" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Zmiana hasła
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
