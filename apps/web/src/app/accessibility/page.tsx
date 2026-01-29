import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Dostępność - WB Trade',
  description: 'Deklaracja dostępności serwisu WB Trade',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900 dark:text-white">
              Dostępność
            </h1>
            <p className="text-secondary-500 dark:text-secondary-400">
              Deklaracja dostępności serwisu WB Trade
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-sm p-8 lg:p-12">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-0 mb-4">
                  Nasze zobowiązanie
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  WB Trade zobowiązuje się do&nbsp;zapewnienia dostępności cyfrowej swojego serwisu 
                  zgodnie z&nbsp;przepisami ustawy z&nbsp;dnia 4&nbsp;kwietnia 2019&nbsp;r. o&nbsp;dostępności cyfrowej 
                  stron internetowych i&nbsp;aplikacji mobilnych podmiotów publicznych.
                </p>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Dokładamy wszelkich starań, aby nasz serwis był dostępny dla wszystkich 
                  użytkowników, niezależnie od&nbsp;ich możliwości czy używanej technologii.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Status zgodności
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Serwis WB Trade jest częściowo zgodny z&nbsp;wytycznymi WCAG&nbsp;2.1 na&nbsp;poziomie AA. 
                  Nieustannie pracujemy nad poprawą dostępności i&nbsp;usuwaniem barier.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Funkcje dostępności
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Nasz serwis zawiera następujące udogodnienia:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Możliwość nawigacji za&nbsp;pomocą klawiatury</li>
                  <li>Teksty alternatywne dla obrazów</li>
                  <li>Odpowiedni kontrast kolorów</li>
                  <li>Czytelna struktura nagłówków</li>
                  <li>Responsywny design dostosowany do&nbsp;różnych urządzeń</li>
                  <li>Możliwość powiększania tekstu bez utraty funkcjonalności</li>
                  <li>Widoczny fokus przy nawigacji klawiaturą</li>
                  <li>Etykiety dla pól formularzy</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Znane ograniczenia
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Pomimo naszych starań, niektóre elementy mogą nie być w pełni dostępne:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Niektóre starsze materiały graficzne mogą nie posiadać opisów alternatywnych</li>
                  <li>Część filmów może nie posiadać napisów</li>
                  <li>Niektóre dokumenty PDF mogą nie być w pełni dostępne</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Skróty klawiaturowe
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  W&nbsp;serwisie można używać standardowych skrótów klawiaturowych:
                </p>
                <div className="bg-secondary-50 dark:bg-secondary-900 rounded-xl p-6 mb-6">
                  <ul className="list-none text-secondary-600 dark:text-secondary-400 space-y-3">
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white dark:bg-secondary-700 rounded border border-secondary-300 dark:border-secondary-600 font-mono text-sm">Tab</kbd>
                      <span>Przejście do następnego elementu interaktywnego</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white dark:bg-secondary-700 rounded border border-secondary-300 dark:border-secondary-600 font-mono text-sm">Shift + Tab</kbd>
                      <span>Przejście do poprzedniego elementu</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white dark:bg-secondary-700 rounded border border-secondary-300 dark:border-secondary-600 font-mono text-sm">Enter</kbd>
                      <span>Aktywacja linku lub przycisku</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white dark:bg-secondary-700 rounded border border-secondary-300 dark:border-secondary-600 font-mono text-sm">Esc</kbd>
                      <span>Zamknięcie okna modalnego lub menu</span>
                    </li>
                  </ul>
                </div>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Informacje zwrotne i dane kontaktowe
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli zauważysz problemy z&nbsp;dostępnością lub potrzebujesz informacji 
                  w&nbsp;alternatywnym formacie, skontaktuj się z&nbsp;nami:
                </p>
                <ul className="list-none text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>📧 E-mail: support@wb-partners.pl</li>
                  <li>📞 Telefon: +48&nbsp;570&nbsp;034&nbsp;367</li>
                  <li>🏢 Adres: ul.&nbsp;Juliusza Słowackiego 24/11, 35-060 Rzeszów</li>
                </ul>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Staramy się odpowiadać na&nbsp;zgłoszenia dotyczące dostępności w&nbsp;ciągu 7&nbsp;dni roboczych.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Procedura skargowa
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  W&nbsp;przypadku braku satysfakcjonującej odpowiedzi na&nbsp;zgłoszenie dotyczące 
                  dostępności, możesz złożyć skargę do&nbsp;Rzecznika Praw Obywatelskich 
                  (www.rpo.gov.pl).
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  Data sporządzenia deklaracji
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-2">
                  Deklaracja została sporządzona dnia: 18 grudnia 2025
                </p>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Deklaracja została przygotowana na&nbsp;podstawie samooceny przeprowadzonej 
                  przez WB&nbsp;PARTNERS Sp.&nbsp;z&nbsp;o.o.
                </p>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer hideTrustBadges />
    </div>
  );
}
