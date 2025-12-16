'use client';

import { useState } from 'react';

interface RamOption {
  value: string;
  label: string;
}

const ramOptions: RamOption[] = [
  { value: '8', label: '8 GB' },
  { value: '16', label: '16 GB' },
  { value: '32', label: '32 GB' },
  { value: '64', label: '64 GB' },
];

export default function RamFilter() {
  const [selected, setSelected] = useState<string>('16');

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 mb-3">Pamięć RAM</h3>
      <div className="grid grid-cols-2 gap-2">
        {ramOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setSelected(option.value === selected ? '' : option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              selected === option.value
                ? 'border-primary-500 bg-primary-50 text-primary-600'
                : 'border-gray-200 text-secondary-700 hover:border-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
