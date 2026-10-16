import { Injectable, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, BehaviorSubject, catchError } from 'rxjs';
import type { Notification } from '../../shared/models/index';
import { MOCK_NOTIFICATIONS } from '../mocks/index';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export function mapBackendNotification(n: any): Notification {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    referenceType: (n.entity_type || 'TASK').toUpperCase() as any,
    referenceId: n.entity_id || '',
    isRead: n.is_read,
    createdAt: n.created_at
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private notifications = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notifications.asObservable();

  /** Emits the latest live SSE notification (null when cleared). Used for live toast banners. */
  private _liveAlert = new BehaviorSubject<Notification | null>(null);
  liveAlert$ = this._liveAlert.asObservable();

  private sseSource: EventSource | null = null;
  private reconnectTimer: any = null;

  constructor() {
    if (environment.useBackendApi) {
      // Automatically react to authentication state changes
      effect(() => {
        const isAuth = this.auth.isAuthenticated();
        if (isAuth) {
          this.refreshNotifications();
          this.connectSSE();
          this.requestNotificationPermission();
        } else {
          this.disconnectSSE();
        }
      });
    } else {
      this.notifications.next(MOCK_NOTIFICATIONS);
    }
  }

  getToken(): string {
    return this.auth.getToken() || localStorage.getItem('cresenix_token') || localStorage.getItem('access_token') || '';
  }

  // ── SSE Connection ──────────────────────────────────────────────────────────
  /**
   * Opens a persistent EventSource to /api/v1/notifications/sse.
   * EventSource does not support custom headers, so the JWT token is
   * passed as a query-param (?token=...) which the Go middleware reads as fallback.
   */
  connectSSE(): void {
    const token = this.getToken();
    if (!token) {
      return; // Do NOT connect without a valid token!
    }

    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const sseUrl = `${environment.apiUrl}/notifications/sse?token=${encodeURIComponent(token)}`;

    try {
      this.sseSource = new EventSource(sseUrl);

      this.sseSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const notif = mapBackendNotification(raw);
          const current = this.notifications.getValue();
          // Dedup by ID before prepending
          if (!current.some(n => n.id === notif.id)) {
            this.notifications.next([notif, ...current]);
            // Play subtle audio chime
            this.playChime();
            // Show browser desktop notification if supported
            this.showDesktopNotification(notif);
            // Broadcast live alert for toast banner (auto-clears after 6s)
            this._liveAlert.next(notif);
            setTimeout(() => this._liveAlert.next(null), 6000);
          }
        } catch {
          // Ignore malformed or heartbeat-only SSE events
        }
      };

      this.sseSource.onerror = () => {
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
        // Only reconnect if the user is still authenticated
        if (this.getToken()) {
          this.reconnectTimer = setTimeout(() => this.connectSSE(), 10000);
        }
      };

      this.sseSource.onopen = () => {};
    } catch {
      // EventSource initialization handled silently in production
    }
  }

  /** Plays a subtle modern audio chime using Web Audio API */
  private playChime(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay gracefully handled if restricted
    }
  }

  /** Displays native browser desktop notification if permitted */
  private showDesktopNotification(notif: Notification): void {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/favicon.ico'
        });
      }
    } catch {
      // Desktop notification silently handled
    }
  }

  /** Request desktop notification permission from user */
  requestNotificationPermission(): void {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch {}
  }

  /** Call on logout to cleanly close the SSE stream */
  disconnectSSE(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    this.notifications.next([]);
    this._liveAlert.next(null);
  }

  refreshNotifications(): void {
    const token = this.getToken();
    if (!token && environment.useBackendApi) {
      return;
    }

    if (environment.useBackendApi) {
      this.http.get<{ data: any[]; unread_count: number }>(`${environment.apiUrl}/notifications`).pipe(
        map(res => (res.data || []).map(mapBackendNotification)),
        catchError(() => of([]))
      ).subscribe(list => {
        this.notifications.next(list || []);
      });
    }
  }

  get unreadCount(): Observable<number> {
    return this.notifications$.pipe(
      map(all => all.filter(n => !n.isRead).length)
    );
  }

  getNotifications(): Observable<Notification[]> {
    if (environment.useBackendApi) {
      this.refreshNotifications();
    }
    return this.notifications$;
  }

  markAsRead(id: string): void {
    if (environment.useBackendApi) {
      this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
        error: () => {}
      });
    }
    const current = this.notifications.getValue();
    const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.notifications.next(updated);
  }

  markAllAsRead(): void {
    if (environment.useBackendApi) {
      this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
        error: () => {}
      });
    }
    const current = this.notifications.getValue();
    this.notifications.next(current.map(n => ({ ...n, isRead: true })));
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): void {
    const newNotif: Notification = {
      ...notification,
      id: 'n_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const current = this.notifications.getValue();
    this.notifications.next([newNotif, ...current]);
  }
}

