# Task List / To-Do Phase

## Phase 0: Discovery and Alignment
- [x] Task completed | [↻ View changes](git:diff) | [⚡ View execution](terminal:log)
- [x] Confirm tenant identification source (hostname vs explicit tenant ID) for cache keys
- Gateway uses hostname → tenant route (TENANT_ROUTES) with query/header overrides on `/api` (query `tenant`, body `tenant`, or header `X-Tenant-ID`)

## Phase 1: Foundation Setup

<!-- @task id="PWA-1" status="pending" priority="critical" -->
### Task PWA-1: Install PWA Dependencies
**Status:** 🔵 Pending | **Priority:** Critical | **Estimate:** 30min

**Description:**
Install vite-plugin-pwa and workbox dependencies for Progressive Web App support.

**Commands:**
```bash
cd apps/dashboard && pnpm add -D vite-plugin-pwa workbox-window
```

**Acceptance Criteria:**
- [ ] vite-plugin-pwa installed
- [ ] workbox-window installed
- [ ] No peer dependency warnings

**Run Task:** `[▶ Execute Task PWA-1]`
<!-- @endtask -->

---

<!-- @task id="PWA-2" status="pending" priority="critical" depends="PWA-1" -->
### Task PWA-2: Configure Vite PWA Plugin
**Status:** 🔵 Pending | **Priority:** Critical | **Estimate:** 1h

**Description:**
Update vite.config.ts to include PWA plugin with proper configuration.

**Target File:** `apps/dashboard/vite.config.ts`

**Implementation:**
```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 60 * 5 }
            }
          }
        ]
      },
      manifest: {
        name: 'JACK Dashboard',
        short_name: 'JACK',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a'
      }
    })
  ]
})
```

**Acceptance Criteria:**
- [ ] PWA plugin configured in vite.config.ts
- [ ] Manifest settings defined
- [ ] Runtime caching strategies set

**Run Task:** `[▶ Execute Task PWA-2]`
<!-- @endtask -->

---

<!-- @task id="PWA-3" status="pending" priority="high" depends="PWA-2" -->
### Task PWA-3: Create Web App Manifest
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 45min

**Description:**
Create manifest.json with app metadata, icons, and PWA configuration.

**Target File:** `apps/dashboard/public/manifest.json`

**Implementation:**
```json
{
  "name": "JACK - Just Another Crypto Kernel",
  "short_name": "JACK",
  "description": "Intent-based trading with on-chain policy enforcement",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Acceptance Criteria:**
- [ ] manifest.json created
- [ ] All required fields present
- [ ] Icons referenced correctly

**Run Task:** `[▶ Execute Task PWA-3]`
<!-- @endtask -->

---

## Phase 2: Offline Storage

<!-- @task id="PWA-4" status="pending" priority="high" depends="PWA-3" -->
### Task PWA-4: Implement IndexedDB Storage Layer
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 2h

**Description:**
Create IndexedDB wrapper for offline intent storage with sync capabilities.

**Target File:** `apps/dashboard/src/pwa/storage.ts`

**Implementation Outline:**
```typescript
import { openDB, DBSchema } from 'idb';

interface JACKDatabase extends DBSchema {
  intents: {
    key: string;
    value: OfflineIntent;
    indexes: { 'by-status': string };
  };
  quotes: {
    key: string;
    value: CachedQuote;
  };
}

export async function getDB() {
  return openDB<JACKDatabase>('jack-offline', 1, {
    upgrade(db) {
      const intentStore = db.createObjectStore('intents', { keyPath: 'id' });
      intentStore.createIndex('by-status', 'syncStatus');
      db.createObjectStore('quotes', { keyPath: 'id' });
    }
  });
}
```

**Acceptance Criteria:**
- [ ] IndexedDB schema defined
- [ ] CRUD operations for intents
- [ ] CRUD operations for quotes
- [ ] Unit tests pass

**Run Task:** `[▶ Execute Task PWA-4]`
<!-- @endtask -->

---

<!-- @task id="PWA-5" status="pending" priority="high" depends="PWA-4" -->
### Task PWA-5: Implement Sync Queue Manager
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 2h

**Description:**
Create background sync manager to handle offline-created intents.

**Target File:** `apps/dashboard/src/pwa/sync.ts`

**Acceptance Criteria:**
- [ ] Queue pending actions when offline
- [ ] Process queue when online
- [ ] Retry failed syncs with exponential backoff
- [ ] Emit events for UI updates

**Run Task:** `[▶ Execute Task PWA-5]`
<!-- @endtask -->

---

## Phase 3: Push Notifications

<!-- @task id="PWA-6" status="pending" priority="medium" depends="PWA-5" -->
### Task PWA-6: Implement Push Notification Service
**Status:** 🔵 Pending | **Priority:** Medium | **Estimate:** 3h

**Description:**
Set up Web Push API integration for execution notifications.

**Target Files:**
- `apps/dashboard/src/pwa/push.ts`
- `apps/dashboard/api/push/route.ts`

**Acceptance Criteria:**
- [ ] Push subscription management
- [ ] Server-side push sending
- [ ] Notification click handling
- [ ] Permission request UI

**Run Task:** `[▶ Execute Task PWA-6]`
<!-- @endtask -->

---

## Phase 4: Integration & Polish

<!-- @task id="PWA-7" status="pending" priority="medium" depends="PWA-6" -->
### Task PWA-7: Add Offline Status Indicator
**Status:** 🔵 Pending | **Priority:** Medium | **Estimate:** 1h

**Description:**
Create UI component showing online/offline status with sync progress.

**Target File:** `apps/dashboard/src/components/OfflineIndicator.tsx`

**Acceptance Criteria:**
- [ ] Shows current connection status
- [ ] Displays pending sync count
- [ ] Allows manual sync trigger
- [ ] Smooth status transitions

**Run Task:** `[▶ Execute Task PWA-7]`
<!-- @endtask -->

---

<!-- @task id="PWA-8" status="pending" priority="low" depends="PWA-7" -->
### Task PWA-8: PWA Testing & Lighthouse Audit
**Status:** 🔵 Pending | **Priority:** Low | **Estimate:** 2h

**Description:**
Run comprehensive PWA testing and achieve Lighthouse PWA score > 90.

**Acceptance Criteria:**
- [ ] Lighthouse PWA score > 90
- [ ] Offline functionality verified
- [ ] Install prompt works correctly
- [ ] All icons load properly

**Run Task:** `[▶ Execute Task PWA-8]`
<!-- @endtask -->

---

## Progress Summary

| Phase | Total | Completed | In Progress | Pending |
|-------|-------|-----------|-------------|---------|
| Phase 0 | 2 | 2 | 0 | 0 |
| Phase 1 | 3 | 0 | 0 | 3 |
| Phase 2 | 2 | 0 | 0 | 2 |
| Phase 3 | 1 | 0 | 0 | 1 |
| Phase 4 | 2 | 0 | 0 | 2 |
| **Total** | **10** | **2** | **0** | **8** |

---

## Quick Actions

| Action | Command |
|--------|---------|
| Run All Pending | `kiro run --spec pwa_migration --all` |
| Run Phase 1 | `kiro run --spec pwa_migration --phase 1` |
| Run Single Task | `kiro run --task PWA-1` |
| View Status | `kiro status --spec pwa_migration` |
