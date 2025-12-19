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
                    Niniejszy Regulamin określa zasady korzystania ze sklepu internetowego WBTrade 
                    dostępnego pod adresem www.wbtrade.pl (dalej: „Sklep").
                  </li>
                  <li>
                    Właścicielem i operatorem Sklepu jest WB PARTNERS Sp. z o.o. z siedzibą w Rzeszowie, 
                    ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów, NIP: 8133000000, REGON: 380000000, 
                    wpisana do rejestru przedsiębiorców KRS (dalej: „Sprzedawca").
                  </li>
                  <li>
                    Kontakt ze Sprzedawcą możliwy jest pod adresem e-mail: support@wb-partners.pl 
                    lub telefonicznie: +48 570 034 367 (pon.-pt. 9:00-17:00).
                  </li>
                  <li>
                    Korzystanie ze Sklepu oznacza akceptację niniejszego Regulaminu.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 2. Definicje
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 mb-6 space-y-3">
                  <li><strong>Klient</strong> – osoba fizyczna, prawna lub jednostka organizacyjna korzystająca ze Sklepu.</li>
                  <li><strong>Konsument</strong> – osoba fizyczna dokonująca zakupu niezwiązanego z działalnością gospodarczą.</li>
                  <li><strong>Konto</strong> – indywidualne konto Klienta w Sklepie.</li>
                  <li><strong>Produkt</strong> – towar dostępny w ofercie Sklepu.</li>
                  <li><strong>Zamówienie</strong> – oświadczenie woli Klienta zmierzające do zawarcia umowy sprzedaży.</li>
                  <li><strong>Koszyk</strong> – funkcjonalność Sklepu umożliwiająca gromadzenie wybranych Produktów.</li>
                </ul>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 3. Rejestracja i konto
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Rejestracja w Sklepie jest dobrowolna i bezpłatna.</li>
                  <li>
                    Do rejestracji wymagane jest podanie adresu e-mail oraz utworzenie hasła. 
                    Klient zobowiązany jest do podania prawdziwych danych.
                  </li>
                  <li>Klient odpowiada za zachowanie poufności hasła do swojego Konta.</li>
                  <li>Zakupy w Sklepie można dokonywać również bez rejestracji (jako gość).</li>
                  <li>
                    Sprzedawca może usunąć Konto w przypadku naruszenia Regulaminu lub przepisów prawa.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 4. Składanie zamówień
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Zamówienia można składać 24 godziny na dobę, 7 dni w tygodniu.</li>
                  <li>
                    W celu złożenia Zamówienia należy:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>dodać Produkt do Koszyka,</li>
                      <li>wybrać sposób dostawy i płatności,</li>
                      <li>podać dane do wysyłki,</li>
                      <li>potwierdzić Zamówienie.</li>
                    </ul>
                  </li>
                  <li>
                    Złożenie Zamówienia stanowi ofertę zawarcia umowy sprzedaży. 
                    Umowa zostaje zawarta z chwilą potwierdzenia przyjęcia Zamówienia przez Sprzedawcę.
                  </li>
                  <li>
                    Potwierdzenie Zamówienia wysyłane jest na adres e-mail podany przez Klienta.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 5. Ceny i płatności
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Ceny Produktów podane są w złotych polskich i zawierają podatek VAT.</li>
                  <li>Cena podana przy Produkcie jest wiążąca w chwili składania Zamówienia.</li>
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
                    W przypadku płatności przelewem tradycyjnym, Zamówienie realizowane jest 
                    po zaksięgowaniu wpłaty na koncie Sprzedawcy.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 6. Dostawa
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>Dostawa realizowana jest na terenie Polski.</li>
                  <li>
                    Dostępne metody dostawy: kurier (DPD, DHL), Paczkomaty InPost, odbiór osobisty.
                  </li>
                  <li>Koszty dostawy podawane są podczas składania Zamówienia.</li>
                  <li>
                    Czas realizacji Zamówienia wynosi od 1 do 5 dni roboczych od momentu 
                    potwierdzenia płatności.
                  </li>
                  <li>
                    Klient zobowiązany jest do sprawdzenia stanu przesyłki przy odbiorze. 
                    W przypadku uszkodzenia należy sporządzić protokół szkody.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 7. Odstąpienie od umowy
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Konsument ma prawo odstąpić od umowy w terminie 14 dni kalendarzowych 
                    od dnia otrzymania Produktu, bez podania przyczyny.
                  </li>
                  <li>
                    W celu odstąpienia od umowy należy złożyć oświadczenie (formularz dostępny w Sklepie 
                    lub w formie dowolnej) i odesłać Produkt na adres Sprzedawcy.
                  </li>
                  <li>Produkt powinien być zwrócony w stanie nienaruszonym, kompletny.</li>
                  <li>
                    Sprzedawca zwróci wszystkie otrzymane płatności (w tym koszty dostawy) 
                    w terminie 14 dni od otrzymania oświadczenia o odstąpieniu.
                  </li>
                  <li>Koszty odesłania Produktu ponosi Konsument.</li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 8. Reklamacje
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Sprzedawca odpowiada za wady Produktu na podstawie przepisów o rękojmi 
                    (art. 556 i nast. Kodeksu cywilnego).
                  </li>
                  <li>
                    Reklamację można złożyć drogą elektroniczną (e-mail) lub pisemnie na adres Sprzedawcy.
                  </li>
                  <li>
                    Reklamacja powinna zawierać: dane Klienta, numer Zamówienia, opis wady, 
                    żądanie (naprawa, wymiana, obniżenie ceny lub odstąpienie od umowy).
                  </li>
                  <li>
                    Sprzedawca rozpatrzy reklamację w terminie 14 dni kalendarzowych od jej otrzymania.
                  </li>
                  <li>
                    W przypadku uznania reklamacji, Sprzedawca pokrywa koszty zwrotu Produktu.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 9. Ochrona danych osobowych
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Administratorem danych osobowych jest WB PARTNERS Sp. z o.o.
                  </li>
                  <li>
                    Dane osobowe przetwarzane są zgodnie z RODO oraz ustawą o ochronie danych osobowych.
                  </li>
                  <li>
                    Szczegółowe informacje zawarte są w Polityce Prywatności dostępnej w Sklepie.
                  </li>
                </ol>

                <h2 className="text-2xl font-bold text-secondary-900 mt-10 mb-4">
                  § 10. Własność intelektualna
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 mb-6 space-y-3">
                  <li>
                    Wszystkie treści dostępne w Sklepie (teksty, grafiki, zdjęcia, logotypy) 
                    są własnością Sprzedawcy lub wykorzystywane na podstawie licencji.
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
                    Sprzedawca zastrzega sobie prawo do zmiany Regulaminu. Zmiany wchodzą w życie 
                    z dniem publikacji w Sklepie.
                  </li>
                  <li>
                    Do Zamówień złożonych przed zmianą Regulaminu stosuje się Regulamin obowiązujący 
                    w dniu złożenia Zamówienia.
                  </li>
                  <li>
                    W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego.
                  </li>
                  <li>
                    Ewentualne spory rozstrzygane będą przez sąd właściwy dla siedziby Sprzedawcy, 
                    z zastrzeżeniem przepisów chroniących Konsumentów.
                  </li>
                  <li>
                    Konsument ma możliwość skorzystania z pozasądowych sposobów rozpatrywania reklamacji 
                    i dochodzenia roszczeń, w tym z platformy ODR: 
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
