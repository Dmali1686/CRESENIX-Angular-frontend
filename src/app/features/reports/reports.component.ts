import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface WorkloadItem {
  user_id: string;
  user_name: string;
  department: string;
  task_count: number;
}

interface MilestoneItem {
  id: string;
  title: string;
  project_name: string;
  owner_name: string;
  due_date: string;
  status: string;
}

interface ActivityItem {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target: string;
  timestamp: string;
}

interface DashboardData {
  active_projects: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_this_week: number;
  upcoming_meetings: number;
  projects_at_risk: number;
  total_employees: number;
  recent_activity: ActivityItem[];
  team_workload: WorkloadItem[];
  upcoming_milestones: MilestoneItem[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Executive Reports &amp; Analytics</h1>
          <p class="page-subtitle">Live project velocity, team workload balance, and delivery KPIs</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline btn-sm" (click)="exportReport('CSV')">
            <span class="material-icons">download</span> Export CSV
          </button>
          <button class="btn btn-gradient btn-sm" (click)="exportReport('PDF')">
            <span class="material-icons">picture_as_pdf</span> Download PDF Report
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <span class="material-icons spin">sync</span>
          <p>Loading live data from database…</p>
        </div>
      }

      @if (!loading()) {
        <div class="kpi-grid">
          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Active Projects</span>
              <span class="material-icons kpi-icon" style="color:var(--color-cyan)">rocket_launch</span>
            </div>
            <span class="kpi-value">{{ data().active_projects }}</span>
            <span class="kpi-sub neutral">Total in the system</span>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Open Tasks</span>
              <span class="material-icons kpi-icon" style="color:var(--color-blue)">task_alt</span>
            </div>
            <span class="kpi-value">{{ data().open_tasks }}</span>
            <span class="kpi-sub" [class.negative]="data().overdue_tasks > 0" [class.neutral]="data().overdue_tasks === 0">
              {{ data().overdue_tasks }} overdue
            </span>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Completed This Week</span>
              <span class="material-icons kpi-icon text-success">verified</span>
            </div>
            <span class="kpi-value">{{ data().completed_this_week }}</span>
            <span class="kpi-sub positive">
              <span class="material-icons">trending_up</span> Tasks closed
            </span>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Upcoming Meetings</span>
              <span class="material-icons kpi-icon text-warning">event</span>
            </div>
            <span class="kpi-value">{{ data().upcoming_meetings }}</span>
            <span class="kpi-sub neutral">From today onward</span>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Total Employees</span>
              <span class="material-icons kpi-icon" style="color:#8B5CF6">groups</span>
            </div>
            <span class="kpi-value">{{ data().total_employees }}</span>
            <span class="kpi-sub neutral">Active accounts</span>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Projects at Risk</span>
              <span class="material-icons kpi-icon" style="color:#DC2626">warning</span>
            </div>
            <span class="kpi-value" [class.text-danger]="data().projects_at_risk > 0">{{ data().projects_at_risk }}</span>
            <span class="kpi-sub" [class.negative]="data().projects_at_risk > 0" [class.neutral]="data().projects_at_risk === 0">
              {{ data().projects_at_risk === 0 ? 'All projects healthy' : 'Needs attention' }}
            </span>
          </div>
        </div>

        <div class="reports-layout">

          <!-- UPCOMING MILESTONES -->
          <div class="card report-card">
            <div class="card-header-bar">
              <h3>Upcoming Milestones</h3>
              <span class="badge badge-done">Next 60 Days</span>
            </div>
            @if (data().upcoming_milestones.length === 0) {
              <div class="empty-state">
                <span class="material-icons">flag</span>
                <p>No milestones due in the next 60 days</p>
              </div>
            } @else {
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Milestone</th><th>Project</th><th>Owner</th><th>Due Date</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of data().upcoming_milestones; track m.id) {
                    <tr>
                      <td><strong>{{ m.title }}</strong></td>
                      <td>{{ m.project_name }}</td>
                      <td>{{ m.owner_name }}</td>
                      <td>{{ m.due_date | date:'dd MMM yyyy' }}</td>
                      <td><span class="badge" [ngClass]="getMilestoneBadge(m.status)">{{ m.status.replace('_',' ') }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <!-- TEAM WORKLOAD -->
          <div class="card report-card">
            <div class="card-header-bar">
              <h3>Team Workload Balance</h3>
              <span class="badge badge-info">Live Task Load</span>
            </div>
            @if (data().team_workload.length === 0) {
              <div class="empty-state">
                <span class="material-icons">people</span>
                <p>No employees with active tasks</p>
              </div>
            } @else {
              <div class="workload-bars-list">
                @for (w of data().team_workload; track w.user_id) {
                  <div class="workload-item">
                    <div class="wl-labels">
                      <span class="wl-team">{{ w.user_name }}</span>
                      <span class="wl-pts">{{ w.task_count }} tasks · {{ w.department || 'N/A' }}</span>
                    </div>
                    <div class="wl-track">
                      <div class="wl-fill" [style.width.%]="getWorkloadPercent(w.task_count)" [style.background]="getWorkloadColor(w.task_count)"></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- RECENT ACTIVITY -->
          <div class="card report-card">
            <div class="card-header-bar">
              <h3>Recent Activity</h3>
              <span class="badge badge-done">Last 10 Actions</span>
            </div>
            @if (data().recent_activity.length === 0) {
              <div class="empty-state">
                <span class="material-icons">history</span>
                <p>No recent activity recorded yet</p>
              </div>
            } @else {
              <div class="activity-list">
                @for (a of data().recent_activity; track a.id) {
                  <div class="activity-item">
                    <div class="activity-avatar">{{ getInitials(a.user_name) }}</div>
                    <div class="activity-content">
                      <p class="activity-text">
                        <strong>{{ a.user_name }}</strong> {{ a.action }}
                        @if (a.target) { <em>"{{ a.target }}"</em> }
                      </p>
                      <span class="activity-time">{{ timeAgo(a.timestamp) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .loading-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px; color:var(--color-text-muted); gap:12px; }
    .loading-state .material-icons { font-size:40px; }
    .spin { animation:spin 1.2s linear infinite; }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

    .kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; margin-bottom:24px; }
    .kpi-card { padding:20px; display:flex; flex-direction:column; }
    .kpi-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .kpi-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--color-text-muted); }
    .kpi-icon { font-size:18px; }
    .kpi-value { font-size:2rem; font-weight:800; color:var(--color-navy); line-height:1; margin-bottom:6px; }
    .kpi-value.text-danger { color:#DC2626; }
    .kpi-sub { font-size:11px; display:flex; align-items:center; gap:3px; }
    .kpi-sub .material-icons { font-size:13px; }
    .kpi-sub.positive { color:#16A34A; }
    .kpi-sub.negative { color:#DC2626; }
    .kpi-sub.neutral  { color:var(--color-text-muted); }

    .reports-layout { display:flex; flex-direction:column; gap:20px; }
    .report-card { padding:0; overflow:hidden; }
    .card-header-bar { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--color-border); }
    .card-header-bar h3 { font-size:0.95rem; font-weight:700; color:var(--color-navy); margin:0; }
    .badge-info { background:#EFF6FF; color:#2563EB; font-size:0.72rem; font-weight:700; padding:3px 9px; border-radius:20px; }

    .report-table { width:100%; border-collapse:collapse; font-size:0.84rem; }
    .report-table th { background:var(--color-bg-secondary); padding:10px 16px; text-align:left; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); border-bottom:1px solid var(--color-border); }
    .report-table td { padding:12px 16px; border-bottom:1px solid var(--color-border); color:var(--color-text-primary); }
    .report-table tr:last-child td { border-bottom:none; }
    .report-table tr:hover td { background:var(--color-bg-secondary); }

    .workload-bars-list { display:flex; flex-direction:column; gap:16px; padding:16px 20px; }
    .workload-item { display:flex; flex-direction:column; gap:6px; }
    .wl-labels { display:flex; justify-content:space-between; font-size:13px; }
    .wl-team { font-weight:700; color:var(--color-navy); }
    .wl-pts { color:var(--color-text-muted); font-size:12px; }
    .wl-track { height:8px; background:#F1F5F9; border-radius:999px; overflow:hidden; }
    .wl-fill { height:100%; border-radius:999px; transition:width 0.4s ease; }

    .activity-list { display:flex; flex-direction:column; gap:0; padding:8px 0; }
    .activity-item { display:flex; align-items:flex-start; gap:12px; padding:10px 20px; border-bottom:1px solid var(--color-border); }
    .activity-item:last-child { border-bottom:none; }
    .activity-avatar { width:32px; height:32px; border-radius:50%; background:var(--color-blue); color:white; font-size:0.72rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .activity-content { flex:1; min-width:0; }
    .activity-text { font-size:0.83rem; color:var(--color-text-primary); margin:0 0 2px 0; line-height:1.4; }
    .activity-text em { color:var(--color-blue); font-style:normal; }
    .activity-time { font-size:0.72rem; color:var(--color-text-muted); }

    .empty-state { display:flex; flex-direction:column; align-items:center; gap:8px; padding:40px 20px; color:var(--color-text-muted); font-size:0.85rem; }
    .empty-state .material-icons { font-size:36px; opacity:0.4; }

    @media (max-width:1200px) { .kpi-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:700px)  { .kpi-grid { grid-template-columns:1fr 1fr; } }
  `]
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  data = signal<DashboardData>({
    active_projects: 0, open_tasks: 0, overdue_tasks: 0,
    completed_this_week: 0, upcoming_meetings: 0, projects_at_risk: 0,
    total_employees: 0, recent_activity: [], team_workload: [], upcoming_milestones: []
  });

  ngOnInit(): void {
    this.http.get<DashboardData>(`${environment.apiUrl}/dashboard/super-admin`).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: ()  => { this.loading.set(false); }
    });
  }

  getMilestoneBadge(status: string): string {
    const map: Record<string, string> = {
      'IN_PROGRESS': 'badge-inprogress', 'NOT_STARTED': 'badge-inreview',
      'AT_RISK': 'priority-critical',    'COMPLETED': 'badge-done',
    };
    return map[status] || 'badge-inreview';
  }

  getWorkloadPercent(taskCount: number): number {
    const max = Math.max(...this.data().team_workload.map(w => w.task_count), 1);
    return Math.max(5, Math.round((taskCount / max) * 100));
  }

  getWorkloadColor(taskCount: number): string {
    const max = Math.max(...this.data().team_workload.map(w => w.task_count), 1);
    const r = taskCount / max;
    return r > 0.8 ? '#DC2626' : r > 0.5 ? '#F59E0B' : '#3B82F6';
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  timeAgo(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  exportReport(type: string): void {
    alert(`Generating Cresenix Solutions ${type} Executive Report…`);
  }
}
