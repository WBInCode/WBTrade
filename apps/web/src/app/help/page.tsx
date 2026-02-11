import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Centrum pomocy - WB Trade',
  description: 'Znajdź odpowiedzi na najczęściej zadawane pytania i uzyskaj pomoc w WB Trade',
};

export default function HelpPage() {
  const helpCategories = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      title: 'Zamówienia',
      description: 'Składanie zamówień, status, modyfikacje',
      links: [
        { label: 'Jak złożyć zamówienie?', href: '/faq#orders' },
        { label: 'Sprawdzanie statusu zamówienia', href: '/faq#orders' },
        { label: 'Anulowanie zamówienia', href: '/faq#orders' },
        { label: 'Faktury i rachunki', href: '/faq#orders' },
      ],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      title: 'Płatności',
      description: 'Metody płatności, bezpieczeństwo',
      links: [
        { label: 'Dostępne metody płatności', href: '/faq#payments' },
        { label: 'Bezpieczeństwo płatności', href: '/faq#payments' },
        { label: 'Problemy z płatnością', href: '/faq#payments' },
        { label: 'Zwrot środków', href: '/faq#returns' },
      ],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      title: 'Zwroty i reklamacje',
      description: 'Procedury zwrotów i reklamacji',
      links: [
        { label: 'Jak zwrócić produkt?', href: '/faq#returns' },
        { label: 'Polityka zwrotów', href: '/terms' },
        { label: 'Zgłaszanie reklamacji', href: '/faq#returns' },
        { label: 'Status zwrotu/reklamacji', href: '/contact' },
      ],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Dostawa',
      description: 'Opcje dostawy, śledzenie przesyłki',
      links: [
        { label: 'Opcje i koszty dostawy', href: '/faq#delivery' },
        { label: 'Śledzenie przesyłki', href: '/faq#delivery' },
        { label: 'Odbiór w punkcie', href: '/faq#delivery' },
        { label: 'Uszkodzona przesyłka', href: '/faq#delivery' },
      ],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: 'Konto',
      description: 'Zarządzanie kontem, ustawienia',
      links: [
        { label: 'Rejestracja konta', href: '/faq#account' },
        { label: 'Resetowanie hasła', href: '/faq#account' },
        { label: 'Zmiana danych', href: '/faq#account' },
        { label: 'Usunięcie konta', href: '/faq#account' },
      ],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Bezpieczeństwo i Prawne',
      description: 'Ochrona konta i regulacje',
      links: [
        { label: 'Polityka prywatności', href: '/privacy' },
        { label: 'Polityka RODO', href: '/rodo' },
        { label: 'Regulamin sklepu', href: '/terms' },
        { label: 'Bezpieczeństwo danych', href: '/faq#account' },
      ],
    },
  ];

  const popularQuestions = [
    {
      question: 'Jak sprawdzić status mojego zamówienia?',
      answer: 'Status zamówienia możesz sprawdzić po zalogowaniu się na konto w zakładce "Moje zamówienia". Znajdziesz tam etap realizacji oraz (po nadaniu przesyłki) numer i link do śledzenia.',
    },
    {
      question: 'Ile mam czasu na zwrot produktu?',
      answer: 'Masz 14 dni kalendarzowych od dnia otrzymania przesyłki na zgłoszenie zwrotu bez podania przyczyny. Zgłoszenia dokonasz przez formularz na stronie "Zwroty i reklamacje".',
    },
    {
      question: 'Jakie są dostępne metody płatności?',
      answer: 'Akceptujemy: karty płatnicze (Visa, Mastercard), BLIK, szybkie przelewy online (PayU) oraz tradycyjny przelew bankowy.',
    },
    {
      question: 'Czy mogę anulować zamówienie?',
      answer: 'Tak — możesz anulować zamówienie, o ile nie zostało jeszcze wysłane. W tym celu przejdź do „Moje zamówienia” i wybierz opcję „Anuluj zamówienie” (jeśli jest dostępna).',
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
              Jak możemy Ci pomóc?
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Znajdź odpowiedzi na pytania dotyczące zamówień, płatności, dostawy i więcej.
            </p>

            {/* Search Box */}
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Szukaj w centrum pomocy..."
                className="w-full px-6 py-4 pr-14 rounded-2xl text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-4 focus:ring-white/30"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-600 hover:text-primary-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-10 text-center">
            Przeglądaj kategorie pomocy
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => (
              <div
                key={index}
                className="bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
                  {category.title}
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-4">
                  {category.description}
                </p>
                <ul className="space-y-2">
                  {category.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        href={link.href}
                        className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Questions */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-10 text-center">
            Najczęściej zadawane pytania
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {popularQuestions.map((item, index) => (
              <details
                key={index}
                className="group bg-secondary-50 dark:bg-secondary-900 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                  <span className="font-semibold text-secondary-900 dark:text-white pr-4">
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
                <div className="px-6 pt-4 pb-6 border-t border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700"
            >
              Zobacz wszystkie pytania
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Nie znalazłeś odpowiedzi?
            </h2>
            <p className="text-primary-100 mb-8">
              Nasz zespół wsparcia jest gotowy, aby Ci pomóc. Skontaktuj się z nami!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@wb-partners.pl"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Napisz do nas
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
