import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Kariera - WB Trade',
  description: 'Dołącz do zespołu WB Trade i rozwijaj swoją karierę w dynamicznym środowisku e-commerce',
};

export default function CareersPage() {
  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Konkurencyjne wynagrodzenie',
      description: 'Oferujemy atrakcyjne stawki i regularne przeglądy płac.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      title: 'Praca zdalna',
      description: 'Elastyczny model pracy - biuro, zdalnie lub hybrydowo.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: 'Opieka zdrowotna',
      description: 'Prywatna opieka medyczna dla Ciebie i Twojej rodziny.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: 'Rozwój i szkolenia',
      description: 'Budżet szkoleniowy i dostęp do kursów online.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'MultiSport',
      description: 'Karta sportowa, abyś mógł dbać o kondycję.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Świetna atmosfera',
      description: 'Integracje, eventy i przyjazny zespół.',
    },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="container-custom relative">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6">
              🚀 Dołącz do nas
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Rozwijaj karierę w <span className="text-primary-200">WB Trade</span>
            </h1>
            <p className="text-xl text-primary-100 leading-relaxed mb-8">
              Budujemy przyszłość e-commerce w Polsce. Szukamy ambitnych osób, 
              które chcą mieć realny wpływ na produkt używany przez miliony.
            </p>
            <a
              href="#openings"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              Sprawdź oferty
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Dlaczego warto z nami pracować?
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Oferujemy nie tylko pracę, ale możliwość rozwoju w dynamicznym środowisku.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 p-6 bg-secondary-50 dark:bg-secondary-900 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-lg relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop"
                    alt="Zespół WB Trade"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg relative h-56">
                  <Image
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=400&fit=crop"
                    alt="Praca w biurze"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="rounded-2xl overflow-hidden shadow-lg relative h-56">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop"
                    alt="Spotkanie zespołu"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop"
                    alt="Integracja"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-6">
                Nasza kultura
              </h2>
              <div className="space-y-4 text-secondary-600 dark:text-secondary-400 leading-relaxed">
                <p>
                  W WB Trade wierzymy, że najlepsze pomysły rodzą się w atmosferze 
                  wzajemnego szacunku i otwartości. Każdy głos się liczy, a hierarchia 
                  nie stoi na przeszkodzie innowacjom.
                </p>
                <p>
                  Pracujemy w zwinnych zespołach, gdzie autonomia idzie w parze 
                  z odpowiedzialnością. Celebrujemy sukcesy razem i wspieramy się 
                  w trudniejszych momentach.
                </p>
                <p>
                  Regularnie organizujemy hackathony, warsztaty i integracje. 
                  Wierzymy, że zespół, który dobrze się bawi, pracuje efektywniej.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  #TeamWork
                </span>
                <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  #Innovation
                </span>
                <span className="px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                  #Growth
                </span>
                <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  #Balance
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Openings */}
      <section id="openings" className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Aktualne oferty pracy
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Sprawdzaj regularnie - nowe stanowiska pojawiają się często!
            </p>
          </div>

          {/* No Job Openings */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-secondary-50 dark:bg-secondary-900 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">
                Brak aktualnych ofert pracy
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Obecnie nie prowadzimy rekrutacji na żadne stanowisko. 
                Zachęcamy do wysłania CV - skontaktujemy się, gdy pojawi się odpowiednia oferta.
              </p>
              <a
                href="mailto:kariera@wbtrade.pl"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Wyślij CV
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container-custom text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Nie widzisz odpowiedniej oferty?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Wyślij nam swoje CV, a skontaktujemy się, gdy pojawi się stanowisko dla Ciebie.
          </p>
          <a
            href="mailto:kariera@wbtrade.pl"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            kariera@wbtrade.pl
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
