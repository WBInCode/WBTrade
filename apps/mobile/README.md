# WBTrade Mobile App

Aplikacja mobilna WBTrade (Android + iOS) zbudowana w React Native + Expo SDK 52.

## Wymagania

- Node.js 20.x lub nowszy
- pnpm (menedżer pakietów)
- Android Studio + emulator (dla testów Android)
- Konto Expo (dla buildów)

## Instalacja

```bash
# W katalogu głównym monorepo
pnpm install

# Przejdź do katalogu mobile
cd apps/mobile
```

## Uruchomienie (Development)

```bash
# Uruchom dev server
npx expo start

# W terminalu naciśnij:
# - 'a' aby uruchomić na emulatorze Android
# - 'i' aby uruchomić na symulatorze iOS (wymaga macOS)
# - zeskanuj QR kod aplikacją Expo Go na prawdziwym telefonie
```

## Buildy

### Build testowy (APK)
```bash
eas build --profile preview --platform android
```

### Build produkcyjny
```bash
eas build --profile production --platform all
```

## Konfiguracja

- `app.json` - konfiguracja Expo (bundle ID, deep linking, pluginy)
- `eas.json` - profile buildów (development, preview, production)
- `.env` - zmienne środowiskowe (API URL)

## Stack technologiczny

- **Framework**: Expo SDK 52 + React Native 0.76
- **Routing**: Expo Router 4 (file-based routing)
- **Stylowanie**: NativeWind (Tailwind CSS dla RN)
- **Auth**: expo-secure-store (JWT Bearer tokens)
- **API**: @tanstack/react-query
- **Formularze**: react-hook-form + zod

## Struktura projektu

```
apps/mobile/
├── app/               # Ekrany (Expo Router)
├── components/        # Komponenty wielokrotnego użytku
├── contexts/          # Contexty (Auth, Cart)
├── services/          # API calls
├── hooks/             # Custom hooks
└── constants/         # Stałe (kolory, config)
```

## Więcej informacji

Zobacz plik `MOBILE_APP_PLAN.md` w katalogu głównym projektu dla pełnej dokumentacji implementacji.
