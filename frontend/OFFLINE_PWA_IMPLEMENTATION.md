# Offline Mode and PWA Implementation

This document describes the offline functionality and Progressive Web App (PWA) features implemented for the Healthcare Monitoring App.

## Overview

The app provides comprehensive offline support to ensure critical healthcare functionality remains available even without internet connectivity. This is especially important for elderly users who may have unreliable internet connections or need emergency features to work at all times.

## Features Implemented

### 1. Service Worker (Task 17.1)

**Location:** `frontend/public/sw.js`

The service worker provides:
- **Static asset caching** - All essential app files cached for offline use
- **API response caching** - Critical health data endpoints cached
- **Offline page** - Dedicated offline experience with emergency features
- **Background sync** - Automatic data synchronization when connection restored
- **Push notifications** - Emergency alerts even when app is closed

**Caching Strategy:**
- Static assets: Cache-first (fast loading)
- API requests: Network-first with cache fallback (fresh data when possible)
- Critical endpoints cached: vitals, medications, appointments, care circle, alerts

**Files:**
- `frontend/public/sw.js` - Service worker implementation
- `frontend/public/offline.html` - Offline fallback page
- `frontend/src/utils/serviceWorkerRegistration.ts` - Registration utility

### 2. Local Data Storage and Sync (Task 17.2)

**Location:** `frontend/src/services/OfflineStorageService.ts`

IndexedDB-based storage for:
- **Health data** - Vital signs, symptoms, measurements
- **Medications** - Schedules, adherence records
- **Appointments** - Upcoming and past appointments
- **Emergency contacts** - Always available offline
- **Sync queue** - Operations to sync when online

**Database Schema:**
```
HealthcareMonitoringDB (v1)
├── healthData (id, userId, type, data, timestamp, synced)
├── syncQueue (id, type, payload, timestamp, attempts)
├── emergencyContacts (id, userId, name, phone, email, priority)
├── medications (id, userId, name, dosage, frequency)
└── appointments (id, userId, provider, scheduledTime, type)
```

**Sync Service:**
- Automatic background sync every 5 minutes when online
- Manual sync trigger available
- Conflict resolution (defaults to server data for healthcare accuracy)
- Retry logic for failed syncs
- Sync status tracking

**Files:**
- `frontend/src/services/OfflineStorageService.ts` - IndexedDB wrapper
- `frontend/src/services/SyncService.ts` - Background sync logic
- `frontend/src/hooks/useOfflineSync.ts` - React hook for sync state

### 3. PWA Manifest and Configuration (Task 17.3)

**Location:** `frontend/public/manifest.json`

PWA features:
- **Installable** - Add to home screen on mobile devices
- **Standalone mode** - Runs like a native app
- **App shortcuts** - Quick access to emergency, health entry, medications
- **Icons** - Multiple sizes for all platforms (72px to 512px)
- **Splash screens** - iOS-specific launch screens
- **Theme colors** - Consistent branding

**Platform Support:**
- Android Chrome - Full PWA support
- iOS Safari - Install prompt, splash screens, icons
- Desktop - Install as desktop app

**Files:**
- `frontend/public/manifest.json` - PWA manifest
- `frontend/public/icons/` - App icons (multiple sizes)
- `frontend/public/splash/` - iOS splash screens
- `frontend/src/components/accessible/PWAInstallPrompt.tsx` - Install prompt UI

### 4. Offline Emergency Alerts (Task 17.4)

**Location:** `frontend/src/services/OfflineEmergencyService.ts`

Critical offline emergency features:
- **SMS fallback** - Opens SMS app to contact emergency contacts
- **Location sharing** - Includes GPS coordinates in alerts
- **Queue for sync** - Alerts sent to server when online
- **Emergency contacts** - Stored locally for offline access
- **Priority-based notifications** - Contacts notified by priority

**Emergency Alert Flow:**
1. User triggers emergency button
2. Get current location (if available)
3. If online: Send to server immediately
4. If offline: 
   - Queue alert for sync
   - Open SMS app with pre-filled message to top 3 contacts
   - Show confirmation to user

**Files:**
- `frontend/src/services/OfflineEmergencyService.ts` - Emergency logic
- `frontend/src/components/emergency/OfflineEmergencyButton.tsx` - UI component
- `frontend/src/components/emergency/OfflineEmergencyButton.css` - Elderly-friendly styles

## Usage

### Registering the Service Worker

The service worker is automatically registered in `main.tsx`:

```typescript
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';

serviceWorkerRegistration.register({
  onSuccess: () => console.log('Offline ready'),
  onUpdate: (reg) => console.log('Update available'),
  onOffline: () => console.log('App offline'),
  onOnline: () => console.log('App online'),
});
```

### Using Offline Storage

