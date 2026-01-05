'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/settings/company');
  }, [router]);
  
  return null;
}
