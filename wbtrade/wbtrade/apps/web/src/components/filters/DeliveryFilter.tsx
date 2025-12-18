'use client';

import { useState } from 'react';

interface DeliveryOption {
  id: string;
  label: string;
  checked: boolean;
}

export default function DeliveryFilter() {
  const [options, setOptions] = useState<DeliveryOption[]>([
    { id: 'smart', label: 'WBTrade Smart!', checked: true },
    { id: 'free', label: 'Darmowa dostawa', checked: false },
    { id: 'tomorrow', label: 'Dostawa jutro', checked: false },
  ]);

  const toggleOption = (id: string) => {
    setOptions(prev => 
      prev.map(opt => opt.id === id ? { ...opt, checked: !opt.checked } : opt)
    );
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 mb-3">Opcje dostawy</h3>
      <div className="space-y-2">
        {options.map(option => (
          <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              option.checked 
                ? 'bg-primary-500 border-primary-500' 
                : 'border-gray-300 group-hover:border-primary-400'
            }`}>
              {option.checked && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-secondary-700">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
