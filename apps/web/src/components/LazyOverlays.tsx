'use client';

import dynamic from 'next/dynamic';

// Lazy load non-critical overlays — JS downloaded after page renders
const WelcomeDiscountPopup = dynamic(
  () => import('./WelcomeDiscountPopup').then(mod => ({ default: mod.WelcomeDiscountPopup })),
  { ssr: false }
);
const CookieConsent = dynamic(
  () => import('./CookieConsent'),
  { ssr: false }
);
const ChatBotWidget = dynamic(
  () => import('./ChatBot'),
  { ssr: false }
);

export default function LazyOverlays() {
  return (
    <>
      <WelcomeDiscountPopup />
      <CookieConsent />
      <ChatBotWidget />
    </>
  );
}
