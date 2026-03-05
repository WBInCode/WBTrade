'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../contexts/AuthContext';

type RequestType = 'RETURN' | 'COMPLAINT';
type Step = 'category' | 'order' | 'form' | 'success';

interface ReturnResult {
  returnNumber: string;
  ticketNumber: string;
  returnAddress: {
    name: string;
    contactPerson: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  };
}

export default function ReturnsPage() {
  const { user, isAuthenticated } = useAuth();

  // Form state
  const [step, setStep] = useState<Step>('category');
  const [type, setType] = useState<RequestType | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [reason, setReason] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [closeTimer, setCloseTimer] = useState(10);
  const [canClose, setCanClose] = useState(false);

  // Auto-fill user data when logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [isAuthenticated, user]);

  // 10-second countdown on success modal
  useEffect(() => {
    if (step !== 'success') return;
    setCloseTimer(10);
    setCanClose(false);

    const interval = setInterval(() => {
      setCloseTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Get auth token for optional auth
  const getToken = useCallback((): string | null => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_tokens');
      if (stored) {
        try {
          return JSON.parse(stored).accessToken || null;
        } catch { return null; }
      }
    }
    return null;
  }, []);

  // --- Step 1: Select category ---
  const handleSelectType = (t: RequestType) => {
    setType(t);
    setError(null);
    setStep('order');
  };

  // --- Step 2: Check order eligibility ---
  const handleCheckOrder = async () => {
    if (!orderNumber.trim()) {
      setError('Wprowadź numer zamówienia');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = type === 'RETURN'
        ? `${apiUrl}/contact/return-eligibility/${encodeURIComponent(orderNumber.trim())}`
        : `${apiUrl}/contact/complaint-eligibility/${encodeURIComponent(orderNumber.trim())}`;

      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      if (data.eligible) {
        setStep('form');
      } else {
        setError(data.reason || 'Zamówienie nie kwalifikuje się do zgłoszenia');
      }
    } catch (err) {
      console.error('Eligibility check error:', err);
      setError('Wystąpił błąd. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Submit form ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Opisz powód zgłoszenia');
      return;
    }

    if (!isAuthenticated) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Podaj imię i nazwisko');
        return;
      }
      if (!email.trim()) {
        setError('Podaj adres email');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiUrl}/contact/return-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          orderNumber: orderNumber.trim(),
          reason: reason.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setStep('success');
      } else {
        setError(data.message || 'Wystąpił błąd podczas wysyłania zgłoszenia');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Wystąpił błąd. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  };

  // --- Reset ---
  const resetForm = () => {
    setStep('category');
    setType(null);
    setOrderNumber('');
    setReason('');
    setError(null);
    setResult(null);
    setCanClose(false);
    setCloseTimer(10);
    if (!isAuthenticated) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
    }
  };

  // --- Process steps display ---
  const processSteps = [
    {
      step: 1,
      title: 'Wybierz typ zgłoszenia',
      description: 'Zdecyduj czy chcesz zgłosić zwrot towaru czy reklamację produktu.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      step: 2,
      title: 'Podaj numer zamówienia',
      description: 'Wprowadź numer zamówienia, aby zweryfikować możliwość zgłoszenia.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      step: 3,
      title: 'Wypełnij formularz',
      description: 'Opisz powód zgłoszenia i podaj swoje dane kontaktowe.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      step: 4,
      title: 'Otrzymaj numer zgłoszenia',
      description: 'Zapisz unikalny numer i umieść go w paczce zwrotnej.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
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
      answer: 'W przypadku uszkodzenia produktu masz prawo do reklamacji. Zgłoś problem przez formularz reklamacyjny, dołączając opis uszkodzeń.',
    },
    {
      question: 'Gdzie znajdę numer zamówienia?',
      answer: 'Numer zamówienia znajdziesz w mailu z potwierdzeniem zamówienia lub w historii zamówień na swoim koncie. Format: WB-XXXXXXXX-XXXX.',
    },
  ];

  // Step indicator helper
  const stepIndex = step === 'category' ? 0 : step === 'order' ? 1 : step === 'form' ? 2 : 3;

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
              możesz go łatwo zwrócić lub zareklamować.
            </p>
          </div>
        </div>
      </section>

      {/* Policy Highlights */}
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

      {/* Process Steps */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
            Jak działa proces?
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 text-center mb-12 max-w-2xl mx-auto">
            Proces zgłoszenia zwrotu lub reklamacji jest prosty i zajmuje tylko kilka minut.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((item, index) => (
              <div key={index} className="relative">
                <div className={`bg-secondary-50 dark:bg-secondary-900 rounded-2xl p-6 h-full transition-all ${
                  stepIndex === index ? 'ring-2 ring-primary-500 shadow-lg' : ''
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      stepIndex > index ? 'bg-green-500' : stepIndex === index ? 'bg-primary-600' : 'bg-secondary-400'
                    }`}>
                      {stepIndex > index ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        item.step
                      )}
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
                {index < processSteps.length - 1 && (
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

      {/* Main Form Section */}
      <section className="py-16 lg:py-24" id="form">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">

            {/* ===== STEP: Category Selection ===== */}
            {step === 'category' && (
              <>
                <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
                  Co chcesz zgłosić?
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 text-center mb-8">
                  Wybierz typ zgłoszenia, aby kontynuować.
                </p>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Zwrot tile */}
                  <button
                    onClick={() => handleSelectType('RETURN')}
                    className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8 text-left hover:shadow-xl hover:ring-2 hover:ring-primary-500 transition-all group"
                  >
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-2">Zwrot</h3>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Chcę zwrócić produkt w ciągu 14 dni od dostawy i otrzymać zwrot środków.
                    </p>
                  </button>

                  {/* Reklamacja tile */}
                  <button
                    onClick={() => handleSelectType('COMPLAINT')}
                    className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8 text-left hover:shadow-xl hover:ring-2 hover:ring-red-500 transition-all group"
                  >
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-2">Reklamacja</h3>
                    <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                      Produkt jest uszkodzony, wadliwy lub niezgodny z zamówieniem.
                    </p>
                  </button>
                </div>
              </>
            )}

            {/* ===== STEP: Order Number ===== */}
            {step === 'order' && (
              <>
                <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
                  {type === 'RETURN' ? 'Zgłoś zwrot' : 'Zgłoś reklamację'}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 text-center mb-8">
                  Wprowadź numer zamówienia, aby zweryfikować możliwość zgłoszenia.
                </p>

                <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Numer zamówienia
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckOrder()}
                      placeholder="np. WB-MKZIFRKY-1SU5"
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
                      onClick={() => { setStep('category'); setType(null); setError(null); }}
                      className="flex-1 px-6 py-4 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 font-semibold rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      Wróć
                    </button>
                    <button
                      onClick={handleCheckOrder}
                      disabled={loading || !orderNumber.trim()}
                      className={`flex-1 px-6 py-4 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        type === 'COMPLAINT' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {loading ? 'Sprawdzanie...' : 'Sprawdź zamówienie'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ===== STEP: Form ===== */}
            {step === 'form' && (
              <>
                <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-4 text-center">
                  {type === 'RETURN' ? 'Formularz zwrotu' : 'Formularz reklamacji'}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 text-center mb-8">
                  Wypełnij poniższe dane, aby złożyć zgłoszenie.
                </p>

                <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8">
                  {/* Verified order badge */}
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-400">Zamówienie zweryfikowane</p>
                        <p className="text-sm text-green-600 dark:text-green-500">Numer: {orderNumber}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        {type === 'RETURN' ? 'Powód zwrotu' : 'Opis problemu'} *
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={type === 'RETURN' ? 'Opisz powód zwrotu...' : 'Opisz szczegółowo problem z produktem...'}
                        required
                        rows={4}
                        className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Personal data */}
                    <div className="border-t border-secondary-200 dark:border-secondary-700 pt-5">
                      <h4 className="font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Dane kontaktowe
                        {isAuthenticated && (
                          <span className="text-xs font-normal text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-full">
                            Uzupełnione z konta
                          </span>
                        )}
                      </h4>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                            Imię *
                          </label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                            Nazwisko *
                          </label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                            Adres e-mail *
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                            Telefon <span className="text-secondary-400 font-normal">(opcjonalnie)</span>
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="np. 500 000 000"
                            className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => { setStep('order'); setError(null); }}
                        className="flex-1 px-6 py-4 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 font-semibold rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                      >
                        Wróć
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-6 py-4 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                          type === 'COMPLAINT' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Wysyłanie...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            {type === 'RETURN' ? 'Złóż zwrot' : 'Złóż reklamację'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {/* ===== STEP: Success Modal ===== */}
            {step === 'success' && result && (
              <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
                    {type === 'RETURN' ? 'Zwrot przyjęty!' : 'Reklamacja przyjęta!'}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                    Zapisz poniższe informacje — będą potrzebne do wysyłki.
                  </p>
                </div>

                {/* Return Number - RED highlighted */}
                <div className="bg-red-600 rounded-2xl p-8 mb-6 text-center">
                  <p className="text-red-100 text-sm mb-2">
                    Twój numer {type === 'RETURN' ? 'zwrotu' : 'reklamacji'}:
                  </p>
                  <p className="text-4xl font-bold text-white font-mono tracking-[4px]">
                    {result.returnNumber}
                  </p>
                </div>

                {/* RED warning about putting number on package */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-7 h-7 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-bold text-red-700 dark:text-red-400 text-lg mb-1">WAŻNE!</p>
                      <p className="text-red-700 dark:text-red-400 font-semibold">
                        Umieść numer <span className="font-mono font-bold">{result.returnNumber}</span> NA PACZCE lub WEWNĄTRZ paczki.
                      </p>
                      <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                        Bez tego numeru nie będziemy mogli zidentyfikować Twojego zgłoszenia.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Return Address */}
                <div className="bg-secondary-50 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 rounded-xl p-6 mb-6">
                  <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">Adres do wysyłki:</p>
                  <div className="text-secondary-900 dark:text-white">
                    <p className="font-semibold text-lg">{result.returnAddress.name}</p>
                    <p>{result.returnAddress.contactPerson}</p>
                    <p>{result.returnAddress.street}</p>
                    <p>{result.returnAddress.postalCode} {result.returnAddress.city}</p>
                    <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-600 text-sm text-secondary-600 dark:text-secondary-400">
                      <p>Tel: {result.returnAddress.phone}</p>
                      <p>{result.returnAddress.email}</p>
                    </div>
                  </div>
                </div>

                {/* Close button with 10s timer */}
                <button
                  onClick={canClose ? resetForm : undefined}
                  disabled={!canClose}
                  className={`w-full px-8 py-4 font-semibold rounded-xl transition-colors ${
                    canClose
                      ? 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
                      : 'bg-secondary-300 dark:bg-secondary-600 text-secondary-500 dark:text-secondary-400 cursor-not-allowed'
                  }`}
                >
                  {canClose ? 'Zamknij' : `Zamknij (${closeTimer}s)`}
                </button>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 bg-white dark:bg-secondary-800">
        <div className="container-custom">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white mb-10 text-center">
            Często zadawane pytania
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group bg-secondary-50 dark:bg-secondary-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
