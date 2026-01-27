'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomepagePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/homepage/carousels');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );
}
