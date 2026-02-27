// Offline Emergency Service
// Handles emergency alerts when offline using SMS fallback

import { offlineStorage } from './OfflineStorageService';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  priority: number;
}

export interface EmergencyAlert {
  id: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  symptoms?: string[];
  message?: string;
  userId: string;
}

class OfflineEmergencyService {
  private emergencyContacts: EmergencyContact[] = [];

  // Initialize service and load emergency contacts
  async init(userId: string): Promise<void> {
    try {
      // Try to load from IndexedDB first
      this.emergencyContacts = await offlineStorage.getEmergencyContacts(userId);
      
      // If online, fetch latest from server and update cache
      if (navigator.onLine) {
        await this.syncEmergencyContacts(userId);
      }
    } catch (error) {
      console.error('[OfflineEmergency] Failed to initialize:', error);
    }
  }

  // Sync emergency contacts from server
  async syncEmergencyContacts(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/emergency-contacts/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (response.ok) {
        const contacts = await response.json();
        this.emergencyContacts = contacts;
        
        // Store in IndexedDB for offline access
        await offlineStorage.storeEmergencyContacts(userId, contacts);
        console.log('[OfflineEmergency] Emergency contacts synced');
      }
    } catch (error) {
      console.error('[OfflineEmergency] Failed to sync contacts:', error);
    }
  }

  // Trigger emergency alert (works offline)
  async triggerEmergencyAlert(
    userId: string,
    severity: EmergencyAlert['severity'] = 'critical',
    options?: {
      symptoms?: string[];
      message?: string;
      includeLocation?: boolean;
    }
  ): Promise<void> {
    console.log('[OfflineEmergency] Triggering emergency alert...');

    // Get location if requested
    let location: EmergencyAlert['location'] | undefined;
    if (options?.includeLocation !== false) {
      location = await this.getCurrentLocation();
    }

    // Create alert object
    const alert: EmergencyAlert = {
      id: `emergency-${Date.now()}`,
      timestamp: new Date().toISOString(),
      location,
      severity,
      symptoms: options?.symptoms,
      message: options?.message,
      userId,
    };

    // If online, send immediately
    if (navigator.onLine) {
      try {
        await this.sendEmergencyAlert(alert);
        console.log('[OfflineEmergency] Alert sent successfully');
        return;
      } catch (error) {
        console.error('[OfflineEmergency] Failed to send alert online:', error);
        // Fall through to offline handling
      }
    }

    // If offline or online send failed, queue for later and use SMS fallback
    await this.queueEmergencyAlert(alert);
    await this.sendSMSFallback(alert);
  }

  // Send emergency alert to server
  private async sendEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    const response = await fetch('/api/v1/health/emergency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Failed to send emergency alert: ${response.statusText}`);
    }
  }

  // Queue emergency alert for sync when online
  private async queueEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    await offlineStorage.addToSyncQueue({
      type: 'emergency-alert',
      payload: alert,
      timestamp: alert.timestamp,
      attempts: 0,
    });

    console.log('[OfflineEmergency] Alert queued for sync');
  }

  // Send SMS to emergency contacts (fallback for offline)
  private async sendSMSFallback(alert: EmergencyAlert): Promise<void> {
    if (this.emergencyContacts.length === 0) {
      console.warn('[OfflineEmergency] No emergency contacts available');
      this.showNoContactsWarning();
      return;
    }

    // Sort contacts by priority
    const sortedContacts = [...this.emergencyContacts].sort(
      (a, b) => a.priority - b.priority
    );

    // Create SMS message
    const message = this.createSMSMessage(alert);

    // Try to send SMS using device capabilities
    if (this.canSendSMS()) {
      // Use SMS protocol (works on mobile devices)
      for (const contact of sortedContacts.slice(0, 3)) {
        // Send to top 3 contacts
        this.openSMSApp(contact.phoneNumber, message);
      }
    } else {
      // Show manual instructions
      this.showManualContactInstructions(sortedContacts, message);
    }
  }

  // Create SMS message text
  private createSMSMessage(alert: EmergencyAlert): string {
    let message = `🚨 EMERGENCY ALERT\n\n`;
    message += `Time: ${new Date(alert.timestamp).toLocaleString()}\n`;
    message += `Severity: ${alert.severity.toUpperCase()}\n`;

    if (alert.message) {
      message += `\nMessage: ${alert.message}\n`;
    }

    if (alert.symptoms && alert.symptoms.length > 0) {
      message += `\nSymptoms: ${alert.symptoms.join(', ')}\n`;
    }

    if (alert.location) {
      message += `\nLocation: https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}\n`;
    }

    message += `\nThis is an automated emergency alert from Healthcare Monitoring App.`;

    return message;
  }

  // Check if device can send SMS
  private canSendSMS(): boolean {
    // Check if running on mobile device
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile;
  }

  // Open SMS app with pre-filled message
  private openSMSApp(phoneNumber: string, message: string): void {
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;
    
    // Open in new window/tab (will open SMS app on mobile)
    window.open(smsUrl, '_blank');
  }

  // Show manual contact instructions
  private showManualContactInstructions(
    contacts: EmergencyContact[],
    message: string
  ): void {
    const contactList = contacts
      .slice(0, 3)
      .map((c) => `${c.name} (${c.relationship}): ${c.phoneNumber}`)
      .join('\n');

    alert(
      `EMERGENCY ALERT QUEUED\n\n` +
      `Your emergency alert has been queued and will be sent when you're back online.\n\n` +
      `For immediate help, please contact:\n\n${contactList}\n\n` +
      `Or call emergency services (911) directly.`
    );
  }

  // Show warning when no contacts available
  private showNoContactsWarning(): void {
    alert(
      `EMERGENCY ALERT QUEUED\n\n` +
      `Your emergency alert has been queued and will be sent when you're back online.\n\n` +
      `No emergency contacts are configured.\n\n` +
      `For immediate help, please call emergency services (911) directly.`
    );
  }

  // Get current location
  private async getCurrentLocation(): Promise<EmergencyAlert['location'] | undefined> {
    if (!navigator.geolocation) {
      console.warn('[OfflineEmergency] Geolocation not available');
      return undefined;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('[OfflineEmergency] Failed to get location:', error);
          resolve(undefined);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  // Get emergency contacts
  getEmergencyContacts(): EmergencyContact[] {
    return [...this.emergencyContacts];
  }

  // Add emergency contact
  async addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id'>
  ): Promise<void> {
    const newContact: EmergencyContact = {
      ...contact,
      id: `contact-${Date.now()}`,
    };

    this.emergencyContacts.push(newContact);
    await offlineStorage.storeEmergencyContacts(userId, this.emergencyContacts);

    // Sync to server if online
    if (navigator.onLine) {
      try {
        await fetch('/api/v1/emergency-contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
          body: JSON.stringify(newContact),
        });
      } catch (error) {
        console.error('[OfflineEmergency] Failed to sync new contact:', error);
      }
    }
  }

  // Remove emergency contact
  async removeEmergencyContact(userId: string, contactId: string): Promise<void> {
    this.emergencyContacts = this.emergencyContacts.filter((c) => c.id !== contactId);
    await offlineStorage.storeEmergencyContacts(userId, this.emergencyContacts);

    // Sync to server if online
    if (navigator.onLine) {
      try {
        await fetch(`/api/v1/emergency-contacts/${contactId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        });
      } catch (error) {
        console.error('[OfflineEmergency] Failed to sync contact deletion:', error);
      }
    }
  }

  // Get authentication token
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const offlineEmergencyService = new OfflineEmergencyService();
