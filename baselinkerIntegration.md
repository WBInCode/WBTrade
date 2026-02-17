# Plan: Baselinker Integration with NeonDB (Final)

Integrate Baselinker as the product data source, syncing one-way (BL → NeonDB) with AES-256-GCM encrypted credentials sadasdasdasdasdasdasdstored exclusively in NeonDB. Baselinker is source of truth - overwrites local product data on sync.

---

## Steps (Priority Order)

### 1. Extend Prisma Schema in `schema.prisma`

**Product & Variant Models:**
- Add `baselinkerProductId` (String, unique, nullable) to `Product` model
- Add `baselinkerVariantId` (String, unique, nullable) to `ProductVariant` model
- Add `baselinkerCategoryId` (String, unique, nullable) to `Category` model ← *Required for category upsert*

**New Enums:**
```prisma
enum BaselinkerSyncType {
  PRODUCTS
  CATEGORIES
  STOCK
  IMAGES
}

enum BaselinkerSyncStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
}
```

**New Models:**
```prisma
model BaselinkerConfig {
  id                  String   @id @default(cuid())
  inventoryId         String   @unique @map("inventory_id") // Unique per inventory for multi-inventory support
  apiTokenEncrypted   String   @map("api_token_encrypted")
  encryptionIv        String   @map("encryption_iv")
  authTag             String   @map("auth_tag")
  lastSyncAt          DateTime? @map("last_sync_at")
  syncEnabled         Boolean  @default(true) @map("sync_enabled")
  syncIntervalMinutes Int      @default(60) @map("sync_interval_minutes")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("baselinker_configs")
}

model BaselinkerSyncLog {
  id             String               @id @default(cuid())
  type           BaselinkerSyncType
  status         BaselinkerSyncStatus
  itemsProcessed Int                  @default(0) @map("items_processed")
  errors         Json?
  startedAt      DateTime             @default(now()) @map("started_at")
  completedAt    DateTime?            @map("completed_at")

  @@map("baselinker_sync_logs")
}
```

**Run migration:** `npx prisma migrate dev --name add_baselinker_integration`

---

### 2. Implement AES-256-GCM Encryption Service in `apps/api/src/lib/encryption.ts`

- Add `BASELINKER_ENCRYPTION_KEY` (32-byte hex string) to environment variables
- `encryptToken(plaintext)` → returns `{ ciphertext, iv, authTag }`
- `decryptToken(ciphertext, iv, authTag)` → returns plaintext
- Use Node.js `crypto` module with random IV per encryption

---

### 3. Create Baselinker Provider in `apps/api/src/providers/baselinker/`

| File | Description |
|------|-------------|
| `baselinker-provider.interface.ts` | Define `IBaselinkerProvider` interface |
| `baselinker.provider.ts` | REST client with rate limiter & pagination |
| `index.ts` | Export provider factory |

**Interface Methods:**
- `getInventories()`
- `getInventoryProductsList(inventoryId, page?)`
- `getInventoryProductsData(inventoryId, productIds)`
- `getInventoryProductsStock(inventoryId)`
- `getInventoryCategories(inventoryId)`
- `getInventoryProductsImages(inventoryId, productIds)` ← *For image sync*

**Implementation Details:**
- `X-BLToken` header for authentication
- Rate limiter: max 100 requests/min (token bucket algorithm)
- Automatic pagination handling
- Retry with exponential backoff on 429/5xx errors

---

### 4. Create Baselinker Controller at `apps/api/src/controllers/baselinker.controller.ts`

Following existing controller pattern, create controller with methods:
- `saveConfig(req, res)` - Validate & encrypt config
- `getConfig(req, res)` - Return masked config
- `testConnection(req, res)` - Test API token
- `triggerSync(req, res)` - Manual sync trigger
- `getStatus(req, res)` - Sync status & logs
- `deleteConfig(req, res)` - Remove integration

---

### 5. Create Baselinker Service at `apps/api/src/services/baselinker.service.ts`

**Methods:**
- `getDecryptedToken()` - Fetch config from DB, decrypt API token
- `syncCategories()` - Fetch BL categories → upsert to Category using `baselinkerCategoryId`
- `syncProducts()` - Fetch products, upsert using `baselinkerProductId` as key
- `syncImages()` - Sync product images from BaseLinker ← *New*
- `syncStock()` - Update Inventory from `getInventoryProductsStock`
- `runFullSync()` - Orchestrate: categories → products → images → stock (in order)
- `reindexMeilisearch()` - Trigger Meilisearch reindex after sync ← *New*

**Field Mapping:**
| BaseLinker | Database |
|------------|----------|
| `ean` | `barcode` |
| `sku` | `sku` |
| `price_brutto` | `price` |
| `text_fields.name` | `name` |
| `text_fields.description` | `description` |
| `images` | `ProductImage[]` |

**Transaction Batching:**
- Use `prisma.$transaction()` with batches of ~100 items
- Prevents partial failures on large catalogs

---

### 6. Create Admin API Routes in `apps/api/src/routes/baselinker.ts`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/baselinker/config` | Encrypt & save API token + inventory ID |
| GET | `/api/admin/baselinker/config` | Return config (token masked) |
| POST | `/api/admin/baselinker/test` | Validate token by calling `getInventories()` |
| POST | `/api/admin/baselinker/sync` | Trigger manual full sync |
| GET | `/api/admin/baselinker/status` | Return sync logs, last run, next scheduled |
| DELETE | `/api/admin/baselinker/config` | Remove integration & clear encrypted data |

**Middleware:**
```typescript
import { requireAdmin } from '../middleware/auth.middleware';

router.use(requireAdmin); // Apply to all routes
```

Register routes in `app.ts` with `/api/admin/baselinker` prefix.

---

### 7. Add Background Worker at `apps/api/src/workers/baselinker-sync.worker.ts`

- Add `BASELINKER_SYNC` to `QUEUE_NAMES` in `queue.ts`
- **Job Types:**
  - `full-sync` - Complete sync (categories → products → images → stock)
  - `stock-sync` - Stock-only update (runs more frequently)
  - `reindex` - Meilisearch reindex after sync
- **Default Schedule:**
  - Full sync: every 60 min
  - Stock sync: every 15 min
- **Retry Logic:** Exponential backoff (3 attempts, 1min → 5min → 15min)
- Log all operations to `BaselinkerSyncLog`

---

### 8. Add Admin UI Page at `apps/admin/src/app/baselinker/page.tsx`

**Components:**
- Configuration form: API token (password input), inventory dropdown
- Connection test button with success/error feedback
- Sync controls: manual trigger, enable/disable toggle, interval selector
- Status dashboard: last sync time, items synced, error log table

**Navigation:**
- Add link in `Sidebar.tsx` under integrations section

---

## Environment Variables

```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BASELINKER_ENCRYPTION_KEY=<32-byte-hex-string>
```

---

## Future Enhancements (Optional)

1. **Webhook Endpoint** - `POST /api/webhooks/baselinker` for real-time stock updates instead of polling
2. **Bi-directional Sync** - Push order status updates back to BaseLinker
3. **Multi-inventory Support** - Already designed in schema with unique `inventoryId`
4. **Sync Conflict Resolution** - Handle edge cases where local changes exist