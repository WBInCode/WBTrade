import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Reklamacja - Centrum pomocy - WB Trade',
  description: 'Jak złożyć reklamację w WB Trade',
};

export default function ComplaintPage() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      
      <main className="py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400 mb-8">
            <Link href="/" className="hover:text-primary-600">Strona główna</Link>
            <span>/</span>
            <Link href="/help" className="hover:text-primary-600">Centrum pomocy</Link>
            <span>/</span>
            <span className="text-secondary-900 dark:text-white">Reklamacja</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
              Reklamacja produktu
            </h1>
            
            <div className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 dark:text-secondary-400 text-lg mb-8">
                  Otrzymałeś wadliwy lub uszkodzony produkt? Dowiedz się, jak złożyć reklamację i jakie masz prawa.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Kiedy możesz złożyć reklamację?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Produkt ma wadę fabryczną</li>
                  <li>Towar jest uszkodzony (nie z Twojej winy)</li>
                  <li>Produkt nie działa zgodnie z opisem</li>
                  <li>Otrzymałeś inny produkt niż zamawiany</li>
                  <li>Produkt uległ awarii w okresie gwarancji</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Twoje prawa
                </h2>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📋 Rękojmia (2 lata)</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      Odpowiedzialność sprzedawcy za wady towaru. Przysługuje przez 2 lata od zakupu.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">🔧 Gwarancja producenta</h4>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Dodatkowe uprawnienia od producenta. Czas trwania zależy od produktu.
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Jak złożyć reklamację?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 dark:text-secondary-400 space-y-3 mb-6">
                  <li>
                    <strong>Zaloguj się</strong> na swoje konto WB Trade
                  </li>
                  <li>
                    <strong>Przejdź do zamówienia:</strong> Moje konto → Zamówienia → Wybierz zamówienie
                  </li>
                  <li>
                    <strong>Wybierz "Reklamuj"</strong> przy produkcie do reklamacji
                  </li>
                  <li>
                    <strong>Opisz problem:</strong> Podaj szczegółowy opis wady
                  </li>
                  <li>
                    <strong>Dodaj zdjęcia:</strong> Załącz zdjęcia pokazujące wadę (min. 2-3 zdjęcia)
                  </li>
                  <li>
                    <strong>Wybierz żądanie:</strong> Naprawa, wymiana, obniżka ceny lub zwrot pieniędzy
                  </li>
                  <li>
                    <strong>Wyślij zgłoszenie</strong> i oczekuj na kontakt
                  </li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Czego możesz żądać?
                </h2>
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🔧 Naprawa</h4>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Bezpłatna naprawa wadliwego produktu przez sprzedawcę.
                    </p>
                  </div>
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">🔄 Wymiana</h4>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Wymiana na nowy, wolny od wad egzemplarz tego samego produktu.
                    </p>
                  </div>
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">💰 Obniżka ceny</h4>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Częściowy zwrot pieniędzy proporcjonalny do wady produktu.
                    </p>
                  </div>
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">💵 Zwrot pieniędzy</h4>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Pełny zwrot pieniędzy i odstąpienie od umowy (przy istotnych wadach).
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Czas rozpatrzenia reklamacji
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mb-6">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    <strong>14 dni</strong> - tyle mamy czasu na rozpatrzenie reklamacji. Jeśli nie otrzymasz odpowiedzi w tym terminie, reklamacja uznawana jest za przyjętą.
                  </p>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Przesyłka reklamacyjna
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Jeśli wymaga tego reklamacja:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 dark:text-secondary-400 space-y-2 mb-6">
                  <li>Wyślemy kuriera po odbiór produktu (bezpłatnie)</li>
                  <li>Lub otrzymasz etykietę zwrotną do wydruku</li>
                  <li>Zapakuj produkt starannie w karton</li>
                  <li>Dołącz wypełniony formularz reklamacyjny</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mt-8 mb-4">
                  Uszkodzenie w transporcie
                </h2>
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-6">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">⚠️ Sprawdź paczkę przy kurierze</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                    Jeśli paczka jest widocznie uszkodzona:
                  </p>
                  <ol className="list-decimal pl-6 text-red-700 dark:text-red-300 text-sm space-y-1">
                    <li>Sporządź protokół szkody z kurierem</li>
                    <li>Zrób zdjęcia uszkodzonego opakowania</li>
                    <li>Zgłoś reklamację w ciągu 24 godzin</li>
                    <li>Zachowaj oryginalne opakowanie</li>
                  </ol>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700 dark:text-primary-300">
                    Zachowaj dowód zakupu i oryginalne opakowanie przez cały okres gwarancji - ułatwi to proces reklamacji.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/returns/policy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Polityka zwrotów
                </Link>
                <Link href="/help/returns/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Status reklamacji
                </Link>
                <Link href="/help/delivery/issues" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-lg">
                  Problemy z dostawą
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
