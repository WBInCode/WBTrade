'use client';

import React, { useState, useEffect } from 'react';
import { ShippingData, PackageShippingSelection } from '../page';
import { checkoutApi } from '../../../lib/api';

type ShippingMethodId = 'inpost_paczkomat' | 'inpost_kurier' | 'wysylka_gabaryt';

interface ShippingMethodOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
  message?: string;
  estimatedDelivery: string;
  forced?: boolean;
}

interface PackageItem {
  productId: string;
  productName: string;
  variantId: string;
  quantity: number;
  isGabaryt: boolean;
  productImage?: string;
}

interface PackageWithOptions {
  package: {
    id: string;
    type: 'standard' | 'gabaryt';
    wholesaler: string | null;
    items: PackageItem[];
    isPaczkomatAvailable: boolean;
    isInPostOnly: boolean;
  };
  shippingMethods: ShippingMethodOption[];
  selectedMethod: string;
}

interface ShippingPerPackageProps {
  initialData: ShippingData;
  onSubmit: (data: ShippingData) => void;
  onBack: () => void;
  onPriceChange?: (totalPrice: number) => void;
  cartItems?: Array<{ variant: { id: string }; quantity: number }>;
}

// Shipping provider icons
// Na ten moment tylko InPost + wysyłka gabaryt
const ShippingIcon = ({ id }: { id: string }) => {
  switch (id) {
    case 'inpost_paczkomat':
    case 'inpost_kurier':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-[#FFCD00] rounded px-1">
          <span className="text-[#1D1D1B] text-[10px] font-bold">InPost</span>
        </div>
      );
    case 'wysylka_gabaryt':
      return (
        <div className="flex items-center justify-center w-12 h-7 bg-orange-500 rounded px-1">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      );
    default:
      return null;
  }
};

