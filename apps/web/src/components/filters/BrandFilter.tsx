'use client';

import { useState } from 'react';

interface Brand {
  id: string;
  name: string;
  count: number;
  checked: boolean;
}

export default function BrandFilter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([
    { id: 'lenovo', name: 'Lenovo', count: 1420, checked: false },
    { id: 'asus', name: 'ASUS', count: 315, checked: false },
    { id: 'msi', name: 'MSI', count: 186, checked: false },
    { id: 'dell', name: 'Dell', count: 1300, checked: false },
    { id: 'hp', name: 'HP', count: 961, checked: false },
  ]);

  const toggleBrand = (id: string) => {
    setBrands(prev => 
      prev.map(brand => brand.id === id ? { ...brand, checked: !brand.checked } : brand)
    );
  };

  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 mb-3">Marki</h3>
      
      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Szukaj marek..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pl-9"
        />
        <svg 
          className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Brand list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filteredBrands.map(brand => (
          <label key={brand.id} className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                brand.checked 
                  ? 'bg-primary-500 border-primary-500' 
                  : 'border-gray-300 group-hover:border-primary-400'
              }`}>
                {brand.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-secondary-700">{brand.name}</span>
            </div>
            <span className="text-xs text-gray-400">({brand.count})</span>
          </label>
        ))}
      </div>
    </div>
  );
}
