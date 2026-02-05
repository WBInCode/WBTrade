'use client';

export default function PrivacyPlainPage() {
  return (
    <div className="min-h-screen bg-secondary-900 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Polityka prywatności</h1>
        <p className="text-secondary-400 mb-8">Ostatnia aktualizacja: 18 grudnia 2025</p>

        <div className="space-y-8 text-secondary-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Informacje ogólne</h2>
            <p className="mb-3">
              Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych 
              przekazanych przez Użytkowników w związku z korzystaniem z serwisu WB Trade.
            </p>
            <p>
              Administratorem danych osobowych jest WB PARTNERS Sp. z o.o. z siedzibą w Rzeszowie, 
              ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów, wpisana do rejestru przedsiębiorców 
              KRS pod numerem 0001151642, NIP: 5170455185, REGON: 540735769.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Zakres zbieranych danych</h2>
            <p className="mb-3">Zbieramy następujące dane osobowe:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Imię i nazwisko</li>
              <li>Adres e-mail</li>
              <li>Numer telefonu</li>
              <li>Adres dostawy</li>
              <li>Dane rozliczeniowe (w przypadku faktur)</li>
              <li>Historia zamówień</li>
              <li>Dane dotyczące aktywności w serwisie</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Cel przetwarzania danych</h2>
            <p className="mb-3">Dane osobowe przetwarzane są w celu:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Realizacji zamówień i umów sprzedaży</li>
              <li>Obsługi reklamacji i zwrotów</li>
              <li>Kontaktu z klientem w sprawach związanych z zamówieniem</li>
              <li>Wysyłki newslettera (za zgodą użytkownika)</li>
              <li>Prowadzenia analiz i statystyk</li>
              <li>Wypełnienia obowiązków prawnych (np. podatkowych)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Podstawa prawna przetwarzania</h2>
            <p className="mb-3">Przetwarzamy dane osobowe na podstawie:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Art. 6 ust. 1 lit. a RODO – zgoda użytkownika</li>
              <li>Art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy</li>
              <li>Art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego</li>
              <li>Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes administratora</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Okres przechowywania danych</h2>
            <p>
              Dane osobowe przechowywane są przez okres niezbędny do realizacji celów, dla których 
              zostały zebrane, a następnie przez okres wymagany przepisami prawa (np. przepisami 
              podatkowymi – 5 lat od końca roku, w którym powstał obowiązek podatkowy). 
              Dane przetwarzane na podstawie zgody przechowujemy do momentu jej wycofania.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Prawa użytkownika</h2>
            <p className="mb-3">Każdy użytkownik ma prawo do:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dostępu do swoich danych osobowych</li>
              <li>Sprostowania nieprawidłowych danych</li>
              <li>Usunięcia danych („prawo do bycia zapomnianym")</li>
              <li>Ograniczenia przetwarzania</li>
              <li>Przenoszenia danych</li>
              <li>Sprzeciwu wobec przetwarzania</li>
              <li>Wycofania zgody w dowolnym momencie</li>
              <li>Wniesienia skargi do organu nadzorczego (UODO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Odbiorcy danych</h2>
            <p className="mb-3">Dane osobowe mogą być przekazywane następującym podmiotom:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Firmom kurierskim i pocztowym (w celu dostawy zamówień)</li>
              <li>Operatorom płatności (w celu realizacji płatności)</li>
              <li>Dostawcom usług IT i hostingu</li>
              <li>Biurom rachunkowym i kancelariom prawnym</li>
              <li>Organom państwowym (na podstawie przepisów prawa)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Pliki cookies</h2>
            <p className="mb-3">Serwis wykorzystuje pliki cookies w celu:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Utrzymania sesji użytkownika</li>
              <li>Zapamiętania zawartości koszyka</li>
              <li>Prowadzenia analiz statystycznych</li>
              <li>Personalizacji treści i reklam</li>
            </ul>
            <p className="mt-3">
              Użytkownik może w każdej chwili zmienić ustawienia przeglądarki dotyczące cookies. 
              Szczegółowe informacje znajdują się w ustawieniach przeglądarki internetowej.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Bezpieczeństwo danych</h2>
            <p>
              Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych 
              przed nieuprawnionym dostępem, utratą lub zniszczeniem. Wykorzystujemy szyfrowanie SSL, 
              kontrolę dostępu oraz regularne kopie zapasowe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Kontakt</h2>
            <p className="mb-3">W sprawach związanych z ochroną danych osobowych można kontaktować się:</p>
            <ul className="space-y-1">
              <li><strong>E-mail:</strong> support@wb-partners.pl</li>
              <li><strong>Telefon:</strong> +48 570 034 367</li>
              <li><strong>Adres:</strong> WB PARTNERS Sp. z o.o., ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Zmiany polityki prywatności</h2>
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w Polityce Prywatności. 
              O wszelkich zmianach użytkownicy będą informowani poprzez publikację nowej wersji 
              na stronie internetowej. Korzystanie z serwisu po wprowadzeniu zmian oznacza ich akceptację.
            </p>
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
