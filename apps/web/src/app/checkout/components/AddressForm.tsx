'use client';

import React, { useState, useEffect } from 'react';
import { AddressData } from '../page';

interface AddressFormProps {
  initialData: AddressData;
  onSubmit: (data: AddressData) => void;
}

interface SavedAddress {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
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

// Regex patterns for validation
const PATTERNS = {
  // Tylko litery (w tym polskie znaki), spacje, myślniki i apostrofy
  nameOnly: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜßàâçéèêëïîôùûüÿœæÀÂÇÉÈÊËÏÎÔÙÛÜŸŒÆ\s\-']+$/,
  // Miasto - tylko litery, spacje i myślniki
  cityOnly: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜßàâçéèêëïîôùûüÿœæÀÂÇÉÈÊËÏÎÔÙÛÜŸŒÆ\s\-]+$/,
  // Email
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Telefon - tylko cyfry i spacje
  phoneDigits: /^[\d\s]+$/,
  // Kod pocztowy polski
  postalCodePL: /^\d{2}-\d{3}$/,
  // Ulica - litery, cyfry, spacje, myślniki, kropki, ukośniki
  street: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜß0-9\s\-\.\/]+$/,
  // Mieszkanie - litery, cyfry, spacje, myślniki, ukośniki
  apartment: /^[a-zA-Z0-9\s\-\/]+$/,
};

