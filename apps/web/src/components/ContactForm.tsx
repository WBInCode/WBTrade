'use client';

import { useState } from 'react';

interface ContactFormProps {
  type?: 'general' | 'product' | 'order' | 'support';
  productId?: string;
  productName?: string;
  orderId?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  issueType?: string;
  browserInfo?: string;
  pageUrl?: string;
}

const issueTypes = [
  { value: 'delivery', label: 'Problem z dostawą' },
  { value: 'payment', label: 'Problem z płatnością' },
  { value: 'product', label: 'Problem z produktem' },
  { value: 'return', label: 'Zwrot/reklamacja' },
  { value: 'other', label: 'Inne' },
];

export default function ContactForm({
  type = 'general',
  productId,
  productName,
  orderId,
}: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    issueType: 'other',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const getEndpoint = () => {
    switch (type) {
      case 'product':
        return '/api/contact/product';
      case 'order':
        return '/api/contact/order';
      case 'support':
        return '/api/contact/support';
      default:
        return '/api/contact/general';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'product':
        return `Zapytanie o produkt${productName ? `: ${productName}` : ''}`;
      case 'order':
        return `Pomoc z zamówieniem${orderId ? ` #${orderId}` : ''}`;
      case 'support':
        return 'Wsparcie techniczne';
      default:
        return 'Formularz kontaktowy';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        message: formData.message,
      };

      if (type === 'product') {
        payload.productId = productId;
        payload.productName = productName;
      } else if (type === 'order') {
        payload.orderId = orderId;
        payload.issueType = formData.issueType;
      } else if (type === 'support') {
        payload.subject = formData.subject;
        payload.browserInfo = navigator.userAgent;
        payload.pageUrl = window.location.href;
      } else {
        payload.subject = formData.subject;
      }

      const response = await fetch(`${apiUrl}${getEndpoint()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Wystąpił błąd podczas wysyłania wiadomości');
      }

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        issueType: 'other',
      });

      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (status === 'success') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Wiadomość wysłana!</h3>
        <p className="text-gray-600">
          Dziękujemy za kontakt. Odpowiemy najszybciej jak to możliwe.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Wyślij kolejną wiadomość
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{getTitle()}</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Imię i nazwisko <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Jan Kowalski"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adres e-mail <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="jan.kowalski@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefon kontaktowy (opcjonalnie)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="+48 123 456 789"
          />
        </div>

        {/* Subject (for general and support) */}
        {(type === 'general' || type === 'support') && (
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Temat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Wpisz temat wiadomości"
            />
          </div>
        )}

        {/* Issue Type (for order) */}
        {type === 'order' && (
          <div>
            <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-1">
              Typ problemu <span className="text-red-500">*</span>
            </label>
            <select
              id="issueType"
              name="issueType"
              value={formData.issueType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {issueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Wiadomość <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Opisz szczegółowo swoją sprawę..."
          />
        </div>

        {/* Error Message */}
        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Wysyłanie...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Wyślij wiadomość
            </>
          )}
        </button>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          Wysyłając formularz, zgadzasz się na przetwarzanie danych zgodnie z{' '}
          <a href="/privacy" className="text-primary-500 hover:underline">
            polityką prywatności
          </a>
          .
        </p>
      </form>
    </div>
  );
}
