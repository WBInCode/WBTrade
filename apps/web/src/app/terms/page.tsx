import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Regulamin - WBTrade',
  description: 'Regulamin sklepu internetowego WBTrade - zasady korzystania z serwisu',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-secondary-200 py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-secondary-900">
              Regulamin
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
                  § 1. Postanowienia ogólne
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Niniejszy Regulamin określa zasady korzystania ze&nbsp;sklepu internetowego WBTrade 
                    dostępnego pod adresem www.wbtrade.pl (dalej: „Sklep").
                  </li>
                  <li>
                    Właścicielem i&nbsp;operatorem Sklepu jest WB&nbsp;PARTNERS Sp.&nbsp;z&nbsp;o.o. z&nbsp;siedzibą w&nbsp;Rzeszowie, 
                    ul.&nbsp;Juliusza Słowackiego 24/11, 35-060 Rzeszów, NIP:&nbsp;5170455185, REGON:&nbsp;540735769, 
                    wpisana do&nbsp;rejestru przedsiębiorców KRS pod numerem 0001151642 (dalej: „Sprzedawca").
                  </li>
                  <li>
                    Kontakt ze&nbsp;Sprzedawcą możliwy jest pod adresem e-mail: support@wb-partners.pl 
                    lub telefonicznie: +48&nbsp;570&nbsp;028&nbsp;761 (pon.–pt. 9:00–17:00).
                  </li>
                  <li>
                    Korzystanie ze Sklepu oznacza akceptację niniejszego Regulaminu.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 2. Definicje
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-3">
                  <li><strong>Klient</strong> – osoba fizyczna, prawna lub jednostka organizacyjna korzystająca ze&nbsp;Sklepu.</li>
                  <li><strong>Konsument</strong> – osoba fizyczna dokonująca zakupu niezwiązanego z&nbsp;działalnością gospodarczą.</li>
                  <li><strong>Konto</strong> – indywidualne konto Klienta w&nbsp;Sklepie.</li>
                  <li><strong>Produkt</strong> – towar dostępny w&nbsp;ofercie Sklepu.</li>
                  <li><strong>Zamówienie</strong> – oświadczenie woli Klienta zmierzające do&nbsp;zawarcia umowy sprzedaży.</li>
                  <li><strong>Koszyk</strong> – funkcjonalność Sklepu umożliwiająca gromadzenie wybranych Produktów.</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 3. Rejestracja i konto
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Rejestracja w&nbsp;Sklepie jest dobrowolna i&nbsp;bezpłatna.</li>
                  <li>
                    Do&nbsp;rejestracji wymagane jest podanie adresu e-mail oraz&nbsp;utworzenie hasła. 
                    Klient zobowiązany jest do&nbsp;podania prawdziwych danych.
                  </li>
                  <li>Klient odpowiada za&nbsp;zachowanie poufności hasła do&nbsp;swojego Konta.</li>
                  <li>Zakupy w&nbsp;Sklepie można dokonywać również bez rejestracji (jako gość).</li>
                  <li>
                    Sprzedawca może usunąć Konto w&nbsp;przypadku naruszenia Regulaminu lub przepisów prawa.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 4. Składanie zamówień
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Zamówienia można składać 24&nbsp;godziny na&nbsp;dobę, 7&nbsp;dni w&nbsp;tygodniu.</li>
                  <li>
                    W&nbsp;celu złożenia Zamówienia należy:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>dodać Produkt do&nbsp;Koszyka,</li>
                      <li>wybrać sposób dostawy i&nbsp;płatności,</li>
                      <li>podać dane do&nbsp;wysyłki,</li>
                      <li>potwierdzić Zamówienie.</li>
                    </ul>
                  </li>
                  <li>
                    Złożenie Zamówienia stanowi ofertę zawarcia umowy sprzedaży. 
                    Umowa zostaje zawarta z&nbsp;chwilą potwierdzenia przyjęcia Zamówienia przez Sprzedawcę.
                  </li>
                  <li>
                    Potwierdzenie Zamówienia wysyłane jest na&nbsp;adres e-mail podany przez Klienta.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 5. Ceny i płatności
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Ceny Produktów podane są w&nbsp;złotych polskich i&nbsp;zawierają podatek VAT.</li>
                  <li>Cena podana przy Produkcie jest wiążąca w&nbsp;chwili składania Zamówienia.</li>
                  <li>
                    Dostępne metody płatności:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>karty płatnicze (Visa, Mastercard),</li>
                      <li>BLIK,</li>
                      <li>szybkie przelewy online,</li>
                      <li>przelew tradycyjny,</li>
                      <li>płatność przy odbiorze (dla wybranych zamówień).</li>
                    </ul>
                  </li>
                  <li>
                    W&nbsp;przypadku płatności przelewem tradycyjnym, Zamówienie realizowane jest 
                    po&nbsp;zaksięgowaniu wpłaty na&nbsp;koncie Sprzedawcy.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 6. Dostawa
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Dostawa realizowana jest na&nbsp;terenie Polski.</li>
                  <li>
                    Dostępne metody dostawy: Kurier InPost, Paczkomaty InPost, wysyłka gabaryt.
                  </li>
                  <li>Koszty dostawy podawane są podczas składania Zamówienia.</li>
                  <li>
                    Czas realizacji Zamówienia wynosi od&nbsp;1 do&nbsp;5 dni roboczych od&nbsp;momentu 
                    potwierdzenia płatności.
                  </li>
                  <li>
                    Klient zobowiązany jest do&nbsp;sprawdzenia stanu przesyłki przy odbiorze. 
                    W&nbsp;przypadku uszkodzenia należy sporządzić protokół szkody.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 7. Odstąpienie od umowy
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Konsument ma prawo odstąpić od&nbsp;umowy w&nbsp;terminie 14&nbsp;dni kalendarzowych 
                    od&nbsp;dnia otrzymania Produktu, bez podania przyczyny.
                  </li>
                  <li>
                    W&nbsp;celu odstąpienia od&nbsp;umowy należy złożyć oświadczenie (formularz dostępny w&nbsp;Sklepie 
                    lub w&nbsp;formie dowolnej) i&nbsp;odesłać Produkt na&nbsp;adres Sprzedawcy.
                  </li>
                  <li>Produkt powinien być zwrócony w&nbsp;stanie nienaruszonym, kompletny.</li>
                  <li>
                    Sprzedawca zwróci wszystkie otrzymane płatności (w&nbsp;tym koszty dostawy) 
                    w&nbsp;terminie 14&nbsp;dni od&nbsp;otrzymania oświadczenia o&nbsp;odstąpieniu.
                  </li>
                  <li>Koszty odesłania Produktu ponosi Konsument.</li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 8. Reklamacje
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Sprzedawca odpowiada za&nbsp;wady Produktu na&nbsp;podstawie przepisów o&nbsp;rękojmi 
                    (art.&nbsp;556 i&nbsp;nast. Kodeksu cywilnego).
                  </li>
                  <li>
                    Reklamację można złożyć drogą elektroniczną (e-mail) lub pisemnie na&nbsp;adres Sprzedawcy.
                  </li>
                  <li>
                    Reklamacja powinna zawierać: dane Klienta, numer Zamówienia, opis wady, 
                    żądanie (naprawa, wymiana, obniżenie ceny lub odstąpienie od&nbsp;umowy).
                  </li>
                  <li>
                    Sprzedawca rozpatrzy reklamację w&nbsp;terminie 14&nbsp;dni kalendarzowych od&nbsp;jej otrzymania.
                  </li>
                  <li>
                    W&nbsp;przypadku uznania reklamacji, Sprzedawca pokrywa koszty zwrotu Produktu.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 9. Ochrona danych osobowych
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Administratorem danych osobowych jest WB&nbsp;PARTNERS Sp.&nbsp;z&nbsp;o.o.
                  </li>
                  <li>
                    Dane osobowe przetwarzane są zgodnie z&nbsp;RODO oraz&nbsp;ustawą o&nbsp;ochronie danych osobowych.
                  </li>
                  <li>
                    Szczegółowe informacje zawarte są w&nbsp;Polityce Prywatności dostępnej w&nbsp;Sklepie.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 10. Własność intelektualna
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Wszystkie treści dostępne w&nbsp;Sklepie (teksty, grafiki, zdjęcia, logotypy) 
                    są własnością Sprzedawcy lub wykorzystywane na&nbsp;podstawie licencji.
                  </li>
                  <li>
                    Kopiowanie, rozpowszechnianie lub wykorzystywanie treści bez zgody Sprzedawcy jest zabronione.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 11. Postanowienia końcowe
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Sprzedawca zastrzega sobie prawo do&nbsp;zmiany Regulaminu. Zmiany wchodzą w&nbsp;życie 
                    z&nbsp;dniem publikacji w&nbsp;Sklepie.
                  </li>
                  <li>
                    Do&nbsp;Zamówień złożonych przed zmianą Regulaminu stosuje się Regulamin obowiązujący 
                    w&nbsp;dniu złożenia Zamówienia.
                  </li>
                  <li>
                    W&nbsp;sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego.
                  </li>
                  <li>
                    Ewentualne spory rozstrzygane będą przez sąd właściwy dla siedziby Sprzedawcy, 
                    z&nbsp;zastrzeżeniem przepisów chroniących Konsumentów.
                  </li>
                  <li>
                    Konsument ma możliwość skorzystania z&nbsp;pozasądowych sposobów rozpatrywania reklamacji 
                    i&nbsp;dochodzenia roszczeń, w&nbsp;tym z&nbsp;platformy ODR: 
                    <a href="https://ec.europa.eu/consumers/odr" className="text-primary-600 hover:underline ml-1">
                      https://ec.europa.eu/consumers/odr
                    </a>
                  </li>
                </ol>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
