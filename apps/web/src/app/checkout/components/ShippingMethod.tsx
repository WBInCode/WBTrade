'use client';

import React, { useState } from 'react';
import { ShippingData } from '../page';

interface ShippingMethodProps {
  initialData: ShippingData;
  onSubmit: (data: ShippingData) => void;
  onBack: () => void;
}

// Dostawcy - przygotowane pod integrację z API
const shippingProviders = [
  {
    id: 'inpost_paczkomat',
    name: 'InPost Paczkomat',
    description: 'Dostawa do wybranego paczkomatu 24/7',
    price: 9.99,
    estimatedDelivery: '1-2 dni robocze',
    logoColors: { bg: '#FFCD00', text: '#1D1D1B' },
    logoText: 'InPost',
    requiresPaczkomat: true,
    apiEndpoint: '/api/shipping/inpost/points',
    trackingUrl: 'https://inpost.pl/sledzenie-przesylek?number=',
  },
  {
    id: 'inpost_kurier',
    name: 'Kurier InPost',
    description: 'Dostawa kurierem pod wskazany adres',
    price: 14.99,
    estimatedDelivery: '1-2 dni robocze',
    logoColors: { bg: '#FFCD00', text: '#1D1D1B' },
    logoText: 'InPost',
    requiresPaczkomat: false,
    apiEndpoint: '/api/shipping/inpost/courier',
    trackingUrl: 'https://inpost.pl/sledzenie-przesylek?number=',
  },
  {
    id: 'dpd',
    name: 'Kurier DPD',
    description: 'Dostawa kurierem DPD pod wskazany adres',
    price: 15.99,
    estimatedDelivery: '1-3 dni robocze',
    logoColors: { bg: '#DC0032', text: '#FFFFFF' },
    logoText: 'DPD',
    requiresPaczkomat: false,
    apiEndpoint: '/api/shipping/dpd/shipment',
    trackingUrl: 'https://www.dpd.com.pl/tracking?q=',
  },
  {
    id: 'pocztex',
    name: 'Pocztex Kurier48',
    description: 'Dostawa Pocztą Polską w 48h',
    price: 12.99,
    estimatedDelivery: '2-3 dni robocze',
    logoColors: { bg: '#003D7C', text: '#FFFFFF' },
    logoText: 'POCZTEX',
    requiresPaczkomat: false,
    apiEndpoint: '/api/shipping/pocztex/shipment',
    trackingUrl: 'https://emonitoring.poczta-polska.pl/?numer=',
  },
  {
    id: 'dhl',
    name: 'Kurier DHL',
    description: 'Dostawa ekspresowa DHL',
    price: 19.99,
    estimatedDelivery: '1-2 dni robocze',
    logoColors: { bg: '#FFCC00', text: '#D40511' },
    logoText: 'DHL',
    requiresPaczkomat: false,
    apiEndpoint: '/api/shipping/dhl/shipment',
    trackingUrl: 'https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=',
  },
  {
    id: 'gls',
    name: 'Kurier GLS',
    description: 'Ekonomiczna dostawa kurierska GLS',
    price: 13.99,
    estimatedDelivery: '2-4 dni robocze',
    logoColors: { bg: '#003087', text: '#F7D117' },
    logoText: 'GLS',
    requiresPaczkomat: false,
    apiEndpoint: '/api/shipping/gls/shipment',
    trackingUrl: 'https://gls-group.eu/PL/pl/sledzenie-paczek?match=',
  },
] as const;

type ShippingProviderId = typeof shippingProviders[number]['id'];