```typescript
import { offlineStorage } from './services/OfflineStorageService';

// Store health data
await offlineStorage.storeHealthData({
  userId: 'user-123',
  type: 'vitals',
  data: { heartRate: 75, bloodPressure: { systolic: 120, diastolic: 80 } },
  timestamp: new Date().toISOString(),
  synced: false,
  syncAttempts: 0,
});

// Retrieve health data
const records = await offlineStorage.getHealthData('user-123', 'vitals', 10);
```

### Using Sync Service

```typescript
import { syncService } from './services/SyncService';

// Subscribe to sync state
const unsubscribe = syncService.subscribe((state) => {
  console.log('Sync status:', state.status);
  console.log('Pending items:', state.pendingItems);
});

// Manual sync
await syncService.syncAll();

// Start auto-sync
syncService.startAutoSync();
```

### Using Offline Emergency

```typescript
import { offlineEmergencyService } from './services/OfflineEmergencyService';

// Initialize with user ID
await offlineEmergencyService.init('user-123');

// Trigger emergency alert
await offlineEmergencyService.triggerEmergencyAlert('user-123', 'critical', {
  includeLocation: true,
  symptoms: ['chest pain', 'shortness of breath'],
});
```

### React Components

```tsx
import { OfflineEmergencyButton } from './components/emergency/OfflineEmergencyButton';
import { PWAInstallPrompt } from './components/accessible/PWAInstallPrompt';
import { useOfflineSync } from './hooks/useOfflineSync';

function App() {
  const { status, isOnline, pendingItems, manualSync } = useOfflineSync();

  return (
    <>
      <OfflineEmergencyButton userId="user-123" />
      <PWAInstallPrompt />
      
      {!isOnline && (
        <div>Offline Mode - {pendingItems} items pending sync</div>
      )}
    </>
  );
}
```

## Testing

### Unit Tests

Run tests with:
```bash
npm test
```

Test files:
- `frontend/src/services/__tests__/OfflineStorageService.test.ts`
- `frontend/src/services/__tests__/SyncService.test.ts`

### Manual Testing

1. **Offline Mode:**
   - Open DevTools → Network → Set to "Offline"
   - Verify app loads from cache
   - Verify offline page appears for new navigation
   - Verify emergency button works offline

2. **PWA Installation:**
   - Chrome: Look for install icon in address bar
   - iOS Safari: Share → Add to Home Screen
   - Verify app opens in standalone mode

3. **Background Sync:**
   - Go offline
   - Enter health data
   - Go back online
   - Verify data syncs automatically

4. **Emergency Alerts:**
   - Test online: Should send immediately
   - Test offline: Should open SMS app
   - Verify location is included
   - Verify alert queues for sync

## Accessibility Considerations

All offline features maintain elderly-friendly design:
- **Large fonts** - Minimum 18pt throughout
- **High contrast** - WCAG AA compliant colors
- **Large touch targets** - Minimum 44x44px buttons
- **Clear messaging** - Non-technical language
- **Voice support** - Screen reader compatible
- **Reduced motion** - Respects user preferences

## Browser Support

- **Chrome/Edge** - Full PWA support
- **Firefox** - Service worker and offline support
- **Safari (iOS)** - Install to home screen, limited PWA features
- **Safari (macOS)** - Basic offline support

## Security Considerations

- **Encrypted storage** - IndexedDB data encrypted at rest
- **Secure sync** - HTTPS required for service workers
- **Token management** - Auth tokens stored securely
- **Data privacy** - Local data cleared on logout
- **Emergency contacts** - Stored locally for offline access only

## Performance

- **Cache size** - ~5-10MB for typical usage
- **Sync frequency** - Every 5 minutes when online
- **Storage quota** - Requests persistent storage for critical data
- **Background sync** - Minimal battery impact

## Future Enhancements

Potential improvements:
- **Offline voice commands** - Local speech recognition
- **Offline medication reminders** - Local notifications
- **Offline health reports** - Generate reports from cached data
- **Conflict resolution UI** - Let users choose which data to keep
- **Selective sync** - Sync only specific data types
- **Compression** - Reduce storage and bandwidth usage

## Troubleshooting

### Service Worker Not Registering
- Ensure HTTPS (required for service workers)
- Check browser console for errors
- Verify `sw.js` is accessible at `/sw.js`

### Data Not Syncing
- Check network connectivity
- Verify auth token is valid
- Check sync queue: `await offlineStorage.getSyncQueue()`
- Manually trigger sync: `await syncService.syncAll()`

### PWA Not Installable
- Verify manifest.json is valid
- Ensure service worker is registered
- Check all required icons are present
- Test on supported browser

### Emergency Alerts Not Working Offline
- Verify emergency contacts are stored locally
- Check SMS app is available on device
- Ensure location permissions granted
- Verify alert is queued: `await offlineStorage.getSyncQueue()`

## References

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [PWA Best Practices](https://web.dev/pwa/)
