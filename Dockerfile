# Dockerfile dla API - wersja produkcyjna dla Render
FROM node:18-alpine AS base

# Instalowanie zależności systemowych wymaganych przez Prisma i inne pakiety
RUN apk add --no-cache libc6-compat openssl
RUN apk update

# Ustawienie katalogu roboczego
WORKDIR /app

# Instalacja pnpm globalnie (v9 dla kompatybilności z lockfile)
RUN npm install -g pnpm@9

# Kopiowanie plików konfiguracyjnych
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Kopiowanie aplikacji API
COPY apps/api ./apps/api
COPY packages ./packages

# Instalacja zależności
RUN pnpm install --frozen-lockfile

# Zmiana katalogu na API do budowania
WORKDIR /app/apps/api

# Generowanie klienta Prisma PRZED kompilacją TypeScript
RUN npx prisma generate

# Budowanie aplikacji
RUN pnpm build

# Stage końcowy - tylko niezbędne pliki
FROM node:18-alpine AS production

RUN apk add --no-cache libc6-compat bash openssl
WORKDIR /app

# Kopiowanie node_modules z poprzedniego stage (root i apps/api)
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules

# Kopiowanie zbudowanej aplikacji i plików potrzebnych do działania
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/apps/api/prisma ./apps/api/prisma
COPY --from=base /app/packages ./packages

# Zmiana katalogu na API
WORKDIR /app/apps/api

# Render automatycznie ustawia PORT, ale domyślnie 5000 dla lokalnych testów
EXPOSE 5000

# Ustawienie zmiennych środowiskowych
ENV NODE_ENV=production

# Sprawdzenie zdrowia aplikacji
# Zwiększony start-period do 60s dla inicjalizacji Redis/Meilisearch/workers
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Uruchomienie aplikacji
# Używamy db push zamiast migrate deploy - nie wymaga advisory locks
CMD ["sh", "-c", "echo 'Starting deployment...' && echo 'Syncing database schema...' && npx prisma db push --accept-data-loss --skip-generate && echo 'Starting application...' && node dist/app.js"]