'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProductUpdatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/baselinker/import');
  }, [router]);

  return null;
}
