import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'FAQ - Najczęściej zadawane pytania - WB Trade',
  description: 'Odpowiedzi na najczęściej zadawane pytania dotyczące zakupów, dostawy, płatności i zwrotów w WB Trade',
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
          answer: 'Aby złożyć zamówienie, dodaj wybrane produkty do\u00A0koszyka, a\u00A0następnie przejdź do\u00A0kasy. Uzupełnij dane dostawy, wybierz metodę płatności i\u00A0potwierdź zamówienie. Po\u00A0złożeniu zamówienia otrzymasz e-mail z\u00A0potwierdzeniem.',
        },
        {
          question: 'Jak sprawdzić status mojego zamówienia?',
          answer: 'Status zamówienia możesz sprawdzić po\u00A0zalogowaniu się na\u00A0swoje konto w\u00A0zakładce "Moje zamówienia". Znajdziesz tam informacje o\u00A0etapie realizacji oraz\u00A0link do\u00A0śledzenia przesyłki. Otrzymasz także powiadomienia e-mail i\u00A0SMS o\u00A0zmianach statusu.',
        },
        {
          question: 'Czy mogę anulować zamówienie?',
          answer: 'Tak, możesz anulować zamówienie, o\u00A0ile nie zostało jeszcze wysłane. Przejdź do\u00A0"Moje zamówienia" i\u00A0kliknij "Anuluj zamówienie". Jeśli zamówienie zostało już nadane, będziesz musiał poczekać na\u00A0dostawę i\u00A0skorzystać z\u00A0procedury zwrotu.',
        },
        {
          question: 'Czy mogę zmienić adres dostawy po złożeniu zamówienia?',
          answer: 'Zmiana adresu dostawy jest możliwa tylko przed wysyłką zamówienia. Skontaktuj się z\u00A0nami jak najszybciej przez formularz kontaktowy lub telefonicznie, podając numer zamówienia i\u00A0nowy adres.',
        },
        {
          question: 'Jak otrzymam fakturę?',
          answer: 'Faktura jest generowana automatycznie i\u00A0wysyłana na\u00A0adres e-mail podany przy zamówieniu. Możesz ją również pobrać z\u00A0zakładki "Moje zamówienia" po\u00A0zalogowaniu. Jeśli potrzebujesz faktury na\u00A0firmę, podaj dane firmy podczas składania zamówienia.',
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
          answer: 'Oferujemy dostawę kurierską InPost, dostawę do\u00A0Paczkomatów InPost oraz\u00A0specjalną wysyłkę dla produktów gabarytowych. Szczegółowe informacje o\u00A0cenach i\u00A0czasie dostawy znajdziesz na\u00A0stronie "Dostawa".',
        },
        {
          question: 'Ile kosztuje dostawa?',
          answer: 'Koszt dostawy zależy od\u00A0wybranej metody: Paczkomaty InPost od\u00A09,99\u00A0zł, Kurier InPost od\u00A019,99\u00A0zł. Darmowa dostawa dostępna przy zamówieniach powyżej określonej kwoty (od\u00A0100\u00A0zł dla Paczkomatów).',
        },
        {
          question: 'Jak długo trwa dostawa?',
          answer: 'Standardowy czas dostawy to\u00A01–3 dni robocze od\u00A0momentu nadania przesyłki. Zamówienia złożone do\u00A0godziny 14:00 w\u00A0dni robocze są wysyłane tego samego dnia.',
        },
        {
          question: 'Jak śledzić przesyłkę?',
          answer: 'Po nadaniu przesyłki otrzymasz e-mail i\u00A0SMS z\u00A0numerem śledzenia. Możesz również sprawdzić status w\u00A0zakładce "Moje zamówienia". Link prowadzi bezpośrednio na\u00A0stronę przewoźnika.',
        },
        {
          question: 'Co zrobić, jeśli przesyłka jest uszkodzona?',
          answer: 'W\u00A0przypadku widocznych uszkodzeń paczki, sporządź protokół szkody w\u00A0obecności kuriera i\u00A0zrób zdjęcia. Następnie skontaktuj się z\u00A0nami, a\u00A0rozpatrzymy reklamację. Masz również prawo odmówić przyjęcia uszkodzonej przesyłki.',
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
          answer: 'Akceptujemy: karty płatnicze (Visa, Mastercard), BLIK, szybkie przelewy online (PayU, Przelewy24), tradycyjny przelew bankowy oraz\u00A0płatność przy odbiorze (dla wybranych zamówień).',
        },
        {
          question: 'Czy płatności są bezpieczne?',
          answer: 'Tak, wszystkie płatności są szyfrowane i\u00A0przetwarzane przez certyfikowanych operatorów płatności. Nie przechowujemy danych Twoich kart płatniczych. Strona jest zabezpieczona certyfikatem SSL.',
        },
        {
          question: 'Co zrobić, gdy płatność nie przeszła?',
          answer: 'Jeśli płatność nie została zrealizowana, sprawdź saldo konta i\u00A0limity karty. Spróbuj ponownie lub wybierz inną metodę płatności. Jeśli problem się powtarza, skontaktuj się z\u00A0nami lub ze\u00A0swoim bankiem.',
        },
        {
          question: 'Kiedy zostanie pobrana płatność?',
          answer: 'Płatność jest pobierana natychmiast po\u00A0potwierdzeniu zamówienia. W\u00A0przypadku przelewu tradycyjnego, zamówienie jest realizowane po\u00A0zaksięgowaniu wpłaty na\u00A0naszym koncie (1–2 dni robocze).',
        },
        {
          question: 'Czy mogę otrzymać fakturę VAT?',
          answer: 'Tak, podczas składania zamówienia zaznacz opcję "Faktura VAT" i\u00A0podaj dane firmy (NIP, nazwa, adres). Faktura zostanie wygenerowana automatycznie i\u00A0wysłana na\u00A0podany adres e-mail.',
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
          answer: 'Masz 14\u00A0dni kalendarzowych od\u00A0daty otrzymania przesyłki na\u00A0dokonanie zwrotu bez podania przyczyny. Wystarczy zgłosić zwrot przez formularz w\u00A0zakładce "Moje zamówienia".',
        },
        {
          question: 'Jak zwrócić produkt?',
          answer: 'Zaloguj się na\u00A0konto, przejdź do\u00A0"Moje zamówienia", wybierz produkt i\u00A0kliknij "Zgłoś zwrot". Postępuj zgodnie z\u00A0instrukcjami – spakuj produkt i\u00A0nadaj przesyłkę. Po\u00A0otrzymaniu i\u00A0weryfikacji, zwrócimy środki.',
        },
        {
          question: 'Kto pokrywa koszty zwrotu?',
          answer: 'W\u00A0przypadku zwrotu z\u00A0tytułu odstąpienia od\u00A0umowy (bez podania przyczyny), koszty przesyłki zwrotnej pokrywa kupujący. Przy reklamacji uznanej lub błędzie po\u00A0naszej stronie – pokrywamy koszty.',
        },
        {
          question: 'Jak długo trwa zwrot pieniędzy?',
          answer: 'Zwrot środków następuje w\u00A0ciągu 14\u00A0dni roboczych od\u00A0momentu otrzymania i\u00A0pozytywnej weryfikacji zwróconego produktu. Pieniądze wracają tą samą metodą, którą dokonano płatności.',
        },
        {
          question: 'Jak złożyć reklamację?',
          answer: 'Reklamację można złożyć przez formularz na\u00A0stronie lub kontaktując się z\u00A0nami mailowo. Podaj numer zamówienia, opis problemu i\u00A0dołącz zdjęcia. Reklamacje rozpatrujemy w\u00A0ciągu 14\u00A0dni kalendarzowych.',
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
          answer: 'Kliknij "Zarejestruj się" w\u00A0prawym górnym rogu strony. Podaj adres e-mail, utwórz hasło i\u00A0uzupełnij dane. Możesz również zarejestrować się podczas składania pierwszego zamówienia.',
        },
        {
          question: 'Zapomniałem hasła, co zrobić?',
          answer: 'Kliknij "Zaloguj się", a\u00A0następnie "Zapomniałem hasła". Podaj adres e-mail powiązany z\u00A0kontem, a\u00A0wyślemy link do\u00A0zresetowania hasła. Link jest ważny przez 24\u00A0godziny.',
        },
        {
          question: 'Jak zmienić dane w koncie?',
          answer: 'Po zalogowaniu przejdź do\u00A0"Moje konto" > "Ustawienia". Możesz tam zmienić dane osobowe, adres dostawy, hasło oraz\u00A0preferencje powiadomień.',
        },
        {
          question: 'Czy mogę usunąć swoje konto?',
          answer: 'Tak, możesz zażądać usunięcia konta kontaktując się z\u00A0nami. Pamiętaj, że utracisz dostęp do\u00A0historii zamówień i\u00A0zgromadzonych punktów. Proces usunięcia trwa do\u00A030\u00A0dni.',
        },
        {
          question: 'Czy moje dane są bezpieczne?',
          answer: 'Tak, dbamy o\u00A0bezpieczeństwo Twoich danych. Stosujemy szyfrowanie SSL, nie udostępniamy danych osobom trzecim bez Twojej zgody i\u00A0przestrzegamy przepisów RODO.',
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
              Znajdź szybkie odpowiedzi na najczęstsze pytania dotyczące zakupów w WB Trade.
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
