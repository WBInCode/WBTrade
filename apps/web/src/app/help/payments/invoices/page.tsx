import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Faktury - Centrum pomocy - WBTrade',
  description: 'Informacje o fakturach i dokumentach sprzedaży w WBTrade',
};

export default function InvoicesPage() {
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
            <span className="text-secondary-900">Faktury</span>
          </nav>

          <div className="max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
              Faktury i dokumenty sprzedaży
            </h1>
            
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-600 text-lg mb-8">
                  Potrzebujesz faktury do zamówienia? Dowiedz się jak ją uzyskać i jakie dokumenty wystawiamy.
                </p>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Jak zamówić fakturę VAT?
                </h2>
                
                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Podczas składania zamówienia:</h3>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>W formularzu zamówienia zaznacz opcję "Chcę otrzymać fakturę VAT"</li>
                  <li>Wypełnij dane do faktury (nazwa firmy, NIP, adres)</li>
                  <li>Dokończ składanie zamówienia</li>
                  <li>Faktura zostanie wystawiona automatycznie</li>
                </ol>

                <h3 className="text-lg font-medium text-secondary-800 mt-6 mb-3">Po złożeniu zamówienia:</h3>
                <p className="text-secondary-600 mb-4">
                  Jeśli zapomniałeś zaznaczyć opcję faktury przy zamówieniu:
                </p>
                <ol className="list-decimal pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Skontaktuj się z nami w ciągu 7 dni od zakupu</li>
                  <li>Podaj numer zamówienia i dane do faktury (NIP, nazwa firmy, adres)</li>
                  <li>Faktura zostanie wystawiona i wysłana e-mailem</li>
                </ol>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Wymagane dane do faktury
                </h2>
                <div className="bg-secondary-50 p-4 rounded-lg mb-6">
                  <ul className="text-secondary-600 space-y-2">
                    <li><strong>Nazwa firmy:</strong> Pełna nazwa zgodna z rejestrem</li>
                    <li><strong>NIP:</strong> 10-cyfrowy numer identyfikacji podatkowej</li>
                    <li><strong>Adres siedziby:</strong> Ulica, numer, kod pocztowy, miasto</li>
                    <li><strong>E-mail:</strong> Na który wyślemy fakturę w formacie PDF</li>
                  </ul>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Gdzie znajdę fakturę?
                </h2>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li><strong>E-mail:</strong> Faktura jest wysyłana na adres podany przy zamówieniu</li>
                  <li><strong>Panel klienta:</strong> Zaloguj się → Moje konto → Zamówienia → Pobierz fakturę</li>
                  <li><strong>W paczce:</strong> Wydrukowana faktura jest dołączona do przesyłki</li>
                </ul>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Rodzaje dokumentów
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">Paragon fiskalny</h4>
                    <p className="text-secondary-600 text-sm">
                      Wystawiany standardowo dla zamówień bez żądania faktury. Dołączany do paczki.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">Faktura VAT</h4>
                    <p className="text-secondary-600 text-sm">
                      Wystawiana na życzenie klienta. Zawiera dane firmy i NIP nabywcy.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">Faktura korygująca</h4>
                    <p className="text-secondary-600 text-sm">
                      Wystawiana w przypadku zwrotu towaru lub błędnych danych na fakturze.
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-secondary-900 mt-8 mb-4">
                  Korekta faktury
                </h2>
                <p className="text-secondary-600 mb-4">
                  Jeśli dane na fakturze są błędne, skontaktuj się z nami podając:
                </p>
                <ul className="list-disc pl-6 text-secondary-600 space-y-2 mb-6">
                  <li>Numer faktury do korekty</li>
                  <li>Dane, które wymagają poprawy</li>
                  <li>Prawidłowe dane</li>
                </ul>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Ważne</h3>
                  <p className="text-yellow-700">
                    Zgodnie z przepisami, nie możemy wystawić faktury na firmę jeśli wcześniej został wystawiony paragon bez NIP. Zadbaj o podanie danych do faktury przed złożeniem zamówienia.
                  </p>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mt-6">
                  <h3 className="font-semibold text-primary-900 mb-2">💡 Wskazówka</h3>
                  <p className="text-primary-700">
                    Jako zalogowany użytkownik możesz zapisać dane do faktury w profilu - będą automatycznie uzupełniane przy kolejnych zamówieniach.
                  </p>
                </div>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">Powiązane tematy</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/help/payments/methods" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Metody płatności
                </Link>
                <Link href="/help/orders/how-to-order" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Jak złożyć zamówienie
                </Link>
                <Link href="/help/account/update" className="text-primary-600 hover:text-primary-700 text-sm bg-primary-50 px-4 py-2 rounded-lg">
                  Zmiana danych konta
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
