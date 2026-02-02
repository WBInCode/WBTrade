import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Dostawa - WB Trade',
  description: 'Informacje o opcjach dostawy, kosztach wysyłki i czasie realizacji w WB Trade',
};

export default function ShippingPage() {
  const shippingMethods = [
    {
      name: 'InPost Paczkomaty',
      time: '1-2 dni robocze',
      price: 'od 15,99 zł',
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
      price: 'od 19,99 zł',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      features: ['Śledzenie przesyłki', 'Dostawa pod drzwi', 'SMS przed dostawą'],
    },
    {
      name: 'Kurier DPD',
      time: '1-2 dni robocze',
      price: 'od 19,99 zł',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      features: ['Śledzenie przesyłki', 'Dostawa pod drzwi', 'Punkty odbioru DPD Pickup'],
    },
    {
      name: 'Wysyłka gabaryt',
      time: '2-5 dni roboczych',
      price: 'od 49,99 zł',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      features: ['Dla dużych produktów', 'Specjalna obsługa', 'Dostawa pod adres'],
    },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
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

      {/* Shipping Methods */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-10 text-center">
            Metody dostawy
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {shippingMethods.map((method, index) => (
              <div
                key={index}
                className="bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-1">
                      {method.name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        <span className="font-medium text-secondary-900 dark:text-white">{method.time}</span>
                      </span>
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Koszt: <span className="font-medium text-primary-600">{method.price}</span>
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {method.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
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
