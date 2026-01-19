import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Dostawa - WBTrade',
  description: 'Informacje o opcjach dostawy, kosztach wysyłki i czasie realizacji w WBTrade',
};

export default function ShippingPage() {
  const shippingMethods = [
    {
      name: 'InPost Paczkomaty',
      time: '1-2 dni robocze',
      price: '9,99 zł',
      freeFrom: '100 zł',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      features: ['Odbiór 24/7', 'Ponad 20 000 automatów', 'Aplikacja InPost'],
    },
    {
      name: 'Kurier InPost',
      time: '1-2 dni robocze',
      price: '19,99 zł',
      freeFrom: '150 zł',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      features: ['Śledzenie przesyłki', 'Dostawa pod drzwi', 'SMS przed dostawą'],
    },
    {
      name: 'Wysyłka gabaryt',
      time: '2-5 dni roboczych',
      price: 'od 49,99 zł',
      freeFrom: null,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      features: ['Dla dużych produktów', 'Specjalna obsługa', 'Dostawa pod adres'],
    },
  ];

  const deliveryZones = [
    { zone: 'Duże miasta', time: '1 dzień roboczy' },
    { zone: 'Miasta średnie', time: '1-2 dni robocze' },
    { zone: 'Małe miejscowości', time: '2-3 dni robocze' },
    { zone: 'Tereny wiejskie', time: '2-4 dni robocze' },
  ];

  const faqItems = [
    {
      question: 'Kiedy otrzymam przesyłkę?',
      answer: 'Czas dostawy zależy od wybranej metody wysyłki oraz lokalizacji. Standardowo przesyłki kurierskie docierają w ciągu 1-3 dni roboczych od momentu nadania. Przesyłki do Paczkomatów są zazwyczaj dostępne do odbioru w ciągu 1-2 dni roboczych.',
    },
    {
      question: 'Jak mogę śledzić moją przesyłkę?',
      answer: 'Po nadaniu przesyłki otrzymasz e-mail i SMS z numerem śledzenia. Możesz również sprawdzić status w zakładce "Moje zamówienia" po zalogowaniu na konto. Link do śledzenia prowadzi bezpośrednio na stronę przewoźnika.',
    },
    {
      question: 'Co jeśli nie będzie mnie w domu?',
      answer: 'Kurier podejmie próbę doręczenia następnego dnia roboczego. Możesz też skorzystać z opcji przekierowania przesyłki do Paczkomatu lub punktu odbioru. Niektórzy przewoźnicy umożliwiają zmianę daty dostawy przez aplikację.',
    },
    {
      question: 'Czy dostarczacie za granicę?',
      answer: 'Obecnie realizujemy dostawy wyłącznie na terenie Polski. Pracujemy nad rozszerzeniem naszej oferty o dostawy międzynarodowe w przyszłości.',
    },
    {
      question: 'Jak uzyskać darmową dostawę?',
      answer: 'Darmowa dostawa jest dostępna przy zamówieniach powyżej określonej kwoty - w zależności od wybranej metody dostawy. Szczegółowe progi dla poszczególnych przewoźników znajdziesz w tabeli powyżej.',
    },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 text-white py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Opcje dostawy
            </h1>
            <p className="text-xl text-primary-100">
              Wybierz najwygodniejszą dla siebie metodę dostawy. 
              Oferujemy szybkie i bezpieczne opcje wysyłki na terenie całej Polski.
            </p>
          </div>
        </div>
      </section>

      {/* Free Shipping Banner */}
      <section className="py-6 bg-emerald-500 text-white">
        <div className="container-custom">
          <div className="flex items-center justify-center gap-3 text-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              Darmowa dostawa do Paczkomatów przy zamówieniach od 100 zł!
            </span>
          </div>
        </div>
      </section>

      {/* Shipping Methods */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 mb-10 text-center">
            Metody dostawy
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {shippingMethods.map((method, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-secondary-900 mb-1">
                      {method.name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
                      <span className="text-secondary-600">
                        <span className="font-medium text-secondary-900">{method.time}</span>
                      </span>
                      <span className="text-secondary-600">
                        Koszt: <span className="font-medium text-primary-600">{method.price}</span>
                      </span>
                    </div>
                    {method.freeFrom && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-3">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Darmowa od {method.freeFrom}
                      </div>
                    )}
                    <ul className="space-y-1">
                      {method.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2 text-sm text-secondary-600">
                          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Time */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 mb-6">
                Czas dostawy
              </h2>
              <p className="text-secondary-600 mb-6">
                Czas realizacji zamówienia zależy od lokalizacji oraz wybranej metody dostawy. 
                Poniżej znajdziesz orientacyjne czasy dostawy dla różnych regionów Polski.
              </p>
              
              <div className="space-y-3">
                {deliveryZones.map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl"
                  >
                    <span className="font-medium text-secondary-900">{zone.zone}</span>
                    <span className="text-primary-600 font-medium">{zone.time}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-secondary-50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-secondary-900 mb-6">
                Ważne informacje
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-900">Zamówienia do 14:00</span>
                    <p className="text-sm text-secondary-600">Wysyłamy tego samego dnia roboczego</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-900">Dni robocze</span>
                    <p className="text-sm text-secondary-600">Poniedziałek - Piątek (bez świąt)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-900">Ubezpieczenie</span>
                    <p className="text-sm text-secondary-600">Wszystkie przesyłki są ubezpieczone</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 mb-10 text-center">
            Najczęściej zadawane pytania
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer transition-colors">
                  <span className="font-semibold text-secondary-900 pr-4">
                    {item.question}
                  </span>
                  <svg
                    className="w-5 h-5 text-secondary-500 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 pt-0 text-secondary-600 border-t border-secondary-100">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container-custom text-center text-white">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">
            Masz pytania o dostawę?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Skontaktuj się z nami, a pomożemy wybrać najlepszą opcję dostawy.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            Skontaktuj się z nami
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
