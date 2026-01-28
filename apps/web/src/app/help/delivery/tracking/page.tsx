import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Śledzenie przesyłki - Centrum pomocy - WB Trade',
  description: 'Jak śledzić przesyłkę w WB Trade',
};

export default function TrackingPage() {
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
            <span className="text-secondary-900">Śledzenie przesyłki</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Śledzenie przesyłki
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Po wysłaniu zamówienia możesz śledzić paczkę na każdym etapie dostawy. Dowiedz się, jak to zrobić.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Gdzie znajdę numer przesyłki?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>E-mail:</strong> Wysyłamy powiadomienie z numerem śledzenia po nadaniu paczki</li>
                  <li><strong>Panel klienta:</strong> Moje konto → Zamówienia → Szczegóły zamówienia</li>
                  <li><strong>SMS:</strong> Jeśli podałeś numer telefonu, otrzymasz SMS z linkiem do śledzenia</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak śledzić paczkę?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Przez panel klienta:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Zaloguj się na konto WB Trade</li>
                  <li>Przejdź do "Moje konto" → "Zamówienia"</li>
                  <li>Znajdź zamówienie ze statusem "Wysłane"</li>
                  <li>Kliknij "Śledź przesyłkę"</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Na stronie przewoźnika:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Skopiuj numer przesyłki z e-maila lub panelu</li>
                  <li>Wejdź na stronę przewoźnika (link poniżej)</li>
                  <li>Wklej numer w pole śledzenia</li>
                  <li>Zobacz historię i aktualny status</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Strony śledzenia przewoźników
                </h2>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">📦</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">InPost Paczkomaty</h4>
                      <p className="text-primary-600 text-sm">inpost.pl/sledzenie-przesylek</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">🚚</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Kurier InPost</h4>
                      <p className="text-primary-600 text-sm">inpost.pl/sledzenie-przesylek</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Typowe statusy przesyłki
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Nadana</h4>
                      <p className="text-secondary-600 text-sm">Paczka została przekazana kurierowi/na pocztę.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">W sortowni</h4>
                      <p className="text-secondary-600 text-sm">Przesyłka jest przetwarzana w centrum logistycznym.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">W doręczeniu</h4>
                      <p className="text-secondary-600 text-sm">Kurier wyruszył z paczką - dostawa dzisiaj!</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">W paczkomacie</h4>
                      <p className="text-secondary-600 text-sm">Paczka czeka na odbiór. Masz 48 godzin.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Doręczona</h4>
                      <p className="text-secondary-600 text-sm">Paczka została odebrana. Miłych zakupów!</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 mb-2">⏰ Opóźnienie aktualizacji</h3>
                  <p className="text-yellow-700">
                    Status przesyłki może być aktualizowany z opóźnieniem do 24 godzin. Jeśli nie widzisz zmian, sprawdź ponownie następnego dnia.
                  </p>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Zainstaluj aplikację InPost lub kuriera na telefonie - otrzymasz powiadomienia push o każdej zmianie statusu.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/delivery/pickup" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Punkty odbioru
                </Link>
                <Link href="/help/delivery/issues" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Problemy z dostawą
                </Link>
                <Link href="/help/orders/status" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Status zamówienia
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
