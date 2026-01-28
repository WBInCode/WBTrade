import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Metody płatności - Centrum pomocy - WB Trade',
  description: 'Poznaj dostępne metody płatności w WB Trade',
};

export default function PaymentMethodsPage() {
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
            <span className="text-secondary-900">Metody płatności</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Metody płatności
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  W WB Trade oferujemy wiele bezpiecznych i wygodnych metod płatności. Wybierz tę, która najlepiej odpowiada Twoim potrzebom.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Szybkie płatności online
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center text-2xl">💳</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">BLIK</h4>
                      <p className="text-secondary-600 text-sm">Najszybsza płatność mobilna. Wpisz 6-cyfrowy kod z aplikacji bankowej.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">💳</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Karty płatnicze</h4>
                      <p className="text-secondary-600 text-sm">Visa, Mastercard, Maestro. Bezpieczne płatności z 3D Secure.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">🏦</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Przelewy online</h4>
                      <p className="text-secondary-600 text-sm">Płać bezpośrednio ze swojego banku przez PayU. Obsługujemy wszystkie główne banki.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📱</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Google Pay / Apple Pay</h4>
                      <p className="text-secondary-600 text-sm">Płać jednym kliknięciem używając portfela cyfrowego.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Płatności odroczone i raty
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">⏰</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">PayPo - Kup teraz, zapłać za 30 dni</h4>
                      <p className="text-secondary-600 text-sm">Otrzymaj zamówienie i zapłać w ciągu 30 dni bez odsetek. Minimalna kwota: 40 zł.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">📊</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Raty PayU</h4>
                      <p className="text-secondary-600 text-sm">Rozłóż płatność na wygodne raty. Decyzja online w kilka minut.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Inne metody
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">📨</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Przelew tradycyjny</h4>
                      <p className="text-secondary-600 text-sm">Wykonaj przelew na nasze konto. Realizacja po zaksięgowaniu wpłaty (1-2 dni robocze).</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">📦</div>
                    <div>
                      <h4 className="font-medium text-secondary-900">Za pobraniem</h4>
                      <p className="text-secondary-600 text-sm">Zapłać kurierowi przy odbiorze paczki. Dodatkowa opłata: 5 zł.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Bezpieczeństwo płatności
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Wszystkie płatności są szyfrowane (SSL/TLS)</li>
                  <li>Współpracujemy z certyfikowanym operatorem PayU</li>
                  <li>Płatności kartą chronione przez 3D Secure</li>
                  <li>Nie przechowujemy danych kart płatniczych</li>
                </ul>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Najszybszą metodą płatności jest BLIK - zamówienie zostanie zrealizowane natychmiast po potwierdzeniu płatności.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/payments/issues" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Problemy z płatnością
                </Link>
                <Link href="/help/payments/invoices" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Faktury
                </Link>
                <Link href="/help/security/shopping" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Bezpieczeństwo zakupów
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
