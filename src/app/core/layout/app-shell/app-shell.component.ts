import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../../shared/models/index';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter, map } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  roles?: string[];
  children?: NavItem[];
}

const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }
    ]
  },
  {
    label: 'WORK MANAGEMENT',
    items: [
      { label: 'My Tasks', icon: 'assignment_ind', route: '/tasks/my-tasks' },
      { label: 'All Tasks', icon: 'task', route: '/tasks/all', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Task Board', icon: 'view_kanban', route: '/tasks/board' },
      { label: 'Review Queue', icon: 'rate_review', route: '/tasks/review', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Calendar', icon: 'event', route: '/tasks/calendar' },
    ]
  },
  {
    label: 'PROJECTS',
    items: [
      { label: 'Project Pipeline', icon: 'account_tree', route: '/projects/pipeline', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'All Projects', icon: 'folder_open', route: '/projects/all' },
      { label: 'Milestones', icon: 'flag', route: '/projects/milestones' },
    ]
  },
  {
    label: 'SALES CRM',
    items: [
      { label: 'Sales Dashboard', icon: 'space_dashboard', route: '/sales/dashboard', roles: ['SALES', 'SUPER_ADMIN'] },
      { label: 'Sales Pipeline', icon: 'view_kanban', route: '/sales/pipeline', roles: ['SALES', 'SUPER_ADMIN'] },
      { label: 'Clients', icon: 'business', route: '/sales/clients', roles: ['SALES', 'SUPER_ADMIN'] },
      { label: 'Activities & Follow-ups', icon: 'check_circle', route: '/sales/activities', roles: ['SALES', 'SUPER_ADMIN'] },
      { label: 'Sales Meetings & Visits', icon: 'event', route: '/sales/meetings', roles: ['SALES', 'SUPER_ADMIN'] },
      { label: 'Sales Analytics', icon: 'bar_chart', route: '/sales/reports', roles: ['SALES', 'SUPER_ADMIN'] },
    ]
  },
  {
    label: 'MEETINGS',
    items: [
      { label: 'Meeting Calendar', icon: 'calendar_month', route: '/meetings/calendar' },
      { label: 'All Meetings', icon: 'groups', route: '/meetings/all' },
      { label: 'Meeting Minutes', icon: 'description', route: '/meetings/minutes' },
      { label: 'Meeting Archive', icon: 'history', route: '/meetings/history' },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { label: 'Employees', icon: 'people', route: '/employees/directory', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Teams', icon: 'group_work', route: '/teams', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ]
  },
  {
    label: 'INSIGHTS',
    items: [
      { label: 'Reports', icon: 'analytics', route: '/reports', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Notifications', icon: 'notifications', route: '/notifications' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ]
  }
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <div class="app-shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Overlay for mobile -->
      <div class="sidebar-overlay"
           [class.active]="mobileOpen()"
           (click)="closeMobileSidebar()"></div>

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.mobile-open]="mobileOpen()">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <div class="sidebar-logo" [routerLink]="['/dashboard']">
            <img src="/cresenix-logo.jpg" alt="CRESENIX SOLUTIONS" class="logo-img" />
            @if (!sidebarCollapsed()) {
              <div class="logo-text">
                <span class="logo-name">CRESENIX</span>
                <span class="logo-sub">SOLUTIONS</span>
              </div>
            }
          </div>
          <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="sidebarCollapsed() ? 'Expand' : 'Collapse'">
            <span class="material-icons">{{ sidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
        </div>

        <!-- Nav Sections -->
        <nav class="sidebar-nav" role="navigation">
          @for (section of visibleSections(); track section.label) {
            <div class="nav-section">
              @if (!sidebarCollapsed()) {
                <span class="nav-section-label">{{ section.label }}</span>
              }
              @for (item of section.items; track item.route) {
                <a class="nav-item"
                   [routerLink]="item.route"
                   routerLinkActive="active"
                   [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
                   [title]="sidebarCollapsed() ? item.label : ''"
                   (click)="closeMobileSidebar()">
                  <span class="material-icons nav-icon">{{ item.icon }}</span>
                  @if (!sidebarCollapsed()) {
                    <span class="nav-label">{{ item.label }}</span>
                    @if (item.label === 'Notifications' && unreadCount() > 0) {
                      <span class="nav-badge">{{ unreadCount() }}</span>
                    }
                  }
                  @if (sidebarCollapsed() && item.label === 'Notifications' && unreadCount() > 0) {
                    <span class="nav-badge-dot"></span>
                  }
                </a>
              }
            </div>
          }
        </nav>

        <!-- User Profile -->
        <div class="sidebar-user">
          <div class="user-avatar-wrap" (click)="toggleUserMenu()">
            <div class="avatar avatar-sm" [style.background]="getAvatarColor(user()?.firstName ?? 'U')">
              {{ getInitials() }}
            </div>
            @if (!sidebarCollapsed()) {
              <div class="user-info">
                <span class="user-name">{{ user()?.firstName }} {{ user()?.lastName }}</span>
                <span class="user-role">{{ formatRole(user()?.role) }}</span>
              </div>
              <span class="material-icons user-menu-arrow">keyboard_arrow_up</span>
            }
          </div>
          @if (showUserMenu() && !sidebarCollapsed()) {
            <div class="user-menu">
              <a class="user-menu-item" routerLink="/settings">
                <span class="material-icons">manage_accounts</span>
                Profile Settings
              </a>
              <div class="user-menu-divider"></div>
              <button class="user-menu-item danger" (click)="logout()">
                <span class="material-icons">logout</span>
                Sign Out
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-wrapper">
        <!-- TOPBAR -->
        <header class="topbar">
          <!-- Mobile menu toggle -->
          <button class="mobile-menu-btn" (click)="toggleMobileSidebar()">
            <span class="material-icons">menu</span>
          </button>

          <!-- Breadcrumbs -->
          <div class="breadcrumbs">
            <span class="breadcrumb-item home">
              <span class="material-icons">home</span>
            </span>
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">{{ currentPageTitle() }}</span>
          </div>

          <!-- Spacer -->
          <div class="topbar-spacer"></div>

          <!-- Search -->
          <div class="topbar-search" [class.active]="searchActive()">
            <span class="material-icons search-icon">search</span>
            <input
              type="text"
              placeholder="Search tasks, projects..."
              [(ngModel)]="searchQuery"
              (focus)="searchActive.set(true)"
              (blur)="searchActive.set(false)"
              class="search-input"
              id="global-search"
            />
          </div>

          <!-- Quick Create -->
          @if (isSuperAdmin() || isAdmin()) {
            <div class="quick-create-wrap">
              <button class="btn btn-gradient btn-sm" (click)="toggleQuickCreate()" id="quick-create-btn">
                <span class="material-icons">add</span>
                New
              </button>
              @if (showQuickCreate()) {
                <div class="quick-create-menu">
                  @if (isSuperAdmin()) {
                    <button class="qc-item" (click)="quickCreate('task')">
                      <span class="material-icons">task_alt</span>
                      New Task
                    </button>
                  }
                  @if (isAdmin()) {
                    <button class="qc-item" (click)="quickCreate('project')">
                      <span class="material-icons">folder_open</span>
                      New Project
                    </button>
                  }
                  @if (isSalesTeam()) {
                    <button class="qc-item" (click)="quickCreate('client')">
                      <span class="material-icons">person_add</span>
                      New Client
                    </button>
                    <button class="qc-item" (click)="quickCreate('opportunity')">
                      <span class="material-icons">trending_up</span>
                      New Opportunity
                    </button>
                    <button class="qc-item" (click)="quickCreate('sales-meeting')">
                      <span class="material-icons">event</span>
                      Sales Meeting / Visit
                    </button>
                    <button class="qc-item" (click)="quickCreate('followup')">
                      <span class="material-icons">add_task</span>
                      Add Follow-up
                    </button>
                  }
                  @if (isSuperAdmin()) {
                    <button class="qc-item" (click)="quickCreate('meeting')">
                      <span class="material-icons">video_call</span>
                      Schedule Meeting
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Notifications -->
          <div class="notif-wrap">
            <button class="topbar-icon-btn" (click)="toggleNotifications()" id="notifications-btn">
              <span class="material-icons">notifications</span>
              @if (unreadCount() > 0) {
                <span class="notif-badge">{{ unreadCount() }}</span>
              }
            </button>

            @if (showNotifications()) {
              <div class="notif-panel animate-fade-in">
                <div class="notif-header">
                  <span class="notif-title">Notifications</span>
                  <button class="mark-all-read" (click)="markAllRead()">Mark all read</button>
                </div>
                <div class="notif-list">
                  @for (notif of notifications().slice(0, 5); track notif.id) {
                    <div class="notif-item" [class.unread]="!notif.isRead" (click)="handleNotification(notif)">
                      <div class="notif-icon" [style.background]="getNotifColor(notif.type)">
                        <span class="material-icons">{{ getNotifIcon(notif.type) }}</span>
                      </div>
                      <div class="notif-content">
                        <p class="notif-text">{{ notif.title }}</p>
                        <p class="notif-msg">{{ notif.message }}</p>
                        <span class="notif-time">{{ timeAgo(notif.createdAt) }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="notif-empty">No notifications</div>
                  }
                </div>
                <div class="notif-footer">
                  <a routerLink="/notifications" (click)="showNotifications.set(false)">View all notifications</a>
                </div>
              </div>
            }
          </div>

          <!-- User Avatar (Topbar) -->
          <div class="topbar-user" routerLink="/settings" style="cursor: pointer;" title="Profile & Account Settings">
            <div class="avatar avatar-sm" [style.background]="getAvatarColor(user()?.firstName ?? 'U')">
              {{ getInitials() }}
            </div>
            <div class="topbar-user-info">
              <span class="topbar-username">{{ user()?.firstName }} {{ user()?.lastName }}</span>
              <span class="topbar-role">{{ formatRole(user()?.role) }}</span>
            </div>
          </div>
        </header>

        <!-- PAGE CONTENT -->
        <main class="main-content" role="main">
          <router-outlet />
        </main>
      </div>
    </div>
    <!-- LIVE SSE TOAST BANNER -->
    @if (liveAlert()) {
      <div class="live-toast animate-slide-in" (click)="dismissLiveAlert()">
        <div class="live-toast-icon">
          <span class="material-icons">{{ getNotifIcon(liveAlert()!.type) }}</span>
        </div>
        <div class="live-toast-content">
          <p class="live-toast-title">{{ liveAlert()!.title }}</p>
          <p class="live-toast-msg">{{ liveAlert()!.message }}</p>
        </div>
        <button class="live-toast-close" (click)="$event.stopPropagation(); dismissLiveAlert()">
          <span class="material-icons">close</span>
        </button>
      </div>
    }
  `,
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);
  showUserMenu = signal(false);
  showQuickCreate = signal(false);
  showNotifications = signal(false);
  searchActive = signal(false);
  searchQuery = '';

  public auth = inject(AuthService);
  private notifService = inject(NotificationService);
  public router = inject(Router);

  user = computed(() => this.auth.currentUser());
  isSuperAdmin = computed(() => this.auth.isSuperAdmin);
  isAdmin = computed(() => this.auth.isAdmin);
  isSalesTeam = computed(() => this.auth.isSales);
  private notifSignal = toSignal(this.notifService.notifications$, { initialValue: [] as Notification[] });
  notifications = computed(() => this.notifSignal());
  private unreadCountSignal = toSignal(this.notifService.unreadCount, { initialValue: 0 });
  unreadCount = computed(() => this.unreadCountSignal());
  // Live SSE alert signal
  liveAlert = toSignal(this.notifService.liveAlert$, { initialValue: null as Notification | null });

  visibleSections = computed(() => {
    const role = this.user()?.role;
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        return role && item.roles.includes(role);
      })
    })).filter(s => s.items.length > 0);
  });

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  currentPageTitle = computed(() => {
    const path = this.currentUrl() || this.router.url;
    if (path.includes('/sales/dashboard')) return 'Sales Dashboard';
    if (path.includes('/sales/pipeline')) return 'Sales Pipeline';
    if (path.includes('/sales/clients')) return 'Client Directory';
    if (path.includes('/sales/opportunities')) return 'Opportunity Details';
    if (path.includes('/sales/activities')) return 'Activities & Follow-ups';
    if (path.includes('/sales/meetings')) return 'Sales Meetings & Visits';
    if (path.includes('/sales/reports')) return 'Sales Analytics';
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/tasks/my-tasks')) return 'My Tasks';
    if (path.includes('/tasks/all')) return 'All Tasks';
    if (path.includes('/tasks/board')) return 'Task Board';
    if (path.includes('/tasks/calendar')) return 'Task Calendar';
    if (path.includes('/tasks/review')) return 'Task Review';
    if (path.includes('/tasks')) return 'Tasks';
    if (path.includes('/projects/pipeline')) return 'Project Pipeline';
    if (path.includes('/projects/all')) return 'All Projects';
    if (path.includes('/projects/milestones')) return 'Milestones';
    if (path.includes('/projects')) return 'Projects';
    if (path.includes('/meetings/calendar')) return 'Meeting Calendar';
    if (path.includes('/meetings/all')) return 'All Meetings';
    if (path.includes('/meetings/minutes')) return 'Meeting Minutes';
    if (path.includes('/meetings/history')) return 'Meeting History';
    if (path.includes('/meetings')) return 'Meetings';
    if (path.includes('/employees/directory')) return 'Employee Directory';
    if (path.includes('/employees')) return 'Employees';
    if (path.includes('/teams')) return 'Teams';
    if (path.includes('/notifications')) return 'Notifications';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/settings')) return 'Settings';
    return 'Dashboard';
  });

  constructor() {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.quick-create-wrap')) this.showQuickCreate.set(false);
    if (!target.closest('.notif-wrap')) this.showNotifications.set(false);
    if (!target.closest('.sidebar-user')) this.showUserMenu.set(false);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.mobileOpen.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  toggleQuickCreate(): void {
    this.showQuickCreate.update(v => !v);
    this.showNotifications.set(false);
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    this.showQuickCreate.set(false);
  }

  quickCreate(type: 'task' | 'project' | 'meeting' | 'client' | 'opportunity' | 'sales-meeting' | 'followup'): void {
    this.showQuickCreate.set(false);
    if (type === 'task') {
      if (!this.isSuperAdmin()) return;
      this.router.navigate(['/tasks/board']);
    } else if (type === 'project') {
      this.router.navigate(['/projects/all']);
    } else if (type === 'client') {
      this.router.navigate(['/sales/clients']);
    } else if (type === 'opportunity') {
      this.router.navigate(['/sales/pipeline']);
    } else if (type === 'sales-meeting') {
      this.router.navigate(['/sales/meetings']);
    } else if (type === 'followup') {
      this.router.navigate(['/sales/activities']);
    } else {
      if (!this.isSuperAdmin()) return;
      this.router.navigate(['/meetings/calendar']);
    }
  }

  markAllRead(): void {
    this.notifService.markAllAsRead();
  }

  handleNotification(notif: Notification): void {
    this.notifService.markAsRead(notif.id);
    this.showNotifications.set(false);
    if (notif.referenceType === 'TASK') this.router.navigate(['/tasks', notif.referenceId]);
    else if (notif.referenceType === 'PROJECT') this.router.navigate(['/projects', notif.referenceId]);
    else if (notif.referenceType === 'MEETING') this.router.navigate(['/meetings', notif.referenceId]);
  }

  logout(): void {
    this.auth.logout();
  }

  dismissLiveAlert(): void {
    // The service auto-clears after 5s, but allow manual dismiss by pushing null
    (this.notifService as any)._liveAlert.next(null);
  }

  getInitials(): string {
    const u = this.user();
    if (!u) return 'U';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#DC2626', '#8B5CF6'];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  formatRole(role?: string): string {
    if (!role) return '';
    return role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getNotifIcon(type: string): string {
    const map: Record<string, string> = {
      TASK_ASSIGNED: 'assignment',
      TASK_DUE_SOON: 'schedule',
      TASK_OVERDUE: 'warning',
      TASK_STATUS_CHANGED: 'sync',
      TASK_COMMENT: 'chat',
      TASK_BLOCKED: 'block',
      PROJECT_STAGE_CHANGED: 'account_tree',
      MEETING_INVITED: 'event',
      MEETING_REMINDER: 'alarm',
      MEETING_UPDATED: 'edit',
      MEETING_CANCELLED: 'event_busy',
      MILESTONE_DUE: 'flag',
      ACTION_ITEM_ASSIGNED: 'list_alt',
    };
    return map[type] ?? 'notifications';
  }

  getNotifColor(type: string): string {
    if (type.startsWith('TASK_OVERDUE') || type === 'TASK_BLOCKED') return 'rgba(220,38,38,0.12)';
    if (type.startsWith('MEETING')) return 'rgba(99,102,241,0.12)';
    if (type.startsWith('PROJECT')) return 'rgba(37,99,235,0.12)';
    if (type === 'MILESTONE_DUE') return 'rgba(217,119,6,0.12)';
    return 'rgba(6,182,212,0.12)';
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}
