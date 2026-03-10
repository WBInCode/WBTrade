'use client';

import { useState, FormEvent } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const topics = [
  { value: 'order', label: 'Zamówienie' },
  { value: 'delivery', label: 'Dostawa' },
  { value: 'return', label: 'Zwrot/Reklamacja' },
  { value: 'payment', label: 'Płatność' },
  { value: 'account', label: 'Konto' },
  { value: 'other', label: 'Inne' },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    topic: '',
    orderNumber: '',
    message: '',
    privacy: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus('error');
      setErrorMessage('Wypełnij wszystkie wymagane pola.');
      return;
    }

    if (!formData.privacy) {
      setStatus('error');
      setErrorMessage('Musisz wyrazić zgodę na przetwarzanie danych osobowych.');
      return;
    }

    try {
      const topicLabel = topics.find(t => t.value === formData.topic)?.label || 'Ogólne';
      const subject = formData.orderNumber
        ? `${topicLabel} - zamówienie ${formData.orderNumber}`
        : topicLabel;

      const res = await fetch(`${API_URL}/contact/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          email: formData.email.trim(),
          subject,
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          topic: '',
          orderNumber: '',
          message: '',
          privacy: false,
        });
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Błąd połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
          Wiadomość wysłana!
        </h3>
        <p className="text-green-700 dark:text-green-400 mb-6">
          Dziękujemy za kontakt. Odpowiemy najszybciej jak to możliwe, zazwyczaj w ciągu 24 godzin.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
        >
          Wyślij kolejną wiadomość
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Imię *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
            placeholder="Jan"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Nazwisko *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
            placeholder="Kowalski"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Adres e-mail *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
          placeholder="jan.kowalski@example.com"
        />
      </div>
      
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Numer telefonu
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
          placeholder="+48 123 456 789"
        />
      </div>
      
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Temat *
        </label>
        <select
          id="topic"
          name="topic"
          required
          value={formData.topic}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
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
        <label htmlFor="orderNumber" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Numer zamówienia
        </label>
        <input
          type="text"
          id="orderNumber"
          name="orderNumber"
          value={formData.orderNumber}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
          placeholder="np. WBT-123456"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Wiadomość *
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          value={formData.message}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none dark:bg-secondary-800 dark:text-white dark:border-secondary-600"
          placeholder="Opisz swoje pytanie lub problem..."
        />
      </div>
      
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy"
          name="privacy"
          required
          checked={formData.privacy}
          onChange={handleChange}
          className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
        />
        <label htmlFor="privacy" className="text-sm text-secondary-600 dark:text-secondary-400">
          Wyrażam zgodę na przetwarzanie moich danych osobowych w celu udzielenia odpowiedzi na moje zapytanie. *
        </label>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}
      
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Wysyłanie...
          </span>
        ) : (
          'Wyślij wiadomość'
        )}
      </button>
    </form>
  );
}
