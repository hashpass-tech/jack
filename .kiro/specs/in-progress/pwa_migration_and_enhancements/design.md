# Design: PWA Migration and Enhancements

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        JACK PWA Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Service   │  │  IndexedDB  │  │    Web Push Service     │  │
│  │   Worker    │  │   Storage   │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PWA Controller                            ││
│  │  - Offline Detection    - Sync Queue Management             ││
│  │  - Cache Management     - Push Registration                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Dashboard                            │
│  - Intent Creation    - Quote Display    - Execution Tracking   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Service Worker (`sw.ts`)
```typescript
// Workbox-based service worker
interface CacheStrategy {
  staticAssets: 'cache-first';
  apiCalls: 'network-first';
  images: 'stale-while-revalidate';
}
```

### 2. PWA Controller (`pwa-controller.ts`)
```typescript
interface PWAController {
  // Lifecycle
  register(): Promise<void>;
  update(): Promise<void>;
  
  // Offline support
  isOnline(): boolean;
  queueAction(action: OfflineAction): void;
  syncQueue(): Promise<void>;
  
  // Push notifications
  subscribeToPush(): Promise<PushSubscription>;
  unsubscribe(): Promise<void>;
}
```

### 3. Offline Storage Schema
```typescript
interface OfflineIntent {
  id: string;
  data: IntentData;
  createdAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

interface OfflineStore {
  intents: OfflineIntent[];
  quotes: CachedQuote[];
  settings: UserSettings;
}
```

## Data Flow

### Offline Intent Creation
```
1. User creates intent → 
2. Save to IndexedDB (pending) → 
3. Show optimistic UI → 
4. Background sync triggers → 
5. POST to /api/intents → 
6. Update IndexedDB (synced) → 
7. Update UI
```

### Push Notification Flow
```
1. User subscribes → 
2. Send subscription to server → 
3. Server stores subscription → 
4. Execution completes → 
5. Server sends push → 
6. SW receives push → 
7. Show notification → 
8. User clicks → Navigate to intent
```

## File Structure
```
apps/dashboard/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── pwa/
│   │   ├── controller.ts
│   │   ├── storage.ts
│   │   ├── sync.ts
│   │   └── push.ts
│   └── sw.ts
└── vite.config.ts (PWA plugin config)
```

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SW Library | Workbox | Industry standard, excellent DX |
| Storage | IndexedDB via idb | Better than localStorage for structured data |
| Push Service | Web Push API | Standard, works across browsers |
| Build Tool | vite-plugin-pwa | Seamless Vite integration |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Browser compatibility | Low | Medium | Feature detection, graceful degradation |
| Sync conflicts | Medium | High | Last-write-wins with user notification |
| Cache staleness | Medium | Low | Versioned cache, manual refresh option |
