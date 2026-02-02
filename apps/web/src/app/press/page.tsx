import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Dla prasy - WB Trade',
  description: 'Materiały prasowe, informacje o firmie i kontakt dla mediów - WB Trade',
};

export default function PressPage() {
  const mediaAssets = [
    {
      title: 'Logo WB Trade',
      description: 'Oficjalne logo w różnych formatach i wariantach kolorystycznych.',
      formats: ['SVG', 'PNG', 'PDF'],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Zdjęcia zespołu',
      description: 'Profesjonalne zdjęcia zarządu i zespołu WB Trade.',
      formats: ['JPG', 'PNG'],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Screenshoty produktu',
      description: 'Aktualne zrzuty ekranu aplikacji webowej i mobilnej.',
      formats: ['PNG', 'JPG'],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Brand Guidelines',
      description: 'Pełna dokumentacja marki, kolorystyka i typografia.',
      formats: ['PDF'],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const facts = [
    { label: 'Rok założenia', value: '2018' },
    { label: 'Siedziba', value: 'Warszawa, Polska' },
    { label: 'Aktywni użytkownicy', value: '2M+' },
    { label: 'Produkty w ofercie', value: '50 000+' },
    { label: 'Sprzedawcy', value: '500+' },
    { label: 'Pracownicy', value: '150+' },
  ];

  const mediaContacts = [
    {
      name: 'Katarzyna Malinowska',
      role: 'PR Manager',
      email: 'k.malinowska@wbtrade.pl',
      phone: '+48 570 034 367',
    },
    {
      name: 'Michał Kowalczyk',
      role: 'Media Relations',
      email: 'm.kowalczyk@wbtrade.pl',
      phone: '+48 500 234 567',
    },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-secondary-900 to-secondary-800 text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="container-custom relative">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6">
              📰 Centrum prasowe
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Dla prasy i mediów
            </h1>
            <p className="text-xl text-secondary-300 leading-relaxed">
              Znajdziesz tutaj najnowsze informacje o WB Trade, materiały do pobrania 
              oraz dane kontaktowe do naszego zespołu PR.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="py-12 bg-white border-b dark:bg-secondary-800 dark:border-secondary-700">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6 text-center">Fakty o WB Trade</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {facts.map((fact, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-primary-600">{fact.value}</div>
                <div className="text-sm text-secondary-500">{fact.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
              Komunikaty prasowe
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400">
              Najnowsze informacje i ogłoszenia od WB Trade.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm dark:bg-secondary-800">
              <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">
                Brak komunikatów prasowych
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Aktualnie nie mamy żadnych komunikatów prasowych do publikacji. 
                Śledź tę stronę, aby być na bieżąco z najnowszymi informacjami.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Media Assets */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
              Materiały do pobrania
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Pobierz oficjalne materiały marki WB Trade do wykorzystania w publikacjach.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mediaAssets.map((asset, index) => (
              <div
                key={index}
                className="bg-secondary-50 rounded-2xl p-6 hover:shadow-lg transition-all group dark:bg-secondary-900"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                  {asset.icon}
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  {asset.title}
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-4">
                  {asset.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {asset.formats.map((format) => (
                    <span
                      key={format}
                      className="px-2 py-1 bg-secondary-200 text-secondary-600 dark:text-secondary-400 rounded text-xs font-medium"
                    >
                      {format}
                    </span>
                  ))}
                </div>
                <button className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Pobierz
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Kontakt dla mediów
            </h2>
            <p className="text-primary-100 max-w-2xl mx-auto">
              Nasz zespół PR jest do Twojej dyspozycji. Odpowiadamy na zapytania w ciągu 24 godzin.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {mediaContacts.map((contact, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white"
              >
                <h3 className="text-lg font-semibold mb-1">{contact.name}</h3>
                <p className="text-primary-200 text-sm mb-4">{contact.role}</p>
                <div className="space-y-2">
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-primary-100 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {contact.email}
                  </a>
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-primary-100 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {contact.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <a
              href="mailto:press@wbtrade.pl"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              press@wbtrade.pl
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