export default function ShippingMethod({ initialData, onSubmit, onBack }: ShippingMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<ShippingProviderId>(
    (initialData.method === 'pickup' ? 'inpost_kurier' : initialData.method) as ShippingProviderId
  );
  const [paczkomatCode, setPaczkomatCode] = useState(initialData.paczkomatCode || '');
  const [paczkomatAddress, setPaczkomatAddress] = useState('');
  const [error, setError] = useState('');
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  const selectedProvider = shippingProviders.find(p => p.id === selectedMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedMethod === 'inpost_paczkomat' && !paczkomatCode.trim()) {
      setError('Proszę wybrać paczkomat');
      return;
    }

    onSubmit({
      method: selectedMethod as ShippingData['method'],
      paczkomatCode: selectedMethod === 'inpost_paczkomat' ? paczkomatCode : undefined,
      price: selectedProvider?.price || 0,
    });
  };

  const handleMethodChange = (method: ShippingProviderId) => {
    setSelectedMethod(method);
    setError('');
  };

  // Integracja z InPost Geowidget
  const openPaczkomatWidget = async () => {
    setIsLoadingPoints(true);
    
    try {
      // TODO: Integracja z InPost API - https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18219044/Geowidget+v5
      const mockPaczkomaty = [
        { code: 'WAW123M', address: 'ul. Marszałkowska 100, 00-001 Warszawa' },
        { code: 'WAW456K', address: 'ul. Krakowska 50, 02-001 Warszawa' },
        { code: 'KRK001A', address: 'ul. Główna 1, 30-001 Kraków' },
        { code: 'GDA010B', address: 'ul. Długa 10, 80-001 Gdańsk' },
        { code: 'WRO005C', address: 'ul. Rynek 5, 50-001 Wrocław' },
      ];
      
      const selected = prompt(
        '🗺️ Wybierz paczkomat (symulacja InPost Geowidget):\n\n' + 
        mockPaczkomaty.map((p, i) => `${i + 1}. ${p.code} - ${p.address}`).join('\n') +
        '\n\nWpisz numer (1-5):'
      );
      
      if (selected && ['1', '2', '3', '4', '5'].includes(selected)) {
        const index = parseInt(selected) - 1;
        setPaczkomatCode(mockPaczkomaty[index].code);
        setPaczkomatAddress(mockPaczkomaty[index].address);
      }
    } catch (err) {
      console.error('Błąd ładowania paczkomatów:', err);
      setError('Nie udało się załadować listy paczkomatów');
    } finally {
      setIsLoadingPoints(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-2">Metoda dostawy</h2>
      <p className="text-sm text-gray-500 mb-6">Wybierz preferowanego przewoźnika</p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {shippingProviders.map((provider) => (
            <div key={provider.id}>
              <label
                className={`
                  flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${selectedMethod === provider.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={provider.id}
                  checked={selectedMethod === provider.id}
                  onChange={() => handleMethodChange(provider.id)}
                  className="sr-only"
                />
                
                {/* Logo dostawcy */}
                <div 
                  className="w-14 h-9 rounded flex items-center justify-center flex-shrink-0 mr-4"
                  style={{ backgroundColor: provider.logoColors.bg }}
                >
                  <span 
                    className="font-bold text-xs"
                    style={{ color: provider.logoColors.text }}
                  >
                    {provider.logoText}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{provider.name}</span>
                    {provider.id === 'inpost_paczkomat' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Popularne
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{provider.description}</p>
                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {provider.estimatedDelivery}
                  </span>
                </div>

                {/* Cena */}
                <div className="flex-shrink-0 ml-4 text-right">
                  <span className="font-semibold text-gray-900">
                    {provider.price.toFixed(2)} zł
                  </span>
                </div>

                {/* Radio indicator */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 ml-4 flex-shrink-0 flex items-center justify-center
                    ${selectedMethod === provider.id
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-gray-300'
                    }
                  `}
                >
                  {selectedMethod === provider.id && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>

              {/* Paczkomat selector - tylko dla InPost Paczkomat */}
              {provider.id === 'inpost_paczkomat' && selectedMethod === 'inpost_paczkomat' && (
                <div className="ml-4 mt-3 p-4 bg-[#FFF9E6] border border-[#FFCD00] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wybrany paczkomat
                      </label>
                      {paczkomatCode ? (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-10 h-10 bg-[#FFCD00] rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-[#1D1D1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{paczkomatCode}</p>
                            <p className="text-sm text-gray-500 truncate">{paczkomatAddress}</p>
                          </div>
                          <button
                            type="button"
                            onClick={openPaczkomatWidget}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Zmień
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={openPaczkomatWidget}
                          disabled={isLoadingPoints}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFCD00] text-[#1D1D1B] font-semibold rounded-lg hover:bg-[#E6B800] transition-colors disabled:opacity-50"
                        >
                          {isLoadingPoints ? (
                            <>
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Ładowanie...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              Wybierz paczkomat na mapie
                            </>
                          )}
                        </button>
                      )}
                      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <svg className="w-4 h-4 text-[#FFCD00]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Odbierz paczkę kiedy chcesz - paczkomaty działają 24/7
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info o śledzeniu */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Śledzenie przesyłki</p>
              <p className="text-xs text-blue-600 mt-1">
                Po wysłaniu zamówienia otrzymasz email z numerem przesyłki i linkiem do śledzenia.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            ← Wróć
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
          >
            Dalej: Wybierz płatność →
          </button>
        </div>
      </form>
    </div>
  );
}
