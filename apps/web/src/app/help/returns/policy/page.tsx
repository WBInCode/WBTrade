import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Polityka zwrotów - Centrum pomocy - WBTrade',
  description: 'Zasady zwrotów towarów w WBTrade',
};

export default function ReturnsPolicyPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      <main className="py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-secondary-500 mb-8">
            <Link href="/" className="hover:text-primary-600">Strona główna</Link>
            <span>/</span>
            <Link href="/help" className="hover:text-primary-600">Centrum pomocy</Link>
            <span>/</span>
            <span className="text-secondary-900">Polityka zwrotów</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Polityka zwrotów
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  W WBTrade masz prawo do zwrotu zakupionego towaru w ciągu 14 dni bez podania przyczyny. Poniżej znajdziesz szczegółowe informacje o naszej polityce zwrotów.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Prawo do odstąpienia od umowy
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-green-800 mb-2">✅ 14 dni na zwrot</h3>
                  <p className="text-green-700">
                    Masz 14 dni kalendarzowych od dnia otrzymania przesyłki na odstąpienie od umowy bez podania przyczyny.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Warunki zwrotu
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Towar musi być nieużywany i w stanie nienaruszonym</li>
                  <li>Produkt powinien znajdować się w oryginalnym opakowaniu</li>
                  <li>Należy dołączyć wszystkie akcesoria i dokumentację</li>
                  <li>Metki i plomby nie mogą być usunięte (dotyczy odzieży)</li>
                  <li>Towar nie może nosić śladów użytkowania</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak dokonać zwrotu?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-3 mb-6">
                  <li>
                    <strong>Zgłoś zwrot:</strong> Zaloguj się na konto → Moje zamówienia → Wybierz zamówienie → "Zwróć produkt"
                  </li>
                  <li>
                    <strong>Wypełnij formularz:</strong> Podaj powód zwrotu i wybierz produkty do zwrotu
                  </li>
                  <li>
                    <strong>Wydrukuj etykietę:</strong> Pobierz i wydrukuj etykietę zwrotną (jeśli dostępna)
                  </li>
                  <li>
                    <strong>Zapakuj towar:</strong> Starannie zapakuj produkty w karton
                  </li>
                  <li>
                    <strong>Nadaj przesyłkę:</strong> Wyślij paczkę na podany adres
                  </li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Adres do zwrotów
                </h2>
                <div className="bg-secondary-50 p-4 rounded-lg mb-6">
                  <p className="text-secondary-700">
                    <strong>WBTrade Sp. z o.o.</strong><br />
                    Magazyn zwrotów<br />
                    ul. Przykładowa 123<br />
                    00-001 Warszawa<br />
                    <br />
                    <em className="text-sm">Dołącz do paczki numer zamówienia</em>
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Koszty zwrotu
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>Zwrot z własnej woli:</strong> Koszt odesłania pokrywa klient</li>
                  <li><strong>Towar wadliwy/niezgodny:</strong> Koszt odesłania pokrywa WBTrade</li>
                  <li><strong>Przesyłka kurierska:</strong> Możesz zamówić kuriera przez naszą stronę</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Produkty wyłączone ze zwrotu
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                  <p className="text-red-700 mb-3">Zgodnie z ustawą, nie podlegają zwrotowi:</p>
                  <ul className="list-disc pl-6 text-red-700 space-y-1 text-sm">
                    <li>Produkty spożywcze i szybko psujące się</li>
                    <li>Produkty higieniczne po otwarciu opakowania</li>
                    <li>Kosmetyki po otwarciu (szminka, krem, perfumy itp.)</li>
                    <li>Bielizna i stroje kąpielowe (ze względów higienicznych)</li>
                    <li>Produkty wykonane na zamówienie klienta</li>
                    <li>Nagrania audio/wideo i oprogramowanie po otwarciu</li>
                    <li>Gazety, czasopisma i książki cyfrowe</li>
                  </ul>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Zwrot pieniędzy
                </h2>
                <p className="text-secondary-600 mb-4">
                  Po otrzymaniu i weryfikacji zwrotu:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Zwrot realizujemy w ciągu 14 dni od otrzymania towaru</li>
                  <li>Pieniądze zwracamy tą samą metodą, którą zapłacono</li>
                  <li>Zwracamy pełną kwotę za towar + koszt najtańszej dostawy (przy całkowitym zwrocie)</li>
                </ul>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Zachowaj dowód nadania przesyłki zwrotnej do momentu otrzymania potwierdzenia przyjęcia zwrotu i zwrotu pieniędzy.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/returns/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Status zwrotu
                </Link>
                <Link href="/help/returns/complaint" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Reklamacja
                </Link>
                <Link href="/help/payments/refunds" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Zwroty płatności
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
