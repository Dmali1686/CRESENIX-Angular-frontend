import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TaskService } from '../../core/services/task.service';
import { MeetingService } from '../../core/services/meeting.service';
import { CreateTaskModalComponent } from '../tasks/create-task-modal/create-task-modal.component';
import {
  SuperAdminDashboard, AdminDashboard, EmployeeDashboard,
  DashboardKpi, Task, Meeting, ActivityItem, Milestone, TeamWorkloadItem
} from '../../shared/models/index';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CreateTaskModalComponent],
  template: `
    <div class="page-container">
      <!-- PAGE HEADER -->
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">{{ greeting() }}, {{ userName() }}</h1>
          <p class="page-subtitle">
            <span>{{ subtitle() }}</span>
            <span class="live-status-pill" title="Live connection to Go backend and PostgreSQL database">
              <span class="live-status-dot"></span>
              Live Backend (PostgreSQL · :8080)
            </span>
          </p>
        </div>
        <div class="page-actions">
          @if (isAdmin()) {
            <a id="dashboard-new-project-btn" routerLink="/projects/pipeline" class="btn btn-outline btn-sm">
              <span class="material-icons">folder_open</span>New Project
            </a>
          }
          @if (isSuperAdmin()) {
            <button id="dashboard-new-task-btn" class="btn btn-outline btn-sm" (click)="showCreateTaskModal.set(true)">
              <span class="material-icons">add_task</span>New Task
            </button>
            <a id="dashboard-schedule-meeting-btn" routerLink="/meetings/calendar" class="btn btn-gradient btn-sm">
              <span class="material-icons">video_call</span>Schedule Meeting
            </a>
          }
        </div>
      </div>

      <!-- LOADING STATE -->
      @if (loading()) {
        <div class="kpi-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton skeleton-card" style="height:96px"></div>
          }
        </div>
      } @else {
        <!-- KPI CARDS -->
        <div class="kpi-grid">
          @for (kpi of kpis(); track kpi.id) {
            <div class="kpi-card" [routerLink]="kpi.route">
              <div class="kpi-icon" [style.background]="kpi.color + '20'">
                <span class="material-icons" [style.color]="kpi.color">{{ kpi.icon }}</span>
              </div>
              <div class="kpi-content">
                <div class="kpi-value">{{ kpi.value }}</div>
                <div class="kpi-label">{{ kpi.label }}</div>
                @if (kpi.trend !== undefined) {
                  <div class="kpi-change" [class.up]="kpi.trendUp" [class.down]="!kpi.trendUp">
                    <span class="material-icons" style="font-size:12px">{{ kpi.trendUp ? 'trending_up' : 'trending_down' }}</span>
                    {{ kpi.trend }} this week
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- MAIN CONTENT -->
        <div class="content-grid grid-2-1" style="gap:20px">
          <!-- LEFT COLUMN -->
          <div style="display:flex;flex-direction:column;gap:20px">

            <!-- MY TASKS / TEAM TASKS -->
            <div class="card">
              <div class="card-header">
                <h3>{{ isEmployee() ? 'My Tasks' : 'Recent Tasks' }}</h3>
                <a [routerLink]="isEmployee() ? '/tasks/my-tasks' : '/tasks/all'" class="btn btn-ghost btn-sm">View all</a>
              </div>
              <div class="card-body" style="padding-top:8px">
                @if (tasks().length === 0) {
                  <div class="empty-state" style="padding:32px 16px">
                    <span class="material-icons empty-icon" style="font-size:40px">task_alt</span>
                    <p class="empty-title">No tasks</p>
                  </div>
                } @else {
                  <div class="task-list">
                    @for (task of tasks().slice(0, 6); track task.id) {
                      <div class="task-row" [routerLink]="['/tasks', task.id]">
                        <div class="task-row-left">
                          <div class="task-status-dot" [class]="'dot-' + task.status.toLowerCase().replace('_', '')"></div>
                          <div>
                            <p class="task-row-title">{{ task.title }}</p>
                            <p class="task-row-meta">{{ task.projectName }} · {{ task.assigneeName }}</p>
                          </div>
                        </div>
                        <div class="task-row-right">
                          <span class="badge" [class]="getPriorityBadge(task.priority)">{{ task.priority }}</span>
                          @if (task.dueDate) {
                            <span class="task-due" [class.overdue]="isOverdue(task.dueDate)">
                              {{ formatDate(task.dueDate) }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- ACTIVITY FEED -->
            <div class="card">
              <div class="card-header">
                <h3>Recent Activity</h3>
              </div>
              <div class="card-body" style="padding-top:8px">
                @for (item of activity().slice(0, 5); track item.id) {
                  <div class="activity-row">
                    <div class="avatar avatar-sm" [style.background]="getAvatarColor(item.userName)">
                      {{ item.userName.charAt(0) }}
                    </div>
                    <div class="activity-content">
                      <p><strong>{{ item.userName }}</strong> {{ item.action }} <span class="text-blue">{{ item.target }}</span></p>
                      <span class="activity-time">{{ timeAgo(item.timestamp) }}</span>
                    </div>
                  </div>
                } @empty {
                  <p class="text-secondary" style="padding:16px 0">No recent activity</p>
                }
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div style="display:flex;flex-direction:column;gap:20px">

            <!-- UPCOMING MEETINGS -->
            <div class="card">
              <div class="card-header">
                <h3>Upcoming Meetings</h3>
                <a routerLink="/meetings/calendar" class="btn btn-ghost btn-sm">View all</a>
              </div>
              <div class="card-body" style="padding-top:8px">
                @for (meeting of meetings().slice(0, 4); track meeting.id) {
                  <div class="meeting-row" [routerLink]="['/meetings', meeting.id]">
                    <div class="meeting-time-col">
                      <span class="meeting-time">{{ meeting.startTime }}</span>
                      <span class="meeting-date">{{ formatDate(meeting.date) }}</span>
                    </div>
                    <div class="meeting-details">
                      <p class="meeting-title">{{ meeting.title }}</p>
                      <p class="meeting-meta">
                        <span class="material-icons" style="font-size:13px">person</span>
                        {{ meeting.organizerName }}
                        @if (meeting.projectName) { · {{ meeting.projectName }} }
                      </p>
                    </div>
                    <span class="badge" [class]="getMeetingTypeBadge(meeting.type)">{{ formatType(meeting.type) }}</span>
                  </div>
                } @empty {
                  <div class="empty-state" style="padding:24px">
                    <span class="material-icons empty-icon" style="font-size:40px">event_available</span>
                    <p class="empty-title">No upcoming meetings</p>
                  </div>
                }
              </div>
            </div>

            <!-- UPCOMING MILESTONES (admin/super admin) -->
            @if (!isEmployee() && milestones().length > 0) {
              <div class="card">
                <div class="card-header">
                  <h3>Upcoming Milestones</h3>
                  <a routerLink="/projects/milestones" class="btn btn-ghost btn-sm">View all</a>
                </div>
                <div class="card-body" style="padding-top:8px">
                  @for (ms of milestones().slice(0, 4); track ms.id) {
                    <div class="milestone-row">
                      <span class="material-icons" [style.color]="getMilestoneColor(ms.status)">flag</span>
                      <div class="milestone-info">
                        <p class="milestone-title">{{ ms.title }}</p>
                        <p class="milestone-meta">{{ ms.projectName }} · {{ ms.ownerName }}</p>
                      </div>
                      <span class="milestone-date" [class.overdue]="isOverdue(ms.dueDate)">{{ formatDate(ms.dueDate) }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TEAM WORKLOAD (super admin / admin) -->
            @if (isAdmin() && workload().length > 0) {
              <div class="card">
                <div class="card-header">
                  <h3>Team Workload</h3>
                </div>
                <div class="card-body" style="padding-top:8px">
                  @for (member of workload().slice(0, 5); track member.userId) {
                    <div class="workload-row">
                      <div class="avatar avatar-xs" [style.background]="getAvatarColor(member.userName)">
                        {{ member.userName.charAt(0) }}
                      </div>
                      <div class="workload-info">
                        <p class="workload-name">{{ member.userName }}</p>
                        <div class="workload-bar-wrap">
                          <div class="workload-bar">
                            <div class="workload-fill" [style.width]="getWorkloadPct(member) + '%'" [style.background]="getWorkloadColor(member)"></div>
                          </div>
                          <span class="workload-count">{{ member.taskCount }} tasks</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (showCreateTaskModal()) {
        <app-create-task-modal
          (close)="showCreateTaskModal.set(false)"
          (created)="onTaskCreated($event)">
        </app-create-task-modal>
      }
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  showCreateTaskModal = signal(false);
  kpis = signal<DashboardKpi[]>([]);
  tasks = signal<Task[]>([]);
  meetings = signal<Meeting[]>([]);
  activity = signal<ActivityItem[]>([]);
  milestones = signal<Milestone[]>([]);
  workload = signal<TeamWorkloadItem[]>([]);

  userName = computed(() => this.auth.currentUser()?.firstName ?? 'User');
  isEmployee = computed(() => this.auth.isEmployee);
  isAdmin = computed(() => this.auth.isAdmin);
  isSuperAdmin = computed(() => this.auth.isSuperAdmin);

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  subtitle = computed(() => {
    const role = this.auth.userRole;
    if (role === 'SUPER_ADMIN') return 'Company-wide overview · Monitor projects, tasks, and team activity';
    if (role === 'ADMIN') return 'Operational overview · Manage your projects and team tasks';
    return `Here's your work overview for today · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  });

  private auth = inject(AuthService);
  private dashService = inject(DashboardService);
  private taskService = inject(TaskService);
  private meetingService = inject(MeetingService);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    this.meetingService.meetings$.subscribe(all => {
      if (all) {
        let filtered = all.filter(m => m.status === 'SCHEDULED');
        if (this.isEmployee() && user) {
          filtered = filtered.filter(m =>
            m.organizerId === user.id || (m.participants && m.participants.some(p => p.userId === user.id))
          );
        }
        const sorted = [...filtered]
          .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
        this.meetings.set(sorted.slice(0, 5));
      }
    });

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const role = this.auth.userRole;
    const user = this.auth.currentUser();
    const isEmp = this.isEmployee();

    if (role === 'SUPER_ADMIN') {
      this.dashService.getSuperAdminDashboard().subscribe(d => {
        this.kpis.set(d.kpis);
        this.activity.set(d.recentActivity ?? []);
        this.milestones.set(d.upcomingMilestones ?? []);
        this.workload.set(d.teamWorkload ?? []);
        this.loading.set(false);
      });
    } else if (role === 'ADMIN') {
      this.dashService.getAdminDashboard().subscribe(d => {
        this.kpis.set(d.kpis);
        this.activity.set(d.recentActivity ?? []);
        this.workload.set(d.teamWorkload ?? []);
        this.loading.set(false);
      });
    } else {
      this.dashService.getEmployeeDashboard().subscribe(d => {
        this.kpis.set(d.kpis);
        this.activity.set(d.recentProjectUpdates ?? []);
        this.loading.set(false);
      });
    }

    if (isEmp && user) {
      // For employee: only show tasks assigned to them OR created by them
      this.taskService.getMyTasks(user.id).subscribe({
        next: list => {
          this.tasks.set(list.slice(0, 6));
        },
        error: () => {}
      });

      // For employee: only show meetings where they are a participant or organizer
      this.meetingService.getMeetings({ status: 'SCHEDULED', sort: 'asc', limit: 50 }).subscribe({
        next: res => {
          if (res && res.data) {
            const userMeetings = res.data.filter(m =>
              m.organizerId === user.id || (m.participants && m.participants.some(p => p.userId === user.id))
            );
            const sorted = [...userMeetings]
              .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
            this.meetings.set(sorted.slice(0, 5));
          }
        },
        error: () => {}
      });
    } else {
      // Super Admin / Admin: view all recent company tasks & meetings
      this.taskService.getTasks({ limit: 6, sort: 'recent' }).subscribe({
        next: res => {
          if (res && res.data && res.data.length > 0) {
            this.tasks.set(res.data.slice(0, 6));
          }
        },
        error: () => {}
      });

      this.meetingService.getMeetings({ status: 'SCHEDULED', sort: 'asc', limit: 20 }).subscribe({
        next: res => {
          if (res && res.data) {
            const sorted = [...res.data]
              .filter(m => m.status === 'SCHEDULED')
              .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
            this.meetings.set(sorted.slice(0, 5));
          }
        },
        error: () => {}
      });
    }
  }

  onTaskCreated(newTask: Task): void {
    this.showCreateTaskModal.set(false);
    // Reload dashboard to update KPI counters (Open Tasks +1) and recent task list
    this.loadDashboardData();
  }

  getPriorityBadge(p: string): string {
    const map: Record<string, string> = { LOW: 'priority-low', MEDIUM: 'priority-medium', HIGH: 'priority-high', CRITICAL: 'priority-critical' };
    return 'badge ' + (map[p] ?? '');
  }

  getMeetingTypeBadge(t: string): string {
    return 'badge badge-inprogress';
  }

  formatType(t: string): string {
    return t.replace('_', ' ');
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  isOverdue(d: string): boolean {
    return new Date(d) < new Date();
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  getMilestoneColor(status: string): string {
    const map: Record<string, string> = { COMPLETED: '#16A34A', IN_PROGRESS: '#2563EB', OVERDUE: '#DC2626', PENDING: '#D97706' };
    return map[status] ?? '#94A3B8';
  }

  getWorkloadPct(m: TeamWorkloadItem): number {
    return Math.min(100, (m.taskCount / 12) * 100);
  }

  getWorkloadColor(m: TeamWorkloadItem): string {
    const pct = this.getWorkloadPct(m);
    if (pct > 80) return '#DC2626';
    if (pct > 60) return '#D97706';
    return '#2563EB';
  }
}
