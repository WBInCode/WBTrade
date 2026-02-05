'use client';

export default function CookiesPlainPage() {
  return (
    <div className="min-h-screen bg-secondary-900 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Polityka cookies</h1>
        <p className="text-secondary-400 mb-8">Ostatnia aktualizacja: 18 grudnia 2025</p>

        <div className="space-y-8 text-secondary-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Czym są pliki cookies?</h2>
            <p>
              Pliki cookies (ciasteczka) to małe pliki tekstowe, które są zapisywane na Twoim 
              urządzeniu podczas korzystania z naszego serwisu. Pozwalają one na rozpoznanie 
              Twojej przeglądarki i zapamiętanie określonych informacji.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Jakich plików cookies używamy?</h2>
            <p className="mb-4">W naszym serwisie wykorzystujemy następujące rodzaje plików cookies:</p>
            
            <h3 className="text-lg font-semibold text-secondary-200 mt-4 mb-2">Cookies niezbędne</h3>
            <p className="mb-3">
              Są konieczne do prawidłowego funkcjonowania serwisu. Umożliwiają poruszanie się 
              po stronie, korzystanie z koszyka zakupowego, logowanie do konta oraz realizację 
              zamówień. Bez tych plików serwis nie może działać prawidłowo.
            </p>

            <h3 className="text-lg font-semibold text-secondary-200 mt-4 mb-2">Cookies funkcjonalne</h3>
            <p className="mb-3">
              Pozwalają zapamiętać Twoje preferencje (np. język, region, rozmiar czcionki) 
              i dostosować serwis do Twoich indywidualnych potrzeb.
            </p>

            <h3 className="text-lg font-semibold text-secondary-200 mt-4 mb-2">Cookies analityczne</h3>
            <p className="mb-3">
              Pomagają nam zrozumieć, w jaki sposób użytkownicy korzystają z serwisu. 
              Zbierają anonimowe informacje o odwiedzanych stronach, czasie spędzonym 
              w serwisie i ewentualnych błędach.
            </p>

            <h3 className="text-lg font-semibold text-secondary-200 mt-4 mb-2">Cookies marketingowe</h3>
            <p>
              Służą do wyświetlania spersonalizowanych reklam oraz mierzenia skuteczności 
              kampanii marketingowych. Mogą być wykorzystywane przez naszych partnerów reklamowych.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Jak zarządzać plikami cookies?</h2>
            <p className="mb-3">Możesz kontrolować i zarządzać plikami cookies na kilka sposobów:</p>
            <ul className="list-disc pl-6 space-y-2">
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
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Cookies podmiotów trzecich</h2>
            <p className="mb-3">W naszym serwisie mogą być wykorzystywane pliki cookies następujących podmiotów:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Analytics – analityka ruchu na stronie</li>
              <li>Facebook Pixel – remarketing i analityka</li>
              <li>PayU / Przelewy24 – obsługa płatności</li>
              <li>Hotjar – analiza zachowań użytkowników</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Okres przechowywania</h2>
            <p className="mb-3">Pliki cookies mogą być przechowywane przez różny czas w zależności od ich rodzaju:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cookies sesyjne</strong> – usuwane po zamknięciu przeglądarki</li>
              <li><strong>Cookies trwałe</strong> – przechowywane od 30 dni do 2 lat</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Kontakt</h2>
            <p className="mb-3">W przypadku pytań dotyczących polityki cookies, prosimy o kontakt:</p>
            <ul className="space-y-1">
              <li>📧 E-mail: support@wb-partners.pl</li>
              <li>📞 Telefon: +48 570 034 367</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-secondary-700 text-center">
          <button 
            onClick={() => window.close()}
            className="text-orange-500 hover:text-orange-400 font-medium"
          >
            Zamknij okno
          </button>
        </div>
      </div>
    </div>
  );
}