export default function ShippingPerPackage({
  initialData,
  onSubmit,
  onBack,
  onPriceChange,
  cartItems,
}: ShippingPerPackageProps) {
  const [packagesWithOptions, setPackagesWithOptions] = useState<PackageWithOptions[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, ShippingMethodId>>({});
  const [paczkomatSelections, setPaczkomatSelections] = useState<Record<string, { code: string; address: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState<string | null>(null);
  
  // Custom address state per package
  const [useCustomAddress, setUseCustomAddress] = useState<Record<string, boolean>>({});
  const [customAddresses, setCustomAddresses] = useState<Record<string, {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    apartment: string;
    postalCode: string;
    city: string;
  }>>({});

  // Fetch shipping options per package
  useEffect(() => {
    async function fetchShippingOptions() {
      if (!cartItems || cartItems.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const items = cartItems.map(item => ({
          variantId: item.variant.id,
          quantity: item.quantity,
        }));

        const response = await checkoutApi.getShippingPerPackage(items);

        setPackagesWithOptions(response.packagesWithOptions);
        setWarnings(response.warnings);

        // Initialize selected methods from response defaults or initial data
        const initialMethods: Record<string, ShippingMethodId> = {};
        const initialUseCustom: Record<string, boolean> = {};
        const initialCustomAddresses: Record<string, typeof customAddresses[string]> = {};
        
        // Try to restore previous selections if available
        if (initialData.packageShipping && initialData.packageShipping.length > 0) {
          for (const pkgShipping of initialData.packageShipping) {
            initialMethods[pkgShipping.packageId] = pkgShipping.method;
            if (pkgShipping.paczkomatCode) {
              setPaczkomatSelections(prev => ({
                ...prev,
                [pkgShipping.packageId]: {
                  code: pkgShipping.paczkomatCode || '',
                  address: pkgShipping.paczkomatAddress || '',
                },
              }));
            }
            // Restore custom address if present
            if (pkgShipping.useCustomAddress && pkgShipping.customAddress) {
              initialUseCustom[pkgShipping.packageId] = true;
              initialCustomAddresses[pkgShipping.packageId] = pkgShipping.customAddress;
            }
          }
        } else {
          // Use defaults from API
          for (const pkgOpt of response.packagesWithOptions) {
            initialMethods[pkgOpt.package.id] = pkgOpt.selectedMethod as ShippingMethodId;
          }
        }
        
        setSelectedMethods(initialMethods);
        setUseCustomAddress(initialUseCustom);
        setCustomAddresses(initialCustomAddresses);
        
        // Calculate initial total
        const initialTotal = calculateTotalPrice(response.packagesWithOptions, initialMethods);
        if (onPriceChange) {
          onPriceChange(initialTotal);
        }
      } catch (err) {
        console.error('Failed to fetch shipping options:', err);
        setError('Nie udało się pobrać opcji wysyłki');
      } finally {
        setIsLoading(false);
      }
    }

    fetchShippingOptions();
  }, [cartItems]);

  const calculateTotalPrice = (
    packages: PackageWithOptions[],
    methods: Record<string, ShippingMethodId>
  ): number => {
    let total = 0;
    for (const pkgOpt of packages) {
      const selectedMethodId = methods[pkgOpt.package.id];
      const method = pkgOpt.shippingMethods.find(m => m.id === selectedMethodId && m.available);
      if (method) {
        total += method.price;
      }
    }
    return total;
  };

  const handleMethodChange = (packageId: string, methodId: ShippingMethodId) => {
    const newMethods = { ...selectedMethods, [packageId]: methodId };
    setSelectedMethods(newMethods);
    setError('');

    // Clear paczkomat selection if switching away from paczkomat
    if (methodId !== 'inpost_paczkomat') {
      setPaczkomatSelections(prev => {
        const { [packageId]: _, ...rest } = prev;
        return rest;
      });
    }
    
    // If switching to paczkomat, disable custom address for this package
    if (methodId === 'inpost_paczkomat') {
      setUseCustomAddress(prev => ({ ...prev, [packageId]: false }));
    }

    // Update total price
    const newTotal = calculateTotalPrice(packagesWithOptions, newMethods);
    if (onPriceChange) {
      onPriceChange(newTotal);
    }
  };
  
  const handleToggleCustomAddress = (packageId: string) => {
    setUseCustomAddress(prev => {
      const newValue = !prev[packageId];
      // Initialize empty address if enabling
      if (newValue && !customAddresses[packageId]) {
        setCustomAddresses(addresses => ({
          ...addresses,
          [packageId]: {
            firstName: '',
            lastName: '',
            phone: '',
            street: '',
            apartment: '',
            postalCode: '',
            city: '',
          },
        }));
      }
      return { ...prev, [packageId]: newValue };
    });
  };
  
  const handleCustomAddressChange = (packageId: string, field: string, value: string) => {
    setCustomAddresses(prev => ({
      ...prev,
      [packageId]: {
        ...prev[packageId],
        [field]: value,
      },
    }));
  };

  const openPaczkomatWidget = async (packageId: string) => {
    setIsLoadingPoints(packageId);

    try {
      // Mock paczkomat selection (same as original)
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
        setPaczkomatSelections(prev => ({
          ...prev,
          [packageId]: {
            code: mockPaczkomaty[index].code,
            address: mockPaczkomaty[index].address,
          },
        }));
      }
    } catch (err) {
      console.error('Błąd ładowania paczkomatów:', err);
      setError('Nie udało się załadować listy paczkomatów');
    } finally {
      setIsLoadingPoints(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all packages have selections
    for (const pkgOpt of packagesWithOptions) {
      const methodId = selectedMethods[pkgOpt.package.id];
      if (!methodId) {
        setError(`Wybierz metodę dostawy dla paczki: ${getPackageTitle(pkgOpt)}`);
        return;
      }

      // Check paczkomat selection if needed
      if (methodId === 'inpost_paczkomat') {
        const paczkomat = paczkomatSelections[pkgOpt.package.id];
        if (!paczkomat?.code) {
          setError(`Wybierz paczkomat dla paczki: ${getPackageTitle(pkgOpt)}`);
          return;
        }
      }
      
      // Validate custom address if enabled
      if (useCustomAddress[pkgOpt.package.id] && methodId !== 'inpost_paczkomat') {
        const addr = customAddresses[pkgOpt.package.id];
        if (!addr?.firstName || !addr?.lastName || !addr?.street || !addr?.postalCode || !addr?.city || !addr?.phone) {
          setError(`Uzupełnij adres dostawy dla paczki: ${getPackageTitle(pkgOpt)}`);
          return;
        }
      }
    }

    // Build package shipping selections
    const packageShipping: PackageShippingSelection[] = packagesWithOptions.map(pkgOpt => {
      const methodId = selectedMethods[pkgOpt.package.id];
      const method = pkgOpt.shippingMethods.find(m => m.id === methodId);
      const paczkomat = paczkomatSelections[pkgOpt.package.id];
      const hasCustomAddr = useCustomAddress[pkgOpt.package.id] && methodId !== 'inpost_paczkomat';

      return {
        packageId: pkgOpt.package.id,
        method: methodId,
        price: method?.price || 0,
        paczkomatCode: methodId === 'inpost_paczkomat' ? paczkomat?.code : undefined,
        paczkomatAddress: methodId === 'inpost_paczkomat' ? paczkomat?.address : undefined,
        useCustomAddress: hasCustomAddr,
        customAddress: hasCustomAddr ? customAddresses[pkgOpt.package.id] : undefined,
      };
    });

    const totalPrice = calculateTotalPrice(packagesWithOptions, selectedMethods);

    // Determine overall method (for backward compatibility) - use most common or first
    const methodCounts: Record<string, number> = {};
    for (const selection of packageShipping) {
      methodCounts[selection.method] = (methodCounts[selection.method] || 0) + 1;
    }
    const primaryMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'inpost_kurier';

    onSubmit({
      method: primaryMethod as ShippingData['method'],
      price: totalPrice,
      packageShipping,
      // If all packages use same paczkomat method, pass the first one for backward compat
      paczkomatCode: packageShipping.find(p => p.paczkomatCode)?.paczkomatCode,
      paczkomatAddress: packageShipping.find(p => p.paczkomatAddress)?.paczkomatAddress,
    });
  };

  const getPackageTitle = (pkgOpt: PackageWithOptions): string => {
    // Get product names from items
    const productNames = pkgOpt.package.items.map(item => item.productName);
    
    if (productNames.length === 1) {
      return productNames[0];
    } else if (productNames.length <= 3) {
      return productNames.join(', ');
    } else {
      return `${productNames.slice(0, 2).join(', ')} i ${productNames.length - 2} więcej`;
    }
  };

  const getPackageDescription = (pkgOpt: PackageWithOptions): string => {
    const itemCount = pkgOpt.package.items.reduce((sum, item) => sum + item.quantity, 0);
    if (pkgOpt.package.type === 'gabaryt') {
      return 'Produkt gabarytowy - dostawa tylko kurierem';
    }
    return `${itemCount} ${itemCount === 1 ? 'produkt' : itemCount < 5 ? 'produkty' : 'produktów'}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <svg className="animate-spin w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-3 text-gray-600">Ładowanie opcji dostawy...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Dostawa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Wybierz metodę dostawy dla każdej przesyłki
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Informacja o wysyłce</p>
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-sm text-amber-700 mt-1">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Packages with shipping options */}
        <div className="divide-y divide-gray-200">
          {packagesWithOptions.map((pkgOpt, pkgIndex) => (
            <div key={pkgOpt.package.id} className="p-6">
              {/* Package header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">{pkgIndex + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{getPackageTitle(pkgOpt)}</h3>
                  <p className="text-sm text-gray-500">{getPackageDescription(pkgOpt)}</p>
                </div>
              </div>

              {/* Products in this package */}
              <div className="ml-14 mb-4">
                <div className="flex flex-wrap gap-2">
                  {pkgOpt.package.items.map((item, itemIndex) => (
                    <div
                      key={`${item.variantId}-${itemIndex}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm"
                    >
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-6 h-6 object-cover rounded"
                        />
                      )}
                      <span className="truncate max-w-[150px]">{item.productName}</span>
                      {item.quantity > 1 && (
                        <span className="text-gray-500">x{item.quantity}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping methods for this package */}
              <div className="ml-14 space-y-2">
                {pkgOpt.shippingMethods.map(method => (
                  <div key={method.id}>
                    <label
                      className={`
                        flex items-center justify-between p-3 rounded-lg border transition-colors
                        ${!method.available
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                          : selectedMethods[pkgOpt.package.id] === method.id
                            ? 'bg-orange-50 border-orange-300 cursor-pointer'
                            : 'bg-white border-gray-200 hover:border-orange-200 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio */}
                        <div
                          className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${selectedMethods[pkgOpt.package.id] === method.id
                              ? 'border-orange-500'
                              : 'border-gray-300'
                            }
                          `}
                        >
                          {selectedMethods[pkgOpt.package.id] === method.id && (
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          )}
                        </div>

                        <input
                          type="radio"
                          name={`shipping-${pkgOpt.package.id}`}
                          value={method.id}
                          checked={selectedMethods[pkgOpt.package.id] === method.id}
                          onChange={() =>
                            method.available && handleMethodChange(pkgOpt.package.id, method.id as ShippingMethodId)
                          }
                          disabled={!method.available}
                          className="sr-only"
                        />

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 text-sm">{method.name}</span>
                            {!method.available && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                Niedostępne
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {!method.available && method.message ? method.message : method.estimatedDelivery}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ShippingIcon id={method.id} />
                        <span className="text-gray-900 font-medium text-sm min-w-[50px] text-right">
                          {method.price.toFixed(2)} zł
                        </span>
                      </div>
                    </label>

                    {/* Paczkomat selector for this package */}
                    {method.id === 'inpost_paczkomat' &&
                      selectedMethods[pkgOpt.package.id] === 'inpost_paczkomat' &&
                      method.available && (
                        <div className="mt-2 ml-7 p-3 bg-[#FFF9E6] border border-[#FFCD00] rounded-lg">
                          {paczkomatSelections[pkgOpt.package.id]?.code ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#FFCD00] rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg
                                  className="w-4 h-4 text-[#1D1D1B]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">
                                  {paczkomatSelections[pkgOpt.package.id].code}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {paczkomatSelections[pkgOpt.package.id].address}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openPaczkomatWidget(pkgOpt.package.id)}
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                              >
                                Zmień
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openPaczkomatWidget(pkgOpt.package.id)}
                              disabled={isLoadingPoints === pkgOpt.package.id}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#FFCD00] text-[#1D1D1B] text-sm font-semibold rounded-lg hover:bg-[#E6B800] transition-colors disabled:opacity-50"
                            >
                              {isLoadingPoints === pkgOpt.package.id ? (
                                <>
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  Ładowanie...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                  </svg>
                                  Wybierz paczkomat
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>
              
              {/* Custom address option - only for courier deliveries */}
              {selectedMethods[pkgOpt.package.id] && selectedMethods[pkgOpt.package.id] !== 'inpost_paczkomat' && (
                <div className="ml-14 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomAddress[pkgOpt.package.id] || false}
                      onChange={() => handleToggleCustomAddress(pkgOpt.package.id)}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Wyślij pod inny adres</span>
                  </label>
                  
                  {/* Custom address form */}
                  {useCustomAddress[pkgOpt.package.id] && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Adres dostawy dla tej przesyłki</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Imię *</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.firstName || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'firstName', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Jan"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Nazwisko *</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.lastName || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'lastName', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Kowalski"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Telefon *</label>
                          <input
                            type="tel"
                            value={customAddresses[pkgOpt.package.id]?.phone || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'phone', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="+48 123 456 789"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Ulica i numer *</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.street || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'street', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="ul. Przykładowa 10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Nr mieszkania</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.apartment || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'apartment', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="5A"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Kod pocztowy *</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.postalCode || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'postalCode', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="00-001"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Miasto *</label>
                          <input
                            type="text"
                            value={customAddresses[pkgOpt.package.id]?.city || ''}
                            onChange={(e) => handleCustomAddressChange(pkgOpt.package.id, 'city', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Warszawa"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>Otrzymasz numer śledzenia dla każdej przesyłki</span>
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
