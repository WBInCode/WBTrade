import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'Kontakt - WBTrade',
  description: 'Skontaktuj się z nami - WBTrade. Obsługa klienta, pytania i pomoc.',
};

export default function ContactPage() {
  const contactMethods = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'E-mail',
      value: 'support@wb-partners.pl',
      description: 'Odpowiadamy w ciągu 24 godzin',
      href: 'mailto:support@wb-partners.pl',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      title: 'Telefon',
      value: '+48 570 034 367',
      description: 'pon.–pt. 9:00–17:00',
      href: 'tel:+48570034367',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Adres',
      value: 'ul. Juliusza Słowackiego 24/11',
      description: '35-060 Rzeszów',
      href: 'https://maps.google.com/?q=ul.+Juliusza+Słowackiego+24/11,+35-060+Rzeszów',
    },
  ];

  const topics = [
    { value: 'order', label: 'Zamówienie' },
    { value: 'delivery', label: 'Dostawa' },
    { value: 'return', label: 'Zwrot/Reklamacja' },
    { value: 'payment', label: 'Płatność' },
    { value: 'account', label: 'Konto' },
    { value: 'other', label: 'Inne' },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 text-white py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Skontaktuj się z nami
            </h1>
            <p className="text-xl text-primary-100">
              Masz pytania? Chętnie pomożemy! Wybierz najwygodniejszą formę kontaktu.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-white border-b">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                className="flex items-start gap-4 p-6 bg-secondary-50 rounded-2xl hover:shadow-lg transition-all group"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 shrink-0 group-hover:scale-110 transition-transform">
                  {method.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-1">{method.title}</h3>
                  <p className="text-primary-600 font-medium">{method.value}</p>
                  <p className="text-sm text-secondary-500">{method.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 mb-6">
                Wyślij wiadomość
              </h2>
              <p className="text-secondary-600 mb-8">
                Wypełnij formularz, a nasz zespół skontaktuje się z Tobą jak najszybciej.
              </p>
              
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700 mb-2">
                      Imię *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Jan"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-secondary-700 mb-2">
                      Nazwisko *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Kowalski"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                    Adres e-mail *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="jan.kowalski@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-2">
                    Numer telefonu
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="+48 123 456 789"
                  />
                </div>
                
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-secondary-700 mb-2">
                    Temat *
                  </label>
                  <select
                    id="topic"
                    name="topic"
                    required
                    className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Wybierz temat</option>
                    {topics.map((topic) => (
                      <option key={topic.value} value={topic.value}>
                        {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-medium text-secondary-700 mb-2">
                    Numer zamówienia
                  </label>
                  <input
                    type="text"
                    id="orderNumber"
                    name="orderNumber"
                    className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="np. WBT-123456"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-2">
                    Wiadomość *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                    placeholder="Opisz swoje pytanie lub problem..."
                  />
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    name="privacy"
                    required
                    className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="privacy" className="text-sm text-secondary-600">
                    Wyrażam zgodę na przetwarzanie moich danych osobowych w celu udzielenia odpowiedzi na moje zapytanie. *
                  </label>
                </div>
                
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Wyślij wiadomość
                </button>
              </form>
            </div>
            
            {/* Company Info */}
            <div>
              <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
                <h3 className="text-xl font-semibold text-secondary-900 mb-6">
                  Dane firmy
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-secondary-900">WB PARTNERS Sp. z o.o.</h4>
                    <p className="text-secondary-600">ul. Juliusza Słowackiego 24/11</p>
                    <p className="text-secondary-600">35-060 Rzeszów</p>
                  </div>
                  <div className="pt-4 border-t border-secondary-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-secondary-500">NIP:</span>
                        <p className="font-medium text-secondary-900">8133000000</p>
                      </div>
                      <div>
                        <span className="text-secondary-500">REGON:</span>
                        <p className="font-medium text-secondary-900">380000000</p>
                      </div>
                      <div>
                        <span className="text-secondary-500">KRS:</span>
                        <p className="font-medium text-secondary-900">0000000000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
                <h3 className="text-xl font-semibold text-secondary-900 mb-6">
                  Godziny pracy
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Poniedziałek – Piątek</span>
                    <span className="font-medium text-secondary-900">9:00 – 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Sobota</span>
                    <span className="font-medium text-secondary-500">Nieczynne</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Niedziela</span>
                    <span className="font-medium text-secondary-500">Nieczynne</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary-50 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  Szybka pomoc
                </h3>
                <p className="text-secondary-600 mb-6">
                  Zanim się z nami skontaktujesz, sprawdź nasze centrum pomocy. 
                  Znajdziesz tam odpowiedzi na najczęściej zadawane pytania.
                </p>
                <div className="space-y-3">
                  <a
                    href="/help"
                    className="flex items-center justify-between p-4 bg-white rounded-xl hover:shadow-md transition-all group"
                  >
                    <span className="font-medium text-secondary-900">Centrum pomocy</span>
                    <svg className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="/faq"
                    className="flex items-center justify-between p-4 bg-white rounded-xl hover:shadow-md transition-all group"
                  >
                    <span className="font-medium text-secondary-900">FAQ</span>
                    <svg className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="/returns"
                    className="flex items-center justify-between p-4 bg-white rounded-xl hover:shadow-md transition-all group"
                  >
                    <span className="font-medium text-secondary-900">Zwroty i reklamacje</span>
                    <svg className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
