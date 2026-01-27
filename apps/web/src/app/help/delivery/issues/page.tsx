import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Problemy z dostawą - Centrum pomocy - WB Trade',
  description: 'Rozwiązywanie problemów z dostawą w WB Trade',
};

export default function DeliveryIssuesPage() {
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
            <span className="text-secondary-900">Problemy z dostawą</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Problemy z dostawą
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Masz problem z dostawą? Znajdź rozwiązanie swojego problemu lub skontaktuj się z nami.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Paczka nie dotarła w terminie
                </h2>
                <div className="bg-secondary-50 p-4 rounded-lg mb-6">
                  <p className="text-secondary-600 mb-3">
                    <strong>Standardowe czasy dostawy:</strong>
                  </p>
                  <ul className="text-secondary-600 text-sm space-y-1">
                    <li>• Paczkomat InPost: 1-2 dni robocze</li>
                    <li>• Kurier: 1-2 dni robocze</li>
                    <li>• Poczta Polska: 3-5 dni roboczych</li>
                  </ul>
                </div>
                <p className="text-secondary-600 mb-4">
                  Jeśli paczka się opóźnia:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Sprawdź status przesyłki w panelu klienta</li>
                  <li>Upewnij się, że podany adres jest prawidłowy</li>
                  <li>Sprawdź telefon - kurier mógł dzwonić</li>
                  <li>Poczekaj dodatkowe 1-2 dni (szczególnie w sezonie)</li>
                  <li>Skontaktuj się z nami jeśli opóźnienie przekracza 5 dni</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Uszkodzona przesyłka
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Ważne!</h4>
                  <p className="text-red-700 text-sm mb-3">
                    Przy odbiorze od kuriera sprawdź stan paczki:
                  </p>
                  <ol className="list-decimal pl-6 text-red-700 text-sm space-y-1">
                    <li>Jeśli opakowanie jest uszkodzone - <strong>spisz protokół szkody</strong></li>
                    <li>Zrób zdjęcia uszkodzeń opakowania i zawartości</li>
                    <li>Zachowaj oryginalne opakowanie</li>
                    <li>Zgłoś reklamację w ciągu 24 godzin</li>
                  </ol>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Kurier nie zastał mnie w domu
                </h2>
                <p className="text-secondary-600 mb-4">
                  Po nieudanej próbie doręczenia:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>InPost:</strong> Paczka trafia do najbliższego paczkomatu lub kurier podejmie kolejną próbę</li>
                  <li><strong>Wysyłka gabaryt:</strong> Kurier skontaktuje się telefonicznie w celu umówienia nowego terminu</li>
                </ul>
                <p className="text-secondary-600 mb-6">
                  Możesz też zalogować się na stronę przewoźnika i wybrać nowy termin dostawy lub przekierować paczkę.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Otrzymałem nie ten produkt
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Zrób zdjęcia otrzymanego produktu i etykiety paczki</li>
                  <li>Zaloguj się do panelu klienta</li>
                  <li>Wybierz zamówienie i kliknij "Reklamuj"</li>
                  <li>Opisz problem i załącz zdjęcia</li>
                  <li>Wyślemy poprawny produkt na nasz koszt</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Brakuje części zamówienia
                </h2>
                <p className="text-secondary-600 mb-4">
                  Jeśli w paczce brakuje produktów:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Sprawdź czy zamówienie nie zostało podzielone na kilka paczek</li>
                  <li>Sprawdź e-mail - mogliśmy wysłać informację o częściowej wysyłce</li>
                  <li>Sprawdź potwierdzenie zamówienia - upewnij się co było zamówione</li>
                  <li>Jeśli rzeczywiście brakuje produktów - zgłoś reklamację</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Paczka oznaczona jako "doręczona" ale jej nie otrzymałem
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Sprawdź u domowników i sąsiadów</li>
                  <li>Sprawdź skrytkę pocztową i przy drzwiach</li>
                  <li>Sprawdź dokładny adres doręczenia w śledzeniu</li>
                  <li>Skontaktuj się z przewoźnikiem w celu weryfikacji</li>
                  <li>Jeśli paczka nie została znaleziona - zgłoś sprawę do nas</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Paczka została zwrócona do nadawcy
                </h2>
                <p className="text-secondary-600 mb-4">
                  Może się to zdarzyć gdy:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Adres był nieprawidłowy lub niekompletny</li>
                  <li>Nie odebrano paczki w terminie</li>
                  <li>Odmówiono przyjęcia przesyłki za pobraniem</li>
                </ul>
                <p className="text-secondary-600 mb-6">
                  <strong>Rozwiązanie:</strong> Skontaktuj się z nami - wyślemy zamówienie ponownie (może być naliczona dodatkowa opłata za przesyłkę).
                </p>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">📞 Kontakt w sprawie dostawy</h3>
                  <p className="text-primary-700 mb-3">
                    Skontaktuj się z nami podając:
                  </p>
                  <ul className="text-primary-700 text-sm space-y-1">
                    <li>• Numer zamówienia</li>
                    <li>• Numer przesyłki (jeśli posiadasz)</li>
                    <li>• Opis problemu</li>
                    <li>• Zdjęcia (w przypadku uszkodzeń)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/delivery/tracking" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Śledzenie przesyłki
                </Link>
                <Link href="/help/returns/complaint" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Reklamacja
                </Link>
                <Link href="/help/orders/modify" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Zmiana adresu
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
