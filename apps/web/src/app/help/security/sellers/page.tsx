import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Weryfikacja sprzedawców - Centrum pomocy - WBTrade',
  description: 'Jak weryfikujemy sprzedawców w WBTrade',
};

export default function SellersPage() {
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
            <span className="text-secondary-900">Weryfikacja sprzedawców</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Weryfikacja sprzedawców
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  W WBTrade dbamy o to, abyś kupował od zweryfikowanych i godnych zaufania sprzedawców. Dowiedz się, jak weryfikujemy naszych partnerów.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Proces weryfikacji sprzedawców
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">1</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Weryfikacja tożsamości</h4>
                      <p className="text-secondary-600 text-sm">Sprawdzamy dokumenty rejestrowe firmy, NIP, REGON oraz\u00A0dane właścicieli.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">2</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Weryfikacja adresu</h4>
                      <p className="text-secondary-600 text-sm">Potwierdzamy adres siedziby firmy i\u00A0magazynu.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">3</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Weryfikacja konta bankowego</h4>
                      <p className="text-secondary-600 text-sm">Sprawdzamy czy konto firmowe należy do\u00A0zarejestrowanej działalności.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">4</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Weryfikacja produktów</h4>
                      <p className="text-secondary-600 text-sm">Sprawdzamy legalność i\u00A0jakość oferowanych produktów.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">5</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Podpisanie umowy</h4>
                      <p className="text-secondary-600 text-sm">Sprzedawca podpisuje umowę zobowiązującą do\u00A0przestrzegania naszych standardów.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  System ocen sprzedawców
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⭐</span>
                      <h4 className="font-medium text-green-800">Super Sprzedawca</h4>
                    </div>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Ocena powyżej 4.8/5</li>
                      <li>• Min. 100 sprzedanych produktów</li>
                      <li>• Szybka wysyłka (do 24h)</li>
                      <li>• Niski procent reklamacji</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✓</span>
                      <h4 className="font-medium text-blue-800">Zweryfikowany</h4>
                    </div>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Przeszedł pełną weryfikację</li>
                      <li>• Aktywny na platformie</li>
                      <li>• Regularne transakcje</li>
                      <li>• Spełnia standardy WBTrade</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Na co zwracać uwagę?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>Ocena sprzedawcy:</strong> Sprawdź średnią ocenę i liczbę opinii</li>
                  <li><strong>Odznaki:</strong> Szukaj odznak "Zweryfikowany" lub "Super Sprzedawca"</li>
                  <li><strong>Czas działania:</strong> Starsi sprzedawcy mają dłuższą historię</li>
                  <li><strong>Opinie klientów:</strong> Przeczytaj recenzje innych kupujących</li>
                  <li><strong>Czas wysyłki:</strong> Sprawdź deklarowany czas realizacji</li>
                  <li><strong>Polityka zwrotów:</strong> Upewnij się, że sprzedawca akceptuje zwroty</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Ochrona kupującego
                </h2>
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mb-6">
                  <p className="text-primary-700 mb-3">
                    <strong>Gwarancja WBTrade:</strong>
                  </p>
                  <ul className="list-disc pl-6 text-primary-700 text-sm space-y-1">
                    <li>Jeśli produkt nie dotrze - zwrot pieniędzy</li>
                    <li>Jeśli produkt jest niezgodny z opisem - zwrot lub wymiana</li>
                    <li>Mediacja w sporach ze sprzedawcą</li>
                    <li>Ochrona przed nieuczciwymi praktykami</li>
                  </ul>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak zgłosić problem ze sprzedawcą?
                </h2>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Najpierw skontaktuj się ze sprzedawcą przez wiadomości</li>
                  <li>Jeśli nie otrzymasz pomocy w ciągu 48h - skontaktuj się z nami</li>
                  <li>Przejdź do zamówienia i kliknij "Zgłoś problem"</li>
                  <li>Opisz sytuację i załącz dowody (zdjęcia, korespondencję)</li>
                  <li>Nasz zespół rozpatrzy sprawę w ciągu 5 dni roboczych</li>
                </ol>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Podejrzany sprzedawca?</h3>
                  <p className="text-yellow-700 mb-3">
                    Jeśli zauważysz:
                  </p>
                  <ul className="list-disc pl-6 text-yellow-700 text-sm space-y-1">
                    <li>Ceny znacznie niższe od rynkowych</li>
                    <li>Prośby o płatność poza platformą</li>
                    <li>Podejrzane opisy produktów</li>
                    <li>Brak kontaktu lub nietypowe odpowiedzi</li>
                  </ul>
                  <p className="text-yellow-700 mt-3 text-sm">
                    Zgłoś to do nas: bezpieczenstwo@wbtrade.pl
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/security/shopping" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Bezpieczeństwo zakupów
                </Link>
                <Link href="/help/returns/complaint" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Reklamacja
                </Link>
                <Link href="/help/security/suspicious" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Podejrzana aktywność
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
