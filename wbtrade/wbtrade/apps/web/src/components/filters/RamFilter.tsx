'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface SpecFilterProps {
  specKey: string;
  label: string;
  options: { value: string; count: number }[];
  unit?: string;
}

export default function SpecificationFilter({ specKey, label, options, unit = '' }: SpecFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const selected = searchParams.get(specKey) || '';

  const toggleOption = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selected === value) {
      params.delete(specKey);
    } else {
      params.set(specKey, value);
    }
    
    // Reset to page 1 when filtering
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, selected, specKey]);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => toggleOption(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              selected === option.value
                ? 'border-primary-500 bg-primary-50 text-primary-600'
                : 'border-gray-200 text-secondary-700 hover:border-gray-300'
            }`}
          >
            {option.value}{unit && ` ${unit}`}
          </button>
        ))}
      </div>
    </div>
  );
}

// Backwards compatibility export
export function RamFilter({ options }: { options: { value: string; count: number }[] }) {
  return (
    <SpecificationFilter
      specKey="ram"
      label="Pamięć RAM"
      options={options}
      unit="GB"
    />
  );
}
