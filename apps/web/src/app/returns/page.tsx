import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Zwroty i reklamacje - WB Trade',
  description: 'Informacje o zwrotach i reklamacjach w WB Trade. Sprawdź jak zwrócić produkt lub zgłosić reklamację.',
};

export default function ReturnsPage() {
  const returnSteps = [
    {
      step: 1,
      title: 'Zgłoś zwrot',
      description: 'Zaloguj się na swoje konto i przejdź do historii zamówień. Wybierz produkt, który chcesz zwrócić i kliknij "Zgłoś zwrot".',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      step: 2,
      title: 'Spakuj produkt',
      description: 'Zapakuj produkt w oryginalne opakowanie (jeśli to możliwe). Dołącz formularz zwrotu, który otrzymasz na e-mail.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      step: 3,
      title: 'Wyślij przesyłkę',
      description: 'Nadaj paczkę w wybranym punkcie. Możesz skorzystać z darmowej etykiety zwrotnej lub wysłać na własny koszt.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      step: 4,
      title: 'Odbierz zwrot',
      description: 'Po otrzymaniu i weryfikacji zwrotu, środki zostaną zwrócone na Twoje konto w ciągu 14 dni roboczych.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  const faqItems = [
    {
      question: 'Ile mam czasu na zwrot produktu?',
      answer: 'Masz 14 dni kalendarzowych od daty otrzymania przesyłki na dokonanie zwrotu bez podania przyczyny. Termin ten wynika z ustawy o prawach konsumenta.',
    },
    {
      question: 'Czy mogę zwrócić używany produkt?',
      answer: 'Produkt musi być nieużywany, kompletny i w stanie nienaruszonym. Możesz go rozpakować i obejrzeć, ale nie powinien nosić śladów użytkowania.',
    },
    {
      question: 'Kto pokrywa koszty zwrotu?',
      answer: 'W przypadku zwrotu z powodu odstąpienia od umowy, koszty przesyłki zwrotnej pokrywa kupujący. Przy reklamacji lub błędzie sprzedawcy - koszty pokrywamy my.',
    },
    {
      question: 'Jak długo trwa zwrot pieniędzy?',
      answer: 'Zwrot środków następuje w ciągu 14 dni roboczych od momentu otrzymania i weryfikacji zwróconego produktu. Pieniądze wracają tą samą metodą płatności.',
    },
    {
      question: 'Co jeśli produkt jest uszkodzony?',
      answer: 'W przypadku uszkodzenia produktu masz prawo do reklamacji. Zgłoś problem przez formularz reklamacyjny, dołączając zdjęcia uszkodzeń.',
    },
    {
      question: 'Czy mogę wymienić produkt na inny?',
      answer: 'Tak, możesz zwrócić produkt i zamówić nowy. Bezpośrednia wymiana nie jest możliwa - prosimy o dokonanie nowego zamówienia.',
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
              Zwroty i reklamacje
            </h1>
            <p className="text-xl text-primary-100">
              Twoja satysfakcja jest dla nas najważniejsza. Jeśli produkt nie spełnił Twoich oczekiwań, 
              możesz go łatwo zwrócić lub zareklamować.
            </p>
          </div>
        </div>
      </section>

      {/* Return Policy Highlights */}
      <section className="py-12 bg-white dark:bg-secondary-800 border-b dark:border-secondary-700">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 dark:text-white">14 dni na zwrot</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Bez podania przyczyny</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 dark:text-white">Łatwy proces</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Wszystko załatwisz online</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-violet-600 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 dark:text-white">Szybki zwrot środków</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Do 14 dni roboczych</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Return Steps */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
            Jak zwrócić produkt?
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 text-center mb-12 max-w-2xl mx-auto">
            Proces zwrotu jest prosty i zajmuje tylko kilka minut. Postępuj zgodnie z poniższymi krokami.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {returnSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                    {step.description}
                  </p>
                </div>
                {index < returnSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-secondary-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              href="/account"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              Zgłoś zwrot
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Complaint Section */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-6">
                Reklamacje
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Jeśli otrzymałeś produkt uszkodzony, niezgodny z opisem lub z wadą fabryczną, 
                masz prawo do złożenia reklamacji. Rozpatrujemy reklamacje w ciągu 14 dni kalendarzowych.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white">Uszkodzenie w transporcie</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Zrób zdjęcia uszkodzonej paczki i produktu przy kurierze</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white">Wada fabryczna</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Zgłoś problem w ciągu 2 lat od zakupu (rękojmia)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white">Produkt niezgodny z opisem</h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Masz prawo do zwrotu lub wymiany na właściwy produkt</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700"
                >
                  Zgłoś reklamację
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-secondary-50 dark:bg-secondary-900 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
                Co potrzebujesz do reklamacji?
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-secondary-700 dark:text-secondary-300">Numer zamówienia</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-secondary-700 dark:text-secondary-300">Zdjęcia produktu/uszkodzenia</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <span className="text-secondary-700 dark:text-secondary-300">Opis problemu</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-secondary-700 dark:text-secondary-300">Preferowane rozwiązanie (zwrot/wymiana/naprawa)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-10 text-center">
            Często zadawane pytania
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group bg-white dark:bg-secondary-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer transition-colors">
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
                <div className="px-6 pb-6 pt-0 text-secondary-600 dark:text-secondary-400 border-t border-secondary-100 dark:border-secondary-700">
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
            Potrzebujesz pomocy?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Nasz zespół obsługi klienta jest gotowy, aby odpowiedzieć na Twoje pytania.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@wb-partners.pl"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              support@wb-partners.pl
            </a>
            <a
              href="tel:+48570034367"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +48 570 034 367
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
