'use client';

import React, { useState } from 'react';
import { AddressData } from '../page';

interface AddressFormProps {
  initialData: AddressData;
  onSubmit: (data: AddressData) => void;
}

// Lista krajów z numerami kierunkowymi
const countries = [
  { code: 'PL', name: 'Polska', dialCode: '+48', flag: '🇵🇱' },
  { code: 'DE', name: 'Niemcy', dialCode: '+49', flag: '🇩🇪' },
  { code: 'CZ', name: 'Czechy', dialCode: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Słowacja', dialCode: '+421', flag: '🇸🇰' },
  { code: 'UA', name: 'Ukraina', dialCode: '+380', flag: '🇺🇦' },
  { code: 'LT', name: 'Litwa', dialCode: '+370', flag: '🇱🇹' },
  { code: 'GB', name: 'Wielka Brytania', dialCode: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'Francja', dialCode: '+33', flag: '🇫🇷' },
  { code: 'NL', name: 'Holandia', dialCode: '+31', flag: '🇳🇱' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgia', dialCode: '+32', flag: '🇧🇪' },
  { code: 'IT', name: 'Włochy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Hiszpania', dialCode: '+34', flag: '🇪🇸' },
  { code: 'SE', name: 'Szwecja', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norwegia', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Dania', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlandia', dialCode: '+358', flag: '🇫🇮' },
  { code: 'CH', name: 'Szwajcaria', dialCode: '+41', flag: '🇨🇭' },
];

export default function AddressForm({ initialData, onSubmit }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressData, string>>>({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initialData.phone.replace(/^\+\d+\s*/, ''));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name as keyof AddressData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d\s]/g, '');
    setPhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      phone: `${selectedCountry.dialCode} ${value}`.trim(),
    }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setFormData(prev => ({
      ...prev,
      phone: `${country.dialCode} ${phoneNumber}`.trim(),
    }));
    setIsCountryDropdownOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Imię jest wymagane';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nazwisko jest wymagane';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else {
      // RFC 5322 compliant email regex
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(formData.email) || formData.email.length > 254) {
        newErrors.email = 'Podaj prawidłowy adres email';
      }
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon jest wymagany';
    } else {
      // Wyciągnij tylko cyfry z numeru telefonu (bez kierunkowego)
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 9) {
        newErrors.phone = 'Numer telefonu musi mieć minimum 9 cyfr';
      } else if (digitsOnly.length > 12) {
        newErrors.phone = 'Numer telefonu jest za długi';
      }
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Ulica jest wymagana';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Kod pocztowy jest wymagany';
    } else if (!/^\d{2}-\d{3}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Format: XX-XXX';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Miasto jest wymagane';
    }

    // Validate billing address if different
    if (formData.differentBillingAddress) {
      if (!formData.billingStreet?.trim()) {
        newErrors.billingStreet = 'Ulica do faktury jest wymagana';
      }
      if (!formData.billingPostalCode?.trim()) {
        newErrors.billingPostalCode = 'Kod pocztowy do faktury jest wymagany';
      } else if (!/^\d{2}-\d{3}$/.test(formData.billingPostalCode)) {
        newErrors.billingPostalCode = 'Format: XX-XXX';
      }
      if (!formData.billingCity?.trim()) {
        newErrors.billingCity = 'Miasto do faktury jest wymagane';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Format postal code as user types
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'postalCode' | 'billingPostalCode') => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length > 2) {
      value = value.slice(0, 2) + '-' + value.slice(2, 5);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6">Adres dostawy</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              Imię *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Jan"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Nazwisko *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Kowalski"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="jan@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon *
            </label>
            <div className="flex">
              {/* Country code dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2.5 border rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  } border-r-0`}
                >
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isCountryDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                          selectedCountry.code === country.code ? 'bg-orange-50' : ''
                        }`}
                      >
                        <span className="text-lg">{country.flag}</span>
                        <span className="flex-1 text-left text-sm text-gray-700">{country.name}</span>
                        <span className="text-sm font-medium text-gray-500">{country.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Phone number input */}
              <input
                type="tel"
                id="phone"
                name="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123 456 789"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Address fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
              Ulica i numer *
            </label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.street ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ul. Przykładowa 123"
            />
            {errors.street && (
              <p className="mt-1 text-sm text-red-500">{errors.street}</p>
            )}
          </div>

          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-1">
              Mieszkanie
            </label>
            <input
              type="text"
              id="apartment"
              name="apartment"
              value={formData.apartment}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="m. 5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
              Kod pocztowy *
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={(e) => handlePostalCodeChange(e, 'postalCode')}
              maxLength={6}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.postalCode ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="00-000"
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              Miasto *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Warszawa"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-500">{errors.city}</p>
            )}
          </div>
        </div>

        {/* Different billing address checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="differentBillingAddress"
            name="differentBillingAddress"
            checked={formData.differentBillingAddress}
            onChange={handleChange}
            className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
          />
          <label htmlFor="differentBillingAddress" className="ml-2 text-sm text-gray-700">
            Chcę podać inny adres do faktury
          </label>
        </div>

        {/* Billing address fields */}
        {formData.differentBillingAddress && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-medium">Adres do faktury</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="billingStreet" className="block text-sm font-medium text-gray-700 mb-1">
                  Ulica i numer *
                </label>
                <input
                  type="text"
                  id="billingStreet"
                  name="billingStreet"
                  value={formData.billingStreet || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.billingStreet ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ul. Przykładowa 123"
                />
                {errors.billingStreet && (
                  <p className="mt-1 text-sm text-red-500">{errors.billingStreet}</p>
                )}
              </div>

              <div>
                <label htmlFor="billingApartment" className="block text-sm font-medium text-gray-700 mb-1">
                  Mieszkanie
                </label>
                <input
                  type="text"
                  id="billingApartment"
                  name="billingApartment"
                  value={formData.billingApartment || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="m. 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="billingPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Kod pocztowy *
                </label>
                <input
                  type="text"
                  id="billingPostalCode"
                  name="billingPostalCode"
                  value={formData.billingPostalCode || ''}
                  onChange={(e) => handlePostalCodeChange(e, 'billingPostalCode')}
                  maxLength={6}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.billingPostalCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="00-000"
                />
                {errors.billingPostalCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.billingPostalCode}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700 mb-1">
                  Miasto *
                </label>
                <input
                  type="text"
                  id="billingCity"
                  name="billingCity"
                  value={formData.billingCity || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.billingCity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Warszawa"
                />
                {errors.billingCity && (
                  <p className="mt-1 text-sm text-red-500">{errors.billingCity}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors focus:ring-4 focus:ring-orange-200"
          >
            Dalej: Wybierz dostawę →
          </button>
        </div>
      </form>
    </div>
  );
}
