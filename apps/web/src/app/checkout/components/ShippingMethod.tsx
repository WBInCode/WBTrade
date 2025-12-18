'use client';

import React, { useState } from 'react';
import { ShippingData } from '../page';

interface ShippingMethodProps {
  initialData: ShippingData;
  onSubmit: (data: ShippingData) => void;
  onBack: () => void;
}

type ShippingProviderId = 'inpost_paczkomat' | 'inpost_kurier' | 'dpd' | 'pocztex' | 'dhl' | 'gls';

interface ShippingProvider {
  id: ShippingProviderId;
  name: string;
  price: number;
  estimatedDelivery: string;
  requiresPaczkomat?: boolean;
  badge?: string;
}

const shippingProviders: ShippingProvider[] = [
  { id: 'inpost_paczkomat', name: 'InPost Paczkomat', price: 9.99, estimatedDelivery: '1-2 dni', requiresPaczkomat: true, badge: 'Popularne' },
  { id: 'inpost_kurier', name: 'Kurier InPost', price: 14.99, estimatedDelivery: '1-2 dni' },
  { id: 'dpd', name: 'Kurier DPD', price: 15.99, estimatedDelivery: '1-3 dni' },
  { id: 'pocztex', name: 'Pocztex Kurier48', price: 12.99, estimatedDelivery: '2-3 dni' },
  { id: 'dhl', name: 'Kurier DHL', price: 19.99, estimatedDelivery: '1-2 dni' },
  { id: 'gls', name: 'Kurier GLS', price: 13.99, estimatedDelivery: '2-4 dni' },
];

// Ikony dla dostawców
const ShippingIcon = ({ id }: { id: ShippingProviderId }) => {
  switch (id) {
    case 'inpost_paczkomat':
    case 'inpost_kurier':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#FFCD00] rounded px-1">
          <span className="text-[#1D1D1B] text-[10px] font-bold">InPost</span>
        </div>
      );
    case 'dpd':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#DC0032] rounded px-1">
          <span className="text-white text-[10px] font-bold">DPD</span>
        </div>
      );
    case 'pocztex':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#003D7C] rounded px-1">
          <span className="text-white text-[8px] font-bold">POCZTEX</span>
        </div>
      );
    case 'dhl':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#FFCC00] rounded px-1">
          <span className="text-[#D40511] text-[10px] font-bold">DHL</span>
        </div>
      );
    case 'gls':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#003087] rounded px-1">
          <span className="text-[#F7D117] text-[10px] font-bold">GLS</span>
        </div>
      );
    default:
      return null;
  }
};

export default function ShippingMethod({ initialData, onSubmit, onBack }: ShippingMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<ShippingProviderId>(
    (initialData.method as ShippingProviderId) || 'inpost_paczkomat'
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
      paczkomatAddress: selectedMethod === 'inpost_paczkomat' ? paczkomatAddress : undefined,
      price: selectedProvider?.price || 0,
    });
  };

  const handleMethodChange = (method: ShippingProviderId) => {
    setSelectedMethod(method);
    setError('');
  };

  const openPaczkomatWidget = async () => {
    setIsLoadingPoints(true);
    
    try {
      const mockPaczkomaty = [
        { code: 'WAW123M', address: 'ul. Marszałkowska 100, 00-001 Warszawa' },
        { code: 'WAW456K', address: 'ul. Krakowska 50, 02-001 Warszawa' },
        { code: 'KRK001A', address: 'ul. Główna 1, 30-001 Kraków' },
        { code: 'GDA010B', address: 'ul. Długa 10, 80-001 Gdańsk' },
        { code: 'WRO005C', address: 'ul. Rynek 5, 50-001 Wrocław' },
      ];
      
      const selected = prompt(
        '🗺️ Wybierz paczkomat:\n\n' + 
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Dostawa</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="divide-y divide-gray-100">
          {shippingProviders.map((provider) => (
            <div key={provider.id}>
              <label
                className={`
                  flex items-center justify-between px-6 py-4 cursor-pointer transition-colors
                  ${selectedMethod === provider.id ? 'bg-gray-50' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Radio button */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${selectedMethod === provider.id
                        ? 'border-orange-500'
                        : 'border-gray-300'
                      }
                    `}
                  >
                    {selectedMethod === provider.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    )}
                  </div>

                  <input
                    type="radio"
                    name="shipping"
                    value={provider.id}
                    checked={selectedMethod === provider.id}
                    onChange={() => handleMethodChange(provider.id)}
                    className="sr-only"
                  />

                  {/* Name, badge, and delivery time */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{provider.name}</span>
                      {provider.badge && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {provider.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{provider.estimatedDelivery}</span>
                  </div>
                </div>

                {/* Right side: icon and price */}
                <div className="flex items-center gap-4">
                  <ShippingIcon id={provider.id} />
                  <span className="text-gray-900 font-medium min-w-[60px] text-right">
                    {provider.price.toFixed(2)} zł
                  </span>
                </div>
              </label>

              {/* Paczkomat selector */}
              {provider.id === 'inpost_paczkomat' && selectedMethod === 'inpost_paczkomat' && (
                <div className="mx-6 mb-4 p-4 bg-[#FFF9E6] border border-[#FFCD00] rounded-lg">
                  {paczkomatCode ? (
                    <div className="flex items-center gap-3">
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
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <svg className="w-4 h-4 text-[#FFCD00]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Paczkomaty działają 24/7
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Otrzymasz numer śledzenia przesyłki na email</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between px-6 py-4 border-t">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            ← Wstecz
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            Dalej →
          </button>
        </div>
      </form>
    </div>
  );
}
