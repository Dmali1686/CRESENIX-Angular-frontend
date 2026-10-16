import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError } from 'rxjs';
import {
  SuperAdminDashboard, AdminDashboard, EmployeeDashboard,
  DashboardKpi, ActivityItem, TeamWorkloadItem, Milestone
} from '../../shared/models/index';
import { environment } from '../../../environments/environment';

// ─── Backend Response Mappers ─────────────────────────────────────────────────

function mapActivity(a: any): ActivityItem {
  return {
    id: a.id ?? '',
    userId: a.user_id ?? '',
    userName: a.user_name ?? 'Unknown',
    action: a.action ?? '',
    target: a.target ?? '',
    targetType: 'TASK',   // generic default; backend doesn't send targetType
    targetId: '',
    timestamp: a.timestamp ?? new Date().toISOString(),
  };
}

function mapWorkload(w: any): TeamWorkloadItem {
  return {
    userId: w.user_id ?? '',
    userName: w.user_name ?? '',
    designation: w.department ?? '',
    taskCount: w.task_count ?? 0,
    completedCount: 0,
    overdueCount: 0,
  };
}

function mapMilestone(m: any): Milestone {
  return {
    id: m.id ?? '',
    projectId: '',
    projectName: m.project_name ?? '',
    title: m.title ?? '',
    dueDate: m.due_date ? m.due_date.split('T')[0] : '',
    ownerId: '',
    ownerName: m.owner_name ?? '',
    status: (m.status as any) ?? 'PENDING',
  };
}

// ─── Empty fallbacks (no mocks) ───────────────────────────────────────────────

function emptySuperAdmin(): SuperAdminDashboard {
  return {
    kpis: [],
    projectPipeline: [],
    teamWorkload: [],
    upcomingMeetings: [],
    overdueTask: [],
    recentActivity: [],
    upcomingMilestones: [],
  };
}

function emptyAdmin(): AdminDashboard {
  return {
    kpis: [],
    myProjects: [],
    teamTasks: [],
    overdueTask: [],
    tasksAwaitingReview: [],
    upcomingMeetings: [],
    recentActivity: [],
  };
}

function emptyEmployee(): EmployeeDashboard {
  return {
    kpis: [],
    myTasks: [],
    dueTodayTasks: [],
    upcomingMeetings: [],
    notifications: [],
    recentProjectUpdates: [],
    assignedActionItems: [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSuperAdminDashboard(): Observable<SuperAdminDashboard> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/dashboard/super-admin`).pipe(
        map(res => {
          const kpis: DashboardKpi[] = [
            { id: 'k1', label: 'Active Projects',    value: res.active_projects     ?? 0, icon: 'folder',       color: '#2563EB', trend: 2, trendUp: true,  route: '/projects' },
            { id: 'k2', label: 'Open Tasks',         value: res.open_tasks          ?? 0, icon: 'task_alt',     color: '#06B6D4', trend: 5, trendUp: false, route: '/tasks' },
            { id: 'k3', label: 'Overdue Tasks',      value: res.overdue_tasks       ?? 0, icon: 'warning',      color: '#DC2626', trend: 1, trendUp: false, route: '/tasks' },
            { id: 'k4', label: 'Completed This Week',value: res.completed_this_week ?? 0, icon: 'check_circle', color: '#16A34A', trend: 4, trendUp: true,  route: '/tasks' },
            { id: 'k5', label: 'Upcoming Meetings',  value: res.upcoming_meetings   ?? 0, icon: 'videocam',     color: '#6366F1', route: '/meetings' },
            { id: 'k6', label: 'Total Employees',    value: res.total_employees     ?? 0, icon: 'groups',       color: '#D97706', route: '/employees' },
          ];

          return {
            kpis,
            projectPipeline: [],
            teamWorkload:        (res.team_workload       ?? []).map(mapWorkload),
            upcomingMeetings:    [],
            overdueTask:         [],
            recentActivity:      (res.recent_activity     ?? []).map(mapActivity),
            upcomingMilestones:  (res.upcoming_milestones ?? []).map(mapMilestone),
          } as SuperAdminDashboard;
        }),
        catchError(() => of(emptySuperAdmin()))
      );
    }

    return of(emptySuperAdmin()).pipe(delay(200));
  }

  getAdminDashboard(): Observable<AdminDashboard> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/dashboard/admin`).pipe(
        map(res => {
          const kpis: DashboardKpi[] = [
            { id: 'k1', label: 'Active Projects',  value: res.active_projects  ?? 0, icon: 'folder',      color: '#2563EB', route: '/projects' },
            { id: 'k2', label: 'Open Tasks',       value: res.open_tasks       ?? 0, icon: 'task_alt',    color: '#06B6D4', route: '/tasks' },
            { id: 'k3', label: 'Overdue Tasks',    value: res.overdue_tasks    ?? 0, icon: 'warning',     color: '#DC2626', route: '/tasks' },
            { id: 'k4', label: 'Awaiting Review',  value: res.awaiting_review  ?? 0, icon: 'rate_review', color: '#8B5CF6', route: '/tasks' },
            { id: 'k5', label: 'Upcoming Meetings',value: res.upcoming_meetings ?? 0, icon: 'videocam',   color: '#6366F1', route: '/meetings' },
          ];

          return {
            kpis,
            myProjects: [],
            teamTasks: [],
            overdueTask: [],
            tasksAwaitingReview: [],
            upcomingMeetings: [],
            recentActivity: (res.recent_activity ?? []).map(mapActivity),
            teamWorkload:    (res.team_workload   ?? []).map(mapWorkload),
          } as AdminDashboard;
        }),
        catchError(() => of(emptyAdmin()))
      );
    }

    return of(emptyAdmin()).pipe(delay(200));
  }

  getEmployeeDashboard(): Observable<EmployeeDashboard> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/dashboard/employee`).pipe(
        map(res => {
          const kpis: DashboardKpi[] = [
            { id: 'k1', label: 'Due Today',       value: res.due_today       ?? 0, icon: 'today',       color: '#D97706', route: '/tasks/my-tasks' },
            { id: 'k2', label: 'In Progress',     value: res.in_progress     ?? 0, icon: 'sync',        color: '#2563EB', route: '/tasks/board' },
            { id: 'k3', label: 'Overdue',         value: res.overdue_tasks   ?? 0, icon: 'warning',     color: '#DC2626', route: '/tasks/my-tasks' },
            { id: 'k4', label: 'Awaiting Review', value: res.awaiting_review ?? 0, icon: 'rate_review', color: '#6366F1', route: '/tasks/review' },
          ];

          return {
            kpis,
            myTasks: [],
            dueTodayTasks: [],
            upcomingMeetings: [],
            notifications: [],
            recentProjectUpdates: (res.recent_activity ?? []).map(mapActivity),
            assignedActionItems: [],
          } as EmployeeDashboard;
        }),
        catchError(() => of(emptyEmployee()))
      );
    }

    return of(emptyEmployee()).pipe(delay(200));
  }
}
