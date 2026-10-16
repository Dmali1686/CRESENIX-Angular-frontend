import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { TaskService } from '../../../core/services/task.service';
import { Employee, Task } from '../../../shared/models/index';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <!-- BREADCRUMBS -->
      <div class="breadcrumb-bar">
        <a routerLink="/employees/directory" class="breadcrumb-item">Employees</a>
        <span class="material-icons breadcrumb-sep">chevron_right</span>
        <span class="breadcrumb-item active">{{ employee() ? (employee()!.firstName + ' ' + employee()!.lastName) : 'Profile' }}</span>
      </div>

      @if (loading()) {
        <div class="card" style="padding:32px">
          <div class="skeleton skeleton-title" style="width:30%;height:28px;margin-bottom:12px"></div>
          <div class="skeleton skeleton-text" style="width:60%;height:16px"></div>
        </div>
      } @else if (employee()) {
        <div class="profile-layout">
          <!-- LEFT COLUMN: EMPLOYEE PROFILE CARD -->
          <div class="profile-side-col">
            <div class="card profile-card">
              <div class="profile-avatar-wrap">
                <div class="avatar avatar-lg" [style.background]="getAvatarColor(employee()!.firstName)">
                  {{ employee()!.firstName.charAt(0) }}{{ employee()!.lastName.charAt(0) }}
                </div>
                <span class="status-indicator-badge" [class.inactive]="!employee()!.isActive">
                  {{ employee()!.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <h2 class="profile-name">{{ employee()!.firstName }} {{ employee()!.lastName }}</h2>
              <span class="profile-role">{{ employee()!.designation || 'Specialist' }}</span>
              <span class="profile-dept"><span class="material-icons">business</span> {{ employee()!.department }}</span>

              <div class="profile-details-list">
                <div class="p-detail-item">
                  <span class="d-label">Email</span>
                  <span class="d-val">{{ employee()!.email }}</span>
                </div>
                <div class="p-detail-item">
                  <span class="d-label">System Role</span>
                  <span class="badge" [class]="getRoleBadgeClass(employee()!.role)">{{ employee()!.role }}</span>
                </div>
                <div class="p-detail-item">
                  <span class="d-label">Employee ID</span>
                  <span class="d-val">EMP-{{ employee()!.id.toUpperCase() }}</span>
                </div>
              </div>

              <button class="btn btn-outline btn-sm full-btn" (click)="goBack()">
                <span class="material-icons">arrow_back</span> Return to Directory
              </button>
            </div>
          </div>

          <!-- RIGHT COLUMN: WORKLOAD & ASSIGNED TASKS -->
          <div class="profile-main-col">
            <!-- WORKLOAD SUMMARY STRIP -->
            <div class="workload-stats-grid">
              <div class="card stat-card">
                <span class="stat-number">{{ employee()!.activeTaskCount ?? 0 }}</span>
                <span class="stat-title">Active Tasks</span>
              </div>
              <div class="card stat-card">
                <span class="stat-number">{{ employee()!.onTimeDeliveryRate ?? 100 }}%</span>
                <span class="stat-title">On-Time Delivery</span>
              </div>
              <div class="card stat-card">
                <span class="stat-number">{{ employee()!.assignedProjectNames?.length || 0 }}</span>
                <span class="stat-title">Projects Active</span>
              </div>
            </div>

            @if (employee()!.assignedProjectNames && employee()!.assignedProjectNames!.length > 0) {
              <div class="card projects-summary-card" style="margin-top:16px;padding:16px 20px;">
                <div style="font-size:12px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                  Assigned Projects
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  @for (pName of employee()!.assignedProjectNames; track pName) {
                    <span class="project-pill"><span class="material-icons" style="font-size:14px;vertical-align:middle;margin-right:4px;">folder</span>{{ pName }}</span>
                  }
                </div>
              </div>
            }

            <!-- ASSIGNED TASKS TABLE -->
            <div class="card data-table-wrapper" style="margin-top:20px">
              <div class="table-header-bar">
                <h3 class="tbl-title">Assigned Tasks</h3>
                <span class="badge badge-inprogress">{{ assignedTasks().length }} Tasks</span>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of assignedTasks(); track t.id) {
                    <tr [routerLink]="['/tasks', t.id]">
                      <td><span style="font-weight:600;color:var(--color-navy)">{{ t.title }}</span></td>
                      <td><span class="project-tag">{{ t.projectCode }}</span></td>
                      <td><span class="badge" [class]="getPriorityClass(t.priority)">{{ t.priority }}</span></td>
                      <td><span class="badge" [class]="getStatusClass(t.status)">{{ t.status }}</span></td>
                      <td><span style="font-size:12px">{{ t.dueDate || '—' }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5"><div class="empty-state"><p class="empty-title">No active tasks assigned to this employee</p></div></td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .breadcrumb-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      font-size: 13px;

      .breadcrumb-item {
        color: var(--color-blue);
        text-decoration: none;
        font-weight: 500;

        &.active {
          color: var(--color-text-secondary);
        }
      }

      .breadcrumb-sep {
        font-size: 16px;
        color: var(--color-text-muted);
      }
    }

    .profile-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }

    .profile-card {
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .profile-avatar-wrap {
        position: relative;
        margin-bottom: 16px;

        .avatar-lg {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 28px;
          font-weight: 700;
          box-shadow: var(--shadow-md);
        }

        .status-indicator-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          background: #10B981;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          border: 2px solid white;

          &.inactive {
            background: #94A3B8;
          }
        }
      }

      .profile-name {
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .profile-role {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-bottom: 6px;
      }

      .profile-dept {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--color-text-muted);
        margin-bottom: 20px;

        .material-icons {
          font-size: 15px;
        }
      }

      .profile-details-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 0;
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 20px;
        text-align: left;

        .p-detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;

          .d-label {
            color: var(--color-text-muted);
            font-weight: 600;
          }

          .d-val {
            font-weight: 600;
            color: var(--color-navy);
          }
        }
      }

      .full-btn {
        width: 100%;
        justify-content: center;
      }
    }

    .workload-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      .stat-card {
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;

        .stat-number {
          font-size: 26px;
          font-weight: 800;
          color: var(--color-navy);
        }

        .stat-title {
          font-size: 12px;
          color: var(--color-text-muted);
          font-weight: 600;
          margin-top: 4px;
        }
      }
    }

    .table-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);

      .tbl-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--color-navy);
      }
    }

    .project-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-blue);
      background: var(--color-light-blue);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .project-pill {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-blue);
      background: var(--color-light-blue);
      padding: 4px 10px;
      border-radius: 6px;
    }

    @media (max-width: 860px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EmployeeDetailComponent implements OnInit {
  loading = signal(true);
  employee = signal<Employee | null>(null);
  assignedTasks = signal<Task[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeService.getEmployeeById(id).subscribe(e => {
        this.employee.set(e || null);
        this.loading.set(false);
      });
      this.taskService.getTasks({ assigneeId: id }).subscribe(res => {
        this.assignedTasks.set(res.data);
      });
    } else {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/employees/directory']);
  }

  getRoleBadgeClass(r: string): string {
    return {
      SUPER_ADMIN: 'badge-blocked',
      ADMIN: 'badge-inreview',
      SALES: 'badge-done',
      EMPLOYEE: 'badge-inprogress'
    }[r] ?? '';
  }

  getPriorityClass(p: string): string {
    return {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    }[p] ?? '';
  }

  getStatusClass(s: string): string {
    return {
      BACKLOG: 'badge-backlog',
      TODO: 'badge-todo',
      IN_PROGRESS: 'badge-inprogress',
      IN_REVIEW: 'badge-inreview',
      BLOCKED: 'badge-blocked',
      DONE: 'badge-done'
    }[s] ?? '';
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#10B981', '#F59E0B'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
