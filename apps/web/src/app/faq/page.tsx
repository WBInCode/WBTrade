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
          answer: 'Aby złożyć zamówienie, dodaj wybrane produkty do koszyka i przejdź do kasy. Uzupełnij dane do wysyłki (oraz dane do faktury, jeśli chcesz ją otrzymać), wybierz metodę dostawy i płatności, a następnie potwierdź zamówienie. Po złożeniu zamówienia otrzymasz e-mail z potwierdzeniem.',
        },
        {
          question: 'Jak sprawdzić status mojego zamówienia?',
          answer: 'Status zamówienia możesz sprawdzić po zalogowaniu się na konto w zakładce "Moje zamówienia". Znajdziesz tam etap realizacji oraz (po nadaniu przesyłki) numer i link do śledzenia.',
        },
        {
          question: 'Czy mogę anulować zamówienie?',
          answer: 'Tak — możesz anulować zamówienie, o ile nie zostało jeszcze wysłane. W tym celu przejdź do „Moje zamówienia” i wybierz opcję „Anuluj zamówienie” (jeśli jest dostępna). Jeżeli zamówienie zostało już nadane, anulowanie może nie być możliwe — w takim przypadku, po otrzymaniu przesyłki, możesz skorzystać z prawa zwrotu w terminie 14 dni.',
        },
        {
          question: 'Czy mogę zmienić adres dostawy po złożeniu zamówienia?',
          answer: 'Zmiana adresu dostawy na stronie jest możliwa wyłącznie przed wysyłką zamówienia. W przypadku pomyłki lub potrzeby zmiany adresu skontaktuj się z nami jak najszybciej (formularz kontaktowy lub telefon), podając numer zamówienia i poprawny adres.',
        },
        {
          question: 'Jak otrzymam fakturę?',
          answer: 'Podczas składania zamówienia zaznacz opcję „Faktura VAT” i podaj dane do faktury (w przypadku firmy: NIP, nazwa i adres). Po opłaceniu zamówienia faktura będzie dostępna do pobrania w zakładce „Moje zamówienia” przy danym zamówieniu.',
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
          answer: 'Oferujemy: dostawę do Paczkomatów InPost, dostawę kurierską InPost, dostawę kurierską DPD oraz specjalną wysyłkę dla produktów gabarytowych (jeśli jest dostępna dla danego produktu).',
        },
        {
          question: 'Ile kosztuje dostawa?',
          answer: 'Koszt dostawy zależy od wybranej metody: Paczkomaty InPost — od 15,99 zł, Kurier InPost — od 19,99 zł. Darmowa dostawa może być dostępna dla wybranych metod po przekroczeniu progu zamówienia, jeśli zamówienie spełnia warunki promocji dla danej hurtowni. Darmowa dostawa nie dotyczy przesyłek gabarytowych. Ostateczny koszt dostawy oraz informacja o ewentualnej darmowej dostawie są widoczne w koszyku i w kasie przed złożeniem zamówienia.',
        },
        {
          question: 'Jak śledzić przesyłkę?',
          answer: 'Po nadaniu przesyłki otrzymasz e-mail z numerem (i linkiem) do śledzenia. Możesz też sprawdzić te informacje po zalogowaniu w zakładce „Moje zamówienia”.',
        },
        {
          question: 'Co zrobić, jeśli przesyłka jest uszkodzona?',
          answer: 'Jeżeli paczka ma widoczne uszkodzenia lub nosi ślady otwarcia, sprawdź ją przy odbiorze. W przypadku dostawy kurierem: sporządź protokół szkody w obecności kuriera i zrób zdjęcia. Następnie skontaktuj się z nami i przekaż numer zamówienia oraz dokumentację (zdjęcia/protokół). Masz również prawo odmówić przyjęcia uszkodzonej przesyłki.',
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
          answer: 'Akceptujemy: karty płatnicze (Visa, Mastercard), BLIK, szybkie przelewy online (PayU) oraz tradycyjny przelew bankowy.',
        },
        {
          question: 'Czy płatności są bezpieczne?',
          answer: 'Tak. Płatności są przetwarzane przez operatorów płatności, a połączenie ze sklepem jest zabezpieczone (SSL). Nie przechowujemy danych kart płatniczych.',
        },
        {
          question: 'Co zrobić, gdy płatność nie przeszła?',
          answer: 'Jeśli płatność nie została zrealizowana, sprawdź saldo i limity (karty/BLIK) oraz spróbuj ponownie lub wybierz inną metodę płatności. Jeżeli problem się powtarza, skontaktuj się z nami lub ze swoim bankiem/operatorem płatności.',
        },
        {
          question: 'Kiedy zostanie pobrana płatność?',
          answer: 'W przypadku płatności online (karta/BLIK/szybki przelew) płatność jest realizowana po potwierdzeniu transakcji. W przypadku przelewu tradycyjnego zamówienie jest realizowane po zaksięgowaniu wpłaty na naszym koncie (zwykle 1–2 dni robocze).',
        },
        {
          question: 'Czy mogę otrzymać fakturę VAT?',
          answer: 'Tak. Podczas składania zamówienia zaznacz opcję „Faktura VAT” i podaj dane do faktury (w przypadku firmy: NIP, nazwa, adres). Faktura zostanie wygenerowana i będzie dostępna w zakładce „Moje zamówienia” przy Twoim zamówieniu.',
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
          answer: 'Masz 14 dni kalendarzowych od dnia otrzymania przesyłki na zgłoszenie zwrotu bez podania przyczyny. Zgłoszenia dokonasz przez formularz na stronie "Zwroty i reklamacje"',
        },
        {
          question: 'Kto pokrywa koszty zwrotu?',
          answer: 'Koszty przesyłki zwrotnej ponosi kupujący.',
        },
        {
          question: 'Jak długo trwa zwrot pieniędzy?',
          answer: 'Zwrot środków następuje w ciągu 14 dni roboczych od otrzymania zwróconego produktu i jego weryfikacji. Środki zwracamy tą samą metodą płatności, którą opłacono zamówienie.',
        },
        {
          question: 'Jak złożyć reklamację?',
          answer: 'Reklamację możesz złożyć przez formularz na stronie lub kontaktując się z nami e-mailowo. Podaj numer zamówienia, opisz problem i dołącz zdjęcia (jeśli to możliwe). Reklamacje rozpatrujemy w ciągu 14 dni kalendarzowych od otrzymania zgłoszenia.',
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
          answer: 'Kliknij „Zaloguj” na górze strony sklepu, a następnie wybierz opcję założenia konta (zgodnie z komunikatem „Załóż konto i odbierz zniżkę”). Podaj adres e-mail, utwórz hasło i uzupełnij wymagane dane. Możesz również utworzyć konto podczas składania zamówienia.',
        },
        {
          question: 'Zapomniałem hasła, co zrobić?',
          answer: 'Kliknij „Zaloguj się”, a następnie „Zapomniałem hasła”. Podaj adres e-mail powiązany z kontem — wyślemy link do ustawienia nowego hasła. Link jest ważny przez godzinę.',
        },
        {
          question: 'Jak zmienić dane w koncie?',
          answer: 'Po zalogowaniu wejdź w „Moje konto” i wybierz odpowiednią zakładkę: „Dane osobowe” — zmiana danych osobowych, „Adresy” — zmiana/dodanie adresu dostawy i adresu rozliczeniowego (do faktury), „Zmiana hasła” — aktualizacja hasła, „Ustawienia” — preferencje konta (np. wygląd/tryb ciemny).',
        },
        {
          question: 'Czy mogę usunąć swoje konto?',
          answer: 'Tak. Po zalogowaniu wejdź w „Moje konto” → „Ustawienia” i w sekcji „Strefa zagrożenia” kliknij „Usuń konto”. Następnie potwierdź operację hasłem. Usunięcie konta jest natychmiastowe i nieodwracalne — zostaną trwale usunięte dane przypisane do konta, w tym m.in. historia zamówień, zapisane adresy oraz ewentualne korzyści przypisane do konta.',
        },
        {
          question: 'Czy moje dane są bezpieczne?',
          answer: 'Dbamy o bezpieczeństwo danych. Połączenie ze sklepem jest zabezpieczone (SSL), a dane przetwarzamy zgodnie z przepisami RODO.',
        },
      ],
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
              Najczęściej zadawane pytania
            </h1>
            <p className="text-xl text-primary-100">
              Znajdź szybkie odpowiedzi na najczęstsze pytania dotyczące zakupów w WB Trade.
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="py-8 bg-white dark:bg-secondary-800 border-b dark:border-secondary-700 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 justify-center">
            {faqCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 dark:bg-secondary-700 hover:bg-primary-100 dark:hover:bg-primary-800 text-secondary-700 dark:text-secondary-300 hover:text-primary-700 dark:hover:text-primary-300 rounded-full transition-colors"
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
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {category.name}
                  </h2>
                </div>

                <div className="space-y-4">
                  {category.questions.map((item, index) => (
                    <details
                      key={index}
                      className="group bg-white dark:bg-secondary-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <summary className="flex items-center justify-between p-6 cursor-pointer transition-colors">
                        <span className="font-semibold text-secondary-900 dark:text-white pr-4">
                          {item.question}
                        </span>
                        <svg
                          className="w-5 h-5 text-secondary-500 dark:text-secondary-400 shrink-0 group-open:rotate-180 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-6 pb-6 pt-4 text-secondary-600 dark:text-secondary-400 leading-relaxed border-t border-secondary-100 dark:border-secondary-700">
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
