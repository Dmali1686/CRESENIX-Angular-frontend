import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../shared/models/index';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Notification Center</h1>
          <p class="page-subtitle">Real-time alerts, project updates, and deadline reminders</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline btn-sm" (click)="markAllAsRead()">
            <span class="material-icons">done_all</span> Mark All Read
          </button>
        </div>
      </div>

      <!-- FILTER TABS -->
      <div class="notif-filters">
        <button class="n-tab" [class.active]="filter() === 'all'" (click)="filter.set('all')">
          All ({{ notifications().length }})
        </button>
        <button class="n-tab" [class.active]="filter() === 'unread'" (click)="filter.set('unread')">
          Unread ({{ unreadCount() }})
        </button>
        <button class="n-tab" [class.active]="filter() === 'task'" (click)="filter.set('task')">
          Tasks
        </button>
        <button class="n-tab" [class.active]="filter() === 'meeting'" (click)="filter.set('meeting')">
          Meetings
        </button>
      </div>

      <!-- NOTIFICATIONS FEED -->
      <div class="notif-feed">
        @for (item of filteredNotifications(); track item.id) {
          <div class="card notif-card" [class.unread]="!item.isRead" (click)="markAsRead(item)">
            <div class="notif-icon-col">
              <div class="icon-circle" [class]="'type-' + item.type.toLowerCase()">
                <span class="material-icons">{{ getIcon(item.type) }}</span>
              </div>
            </div>

            <div class="notif-content-col">
              <div class="notif-title-row">
                <h4 class="notif-title">{{ item.title }}</h4>
                <span class="notif-time">{{ item.createdAt }}</span>
              </div>
              <p class="notif-message">{{ item.message }}</p>

              @if (getLink(item)) {
                <a [routerLink]="getLink(item)!" class="notif-link-btn" (click)="$event.stopPropagation()">
                  View Details <span class="material-icons">arrow_forward</span>
                </a>
              }
            </div>

            <div class="notif-action-col">
              @if (!item.isRead) {
                <span class="unread-dot" title="Unread notification"></span>
              }
              <button class="icon-btn-xs" (click)="$event.stopPropagation(); remove(item.id)" title="Dismiss">
                <span class="material-icons">close</span>
              </button>
            </div>
          </div>
        } @empty {
          <div class="card empty-state">
            <span class="material-icons empty-icon text-muted">notifications_none</span>
            <p class="empty-title">You're all caught up!</p>
            <p class="empty-subtitle">No notifications match your current filter.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notif-filters {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 8px;

      .n-tab {
        padding: 6px 14px;
        background: transparent;
        border: none;
        border-radius: 6px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #F8FAFC;
          color: var(--color-navy);
        }

        &.active {
          background: var(--color-light-blue);
          color: var(--color-blue);
        }
      }
    }

    .notif-feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 860px;
    }

    .notif-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      border: 1px solid var(--color-border);
      transition: background 0.15s ease, border-color 0.15s ease;
      cursor: pointer;

      &.unread {
        background: #F8FAFC;
        border-left: 4px solid var(--color-blue);
      }

      .notif-icon-col {
        .icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          .material-icons {
            font-size: 20px;
          }

          &.type-task_assigned {
            background: #DBEAFE;
            color: #2563EB;
          }

          &.type-deadline {
            background: #FEE2E2;
            color: #DC2626;
          }

          &.type-meeting_invite {
            background: #EDE9FE;
            color: #7C3AED;
          }

          &.type-mention {
            background: #FEF3C7;
            color: #D97706;
          }

          &.type-system {
            background: #F1F5F9;
            color: #64748B;
          }
        }
      }

      .notif-content-col {
        flex: 1;

        .notif-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;

          .notif-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .notif-time {
            font-size: 11px;
            color: var(--color-text-muted);
          }
        }

        .notif-message {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .notif-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-blue);
          text-decoration: none;

          .material-icons {
            font-size: 14px;
          }

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .notif-action-col {
        display: flex;
        align-items: center;
        gap: 8px;

        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-blue);
        }

        .icon-btn-xs {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: 2px;
          border-radius: 4px;

          .material-icons {
            font-size: 16px;
          }

          &:hover {
            color: var(--color-error);
          }
        }
      }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  notifications = signal<Notification[]>([]);
  filter = signal<'all' | 'unread' | 'task' | 'meeting'>('all');

  constructor(private notifService: NotificationService) {}

  ngOnInit(): void {
    this.notifService.refreshNotifications();
    this.notifService.notifications$.subscribe(list => {
      this.notifications.set(list || []);
    });
  }

  unreadCount = computed(() => {
    return this.notifications().filter(n => !n.isRead).length;
  });

  filteredNotifications = computed(() => {
    const list = this.notifications();
    const f = this.filter();
    if (f === 'unread') return list.filter(n => !n.isRead);
    if (f === 'task') return list.filter(n => n.referenceType === 'TASK');
    if (f === 'meeting') return list.filter(n => n.referenceType === 'MEETING');
    return list;
  });

  getLink(n: Notification): string | null {
    if (n.referenceType === 'TASK' && n.referenceId) return `/tasks/${n.referenceId}`;
    if (n.referenceType === 'MEETING' && n.referenceId) return `/meetings/${n.referenceId}`;
    if (n.referenceType === 'PROJECT' && n.referenceId) return `/projects/${n.referenceId}`;
    return null;
  }

  markAsRead(item: Notification): void {
    this.notifService.markAsRead(item.id);
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead();
  }

  remove(id: string): void {
    this.notifService.markAsRead(id);
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  getIcon(type: string): string {
    switch (type) {
      case 'TASK_ASSIGNED': return 'assignment_ind';
      case 'DEADLINE': return 'alarm';
      case 'MEETING_INVITE': return 'video_camera_front';
      case 'MENTION': return 'alternate_email';
      default: return 'notifications';
    }
  }
}
