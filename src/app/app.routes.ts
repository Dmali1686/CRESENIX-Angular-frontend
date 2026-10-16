import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard, RoleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Auth routes (public)
  {
    path: 'auth',
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Protected routes (inside app shell)
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./core/layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Tasks
      {
        path: 'tasks',
        children: [
          {
            path: 'my-tasks',
            loadComponent: () => import('./features/tasks/my-tasks/my-tasks.component').then(m => m.MyTasksComponent)
          },
          {
            path: 'all',
            loadComponent: () => import('./features/tasks/all-tasks/all-tasks.component').then(m => m.AllTasksComponent)
          },
          {
            path: 'board',
            loadComponent: () => import('./features/tasks/task-board/task-board.component').then(m => m.TaskBoardComponent)
          },
          {
            path: 'calendar',
            loadComponent: () => import('./features/tasks/task-calendar/task-calendar.component').then(m => m.TaskCalendarComponent)
          },
          {
            path: 'review',
            loadComponent: () => import('./features/tasks/task-review/task-review.component').then(m => m.TaskReviewComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/tasks/task-detail/task-detail.component').then(m => m.TaskDetailComponent)
          },
          { path: '', redirectTo: 'my-tasks', pathMatch: 'full' }
        ]
      },

      // Projects
      {
        path: 'projects',
        children: [
          {
            path: 'pipeline',
            loadComponent: () => import('./features/projects/pipeline/pipeline.component').then(m => m.PipelineComponent)
          },
          {
            path: 'all',
            loadComponent: () => import('./features/projects/all-projects/all-projects.component').then(m => m.AllProjectsComponent)
          },
          {
            path: 'milestones',
            loadComponent: () => import('./features/projects/milestones/milestones.component').then(m => m.MilestonesComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
          },
          { path: '', redirectTo: 'pipeline', pathMatch: 'full' }
        ]
      },

      // Sales CRM — restricted strictly to SALES team and SUPER_ADMIN
      {
        path: 'sales',
        canActivate: [RoleGuard],
        data: { roles: ['SALES', 'SUPER_ADMIN'] },
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./features/sales/dashboard/sales-dashboard.component').then(m => m.SalesDashboardComponent)
          },
          {
            path: 'pipeline',
            loadComponent: () => import('./features/sales/pipeline/sales-pipeline.component').then(m => m.SalesPipelineComponent)
          },
          {
            path: 'clients',
            children: [
              {
                path: '',
                loadComponent: () => import('./features/sales/clients/client-directory.component').then(m => m.ClientDirectoryComponent)
              },
              {
                path: ':id',
                loadComponent: () => import('./features/sales/clients/client-profile.component').then(m => m.ClientProfileComponent)
              }
            ]
          },
          {
            path: 'opportunities',
            children: [
              {
                path: '',
                redirectTo: '/sales/pipeline',
                pathMatch: 'full'
              },
              {
                path: ':id',
                loadComponent: () => import('./features/sales/opportunities/opportunity-details.component').then(m => m.OpportunityDetailsComponent)
              }
            ]
          },
          {
            path: 'activities',
            loadComponent: () => import('./features/sales/activities/sales-activities.component').then(m => m.SalesActivitiesComponent)
          },
          {
            path: 'meetings',
            loadComponent: () => import('./features/sales/meetings/sales-meetings.component').then(m => m.SalesMeetingsComponent)
          },
          {
            path: 'reports',
            loadComponent: () => import('./features/sales/reports/sales-reports.component').then(m => m.SalesReportsComponent)
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },

      // Meetings
      {
        path: 'meetings',
        children: [
          {
            path: 'calendar',
            loadComponent: () => import('./features/meetings/meeting-calendar/meeting-calendar.component').then(m => m.MeetingCalendarComponent)
          },
          {
            path: 'all',
            loadComponent: () => import('./features/meetings/all-meetings/all-meetings.component').then(m => m.AllMeetingsComponent)
          },
          {
            path: 'minutes',
            loadComponent: () => import('./features/meetings/meeting-minutes/meeting-minutes.component').then(m => m.MeetingMinutesComponent)
          },
          {
            path: 'history',
            loadComponent: () => import('./features/meetings/meeting-history/meeting-history.component').then(m => m.MeetingHistoryComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/meetings/meeting-detail/meeting-detail.component').then(m => m.MeetingDetailComponent)
          },
          { path: '', redirectTo: 'calendar', pathMatch: 'full' }
        ]
      },

      // Employees & Teams
      {
        path: 'employees',
        children: [
          {
            path: 'directory',
            loadComponent: () => import('./features/employees/directory/directory.component').then(m => m.DirectoryComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/employees/employee-detail/employee-detail.component').then(m => m.EmployeeDetailComponent)
          },
          { path: '', redirectTo: 'directory', pathMatch: 'full' }
        ]
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams.component').then(m => m.TeamsComponent)
      },

      // Notifications
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent)
      },

      // Reports
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },

      // Settings
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },

      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Root redirect
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
