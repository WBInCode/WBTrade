'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ordersApi } from '../../lib/api';

export default function ReturnsPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<{
    refundNumber: string;
    returnAddress: {
      name: string;
      contactPerson: string;
      street: string;
      city: string;
      postalCode: string;
      phone: string;
      email: string;
    };
  } | null>(null);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
  } | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [acceptedConditions, setAcceptedConditions] = useState(false);

  const handleCheckEligibility = async () => {
    if (!orderNumber.trim()) {
      setError('Wprowadź numer zamówienia');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ordersApi.checkRefundEligibility(orderNumber.trim());
      setEligibility(result);
      
      if (result.eligible) {
        setStep('confirm');
      } else {
        setError(result.reason || 'Zamówienie nie kwalifikuje się do zwrotu');
      }
    } catch (err: any) {
      setError(err.message || 'Nie znaleziono zamówienia o podanym numerze');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRefund = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await ordersApi.requestRefund(orderNumber.trim(), reason.trim());
      setRefundResult({
        refundNumber: result.refundNumber,
        returnAddress: result.returnAddress,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Nie udało się złożyć wniosku o zwrot');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrderNumber('');
    setReason('');
    setRefundResult(null);
    setEligibility(null);
    setError(null);
    setStep('form');
  };

  const returnSteps = [
    {
      step: 1,
      title: 'Podaj numer zamówienia',
      description: 'Wprowadź numer zamówienia (np. WB-XXXXXXXX-XXXX) który znajdziesz w potwierdzeniu zamówienia lub mailu.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      step: 2,
      title: 'Otrzymaj numer zwrotu',
      description: 'System wygeneruje unikalny numer zwrotu który musisz umieścić w paczce lub na paczce.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
    },
    {
      step: 3,
      title: 'Spakuj i wyślij',
      description: 'Zapakuj produkt i wyślij na podany adres. Pamiętaj o umieszczeniu numeru zwrotu w przesyłce.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      step: 4,
      title: 'Odbierz zwrot środków',
      description: 'Po otrzymaniu i weryfikacji paczki, środki zostaną zwrócone w ciągu 14 dni roboczych.',
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
      answer: 'Produkt musi być nieużywany, kompletny i w stanie nienaruszonym. Możesz go rozpakować i obejrzeć, ale opakowanie nie może być uszkodzone, a produkt nie może posiadać śladów użytkowania.',
    },
    {
      question: 'Kto pokrywa koszty zwrotu?',
      answer: 'Koszty przesyłki zwrotnej zawsze pokrywa kupujący.',
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
      question: 'Gdzie znajdę numer zamówienia?',
      answer: 'Numer zamówienia znajdziesz w mailu z potwierdzeniem zamówienia lub w historii zamówień na swoim koncie. Format: WB-XXXXXXXX-XXXX.',
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
              Zwroty i reklamacje
            </h1>
            <p className="text-xl text-primary-100">
              Twoja satysfakcja jest dla nas najważniejsza. Jeśli produkt nie spełnił Twoich oczekiwań, 
              możesz go łatwo zwrócić w ciągu 14 dni od dostawy.
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
                <h3 className="font-semibold text-secondary-900 dark:text-white">Bez logowania</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">Wystarczy numer zamówienia</p>
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

      {/* Refund Form Section */}
      <section className="py-16 lg:py-24" id="refund-form">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
              Zgłoś zwrot
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 text-center mb-8">
              Wprowadź numer zamówienia, aby rozpocząć proces zwrotu.
            </p>

            <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8">
              {step === 'form' && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Numer zamówienia
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="np. WB-MKZIFRKY-1SU5"
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckEligibility}
                    disabled={loading || !orderNumber.trim()}
                    className="w-full px-6 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sprawdzanie...' : 'Sprawdź możliwość zwrotu'}
                  </button>
                </>
              )}

              {step === 'confirm' && eligibility && (
                <>
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-400">Zamówienie kwalifikuje się do zwrotu</p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          Pozostało {eligibility.daysRemaining} dni na złożenie wniosku
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Powód zwrotu <span className="text-secondary-400 font-normal">(opcjonalnie)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Opisz powód zwrotu (opcjonalnie)..."
                      rows={3}
                      className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep('form')}
                      className="flex-1 px-6 py-4 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 font-semibold rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      Wróć
                    </button>
                    <button
                      onClick={() => setShowConditionsModal(true)}
                      disabled={loading}
                      className="flex-1 px-6 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Przetwarzanie...' : 'Złóż wniosek o zwrot'}
                    </button>
                  </div>
                </>
              )}

              {/* Conditions Modal */}
              {showConditionsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
                      <h3 className="text-xl font-bold text-secondary-900 dark:text-white">Warunki zwrotu</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                        Przed złożeniem wniosku o zwrot, upewnij się że:
                      </p>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-secondary-600 dark:text-secondary-400">Produkt jest w <strong>oryginalnym opakowaniu</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-secondary-600 dark:text-secondary-400">Produkt jest <strong>nieużywany</strong> i nie nosi śladów użytkowania</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-secondary-600 dark:text-secondary-400">Produkt jest <strong>kompletny</strong> - zawiera wszystkie elementy i akcesoria</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-secondary-600 dark:text-secondary-400">Dołączone są <strong>metki i plomby</strong> (jeśli były)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-secondary-600 dark:text-secondary-400"><strong>Koszty przesyłki zwrotnej</strong> pokrywa kupujący</span>
                        </li>
                      </ul>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          <strong>Uwaga:</strong> Produkty noszące ślady użytkowania, niekompletne lub uszkodzone z winy kupującego nie podlegają zwrotowi.
                        </p>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptedConditions}
                          onChange={(e) => setAcceptedConditions(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-secondary-700 dark:text-secondary-300">
                          Potwierdzam, że zapoznałem/am się z warunkami zwrotu i że zwracany produkt spełnia powyższe wymagania.
                        </span>
                      </label>
                    </div>
                    <div className="p-6 border-t border-secondary-200 dark:border-secondary-700 flex gap-4">
                      <button
                        onClick={() => {
                          setShowConditionsModal(false);
                          setAcceptedConditions(false);
                        }}
                        className="flex-1 px-6 py-3 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 font-semibold rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                      >
                        Anuluj
                      </button>
                      <button
                        onClick={() => {
                          setShowConditionsModal(false);
                          handleSubmitRefund();
                        }}
                        disabled={!acceptedConditions || loading}
                        className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Przetwarzanie...' : 'Potwierdzam i składam zwrot'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'success' && refundResult && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Wniosek o zwrot przyjęty!</h3>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                    Zapisz poniższe informacje - będą potrzebne do wysyłki.
                  </p>

                  {/* Refund Number */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-6 mb-6">
                    <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Twój numer zwrotu:</p>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 font-mono tracking-wider">
                      {refundResult.refundNumber}
                    </p>
                  </div>

                  {/* Return Address */}
                  <div className="bg-secondary-50 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 rounded-xl p-6 mb-6 text-left">
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">Adres do wysyłki zwrotu:</p>
                    <div className="text-secondary-900 dark:text-white">
                      <p className="font-semibold text-lg">{refundResult.returnAddress.name}</p>
                      <p>{refundResult.returnAddress.contactPerson}</p>
                      <p>{refundResult.returnAddress.street}</p>
                      <p>{refundResult.returnAddress.postalCode} {refundResult.returnAddress.city}</p>
                      <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-600 text-sm text-secondary-600 dark:text-secondary-400">
                        <p>Tel: {refundResult.returnAddress.phone}</p>
                        <p>{refundResult.returnAddress.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Important Notice */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8 text-left">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-yellow-800 dark:text-yellow-400 mb-1">Ważne!</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Umieść numer zwrotu <strong className="font-mono">{refundResult.refundNumber}</strong> wewnątrz paczki lub na zewnątrz, abyśmy mogli zidentyfikować Twój zwrot.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetForm}
                    className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    Zgłoś kolejny zwrot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Return Steps */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
            Jak działa proces zwrotu?
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 text-center mb-12 max-w-2xl mx-auto">
            Proces zwrotu jest prosty i zajmuje tylko kilka minut. Postępuj zgodnie z poniższymi krokami.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {returnSteps.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-secondary-50 dark:bg-secondary-900 rounded-2xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                    {item.description}
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