export default function AddressForm({ initialData, onSubmit }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressData, string>>>({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initialData.phone.replace(/^\+\d+\s*/, ''));
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Check if user is logged in and fetch saved addresses
  useEffect(() => {
    const checkAuthAndFetchAddresses = async () => {
      // Get tokens from localStorage - stored as 'auth_tokens' JSON object
      const storedTokens = localStorage.getItem('auth_tokens');
      let token = null;
      if (storedTokens) {
        try {
          const parsed = JSON.parse(storedTokens);
          token = parsed.accessToken;
        } catch {
          // Invalid token format
        }
      }
      
      if (token) {
        setIsLoggedIn(true);
        setLoadingAddresses(true);
        try {
          const response = await fetch('http://localhost:5000/api/addresses', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const addresses = await response.json();
            setSavedAddresses(addresses);
            
            // Auto-select default address if form is empty
            const defaultAddress = addresses.find((a: SavedAddress) => a.isDefault);
            if (defaultAddress && !formData.firstName && !formData.street) {
              handleSelectSavedAddress(defaultAddress.id, addresses);
            }
          }
        } catch (error) {
          console.error('Error fetching addresses:', error);
        } finally {
          setLoadingAddresses(false);
        }
      }
    };
    
    checkAuthAndFetchAddresses();
  }, []);

  // Handle selecting a saved address
  const handleSelectSavedAddress = (addressId: string, addressList?: SavedAddress[]) => {
    const addresses = addressList || savedAddresses;
    const address = addresses.find(a => a.id === addressId);
    if (address) {
      setSelectedSavedAddress(addressId);
      
      // Find country by code
      const country = countries.find(c => c.code === address.country) || countries[0];
      setSelectedCountry(country);
      
      // Extract phone number without country code
      const phone = address.phone || '';
      const phoneWithoutCode = phone.replace(/^\+\d+\s*/, '');
      setPhoneNumber(phoneWithoutCode);
      
      setFormData(prev => ({
        ...prev,
        firstName: address.firstName,
        lastName: address.lastName,
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        phone: phone,
        email: prev.email, // Keep email from initial data
      }));
    }
  };

  // Handle saving address to account
  const handleSaveAddressToAccount = async () => {
    // Get tokens from localStorage - stored as 'auth_tokens' JSON object
    const storedTokens = localStorage.getItem('auth_tokens');
    let token = null;
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        token = parsed.accessToken;
      } catch {
        // Invalid token format
      }
    }
    
    if (!token || !saveAddress) return;

    try {
      await fetch('http://localhost:5000/api/addresses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
          country: selectedCountry.code,
          phone: formData.phone,
          isDefault: savedAddresses.length === 0, // First address is default
        }),
      });
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  // Sanitize input based on field type
  const sanitizeInput = (value: string, fieldType: 'name' | 'city' | 'street' | 'apartment' | 'email'): string => {
    switch (fieldType) {
      case 'name':
        // Usuwamy wszystko oprócz liter, spacji, myślników i apostrofów
        return value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜßàâçéèêëïîôùûüÿœæÀÂÇÉÈÊËÏÎÔÙÛÜŸŒÆ\s\-']/g, '');
      case 'city':
        // Usuwamy wszystko oprócz liter, spacji i myślników
        return value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜßàâçéèêëïîôùûüÿœæÀÂÇÉÈÊËÏÎÔÙÛÜŸŒÆ\s\-]/g, '');
      case 'street':
        // Dozwolone litery, cyfry, spacje, myślniki, kropki, ukośniki
        return value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüÄÖÜß0-9\s\-\.\/]/g, '');
      case 'apartment':
        // Dozwolone litery, cyfry, spacje, myślniki, ukośniki
        return value.replace(/[^a-zA-Z0-9\s\-\/]/g, '');
      case 'email':
        // Dozwolone znaki dla email
        return value.replace(/[^a-zA-Z0-9@.\-_+]/g, '');
      default:
        return value;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Clear selected saved address when user manually edits
    if (selectedSavedAddress && name !== 'differentBillingAddress') {
      setSelectedSavedAddress(null);
    }
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    // Sanitize based on field name
    let sanitizedValue = value;
    if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = sanitizeInput(value, 'name');
    } else if (name === 'city' || name === 'billingCity') {
      sanitizedValue = sanitizeInput(value, 'city');
    } else if (name === 'street' || name === 'billingStreet') {
      sanitizedValue = sanitizeInput(value, 'street');
    } else if (name === 'apartment' || name === 'billingApartment') {
      sanitizedValue = sanitizeInput(value, 'apartment');
    } else if (name === 'email') {
      sanitizedValue = sanitizeInput(value, 'email');
    }

    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error when user types
    if (errors[name as keyof AddressData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear selected saved address when user manually edits
    if (selectedSavedAddress) {
      setSelectedSavedAddress(null);
    }
    
    // Tylko cyfry i spacje
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

    // Imię - wymagane, min 2 znaki, tylko litery
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Imię jest wymagane';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Imię musi mieć min. 2 znaki';
    } else if (!PATTERNS.nameOnly.test(formData.firstName)) {
      newErrors.firstName = 'Imię może zawierać tylko litery';
    }

    // Nazwisko - wymagane, min 2 znaki, tylko litery
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nazwisko jest wymagane';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Nazwisko musi mieć min. 2 znaki';
    } else if (!PATTERNS.nameOnly.test(formData.lastName)) {
      newErrors.lastName = 'Nazwisko może zawierać tylko litery';
    }

    // Email - wymagany, poprawny format
    if (!formData.email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else if (!PATTERNS.email.test(formData.email)) {
      newErrors.email = 'Nieprawidłowy format email';
    }

    // Telefon - wymagany, min 9 cyfr
    const phoneDigitsOnly = phoneNumber.replace(/\s/g, '');
    if (!phoneNumber.trim()) {
      newErrors.phone = 'Telefon jest wymagany';
    } else if (phoneDigitsOnly.length < 9) {
      newErrors.phone = 'Numer telefonu musi mieć min. 9 cyfr';
    } else if (phoneDigitsOnly.length > 12) {
      newErrors.phone = 'Numer telefonu jest za długi';
    }

    // Ulica - wymagana, min 3 znaki
    if (!formData.street.trim()) {
      newErrors.street = 'Ulica jest wymagana';
    } else if (formData.street.trim().length < 3) {
      newErrors.street = 'Adres musi mieć min. 3 znaki';
    }

    // Kod pocztowy - wymagany, format XX-XXX
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Kod pocztowy jest wymagany';
    } else if (!PATTERNS.postalCodePL.test(formData.postalCode)) {
      newErrors.postalCode = 'Format: XX-XXX';
    }

    // Miasto - wymagane, min 2 znaki, tylko litery
    if (!formData.city.trim()) {
      newErrors.city = 'Miasto jest wymagane';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'Miasto musi mieć min. 2 znaki';
    } else if (!PATTERNS.cityOnly.test(formData.city)) {
      newErrors.city = 'Miasto może zawierać tylko litery';
    }

    // Validate billing address if different
    if (formData.differentBillingAddress) {
      if (!formData.billingStreet?.trim()) {
        newErrors.billingStreet = 'Ulica do faktury jest wymagana';
      } else if (formData.billingStreet.trim().length < 3) {
        newErrors.billingStreet = 'Adres musi mieć min. 3 znaki';
      }

      if (!formData.billingPostalCode?.trim()) {
        newErrors.billingPostalCode = 'Kod pocztowy do faktury jest wymagany';
      } else if (!PATTERNS.postalCodePL.test(formData.billingPostalCode)) {
        newErrors.billingPostalCode = 'Format: XX-XXX';
      }

      if (!formData.billingCity?.trim()) {
        newErrors.billingCity = 'Miasto do faktury jest wymagane';
      } else if (formData.billingCity.trim().length < 2) {
        newErrors.billingCity = 'Miasto musi mieć min. 2 znaki';
      } else if (!PATTERNS.cityOnly.test(formData.billingCity)) {
        newErrors.billingCity = 'Miasto może zawierać tylko litery';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Save address to account if checkbox is checked
      if (saveAddress && isLoggedIn && !selectedSavedAddress) {
        await handleSaveAddressToAccount();
      }
      onSubmit(formData);
    }
  };

  // Format postal code as user types
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'postalCode' | 'billingPostalCode') => {
    // Clear selected saved address when user manually edits
    if (selectedSavedAddress) {
      setSelectedSavedAddress(null);
    }
    
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length > 2) {
      value = value.slice(0, 2) + '-' + value.slice(2, 5);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6">Adres dostawy</h2>

      {/* Saved addresses section */}
      {isLoggedIn && savedAddresses.length > 0 && (
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            <svg className="w-4 h-4 inline mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Twoje zapisane adresy
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedAddresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => handleSelectSavedAddress(address.id)}
                className={`p-4 text-left border rounded-lg transition-all ${
                  selectedSavedAddress === address.id
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {address.firstName} {address.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{address.street}</p>
                    <p className="text-sm text-gray-600">
                      {address.postalCode} {address.city}
                    </p>
                    {address.phone && (
                      <p className="text-sm text-gray-500 mt-1">{address.phone}</p>
                    )}
                  </div>
                  {address.isDefault && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Domyślny
                    </span>
                  )}
                </div>
                {selectedSavedAddress === address.id && (
                  <div className="mt-2 flex items-center text-sm text-orange-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Wybrany
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <button
            type="button"
            onClick={() => {
              setSelectedSavedAddress(null);
              setFormData(prev => ({
                ...prev,
                firstName: '',
                lastName: '',
                street: '',
                city: '',
                postalCode: '',
                phone: '',
              }));
              setPhoneNumber('');
            }}
            className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Wprowadź nowy adres
          </button>
        </div>
      )}

      {loadingAddresses && (
        <div className="mb-6 flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-sm text-gray-600">Ładowanie zapisanych adresów...</span>
        </div>
      )}

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

          <div className="min-w-0">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon *
            </label>
            <div className="flex">
              {/* Country code dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className={`flex items-center gap-1 px-2 py-2.5 border rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  } border-r-0`}
                >
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
                  <svg className={`w-3 h-3 text-gray-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className={`flex-1 min-w-0 px-3 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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

        {/* Save address checkbox - only show for logged in users with new address */}
        {isLoggedIn && !selectedSavedAddress && (
          <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
            <input
              type="checkbox"
              id="saveAddress"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="saveAddress" className="ml-3 text-sm text-gray-700">
              <span className="font-medium">Zapamiętaj ten adres</span>
              <span className="block text-gray-500 text-xs">Zapisz adres na swoim koncie, aby szybciej składać zamówienia</span>
            </label>
          </div>
        )}

        {/* Not logged in hint */}
        {!isLoggedIn && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-gray-600">
                  <a href="/auth/login" className="text-orange-600 hover:text-orange-700 font-medium">Zaloguj się</a>
                  {' '}lub{' '}
                  <a href="/auth/register" className="text-orange-600 hover:text-orange-700 font-medium">załóż konto</a>
                  {' '}aby zapisać adres i szybciej składać zamówienia.
                </p>
              </div>
            </div>
          </div>
        )}

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
