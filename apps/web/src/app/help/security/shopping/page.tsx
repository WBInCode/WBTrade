import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Bezpieczeństwo zakupów - Centrum pomocy - WB Trade',
  description: 'Jak bezpiecznie kupować w WB Trade',
};

export default function ShoppingSecurityPage() {
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
            <span className="text-secondary-900">Bezpieczeństwo zakupów</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Bezpieczeństwo zakupów
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  W WB Trade bezpieczeństwo Twoich zakupów i danych jest dla nas priorytetem. Dowiedz się, jak chronimy Twoje transakcje.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak chronimy Twoje zakupy?
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🔒</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900">Szyfrowanie SSL/TLS</h4>
                        <p className="text-secondary-600 text-sm mt-1">
                          Wszystkie dane przesyłane między Tobą a naszą stroną są szyfrowane za pomocą protokołu SSL/TLS. Sprawdź kłódkę w przeglądarce!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">💳</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900">Bezpieczne płatności</h4>
                        <p className="text-secondary-600 text-sm mt-1">
                          Współpracujemy z certyfikowanym operatorem PayU. Płatności kartą są chronione przez 3D Secure.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">🛡️</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900">Ochrona danych karty</h4>
                        <p className="text-secondary-600 text-sm mt-1">
                          Nie przechowujemy pełnych danych Twojej karty płatniczej. Są one przetwarzane bezpośrednio przez operatora płatności.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">✅</div>
                      <div>
                        <h4 className="font-semibold text-secondary-900">Weryfikacja sprzedawców</h4>
                        <p className="text-secondary-600 text-sm mt-1">
                          Wszyscy sprzedawcy na naszej platformie przechodzą proces weryfikacji przed dopuszczeniem do sprzedaży.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Nasze certyfikaty i standardy
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>PCI DSS</strong> - standard bezpieczeństwa danych kart płatniczych</li>
                  <li><strong>RODO/GDPR</strong> - zgodność z przepisami o ochronie danych osobowych</li>
                  <li><strong>Trusted Shops</strong> - certyfikat zaufanego sklepu internetowego</li>
                  <li><strong>Regularne audyty bezpieczeństwa</strong> - zewnętrzne kontrole zabezpieczeń</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Twoje gwarancje jako kupującego
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">📦 Gwarancja dostawy</h4>
                    <p className="text-secondary-600 text-sm">Jeśli paczka nie dotrze, zwrócimy pieniądze lub wyślemy nową.</p>
                  </div>
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">↩️ 14 dni na zwrot</h4>
                    <p className="text-secondary-600 text-sm">Prawo do zwrotu bez podania przyczyny w ciągu 14 dni.</p>
                  </div>
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">🔧 Rękojmia 2 lata</h4>
                    <p className="text-secondary-600 text-sm">Odpowiedzialność sprzedawcy za wady produktu.</p>
                  </div>
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">💰 Ochrona kupującego</h4>
                    <p className="text-secondary-600 text-sm">Pomożemy w sporach ze sprzedawcą.</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak bezpiecznie kupować?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Sprawdzaj czy w przeglądarce jest kłódka 🔒 (HTTPS)</li>
                  <li>Używaj silnego, unikalnego hasła do konta</li>
                  <li>Nie loguj się przez publiczne sieci Wi-Fi</li>
                  <li>Sprawdzaj opinie o produktach i sprzedawcach</li>
                  <li>Zachowuj potwierdzenia zamówień i płatności</li>
                  <li>Nigdy nie podawaj hasła przez e-mail lub telefon</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Uwaga na fałszywe strony!
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Nasza oficjalna strona to: wbtrade.pl</h4>
                  <p className="text-red-700 text-sm mb-3">
                    Uważaj na strony podszywające się pod WB Trade:
                  </p>
                  <ul className="list-disc pl-6 text-red-700 text-sm space-y-1">
                    <li>Sprawdzaj dokładnie adres strony przed zakupem</li>
                    <li>Nie klikaj w podejrzane linki w e-mailach</li>
                    <li>Nie wchodź na stronę z nieznanych źródeł</li>
                    <li>Zgłoś podejrzaną stronę: bezpieczenstwo@wbtrade.pl</li>
                  </ul>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">🔐 Włącz dodatkowe zabezpieczenia</h3>
                  <p className="text-primary-700">
                    Zalecamy włączenie dwuetapowej weryfikacji (2FA) w ustawieniach konta dla dodatkowej ochrony.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/security/privacy" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Ochrona prywatności
                </Link>
                <Link href="/help/security/suspicious" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Podejrzana aktywność
                </Link>
                <Link href="/help/payments/methods" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Metody płatności
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
