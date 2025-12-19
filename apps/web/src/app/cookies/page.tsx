import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Polityka cookies - WBTrade',
  description: 'Polityka plików cookies w serwisie WBTrade',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-secondary-200 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900">
              Polityka cookies
            </h1>
            <p className="text-secondary-500">
              Ostatnia aktualizacja: 18 grudnia 2025
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
                  1. Czym są pliki cookies?
                </h2>
                <p className="text-secondary-600 mb-6">
                  Pliki cookies (ciasteczka) to małe pliki tekstowe, które są zapisywane na Twoim 
                  urządzeniu podczas korzystania z naszego serwisu. Pozwalają one na rozpoznanie 
                  Twojej przeglądarki i zapamiętanie określonych informacji.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  2. Jakich plików cookies używamy?
                </h2>
                <p className="text-secondary-600 mb-4">
                  W naszym serwisie wykorzystujemy następujące rodzaje plików cookies:
                </p>
                
                <h3 className="text-xl font-semibold text-secondary-800 mt-6 mb-3">
                  Cookies niezbędne
                </h3>
                <p className="text-secondary-600 mb-4">
                  Są konieczne do prawidłowego funkcjonowania serwisu. Umożliwiają poruszanie się 
                  po stronie, korzystanie z koszyka zakupowego, logowanie do konta oraz realizację 
                  zamówień. Bez tych plików serwis nie może działać prawidłowo.
                </p>

                <h3 className="text-xl font-semibold text-secondary-800 mt-6 mb-3">
                  Cookies funkcjonalne
                </h3>
                <p className="text-secondary-600 mb-4">
                  Pozwalają zapamiętać Twoje preferencje (np. język, region, rozmiar czcionki) 
                  i dostosować serwis do Twoich indywidualnych potrzeb.
                </p>

                <h3 className="text-xl font-semibold text-secondary-800 mt-6 mb-3">
                  Cookies analityczne
                </h3>
                <p className="text-secondary-600 mb-4">
                  Pomagają nam zrozumieć, w jaki sposób użytkownicy korzystają z serwisu. 
                  Zbierają anonimowe informacje o odwiedzanych stronach, czasie spędzonym 
                  w serwisie i ewentualnych błędach.
                </p>

                <h3 className="text-xl font-semibold text-secondary-800 mt-6 mb-3">
                  Cookies marketingowe
                </h3>
                <p className="text-secondary-600 mb-6">
                  Służą do wyświetlania spersonalizowanych reklam oraz mierzenia skuteczności 
                  kampanii marketingowych. Mogą być wykorzystywane przez naszych partnerów reklamowych.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  3. Jak zarządzać plikami cookies?
                </h2>
                <p className="text-secondary-600 mb-4">
                  Możesz kontrolować i zarządzać plikami cookies na kilka sposobów:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>
                    <strong>Ustawienia przeglądarki</strong> – większość przeglądarek pozwala 
                    na blokowanie lub usuwanie plików cookies w ustawieniach.
                  </li>
                  <li>
                    <strong>Panel preferencji cookies</strong> – możesz zmienić swoje preferencje 
                    klikając przycisk „Ustawienia cookies" w stopce strony.
                  </li>
                  <li>
                    <strong>Tryb prywatny</strong> – korzystanie z trybu incognito/prywatnego 
                    w przeglądarce ogranicza zapisywanie plików cookies.
                  </li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  4. Cookies podmiotów trzecich
                </h2>
                <p className="text-secondary-600 mb-4">
                  W naszym serwisie mogą być wykorzystywane pliki cookies następujących podmiotów:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Google Analytics – analityka ruchu na stronie</li>
                  <li>Facebook Pixel – remarketing i analityka</li>
                  <li>PayU / Przelewy24 – obsługa płatności</li>
                  <li>Hotjar – analiza zachowań użytkowników</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  5. Okres przechowywania
                </h2>
                <p className="text-secondary-600 mb-6">
                  Pliki cookies mogą być przechowywane przez różny czas w zależności od ich rodzaju:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li><strong>Cookies sesyjne</strong> – usuwane po zamknięciu przeglądarki</li>
                  <li><strong>Cookies trwałe</strong> – przechowywane od 30 dni do 2 lat</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  6. Kontakt
                </h2>
                <p className="text-secondary-600 mb-6">
                  W przypadku pytań dotyczących polityki cookies, prosimy o kontakt:
                </p>
                <ul className="list-none text-secondary-600 mb-6 space-y-2">
                  <li>📧 E-mail: support@wb-partners.pl</li>
                  <li>📞 Telefon: +48 570 034 367</li>
                </ul>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer hideTrustBadges />
    </div>
  );
}
