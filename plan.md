 
 # 🛒 WBTrade - Plan Budowy Sklepu E-commerce

> **Skala**: 10,000 - 100,000 produktów  
> **Zamówienia**: 500 - 5,000 dziennie  
> **Funkcje**: Sklep + Magazyn (WMS) + Panel Admin  
> **Data utworzenia**: 16 grudnia 2024

---

## 📋 Spis treści

1. [Stack technologiczny](#-stack-technologiczny)
2. [Etap 1: Naprawa fundamentów](#etap-1-naprawa-fundamentów-1-2-dni)
3. [Etap 2: Frontend – UI statyczne](#etap-2-frontend--ui-statyczne-3-5-dni)
4. [Etap 3: Frontend – formularze i flow](#etap-3-frontend--formularze-i-flow-2-3-dni)
5. [Etap 4: Baza danych – schemat Prisma](#etap-4-baza-danych--schemat-prisma-2-3-dni)
6. [Etap 5: Backend – CRUD i logika](#etap-5-backend--crud-i-logika-5-7-dni)
7. [Etap 6: Integracje zewnętrzne](#etap-6-integracje-zewnętrzne-3-5-dni)
8. [Etap 7: Panel Admin + WMS](#etap-7-panel-admin--wms-5-7-dni)
9. [Etap 8: Optymalizacja i skala](#etap-8-optymalizacja-i-skala-3-5-dni)
10. [Rozszerzenia opcjonalne](#-rozszerzenia-opcjonalne)

---

## 🛠 Stack Technologiczny

| Warstwa | Technologia |
|---------|-------------|
| **Frontend (Sklep)** | Next.js 14 + TypeScript + Tailwind CSS |
| **Frontend (Admin)** | Next.js 14 + TypeScript + Tailwind CSS |
| **Backend API** | NestJS / Express + TypeScript |
| **Baza danych** | PostgreSQL + Prisma ORM |
| **Cache** | Redis |
| **Kolejki** | BullMQ + Redis |
| **Wyszukiwarka** | Meilisearch |
| **Storage (pliki)** | S3 / Cloudflare R2 |
| **Płatności** | Stripe / PayU / Przelewy24 |
| **Email** | Nodemailer / Resend |
| **Monitoring** | Sentry + Prometheus + Grafana |
| **CI/CD** | GitHub Actions |
| **Konteneryzacja** | Docker + Docker Compose |

---

## Etap 1: Naprawa fundamentów (1-2 dni) ✅ UKOŃCZONY

> ✅ **Status: UKOŃCZONY** - 16 grudnia 2025

### TODO

- [x] **1.1** Usunąć Mongoose z `apps/api/package.json` ✅ (nie było Mongoose)
- [x] **1.2** Zainstalować Prisma + PostgreSQL driver ✅
  ```bash
  cd apps/api
  npm install prisma @prisma/client
  npm install pg
  npx prisma init
  ```
- [x] **1.3** Skonfigurować npm workspaces w root `package.json` ✅
- [x] **1.4** Stworzyć brakujący plik `apps/web/src/lib/api.ts` ✅
  - Klient fetch do komunikacji z API
  - Obsługa błędów, interceptory
- [x] **1.5** Naprawić eksporty w `apps/api/src/routes/products.ts` ✅
  - Zmienić import klasy na funkcje kontrolera
- [x] **1.6** Stworzyć `docker-compose.yml` w root ✅
  - PostgreSQL (port 5432)
  - Redis (port 6379)
  - Meilisearch (port 7700)
- [x] **1.7** Zaktualizować `.env.example` z poprawnymi zmiennymi ✅
- [x] **1.8** Przetestować uruchomienie: `docker-compose up` + `npm run dev` ✅

### Pliki do utworzenia/edycji

- `docker-compose.yml`
- `apps/web/src/lib/api.ts`
- `apps/api/prisma/schema.prisma`
- `.env` (z `.env.example`)

---

## Etap 2: Frontend – UI statyczne (3-5 dni)

> 🎨 **Cel**: Kompletny UI sklepu (bez działającego API)

### TODO

#### Strona główna (`apps/web/src/app/page.tsx`)

- [x] **2.1** Hero section z CTA ✅ (HeroBanner.tsx)
- [x] **2.2** Sekcja kategorii (grid/carousel) ✅ (Category icons)
- [x] **2.3** Bestsellery / Polecane produkty ✅ (Super Price + Recommended)
- [ ] **2.4** Newsletter signup
- [x] **2.5** Footer z linkami ✅ (Footer.tsx)

#### Listing produktów (`apps/web/src/app/products/page.tsx`)

- [x] **2.6** Grid produktów (responsywny) ✅ (Homepage grid)
- [x] **2.7** Filtry boczne (kategoria, cena, atrybuty) ✅ (Deals page sidebar)
- [x] **2.8** Sortowanie (cena, nazwa, popularność) ✅ (Deals page)
- [ ] **2.9** Paginacja / Infinite scroll
- [ ] **2.10** Skeleton loading

#### Karta produktu (`apps/web/src/components/ProductCard.tsx`)

- [x] **2.11** Zdjęcie z hover effect ✅
- [x] **2.12** Nazwa, cena, stara cena (przekreślona) ✅
- [x] **2.13** Badge (nowość, promocja, wyprzedane) ✅ (Discount badge)
- [x] **2.14** Quick add to cart button ✅ (na stronie produktu)
- [ ] **2.15** Wishlist icon

#### Strona produktu (`apps/web/src/app/products/[id]/page.tsx`)

- [x] **2.16** Galeria zdjęć (thumbnails + lightbox) ✅ (Image gallery with thumbnails)
- [x] **2.17** Wybór wariantów (rozmiar, kolor) ✅ (Dynamic variant selector with Color/Size dropdowns)
- [x] **2.18** Stan magazynowy (dostępność) ✅ (Stock status indicator)
- [x] **2.19** Quantity selector ✅ (Input + buttons with stock limit validation)
- [x] **2.20** Przycisk "Dodaj do koszyka" ✅ (Add to Cart + Buy Now buttons)
- [x] **2.21** Opis produktu (tabs: opis, specyfikacja, opinie) ✅ (Full tabbed interface)
- [x] **2.22** Produkty powiązane ✅ (Customers also viewed carousel)

#### Koszyk (`apps/web/src/app/cart/page.tsx`) ✅ UKOŃCZONY

- [x] **2.23** Lista produktów w koszyku ✅
- [x] **2.24** Edycja ilości ✅
- [x] **2.25** Usuwanie pozycji ✅
- [x] **2.26** Podsumowanie (suma, dostawa, VAT) ✅
- [x] **2.27** Kod rabatowy input ✅
- [x] **2.28** Przycisk "Do kasy" ✅
- [x] **2.29** Empty cart state ✅
- [x] **2.29a** Sekcja "Może Cię zainteresować" z sugerowanymi produktami ✅
- [x] **2.29b** Sekcja "Dlaczego warto kupić w WBTrade" ✅

#### Header (`apps/web/src/components/Header.tsx`) ✅ UKOŃCZONY

- [x] **2.30** Logo + nawigacja ✅
- [x] **2.31** SearchBar (desktop + mobile) ✅
- [x] **2.32** Ikona koszyka z licznikiem ✅ (dynamiczny licznik z CartContext)
- [x] **2.33** Ikona konta (login/register lub dropdown) ✅
- [x] **2.34** Mobile menu (hamburger) ✅ (Categories mobile)
- [x] **2.35** Link do strony Deals w nawigacji ✅ (Orange highlighted link)

#### SearchBar (`apps/web/src/components/SearchBar.tsx`)

- [x] **2.35** Input z ikoną ✅
- [ ] **2.36** Autocomplete dropdown
- [ ] **2.37** Debounce (300ms)
- [ ] **2.38** Ostatnie wyszukiwania
- [ ] **2.39** Popularne produkty w dropdown

#### Strona Deals/Promocje (`apps/web/src/app/deals/page.tsx`) - NOWA ✅

- [x] **2.40** Hero banner z promocją (Summer Clearance) ✅
- [x] **2.41** Deal of the Day z countdown/progress ✅
- [x] **2.42** Top Discounts carousel (6 produktów) ✅
- [x] **2.43** Category pills navigation ✅
- [x] **2.44** Sidebar z filtrami (kategorie, cena, dostawa) ✅
- [x] **2.45** Trending Now grid z sortowaniem ✅
- [x] **2.46** Product badges (Super Price, Bestseller, %) ✅
- [x] **2.47** Smart Free delivery labels ✅

#### Cart Context (`apps/web/src/contexts/CartContext.tsx`) ✅ NOWY

- [x] **2.48** CartProvider z globalnym stanem koszyka ✅
- [x] **2.49** useCart hook ✅
- [x] **2.50** Automatyczne ładowanie koszyka ✅
- [x] **2.51** sessionId dla gości (localStorage) ✅
- [x] **2.52** Obliczanie liczby produktów w koszyku ✅

#### Footer (`apps/web/src/components/Footer.tsx`) ✅

- [x] **2.53** Trust badges (Ochrona kupującego, Szybka dostawa, Bezpieczne płatności) ✅
- [x] **2.54** Linki do sekcji (O nas, Pomoc, Sprzedaż) ✅
- [x] **2.55** Aplikacja mobilna badges ✅
- [x] **2.56** Opcjonalne ukrywanie trust badges (hideTrustBadges prop) ✅

---
## Etap 3: Frontend – formularze i flow (2-3 dni)

> 📝 **Cel**: Kompletny flow zakupowy

### TODO

#### Checkout (`apps/web/src/app/checkout/page.tsx`) ✅ UKOŃCZONY

- [x] **3.1** Multi-step form (adres → dostawa → płatność → podsumowanie) ✅
- [x] **3.2** Formularz adresu (walidacja) ✅
- [x] **3.3** Wybór dostawy (InPost, kurier, odbiór) ✅
- [x] **3.4** Wybór płatności (karta, BLIK, przelew) ✅
- [x] **3.5** Podsumowanie zamówienia ✅
- [x] **3.6** Checkbox regulamin + RODO ✅
- [x] **3.7** Przycisk "Zamawiam i płacę" ✅

#### Auth (`apps/web/src/app/auth/`) ✅ UKOŃCZONY

- [x] **3.8** Strona logowania (`login/page.tsx`) ✅
- [x] **3.9** Strona rejestracji (`register/page.tsx`) ✅
- [x] **3.10** Reset hasła (`forgot-password/page.tsx` + `reset-password/page.tsx`) ✅
- [x] **3.11** Walidacja formularzy (RFC 5322 email, hasło, telefon) ✅
- [x] **3.12** Social login buttons - POMINIĘTE (wymaga OAuth)

#### Panel klienta (`apps/web/src/app/account/`)

- [x] **3.13** Dashboard klienta (`page.tsx`) ✅ (Full user dashboard with stats, orders, recommendations)
- [ ] **3.14** Historia zamówień (`orders/page.tsx`)
- [ ] **3.15** Szczegóły zamówienia (`orders/[id]/page.tsx`)
- [ ] **3.16** Dane osobowe (`profile/page.tsx`)
- [ ] **3.17** Adresy (`addresses/page.tsx`)
- [ ] **3.18** Zmiana hasła (`password/page.tsx`)

#### Strona zamówienia (`apps/web/src/app/order/[id]/page.tsx`)

- [ ] **3.19** Status zamówienia (timeline)
- [ ] **3.20** Tracking przesyłki
- [ ] **3.21** Pobranie faktury PDF
- [ ] **3.22** Kontakt ws. zamówienia

---
## Etap 4: Baza danych – schemat Prisma (2-3 dni) ✅ UKOŃCZONY

> ✅ **Status: UKOŃCZONY** - 16 grudnia 2025

### TODO

#### Schema (`apps/api/prisma/schema.prisma`)

- [x] **4.1** Model `User` (id, email, password, role, created_at, updated_at) ✅
- [x] **4.2** Model `Address` (user_id, street, city, postal_code, country, is_default) ✅
- [x] **4.3** Model `Category` (id, name, slug, parent_id, image) ✅
- [x] **4.4** Model `Product` (id, name, slug, description, sku, barcode, status, specifications) ✅
- [x] **4.5** Model `ProductVariant` (product_id, sku, name, price, attributes) ✅
- [x] **4.6** Model `ProductImage` (product_id, url, alt, order) ✅
- [x] **4.7** Model `Attribute` (id, name, type) + `AttributeValue` ✅ (JSON w variant)
- [x] **4.8** Model `Inventory` (variant_id, location_id, quantity, reserved) ✅
- [x] **4.9** Model `Location` (id, name, code, type: warehouse/shelf/bin) ✅
- [x] **4.10** Model `StockMovement` (variant_id, location_id, quantity, type, reference) ✅
- [x] **4.11** Model `Cart` + `CartItem` ✅
- [x] **4.12** Model `Order` (user_id, status, total, shipping_address, billing_address) ✅
- [x] **4.13** Model `OrderItem` (order_id, variant_id, quantity, price) ✅
- [x] **4.14** Model `OrderStatus` (order_id, status, note, created_at) ✅ (OrderStatusHistory)
- [ ] **4.15** Model `Price` / `PriceList` (jeśli wiele cenników) - opcjonalne
- [x] **4.16** Model `Discount` / `Coupon` ✅
- [x] **4.17** Model `Tax` (rate, country) ✅ (TaxRate)

#### Indeksy i relacje

- [x] **4.18** Indeks na `Product.sku`, `Product.slug` ✅
- [x] **4.19** Indeks na `ProductVariant.sku`, `ProductVariant.barcode` ✅
- [x] **4.20** Indeks na `Order.created_at`, `Order.status` ✅
- [x] **4.21** Indeks na `Inventory.variant_id`, `Inventory.location_id` ✅
- [x] **4.22** Composite index na często używane filtry ✅

#### Migracje

- [x] **4.23** Pierwsza migracja: `npx prisma migrate dev --name init` ✅
- [x] **4.24** Seed data (kategorie, przykładowe produkty) ✅ (prisma/seed.ts)
- [x] **4.25** Wygenerować Prisma Client: `npx prisma generate` ✅

---

## Etap 5: Backend – CRUD i logika (5-7 dni)

> ⚙️ **Cel**: Działające API z logiką biznesową
> ✅ **Status**: 90% UKOŃCZONE (brak: Search Service, bulkImport)

### TODO

#### Products Service (`apps/api/src/services/products.service.ts`) ✅ UKOŃCZONY

- [x] **5.1** `getAll()` - lista z paginacją, filtrami ✅
- [x] **5.2** `getById()` - produkt z wariantami, zdjęciami ✅
- [x] **5.3** `getBySlug()` - dla SEO-friendly URLs ✅
- [x] **5.4** `create()` - tworzenie produktu + wariantów ✅
- [x] **5.5** `update()` - aktualizacja produktu ✅
- [x] **5.6** `delete()` - soft delete ✅
- [ ] **5.7** `bulkImport()` - import CSV/XLSX

#### Orders Service (`apps/api/src/services/orders.service.ts`) ✅ UKOŃCZONY

- [x] **5.8** `create()` - TRANSAKCJA: tworzenie zamówienia + rezerwacja stanów ✅
- [x] **5.9** `getById()` - zamówienie ze szczegółami ✅
- [x] **5.10** `getUserOrders()` - historia zamówień użytkownika ✅
- [x] **5.11** `updateStatus()` - zmiana statusu + zapis historii ✅
- [x] **5.12** `cancel()` - anulowanie + zwrot rezerwacji ✅

#### Inventory Service (`apps/api/src/services/inventory.service.ts`) ✅ UKOŃCZONY

- [x] **5.13** `getStock()` - stan per wariant/lokalizacja ✅
- [x] **5.14** `reserve()` - rezerwacja (zamówienie) ✅
- [x] **5.15** `release()` - zwolnienie rezerwacji ✅
- [x] **5.16** `receive()` - przyjęcie towaru (PZ) ✅
- [x] **5.17** `ship()` - wydanie towaru (WZ) ✅
- [x] **5.18** `transfer()` - przesunięcie między lokalizacjami ✅
- [x] **5.19** `adjust()` - korekta inwentaryzacyjna ✅
- [x] **5.20** `getLowStock()` - produkty poniżej minimum ✅

#### Search Service (`apps/api/src/services/search.service.ts`)

- [ ] **5.21** `indexProduct()` - dodanie do Meilisearch
- [ ] **5.22** `indexAllProducts()` - pełna reindeksacja
- [ ] **5.23** `search()` - wyszukiwanie z facetami
- [ ] **5.24** `suggest()` - autocomplete

#### Cart Service (`apps/api/src/services/cart.service.ts`) ✅ UKOŃCZONY

- [x] **5.25** `getCart()` - pobranie koszyka (Redis lub DB) ✅
- [x] **5.26** `addItem()` - dodanie produktu ✅
- [x] **5.27** `updateQuantity()` - zmiana ilości ✅
- [x] **5.28** `removeItem()` - usunięcie pozycji ✅
- [x] **5.29** `clear()` - wyczyszczenie koszyka ✅
- [x] **5.30** `applyDiscount()` - kod rabatowy ✅
- [x] **5.30a** `removeCoupon()` - usunięcie kodu rabatowego ✅
- [x] **5.30b** `mergeCarts()` - łączenie koszyków (guest → user) ✅

#### Auth Service (`apps/api/src/services/auth.service.ts`) ✅ UKOŃCZONY + PRODUCTION-GRADE SECURITY

- [x] **5.31** `register()` - rejestracja + hash hasła ✅
- [x] **5.32** `login()` - logowanie + JWT ✅
- [x] **5.33** `refreshToken()` - odświeżanie tokenu ✅
- [x] **5.34** `logout()` - blacklist tokenu ✅
- [x] **5.35** `forgotPassword()` - reset hasła (email) ✅
- [x] **5.36** `resetPassword()` - ustawienie nowego hasła ✅
- [x] **5.37** Middleware: `authGuard`, `roleGuard` ✅
- [x] **5.38** Redis token blacklist (survives restart) ✅
- [x] **5.39** Account lockout after 5 failed attempts ✅
- [x] **5.40** Rate limiting (login, register, password reset) ✅
- [x] **5.41** Password strength validation (8+ chars, mixed case, numbers, symbols) ✅
- [x] **5.42** Security audit logging ✅
- [x] **5.43** Email verification flow ✅
- [x] **5.44** Session management ✅
- [x] **5.45** Helmet security headers ✅
- [x] **5.46** SECURITY.md documentation ✅

---
## Etap 6: Integracje zewnętrzne (3-5 dni)

> 🔗 **Cel**: Płatności, wysyłki, powiadomienia

### TODO

#### Płatności

- [ ] **6.1** Integracja Stripe / PayU / Przelewy24
- [ ] **6.2** Endpoint webhook dla statusów płatności
- [ ] **6.3** Obsługa statusów: `pending`, `paid`, `failed`, `refunded`
- [ ] **6.4** Aktualizacja zamówienia po płatności

#### Kurierzy

- [ ] **6.5** Integracja InPost API (Paczkomaty + Kurier)
- [ ] **6.6** Integracja DPD / DHL (opcjonalnie)
- [ ] **6.7** Generowanie etykiet (label PDF)
- [ ] **6.8** Pobieranie statusu tracking
- [ ] **6.9** Webhook dla aktualizacji statusu

#### Meilisearch

- [ ] **6.10** Konfiguracja indeksu produktów
- [ ] **6.11** Ustawienie facetów (kategoria, cena, atrybuty)
- [ ] **6.12** BullMQ job do synchronizacji produktów
- [ ] **6.13** Synonimy i stop words (PL)

#### Email

- [ ] **6.14** Konfiguracja Nodemailer / Resend
- [ ] **6.15** Szablony email (HTML):
  - Potwierdzenie rejestracji
  - Reset hasła
  - Potwierdzenie zamówienia
  - Zmiana statusu zamówienia
  - Faktura (załącznik PDF)
- [ ] **6.16** BullMQ job do wysyłki emaili

#### Storage (pliki)

- [ ] **6.17** Konfiguracja S3 / Cloudflare R2
- [ ] **6.18** Upload zdjęć produktów
- [ ] **6.19** Generowanie thumbnails (sharp)
- [ ] **6.20** CDN dla zdjęć

---
## Etap 7: Panel Admin + WMS (5-7 dni)

> 👨‍💼 **Cel**: Zarządzanie sklepem i magazynem

### TODO

#### Setup (`apps/admin/`)

- [ ] **7.1** Nowa aplikacja Next.js w monorepo
- [ ] **7.2** Layout z sidebar navigation
- [ ] **7.3** Auth (login admin) + RBAC middleware
- [ ] **7.4** Współdzielone komponenty z `packages/ui`

#### Dashboard (`apps/admin/src/app/page.tsx`)

- [ ] **7.5** KPI cards (zamówienia dziś, przychód, nowi klienci)
- [ ] **7.6** Wykres sprzedaży (ostatnie 30 dni)
- [ ] **7.7** Ostatnie zamówienia
- [ ] **7.8** Produkty z niskim stanem
- [ ] **7.9** Alerty (zamówienia do realizacji, braki)

#### Produkty (`apps/admin/src/app/products/`)

- [ ] **7.10** Lista produktów (tabela z filtrami, sortowaniem)
- [ ] **7.11** Dodawanie produktu (formularz multi-step)
- [ ] **7.12** Edycja produktu
- [ ] **7.13** Zarządzanie wariantami
- [ ] **7.14** Upload zdjęć (drag & drop)
- [ ] **7.15** Import CSV/XLSX
- [ ] **7.16** Eksport do CSV
- [ ] **7.17** Bulk actions (aktywuj, deaktywuj, usuń)

#### Kategorie (`apps/admin/src/app/categories/`)

- [ ] **7.18** Drzewo kategorii
- [ ] **7.19** Dodawanie/edycja kategorii
- [ ] **7.20** Przypisywanie produktów

#### Zamówienia (`apps/admin/src/app/orders/`)

- [ ] **7.21** Lista zamówień (tabela z filtrami)
- [ ] **7.22** Szczegóły zamówienia
- [ ] **7.23** Zmiana statusu
- [ ] **7.24** Drukowanie etykiety kurierskiej
- [ ] **7.25** Drukowanie faktury
- [ ] **7.26** Anulowanie / zwrot

#### Magazyn (WMS) (`apps/admin/src/app/warehouse/`)

- [ ] **7.27** Stany magazynowe (tabela)
- [ ] **7.28** Przyjęcie towaru (PZ) - formularz
- [ ] **7.29** Wydanie towaru (WZ) - formularz
- [ ] **7.30** Przesunięcia między lokalizacjami
- [ ] **7.31** Inwentaryzacja
- [ ] **7.32** Historia ruchów
- [ ] **7.33** Lokalizacje (regały, półki)
- [ ] **7.34** Alerty niskich stanów

#### Użytkownicy (`apps/admin/src/app/users/`)

- [ ] **7.35** Lista użytkowników
- [ ] **7.36** Dodawanie/edycja użytkownika
- [ ] **7.37** Role i uprawnienia (Admin, Magazynier, Obsługa)
- [ ] **7.38** Blokowanie/odblokowywanie

#### Ustawienia (`apps/admin/src/app/settings/`)

- [ ] **7.39** Dane firmy
- [ ] **7.40** Metody dostawy
- [ ] **7.41** Metody płatności
- [ ] **7.42** Podatki (stawki VAT)
- [ ] **7.43** Szablony email
- [ ] **7.44** Integracje (API keys)

---
## Etap 8: Optymalizacja i skala (3-5 dni)

> 🚀 **Cel**: Wydajność przy 500-5000 zamówień/dzień

### TODO

#### Cache (Redis)

- [ ] **8.1** Cache katalogu produktów (TTL 5-15 min)
- [ ] **8.2** Cache stanów magazynowych (TTL 1 min)
- [ ] **8.3** Cache sesji użytkowników
- [ ] **8.4** Rate limiting (API)
- [ ] **8.5** Distributed locks (rezerwacje)

#### ISR + Optymalizacja Frontend (⚠️ PRIORYTET WYSOKI - 100k produktów!)

> 🎯 **Cel**: Szybkie ładowanie przy 100,000 produktów bez budowania wszystkich stron

- [ ] **8.6** ISR dla stron produktów (`/products/[id]`) - revalidate co 60s
- [ ] **8.7** Pre-build tylko TOP 100-500 bestsellerów (`generateStaticParams`)
- [ ] **8.8** On-demand revalidation API (`/api/revalidate?path=...`)
  - Wywołanie przy update produktu/ceny w admin
- [ ] **8.9** Paginacja API produktów (50 items/page, cursor-based)
- [ ] **8.10** Indeksy w bazie danych (category, price, sku, createdAt)
- [ ] **8.11** Lazy loading obrazów + Next.js Image optimization
- [ ] **8.12** CDN dla obrazów produktów (Cloudflare R2 / S3 + CloudFront)
- [ ] **8.13** Virtual scrolling dla długich list (react-window / tanstack-virtual)

#### Kolejki (BullMQ)

- [ ] **8.14** Queue: `email` - wysyłka maili
- [ ] **8.15** Queue: `search-index` - indeksowanie produktów
- [ ] **8.16** Queue: `import` - importy CSV/XLSX
- [ ] **8.17** Queue: `export` - eksporty raportów
- [ ] **8.18** Queue: `inventory-sync` - synchronizacja stanów
- [ ] **8.19** Queue: `shipping` - generowanie etykiet
- [ ] **8.20** Dashboard kolejek (Bull Board)

#### Rezerwacje stanów (krytyczne!)

- [ ] **8.21** Optimistic locking na `Inventory`
- [ ] **8.22** Timeout rezerwacji (np. 15 min)
- [ ] **8.23** Job do czyszczenia wygasłych rezerwacji
- [ ] **8.24** Transakcje DB przy tworzeniu zamówień

#### Monitoring

- [ ] **8.25** Sentry - error tracking (frontend + backend)
- [ ] **8.26** Prometheus - metryki
- [ ] **8.27** Grafana - dashboardy
- [ ] **8.28** Alerty (błędy, wydajność, stany)
- [ ] **8.29** Health check endpoints

#### Testy

- [ ] **8.30** Unit testy - serwisy (Jest)
- [ ] **8.31** Integration testy - API (supertest)
- [ ] **8.32** E2E testy - flow zakupowy (Playwright)
- [ ] **8.33** Load testy (k6 / Artillery)

#### CI/CD

- [ ] **8.34** GitHub Actions workflow:
  - Lint + TypeScript check
  - Unit testy
  - Build
  - Deploy (staging → production)
- [ ] **8.35** Automatyczne migracje DB
- [ ] **8.36** Rollback strategy

---

## 🚀 Pre-Production Checklist (Backend)

> ⚠️ **KRYTYCZNE**: Lista zadań do wykonania PRZED uruchomieniem na produkcji

### Zmienne środowiskowe (WYMAGANE)

| Zmienna | Opis | Status |
|---------|------|--------|
| `NODE_ENV` | Ustawić na `production` | ⬜ |
| `JWT_ACCESS_SECRET` | Min. 64 znaki, wygenerować: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | ⬜ |
| `JWT_REFRESH_SECRET` | Min. 64 znaki, INNY niż access secret | ⬜ |
| `DATABASE_URL` | PostgreSQL z hasłem, SSL enabled | ⬜ |
| `REDIS_URL` | Redis z hasłem (nie localhost bez auth!) | ⬜ |
| `FRONTEND_URL` | URL frontendu dla CORS | ⬜ |

### TODO Backend → Production

#### Bezpieczeństwo (KRYTYCZNE)
- [ ] **PROD-1** Wygenerować silne JWT sekrety (64+ znaków każdy)
- [ ] **PROD-2** Skonfigurować Redis z hasłem (AUTH)
- [ ] **PROD-3** Włączyć HTTPS (SSL/TLS) - bez tego tokeny mogą być przechwycone!
- [ ] **PROD-4** Ustawić `NODE_ENV=production` - wyłącza dev fallbacki
- [ ] **PROD-5** Skonfigurować CORS tylko dla produkcyjnego frontendu
- [ ] **PROD-6** Usunąć tokeny weryfikacji/resetu z odpowiedzi API (wysyłać tylko emailem)

#### Email Service (WYMAGANE)
- [ ] **PROD-7** Zintegrować serwis email (Nodemailer/Resend/SendGrid)
- [ ] **PROD-8** Skonfigurować szablony email (weryfikacja, reset hasła)
- [ ] **PROD-9** Ustawić domenę nadawcy (SPF/DKIM/DMARC)
- [ ] **PROD-10** Przetestować dostarczalność emaili

#### Baza danych
- [ ] **PROD-11** Uruchomić migrację: `npx prisma migrate deploy`
- [ ] **PROD-12** Skonfigurować automatyczne backupy
- [ ] **PROD-13** Ustawić connection pooling (PgBouncer lub Prisma connection limit)
- [ ] **PROD-14** Włączyć SSL dla połączenia z bazą

#### Infrastruktura
- [ ] **PROD-15** Skonfigurować reverse proxy (nginx/Caddy) z HTTPS
- [ ] **PROD-16** Ustawić limity pamięci dla Node.js
- [ ] **PROD-17** Skonfigurować PM2 lub podobny process manager
- [ ] **PROD-18** Ustawić automatyczny restart przy crashu

#### Monitoring
- [ ] **PROD-19** Wdrożyć Sentry dla error tracking
- [ ] **PROD-20** Skonfigurować logi (stdout → agregator np. Loki)
- [ ] **PROD-21** Ustawić alerty dla błędów bezpieczeństwa
- [ ] **PROD-22** Health check endpoint (`/health`)

#### Testy przed launch
- [ ] **PROD-23** Test rejestracji nowego użytkownika
- [ ] **PROD-24** Test logowania (sukces + błędne hasło)
- [ ] **PROD-25** Test blokady konta po 5 nieudanych próbach
- [ ] **PROD-26** Test rate limitingu (powinien blokować po przekroczeniu)
- [ ] **PROD-27** Test resetu hasła (email powinien dojść)
- [ ] **PROD-28** Test weryfikacji email
- [ ] **PROD-29** Test refresh token (po 15 min access token wygasa)
- [ ] **PROD-30** Test logout (token powinien być unieważniony)

### Komendy do uruchomienia

```bash
# 1. Wygeneruj sekrety JWT
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# 2. Uruchom migrację na produkcji
NODE_ENV=production npx prisma migrate deploy

# 3. Zbuduj aplikację
npm run build

# 4. Uruchom z PM2
pm2 start dist/app.js --name wbtrade-api
```

### Przykładowy .env produkcyjny

```env
NODE_ENV=production
APP_PORT=5000

# Database (zmień na swoje dane!)
DATABASE_URL="postgresql://user:SILNE_HASLO@db.example.com:5432/wbtrade?sslmode=require"

# Redis (zmień na swoje dane!)
REDIS_URL="redis://:SILNE_HASLO@redis.example.com:6379"

# JWT (wygeneruj własne!)
JWT_ACCESS_SECRET="wygenerowany-64-znakowy-secret..."
JWT_REFRESH_SECRET="inny-wygenerowany-64-znakowy-secret..."

# Frontend
FRONTEND_URL="https://sklep.wbtrade.pl"

# Email (przykład dla Resend)
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="noreply@wbtrade.pl"
```

---
## 🔮 Rozszerzenia opcjonalne

### Internacjonalizacja (i18n)

- [ ] `next-intl` dla frontend
- [ ] Tłumaczenia: PL, EN, DE
- [ ] Multi-currency (PLN, EUR)
- [ ] Cenniki per kraj

### Marketplace

- [ ] Integracja Allegro API
- [ ] Integracja Amazon SP-API
- [ ] Synchronizacja produktów
- [ ] Synchronizacja zamówień
- [ ] Synchronizacja stanów

### Faktury

- [ ] Generator faktur PDF
- [ ] Numeracja faktur
- [ ] VAT EU (OSS/IOSS)
- [ ] Integracja z systemem księgowym

### PWA dla magazynu

- [ ] Aplikacja PWA na telefon
- [ ] Skaner kodów kreskowych (kamera)
- [ ] Tryb offline
- [ ] Push notifications

### Analytics

- [ ] Google Analytics 4
- [ ] Facebook Pixel
- [ ] Własne dashboardy (konwersje, koszyki porzucone)

---

## 📝 Notatki techniczne (TODO na produkcję)

### Checkout - Paczkomaty InPost
> ⚠️ **Prowizoryczne rozwiązanie**: Obecnie wybór paczkomatów jest zaimplementowany w uproszczony sposób (statyczna lista lub ręczne wpisywanie kodu). 
> 
> **Na produkcję wymagane:**
> - [ ] Integracja z InPost Geowidget API (mapa z paczkomatami)
> - [ ] Wyszukiwanie paczkomatów po lokalizacji użytkownika
> - [ ] Walidacja kodu paczkomatu przez API InPost
> - [ ] Dokumentacja: https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18579457/Geowidget+v5