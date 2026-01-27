import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Punkty odbioru - Centrum pomocy - WB Trade',
  description: 'Informacje o punktach odbioru przesyłek w WB Trade',
};

export default function PickupPage() {
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
            <span className="text-secondary-900">Punkty odbioru</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Punkty odbioru przesyłek
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Odbierz paczkę w dogodnym dla siebie miejscu i czasie. Oferujemy szeroki wybór punktów odbioru w całej Polsce.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Dostępne opcje odbioru
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-5 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl">📦</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 text-lg">InPost Paczkomaty 24/7</h4>
                        <p className="text-secondary-600 mt-1">
                          Ponad 20 000 paczkomatów w Polsce. Odbiór całą dobę, 7 dni w tygodniu.
                        </p>
                        <ul className="text-secondary-600 text-sm mt-2 space-y-1">
                          <li>✅ Czas odbioru: 48 godzin</li>
                          <li>✅ Darmowa dostawa od 100 zł</li>
                          <li>✅ Aplikacja InPost do łatwego odbioru</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">🏪</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 text-lg">Żabka</h4>
                        <p className="text-secondary-600 mt-1">
                          Odbierz paczkę w jednym z tysięcy sklepów Żabka.
                        </p>
                        <ul className="text-secondary-600 text-sm mt-2 space-y-1">
                          <li>✅ Czas odbioru: 3 dni robocze</li>
                          <li>✅ Długie godziny otwarcia</li>
                          <li>✅ Lokalizacje w całej Polsce</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-3xl">📮</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 text-lg">Poczta Polska - Punkt odbioru</h4>
                        <p className="text-secondary-600 mt-1">
                          Odbiór w placówce pocztowej lub Orlen Paczka.
                        </p>
                        <ul className="text-secondary-600 text-sm mt-2 space-y-1">
                          <li>✅ Czas odbioru: 14 dni</li>
                          <li>✅ Punkty w małych miejscowościach</li>
                          <li>✅ Awizo SMS/e-mail</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl">⛽</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 text-lg">Orlen Paczka</h4>
                        <p className="text-secondary-600 mt-1">
                          Automaty paczkowe na stacjach Orlen i w innych lokalizacjach.
                        </p>
                        <ul className="text-secondary-600 text-sm mt-2 space-y-1">
                          <li>✅ Czas odbioru: 48 godzin</li>
                          <li>✅ Dostęp 24/7 na stacjach</li>
                          <li>✅ Odbiór bezgotówkowy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak wybrać punkt odbioru?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Podczas składania zamówienia wybierz "Dostawa do punktu"</li>
                  <li>Na mapie znajdź najbliższy punkt lub wpisz adres</li>
                  <li>Kliknij wybrany punkt aby zobaczyć szczegóły</li>
                  <li>Potwierdź wybór i kontynuuj zamówienie</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak odebrać paczkę z paczkomatu?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Otrzymasz SMS/e-mail z kodem odbioru</li>
                  <li>Udaj się do wybranego paczkomatu</li>
                  <li>Wpisz kod na ekranie lub zeskanuj kod QR z aplikacji</li>
                  <li>Skrytka otworzy się automatycznie</li>
                  <li>Odbierz paczkę i zamknij skrytkę</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak odebrać paczkę z punktu?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Otrzymasz powiadomienie o dostawie do punktu</li>
                  <li>Udaj się do punktu w godzinach otwarcia</li>
                  <li>Podaj numer telefonu lub kod odbioru</li>
                  <li>Pokaż dokument tożsamości</li>
                  <li>Odbierz paczkę i podpisz potwierdzenie</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Co jeśli nie odbiorę paczki?
                </h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                  <p className="text-yellow-800 mb-3">
                    Jeśli nie odbierzesz paczki w wyznaczonym czasie:
                  </p>
                  <ul className="list-disc pl-6 text-yellow-700 text-sm space-y-1">
                    <li><strong>Paczkomat:</strong> Paczka zostanie przeniesiona do najbliższego punktu obsługi InPost</li>
                    <li><strong>Punkt odbioru:</strong> Paczka zostanie zwrócona do nadawcy</li>
                    <li>Możemy naliczyć opłatę za zwrot przesyłki</li>
                    <li>Skontaktuj się z nami, jeśli potrzebujesz więcej czasu</li>
                  </ul>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Pobierz aplikację InPost - możesz przedłużyć czas odbioru o dodatkowe 24 godziny jednym kliknięciem!
                  </p>
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
                <Link href="/help/delivery/issues" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Problemy z dostawą
                </Link>
                <Link href="/help/orders/modify" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Zmiana adresu dostawy
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
