import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Polityka prywatności - WB Trade',
  description: 'Polityka prywatności i ochrony danych osobowych w WB Trade',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />

      {/* Hero Section */}
      <section className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900 dark:text-white">
              Polityka prywatności
            </h1>
            <p className="text-secondary-500 dark:text-secondary-400">
              Ostatnia aktualizacja: 18 grudnia 2025
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
                  1. Informacje ogólne
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Niniejsza Polityka Prywatności określa zasady przetwarzania i&nbsp;ochrony danych osobowych
                  przekazanych przez Użytkowników w&nbsp;związku z&nbsp;korzystaniem z&nbsp;serwisu wb-trade.pl („Sklep").
                </p>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Administratorem danych osobowych jest WB&nbsp;Partners Sp.&nbsp;z&nbsp;o.o. z&nbsp;siedzibą w&nbsp;Rzeszowie pod ul.&nbsp;Juliusza
                  Słowackiego 24/11, 35-060 Rzeszów, wpisana do&nbsp;rejestru przedsiębiorców KRS pod numerem
                  0001151642, NIP:&nbsp;5170455185, REGON:&nbsp;540735769.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  2. Zakres zbieranych danych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Zbieramy następujące dane osobowe:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Imię i nazwisko</li>
                  <li>Adres e-mail</li>
                  <li>Numer telefonu</li>
                  <li>Adres dostawy</li>
                  <li>Dane rozliczeniowe</li>
                  <li>Dane do faktury</li>
                  <li>Dane zamówień</li>
                  <li>Dane techniczne i analityczne</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  3. Źródło danych osobowych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Dane osobowe pozyskujemy bezpośrednio od&nbsp;Ciebie, w&nbsp;szczególności podczas: rejestracji konta,
                  składania zamówienia, wypełniania formularzy kontaktowych, zapisu do&nbsp;newslettera oraz w&nbsp;trakcie
                  kontaktu z&nbsp;Biurem Obsługi Klienta. Dodatkowo, po&nbsp;wyrażeniu zgody na&nbsp;pliki cookies, możemy
                  pozyskiwać dane z&nbsp;urządzenia i&nbsp;przeglądarki (np.&nbsp;identyfikatory cookies, adres IP, informacje o&nbsp;aktywności
                  w&nbsp;Sklepie) w&nbsp;związku z&nbsp;korzystaniem z&nbsp;narzędzi analitycznych i&nbsp;marketingowych.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  4. Cel przetwarzania danych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Dane osobowe przetwarzane są w celu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Realizacji zamówień i umów sprzedaży</li>
                  <li>Obsługi konta użytkownika (jeżeli zostało założone)</li>
                  <li>Obsługi zwrotów i reklamacji</li>
                  <li>Kontaktu z klientem w sprawach zamówienia, zwrotu lub reklamacji</li>
                  <li>Prowadzenia analiz i statystyk</li>
                  <li>Marketingu bezpośredniego – na podstawie prawnie uzasadnionego interesu</li>
                  <li>Wysyłki newslettera – wyłącznie na podstawie zgody użytkownika</li>
                  <li>Wypełnienia obowiązków prawnych (np. podatkowych/księgowych)</li>
                  <li>Ustalenia, dochodzenia i obrony roszczeń</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  5. Podstawa prawna przetwarzania
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Przetwarzamy dane osobowe na podstawie:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Art. 6 ust. 1 lit. a RODO – zgoda użytkownika</li>
                  <li>Art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy</li>
                  <li>Art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego</li>
                  <li>Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes administratora</li>
                </ul>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Szczegółowe cele i&nbsp;przypisane im podstawy prawne wskazujemy w&nbsp;dokumencie „RODO" dostępnym
                  w&nbsp;Sklepie.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  6. Okres przechowywania danych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Dane osobowe przechowywane są przez okres niezbędny do&nbsp;realizacji celów, dla których zostały
                  zebrane, a&nbsp;następnie przez okres wymagany przepisami prawa (np.&nbsp;przepisami podatkowymi – 5&nbsp;lat od&nbsp;końca
                  roku, w&nbsp;którym powstał obowiązek podatkowy). Dane przetwarzane na&nbsp;podstawie zgody
                  przechowujemy do&nbsp;momentu jej wycofania.
                </p>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Szczegółowe informacje o&nbsp;okresie przechowywania danych wskazujemy w&nbsp;dokumencie „RODO"
                  dostępnym w&nbsp;Sklepie.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  7. Prawa użytkownika
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Każdy użytkownik ma prawo do:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Dostępu do swoich danych osobowych</li>
                  <li>Sprostowania nieprawdziwych danych</li>
                  <li>Usunięcia danych („prawo do bycia zapomnianym")</li>
                  <li>Ograniczenia przetwarzania</li>
                  <li>Przenoszenia danych</li>
                  <li>Sprzeciwu wobec przetwarzania</li>
                  <li>Wycofania zgody w dowolnym momencie</li>
                  <li>Wniesienia skargi do organu nadzorczego (UODO)</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  8. Odbiorcy danych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Dane osobowe mogą być przekazywane następującym podmiotom:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Firmom kurierskim i pocztowym (w celu dostawy zamówień)</li>
                  <li>Operatorom płatności (w celu realizacji płatności)</li>
                  <li>Dostawcom usług IT i hostingu</li>
                  <li>Biurom rachunkowym i kancelariom prawnym</li>
                  <li>Organom państwowym (na podstawie przepisów prawa)</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  9. Pliki cookies
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Serwis wykorzystuje pliki cookies w celu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li>Utrzymania sesji użytkownika</li>
                  <li>Zapamiętania zawartości koszyka</li>
                  <li>Prowadzenia analiz statystycznych</li>
                  <li>Personalizacji treści i reklam</li>
                </ul>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Użytkownik może w każdej chwili zmienić ustawienia przeglądarki dotyczące cookies.
                  Szczegółowe informacje znajdują się w ustawieniach przeglądarki internetowej.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  10. Bezpieczeństwo danych
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Stosujemy odpowiednie środki techniczne i&nbsp;organizacyjne w&nbsp;celu ochrony danych osobowych
                  przed nieuprawnionym dostępem, utratą lub zniszczeniem. Wykorzystujemy szyfrowanie SSL,
                  kontrolę dostępu oraz&nbsp;regularne kopie zapasowe.
                </p>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  11. Kontakt
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  W sprawach związanych z ochroną danych osobowych można kontaktować się:
                </p>
                <ul className="list-none text-secondary-600 dark:text-secondary-400 mb-6 space-y-2">
                  <li><strong>E-mail:</strong> support@wb-partners.pl</li>
                  <li><strong>Telefon:</strong> +48 570 034 367</li>
                  <li><strong>Adres:</strong> WB Partners Sp. z o.o., ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mt-10 mb-4">
                  12. Zmiany polityki prywatności
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Administrator zastrzega sobie prawo do wprowadzania zmian w Polityce Prywatności. O wszelkich
                  zmianach użytkownicy będą informowani poprzez publikację nowej wersji na stronie internetowej.
                  Korzystanie z serwisu po wprowadzeniu zmian oznacza ich akceptację.
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
