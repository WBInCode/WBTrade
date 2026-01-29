'use client';

import { useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface SpecFilterProps {
  specKey: string;
  label: string;
  options: { value: string; count: number }[];
  unit?: string;
}

function SpecificationFilterContent({ specKey, label, options, unit = '' }: SpecFilterProps) {
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
      <h3 className="font-semibold text-secondary-900 dark:text-white mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => toggleOption(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              selected === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'border-gray-200 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:border-gray-300 dark:hover:border-secondary-500'
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

export default function SpecificationFilter(props: SpecFilterProps) {
  return (
    <Suspense fallback={<div className="mb-6 animate-pulse"><div className="h-6 bg-gray-200 dark:bg-secondary-700 rounded w-1/2 mb-3"></div><div className="h-20 bg-gray-200 dark:bg-secondary-700 rounded"></div></div>}>
      <SpecificationFilterContent {...props} />
    </Suspense>
  );
}
