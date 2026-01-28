import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Rejestracja konta - Centrum pomocy - WB Trade',
  description: 'Jak założyć konto w WB Trade',
};

export default function RegisterPage() {
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
            <span className="text-secondary-900">Rejestracja konta</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Rejestracja konta
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Załóż konto w WB Trade i korzystaj z wielu udogodnień - śledzenie zamówień, historia zakupów, lista życzeń i więcej!
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Korzyści z posiadania konta
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="text-2xl mb-2">📦</div>
                    <h4 className="font-medium text-secondary-900">Śledzenie zamówień</h4>
                    <p className="text-secondary-600 text-sm">Wszystkie zamówienia w jednym miejscu</p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="text-2xl mb-2">❤️</div>
                    <h4 className="font-medium text-secondary-900">Lista życzeń</h4>
                    <p className="text-secondary-600 text-sm">Zapisuj ulubione produkty na później</p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="text-2xl mb-2">🏠</div>
                    <h4 className="font-medium text-secondary-900">Zapisane adresy</h4>
                    <p className="text-secondary-600 text-sm">Szybsze składanie zamówień</p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="text-2xl mb-2">🔔</div>
                    <h4 className="font-medium text-secondary-900">Powiadomienia</h4>
                    <p className="text-secondary-600 text-sm">Informacje o promocjach i statusie</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak założyć konto?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Metoda 1: Formularz rejestracji</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Kliknij "Zaloguj się" w prawym górnym rogu strony</li>
                  <li>Wybierz "Utwórz konto" lub "Zarejestruj się"</li>
                  <li>Podaj swój adres e-mail</li>
                  <li>Utwórz hasło (min. 8 znaków, litery i cyfry)</li>
                  <li>Podaj imię i nazwisko</li>
                  <li>Zaakceptuj regulamin i politykę prywatności</li>
                  <li>Kliknij "Zarejestruj"</li>
                  <li>Potwierdź adres e-mail klikając link w wiadomości</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Metoda 2: Logowanie przez Google</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Kliknij "Zaloguj się"</li>
                  <li>Wybierz "Kontynuuj przez Google"</li>
                  <li>Wybierz swoje konto Google</li>
                  <li>Zaakceptuj uprawnienia</li>
                  <li>Gotowe! Konto zostało utworzone automatycznie</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Metoda 3: Podczas składania zamówienia</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Dodaj produkty do koszyka i przejdź do kasy</li>
                  <li>Wypełnij dane kontaktowe i dostawy</li>
                  <li>Zaznacz opcję "Utwórz konto"</li>
                  <li>Wprowadź hasło</li>
                  <li>Konto zostanie utworzone wraz z zamówieniem</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Wymagania dotyczące hasła
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Minimum 8 znaków</li>
                  <li>Co najmniej jedna wielka litera</li>
                  <li>Co najmniej jedna cyfra</li>
                  <li>Zalecane: znak specjalny (!@#$%)</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Problemy z rejestracją
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800">E-mail już zarejestrowany</h4>
                    <p className="text-yellow-700 text-sm">
                      Jeśli widzisz ten błąd, możliwe że już masz konto. Spróbuj odzyskać hasło lub zaloguj się przez Google.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800">Nie otrzymałem e-maila potwierdzającego</h4>
                    <p className="text-yellow-700 text-sm">
                      Sprawdź folder SPAM. Jeśli nie ma wiadomości, kliknij "Wyślij ponownie" na stronie logowania.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-800">Link aktywacyjny wygasł</h4>
                    <p className="text-yellow-700 text-sm">
                      Linki są ważne 24 godziny. Poproś o nowy link aktywacyjny lub zarejestruj się ponownie.
                    </p>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Logowanie przez Google jest najszybsze i nie wymaga pamiętania dodatkowego hasła. Twoje dane są bezpieczne.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/account/update" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Zmiana danych konta
                </Link>
                <Link href="/help/security/privacy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Ochrona prywatności
                </Link>
                <Link href="/help/orders/how-to-order" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Jak złożyć zamówienie
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
