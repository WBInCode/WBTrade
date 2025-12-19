import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Polityka prywatności - WBTrade',
  description: 'Polityka prywatności i ochrony danych osobowych w WBTrade',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-secondary-200 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900">
              Polityka prywatności
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
                  1. Informacje ogólne
                </h2>
                <p className="text-secondary-600 mb-6">
                  Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych 
                  przekazanych przez Użytkowników w związku z korzystaniem z serwisu WBTrade.
                </p>
                <p className="text-secondary-600 mb-6">
                  Administratorem danych osobowych jest WB PARTNERS Sp. z o.o. z siedzibą w Rzeszowie, 
                  ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów, wpisana do rejestru przedsiębiorców 
                  Krajowego Rejestru Sądowego, NIP: 8133000000, REGON: 380000000.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  2. Zakres zbieranych danych
                </h2>
                <p className="text-secondary-600 mb-4">
                  Zbieramy następujące dane osobowe:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Imię i nazwisko</li>
                  <li>Adres e-mail</li>
                  <li>Numer telefonu</li>
                  <li>Adres dostawy</li>
                  <li>Dane rozliczeniowe (w przypadku faktur)</li>
                  <li>Historia zamówień</li>
                  <li>Dane dotyczące aktywności w serwisie</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  3. Cel przetwarzania danych
                </h2>
                <p className="text-secondary-600 mb-4">
                  Dane osobowe przetwarzane są w celu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Realizacji zamówień i umów sprzedaży</li>
                  <li>Obsługi reklamacji i zwrotów</li>
                  <li>Kontaktu z klientem w sprawach związanych z zamówieniem</li>
                  <li>Wysyłki newslettera (za zgodą użytkownika)</li>
                  <li>Prowadzenia analiz i statystyk</li>
                  <li>Wypełnienia obowiązków prawnych (np. podatkowych)</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  4. Podstawa prawna przetwarzania
                </h2>
                <p className="text-secondary-600 mb-4">
                  Przetwarzamy dane osobowe na podstawie:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Art. 6 ust. 1 lit. a RODO – zgoda użytkownika</li>
                  <li>Art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy</li>
                  <li>Art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego</li>
                  <li>Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes administratora</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  5. Okres przechowywania danych
                </h2>
                <p className="text-secondary-600 mb-6">
                  Dane osobowe przechowywane są przez okres niezbędny do realizacji celów, dla których 
                  zostały zebrane, a następnie przez okres wymagany przepisami prawa (np. przepisami 
                  podatkowymi - 5 lat od końca roku, w którym powstał obowiązek podatkowy). 
                  Dane przetwarzane na podstawie zgody przechowujemy do momentu jej wycofania.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  6. Prawa użytkownika
                </h2>
                <p className="text-secondary-600 mb-4">
                  Każdy użytkownik ma prawo do:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Dostępu do swoich danych osobowych</li>
                  <li>Sprostowania nieprawidłowych danych</li>
                  <li>Usunięcia danych („prawo do bycia zapomnianym")</li>
                  <li>Ograniczenia przetwarzania</li>
                  <li>Przenoszenia danych</li>
                  <li>Sprzeciwu wobec przetwarzania</li>
                  <li>Wycofania zgody w dowolnym momencie</li>
                  <li>Wniesienia skargi do organu nadzorczego (UODO)</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  7. Odbiorcy danych
                </h2>
                <p className="text-secondary-600 mb-4">
                  Dane osobowe mogą być przekazywane następującym podmiotom:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Firmom kurierskim i pocztowym (w celu dostawy zamówień)</li>
                  <li>Operatorom płatności (w celu realizacji płatności)</li>
                  <li>Dostawcom usług IT i hostingu</li>
                  <li>Biurom rachunkowym i kancelariom prawnym</li>
                  <li>Organom państwowym (na podstawie przepisów prawa)</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  8. Pliki cookies
                </h2>
                <p className="text-secondary-600 mb-4">
                  Serwis wykorzystuje pliki cookies w celu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-2">
                  <li>Utrzymania sesji użytkownika</li>
                  <li>Zapamiętania zawartości koszyka</li>
                  <li>Prowadzenia analiz statystycznych</li>
                  <li>Personalizacji treści i reklam</li>
                </ul>
                <p className="text-secondary-600 mb-6">
                  Użytkownik może w każdej chwili zmienić ustawienia przeglądarki dotyczące cookies. 
                  Szczegółowe informacje znajdują się w ustawieniach przeglądarki internetowej.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  9. Bezpieczeństwo danych
                </h2>
                <p className="text-secondary-600 mb-6">
                  Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych 
                  przed nieuprawnionym dostępem, utratą lub zniszczeniem. Wykorzystujemy szyfrowanie SSL, 
                  kontrolę dostępu oraz regularne kopie zapasowe.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  10. Kontakt
                </h2>
                <p className="text-secondary-600 mb-4">
                  W sprawach związanych z ochroną danych osobowych można kontaktować się:
                </p>
                <ul className="list-none text-secondary-600 mb-6 space-y-2">
                  <li><strong>E-mail:</strong> support@wb-partners.pl</li>
                  <li><strong>Telefon:</strong> +48 570 034 367</li>
                  <li><strong>Adres:</strong> WB PARTNERS Sp. z o.o., ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  11. Zmiany polityki prywatności
                </h2>
                <p className="text-secondary-600 mb-6">
                  Administrator zastrzega sobie prawo do wprowadzania zmian w Polityce Prywatności. 
                  O wszelkich zmianach użytkownicy będą informowani poprzez publikację nowej wersji 
                  na stronie internetowej. Korzystanie z serwisu po wprowadzeniu zmian oznacza ich akceptację.
                </p>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
