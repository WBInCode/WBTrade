import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'FAQ - Najczęściej zadawane pytania - WBTrade',
  description: 'Odpowiedzi na najczęściej zadawane pytania dotyczące zakupów, dostawy, płatności i zwrotów w WBTrade',
};

export default function FAQPage() {
  const faqCategories = [
    {
      id: 'orders',
      name: 'Zamówienia',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      questions: [
        {
          question: 'Jak złożyć zamówienie?',
          answer: 'Aby złożyć zamówienie, dodaj wybrane produkty do koszyka, a następnie przejdź do kasy. Uzupełnij dane dostawy, wybierz metodę płatności i potwierdź zamówienie. Po złożeniu zamówienia otrzymasz e-mail z potwierdzeniem.',
        },
        {
          question: 'Jak sprawdzić status mojego zamówienia?',
          answer: 'Status zamówienia możesz sprawdzić po zalogowaniu się na swoje konto w zakładce "Moje zamówienia". Znajdziesz tam informacje o etapie realizacji oraz link do śledzenia przesyłki. Otrzymasz także powiadomienia e-mail i SMS o zmianach statusu.',
        },
        {
          question: 'Czy mogę anulować zamówienie?',
          answer: 'Tak, możesz anulować zamówienie, o ile nie zostało jeszcze wysłane. Przejdź do "Moje zamówienia" i kliknij "Anuluj zamówienie". Jeśli zamówienie zostało już nadane, będziesz musiał poczekać na dostawę i skorzystać z procedury zwrotu.',
        },
        {
          question: 'Czy mogę zmienić adres dostawy po złożeniu zamówienia?',
          answer: 'Zmiana adresu dostawy jest możliwa tylko przed wysyłką zamówienia. Skontaktuj się z nami jak najszybciej przez formularz kontaktowy lub telefonicznie, podając numer zamówienia i nowy adres.',
        },
        {
          question: 'Jak otrzymam fakturę?',
          answer: 'Faktura jest generowana automatycznie i wysyłana na adres e-mail podany przy zamówieniu. Możesz ją również pobrać z zakładki "Moje zamówienia" po zalogowaniu. Jeśli potrzebujesz faktury na firmę, podaj dane firmy podczas składania zamówienia.',
        },
      ],
    },
    {
      id: 'delivery',
      name: 'Dostawa',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      questions: [
        {
          question: 'Jakie są dostępne metody dostawy?',
          answer: 'Oferujemy dostawę kurierską (DPD, DHL), dostawę do Paczkomatów InPost oraz odbiór osobisty. Szczegółowe informacje o cenach i czasie dostawy znajdziesz na stronie "Dostawa".',
        },
        {
          question: 'Ile kosztuje dostawa?',
          answer: 'Koszt dostawy zależy od wybranej metody: Paczkomaty InPost od 9,99 zł, kurier DPD od 14,99 zł, kurier DHL od 16,99 zł. Darmowa dostawa dostępna przy zamówieniach powyżej określonej kwoty (od 100 zł dla Paczkomatów).',
        },
        {
          question: 'Jak długo trwa dostawa?',
          answer: 'Standardowy czas dostawy to 1-3 dni robocze od momentu nadania przesyłki. Zamówienia złożone do godziny 14:00 w dni robocze są wysyłane tego samego dnia.',
        },
        {
          question: 'Jak śledzić przesyłkę?',
          answer: 'Po nadaniu przesyłki otrzymasz e-mail i SMS z numerem śledzenia. Możesz również sprawdzić status w zakładce "Moje zamówienia". Link prowadzi bezpośrednio na stronę przewoźnika.',
        },
        {
          question: 'Co zrobić, jeśli przesyłka jest uszkodzona?',
          answer: 'W przypadku widocznych uszkodzeń paczki, sporządź protokół szkody w obecności kuriera i zrób zdjęcia. Następnie skontaktuj się z nami, a rozpatrzymy reklamację. Masz również prawo odmówić przyjęcia uszkodzonej przesyłki.',
        },
      ],
    },
    {
      id: 'payments',
      name: 'Płatności',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      questions: [
        {
          question: 'Jakie metody płatności są dostępne?',
          answer: 'Akceptujemy: karty płatnicze (Visa, Mastercard), BLIK, szybkie przelewy online (PayU, Przelewy24), tradycyjny przelew bankowy oraz płatność przy odbiorze (dla wybranych zamówień).',
        },
        {
          question: 'Czy płatności są bezpieczne?',
          answer: 'Tak, wszystkie płatności są szyfrowane i przetwarzane przez certyfikowanych operatorów płatności. Nie przechowujemy danych Twoich kart płatniczych. Strona jest zabezpieczona certyfikatem SSL.',
        },
        {
          question: 'Co zrobić, gdy płatność nie przeszła?',
          answer: 'Jeśli płatność nie została zrealizowana, sprawdź saldo konta i limity karty. Spróbuj ponownie lub wybierz inną metodę płatności. Jeśli problem się powtarza, skontaktuj się z nami lub ze swoim bankiem.',
        },
        {
          question: 'Kiedy zostanie pobrana płatność?',
          answer: 'Płatność jest pobierana natychmiast po potwierdzeniu zamówienia. W przypadku przelewu tradycyjnego, zamówienie jest realizowane po zaksięgowaniu wpłaty na naszym koncie (1-2 dni robocze).',
        },
        {
          question: 'Czy mogę otrzymać fakturę VAT?',
          answer: 'Tak, podczas składania zamówienia zaznacz opcję "Faktura VAT" i podaj dane firmy (NIP, nazwa, adres). Faktura zostanie wygenerowana automatycznie i wysłana na podany adres e-mail.',
        },
      ],
    },
    {
      id: 'returns',
      name: 'Zwroty i reklamacje',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      questions: [
        {
          question: 'Ile mam czasu na zwrot produktu?',
          answer: 'Masz 14 dni kalendarzowych od daty otrzymania przesyłki na dokonanie zwrotu bez podania przyczyny. Wystarczy zgłosić zwrot przez formularz w zakładce "Moje zamówienia".',
        },
        {
          question: 'Jak zwrócić produkt?',
          answer: 'Zaloguj się na konto, przejdź do "Moje zamówienia", wybierz produkt i kliknij "Zgłoś zwrot". Postępuj zgodnie z instrukcjami - spakuj produkt i nadaj przesyłkę. Po otrzymaniu i weryfikacji, zwrócimy środki.',
        },
        {
          question: 'Kto pokrywa koszty zwrotu?',
          answer: 'W przypadku zwrotu z tytułu odstąpienia od umowy (bez podania przyczyny), koszty przesyłki zwrotnej pokrywa kupujący. Przy reklamacji uznanej lub błędzie po naszej stronie - pokrywamy koszty.',
        },
        {
          question: 'Jak długo trwa zwrot pieniędzy?',
          answer: 'Zwrot środków następuje w ciągu 14 dni roboczych od momentu otrzymania i pozytywnej weryfikacji zwróconego produktu. Pieniądze wracają tą samą metodą, którą dokonano płatności.',
        },
        {
          question: 'Jak złożyć reklamację?',
          answer: 'Reklamację można złożyć przez formularz na stronie lub kontaktując się z nami mailowo. Podaj numer zamówienia, opis problemu i dołącz zdjęcia. Reklamacje rozpatrujemy w ciągu 14 dni kalendarzowych.',
        },
      ],
    },
    {
      id: 'account',
      name: 'Konto',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      questions: [
        {
          question: 'Jak założyć konto?',
          answer: 'Kliknij "Zarejestruj się" w prawym górnym rogu strony. Podaj adres e-mail, utwórz hasło i uzupełnij dane. Możesz również zarejestrować się podczas składania pierwszego zamówienia.',
        },
        {
          question: 'Zapomniałem hasła, co zrobić?',
          answer: 'Kliknij "Zaloguj się", a następnie "Zapomniałem hasła". Podaj adres e-mail powiązany z kontem, a wyślemy link do zresetowania hasła. Link jest ważny przez 24 godziny.',
        },
        {
          question: 'Jak zmienić dane w koncie?',
          answer: 'Po zalogowaniu przejdź do "Moje konto" > "Ustawienia". Możesz tam zmienić dane osobowe, adres dostawy, hasło oraz preferencje powiadomień.',
        },
        {
          question: 'Czy mogę usunąć swoje konto?',
          answer: 'Tak, możesz zażądać usunięcia konta kontaktując się z nami. Pamiętaj, że utracisz dostęp do historii zamówień i zgromadzonych punktów. Proces usunięcia trwa do 30 dni.',
        },
        {
          question: 'Czy moje dane są bezpieczne?',
          answer: 'Tak, dbamy o bezpieczeństwo Twoich danych. Stosujemy szyfrowanie SSL, nie udostępniamy danych osobom trzecim bez Twojej zgody i przestrzegamy przepisów RODO.',
        },
      ],
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
              Najczęściej zadawane pytania
            </h1>
            <p className="text-xl text-primary-100">
              Znajdź szybkie odpowiedzi na najczęstsze pytania dotyczące zakupów w WBTrade.
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="py-8 bg-white border-b sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 justify-center">
            {faqCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-primary-100 text-secondary-700 hover:text-primary-700 rounded-full transition-colors"
              >
                {category.icon}
                <span className="font-medium">{category.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto space-y-16">
            {faqCategories.map((category) => (
              <div key={category.id} id={category.id}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    {category.name}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {category.questions.map((item, index) => (
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
                      <div className="px-6 pb-6 pt-0 text-secondary-600 leading-relaxed border-t border-secondary-100">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Nie znalazłeś odpowiedzi na swoje pytanie?
            </h2>
            <p className="text-primary-100 mb-8">
              Skontaktuj się z nami - chętnie pomożemy!
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Formularz kontaktowy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
