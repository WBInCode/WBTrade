import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Dostępność - WBTrade',
  description: 'Deklaracja dostępności serwisu WBTrade',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-secondary-200 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900">
              Dostępność
            </h1>
            <p className="text-secondary-500">
              Deklaracja dostępności serwisu WBTrade
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 lg:p-12">
              <div className="prose prose-lg max-w-none">
                
                <h2 className="text-2xl font-bold text-secondary-900 mt-0 mb-4">
                  Nasze zobowiązanie
                </h2>
                <p className="text-secondary-600 mb-6">
                  WBTrade zobowiązuje się do zapewnienia dostępności cyfrowej swojego serwisu 
                  zgodnie z przepisami ustawy z dnia 4 kwietnia 2019 r. o dostępności cyfrowej 
                  stron internetowych i aplikacji mobilnych podmiotów publicznych.
                </p>
                <p className="text-secondary-600 mb-6">
                  Dokładamy wszelkich starań, aby nasz serwis był dostępny dla wszystkich 
                  użytkowników, niezależnie od ich możliwości czy używanej technologii.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Status zgodności
                </h2>
                <p className="text-secondary-600 mb-6">
                  Serwis WBTrade jest częściowo zgodny z wytycznymi WCAG 2.1 na poziomie AA. 
                  Nieustannie pracujemy nad poprawą dostępności i usuwaniem barier.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Funkcje dostępności
                </h2>
                <p className="text-secondary-600 mb-4">
                  Nasz serwis zawiera następujące udogodnienia:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Możliwość nawigacji za pomocą klawiatury</li>
                  <li>Teksty alternatywne dla obrazów</li>
                  <li>Odpowiedni kontrast kolorów</li>
                  <li>Czytelna struktura nagłówków</li>
                  <li>Responsywny design dostosowany do różnych urządzeń</li>
                  <li>Możliwość powiększania tekstu bez utraty funkcjonalności</li>
                  <li>Widoczny fokus przy nawigacji klawiaturą</li>
                  <li>Etykiety dla pól formularzy</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Znane ograniczenia
                </h2>
                <p className="text-secondary-600 mb-4">
                  Pomimo naszych starań, niektóre elementy mogą nie być w pełni dostępne:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Niektóre starsze materiały graficzne mogą nie posiadać opisów alternatywnych</li>
                  <li>Część filmów może nie posiadać napisów</li>
                  <li>Niektóre dokumenty PDF mogą nie być w pełni dostępne</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Skróty klawiaturowe
                </h2>
                <p className="text-secondary-600 mb-4">
                  W serwisie można używać standardowych skrótów klawiaturowych:
                </p>
                <div className="bg-secondary-50 rounded-xl p-6 mb-6">
                  <ul className="list-none text-secondary-600 space-y-3">
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white rounded border border-secondary-300 font-mono text-sm">Tab</kbd>
                      <span>Przejście do następnego elementu interaktywnego</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white rounded border border-secondary-300 font-mono text-sm">Shift + Tab</kbd>
                      <span>Przejście do poprzedniego elementu</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white rounded border border-secondary-300 font-mono text-sm">Enter</kbd>
                      <span>Aktywacja linku lub przycisku</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <kbd className="px-3 py-1 bg-white rounded border border-secondary-300 font-mono text-sm">Esc</kbd>
                      <span>Zamknięcie okna modalnego lub menu</span>
                    </li>
                  </ul>
                </div>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Informacje zwrotne i dane kontaktowe
                </h2>
                <p className="text-secondary-600 mb-4">
                  Jeśli zauważysz problemy z dostępnością lub potrzebujesz informacji 
                  w alternatywnym formacie, skontaktuj się z nami:
                </p>
                <ul className="list-none text-secondary-600 mb-6 space-y-2">
                  <li>📧 E-mail: support@wb-partners.pl</li>
                  <li>📞 Telefon: +48 570 034 367</li>
                  <li>🏢 Adres: ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</li>
                </ul>
                <p className="text-secondary-600 mb-6">
                  Staramy się odpowiadać na zgłoszenia dotyczące dostępności w ciągu 7 dni roboczych.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Procedura skargowa
                </h2>
                <p className="text-secondary-600 mb-6">
                  W przypadku braku satysfakcjonującej odpowiedzi na zgłoszenie dotyczące 
                  dostępności, możesz złożyć skargę do Rzecznika Praw Obywatelskich 
                  (www.rpo.gov.pl).
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  Data sporządzenia deklaracji
                </h2>
                <p className="text-secondary-600 mb-2">
                  Deklaracja została sporządzona dnia: 18 grudnia 2025
                </p>
                <p className="text-secondary-600 mb-6">
                  Deklaracja została przygotowana na podstawie samooceny przeprowadzonej 
                  przez WB PARTNERS Sp. z o.o.
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
