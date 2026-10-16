import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Project, Task, Milestone } from '../../../shared/models/index';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <!-- BREADCRUMBS -->
      <div class="breadcrumb-bar">
        <a routerLink="/projects/all" class="breadcrumb-item">Projects</a>
        <span class="material-icons breadcrumb-sep">chevron_right</span>
        <span class="breadcrumb-item active">{{ project()?.name || 'Project Details' }}</span>
      </div>

      @if (loading()) {
        <div class="card" style="padding: 32px">
          <div class="skeleton skeleton-title" style="width: 40%; height: 28px; margin-bottom: 16px"></div>
          <div class="skeleton skeleton-text" style="width: 70%; height: 16px; margin-bottom: 8px"></div>
          <div class="skeleton skeleton-text" style="width: 50%; height: 16px"></div>
        </div>
      } @else if (project()) {
        <!-- HERO BANNER -->
        <div class="project-hero-card card">
          <div class="hero-top">
            <div class="hero-info">
              <div class="hero-badges">
                <span class="p-code-tag">{{ project()!.code }}</span>
                <span class="badge" [class]="getStageClass(project()!.stage)">{{ fmtStage(project()!.stage) }}</span>
                <span class="badge" [class]="getPriorityClass(project()!.priority)">{{ project()!.priority }}</span>
              </div>
              <h1 class="project-title">{{ project()!.name }}</h1>
              <p class="project-desc">{{ project()!.description }}</p>
            </div>
            <div class="hero-actions">
              <a routerLink="/tasks/all" class="btn btn-gradient btn-sm">
                <span class="material-icons">add</span> Add Task
              </a>
              <a routerLink="/projects/pipeline" class="btn btn-outline btn-sm">
                <span class="material-icons">view_column</span> Pipeline
              </a>
              @if (isSuperAdmin()) {
                <button class="btn btn-outline-danger btn-sm" (click)="openDeleteConfirm()">
                  <span class="material-icons">delete_outline</span> Delete
                </button>
              }
            </div>
          </div>

          <!-- METRICS ROW -->
          <div class="project-metrics-grid">
            <div class="metric-box">
              <span class="m-val">{{ project()!.progress }}%</span>
              <span class="m-lbl">Progress</span>
              <div class="progress-bar-xs">
                <div class="progress-fill" [style.width.%]="project()!.progress"></div>
              </div>
            </div>

            <div class="metric-box">
              <span class="m-val">{{ project()!.openTaskCount }} / {{ project()!.totalTaskCount }}</span>
              <span class="m-lbl">Open Tasks</span>
            </div>

            <div class="metric-box">
              <span class="m-val">{{ project()!.managerName || '—' }}</span>
              <span class="m-lbl">Project Manager</span>
            </div>

            <div class="metric-box">
              <span class="m-val">{{ project()!.targetDate }}</span>
              <span class="m-lbl">Target Delivery</span>
            </div>
          </div>
        </div>

        <!-- TABS BAR -->
        <div class="tabs-nav">
          <button class="tab-btn" [class.active]="activeTab() === 'tasks'" (click)="activeTab.set('tasks')">
            <span class="material-icons">task_alt</span> Tasks ({{ projectTasks().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'milestones'" (click)="activeTab.set('milestones')">
            <span class="material-icons">flag</span> Milestones ({{ milestones().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'details'" (click)="activeTab.set('details')">
            <span class="material-icons">info</span> Overview
          </button>
        </div>

        <!-- TAB CONTENT: TASKS -->
        @if (activeTab() === 'tasks') {
          <div class="card data-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                @for (t of projectTasks(); track t.id) {
                  <tr [routerLink]="['/tasks', t.id]">
                    <td>
                      <span style="font-weight:600;color:var(--color-navy)">{{ t.title }}</span>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="avatar avatar-xs">{{ t.assigneeName ? t.assigneeName.charAt(0) : '?' }}</div>
                        <span style="font-size:12px">{{ t.assigneeName || 'Unassigned' }}</span>
                      </div>
                    </td>
                    <td><span class="badge" [class]="getPriorityClass(t.priority)">{{ t.priority }}</span></td>
                    <td><span class="badge" [class]="getStatusClass(t.status)">{{ t.status }}</span></td>
                    <td><span style="font-size:12px">{{ t.dueDate || '—' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5"><div class="empty-state"><p class="empty-title">No tasks linked to this project</p></div></td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- TAB CONTENT: MILESTONES -->
        @if (activeTab() === 'milestones') {
          <div class="milestones-tab-list">
            @for (m of milestones(); track m.id) {
              <div class="card milestone-item-row">
                <div class="m-left">
                  <span class="badge" [class]="m.status === 'COMPLETED' ? 'badge-done' : 'badge-inprogress'">{{ m.status }}</span>
                  <div>
                    <h4 class="m-title">{{ m.title }}</h4>
                    <p class="m-desc">{{ m.description }}</p>
                  </div>
                </div>
                <div class="m-right">
                  <span class="target-txt"><span class="material-icons">event</span> Target: {{ m.dueDate }}</span>
                </div>
              </div>
            } @empty {
              <div class="card empty-state"><p class="empty-title">No milestones recorded for this project.</p></div>
            }
          </div>
        }

        <!-- TAB CONTENT: OVERVIEW DETAILS -->
        @if (activeTab() === 'details') {
          <div class="overview-grid">
            <div class="card detail-info-card">
              <h3 class="card-section-title">Project Specifications</h3>
              <div class="spec-row">
                <span class="spec-label">Project Code:</span>
                <span class="spec-val">{{ project()!.code }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Client or Department:</span>
                <span class="spec-val">{{ project()!.clientOrDepartment || 'Internal' }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Type:</span>
                <span class="spec-val">{{ project()!.type }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Associated Team:</span>
                <span class="spec-val">{{ project()!.teamName || 'Engineering' }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Start Date:</span>
                <span class="spec-val">{{ project()!.startDate }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Target Completion:</span>
                <span class="spec-val">{{ project()!.targetDate }}</span>
              </div>
            </div>

            <div class="card detail-info-card">
              <h3 class="card-section-title">Health & Risks</h3>
              @if (project()!.hasRisk) {
                <div class="risk-alert-box">
                  <span class="material-icons risk-icon">warning</span>
                  <div>
                    <span class="risk-title">Flagged Risk Level: {{ project()!.riskLevel || 'Medium' }}</span>
                    <p class="risk-desc">Potential bottleneck reported in milestones or resource dependencies.</p>
                  </div>
                </div>
              } @else {
                <div class="health-good-box">
                  <span class="material-icons good-icon">check_circle</span>
                  <div>
                    <span class="good-title">Healthy & On Track</span>
                    <p class="good-desc">No active blockers or delivery risks registered.</p>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="card empty-state">
          <span class="material-icons empty-icon text-muted">folder_off</span>
          <h3 class="empty-title">Project Not Found</h3>
          <button class="btn btn-gradient btn-sm" (click)="goBack()">Return to Projects</button>
        </div>
      }

      <!-- CONFIRM DELETE MODAL WITH PASSCODE VERIFICATION -->
      @if (showDeleteModal()) {
        <div class="modal-backdrop" (click)="closeDeleteModal()">
          <div class="modal-card confirm-modal" (click)="$event.stopPropagation()">
            <div class="confirm-icon">
              <span class="material-icons">shield</span>
            </div>
            <h3>Super Admin Security Check</h3>
            <p class="confirm-desc">
              You are about to permanently delete <strong>"{{ project()?.name }}"</strong> (<span class="code-tag">{{ project()?.code }}</span>).
              <br>
              <span class="text-danger-sub">This action is destructive and irreversible. All linked milestones, tasks, and data will be permanently purged.</span>
            </p>

            <div class="passcode-box">
              <label class="passcode-label">
                <span class="material-icons label-icon">lock</span> Enter Super Admin Passcode / Password:
              </label>
              <div class="passcode-input-wrap">
                <input
                  [type]="showPasscode() ? 'text' : 'password'"
                  class="form-control passcode-input"
                  placeholder="Enter your password or admin PIN..."
                  [(ngModel)]="deletePasscode"
                  (keyup.enter)="executeDeleteProject()"
                  autofocus
                />
                <button
                  type="button"
                  class="btn-toggle-eye"
                  (click)="showPasscode.set(!showPasscode())"
                  tabindex="-1"
                  [title]="showPasscode() ? 'Hide passcode' : 'Show passcode'"
                >
                  <span class="material-icons">{{ showPasscode() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <div class="passcode-hint">
                <span class="material-icons">info</span>
                Requires your Super Admin login password or authorized security PIN.
              </div>
            </div>

            @if (deleteError()) {
              <div class="error-banner">
                <span class="material-icons">error</span>
                <span>{{ deleteError() }}</span>
              </div>
            }

            <div class="modal-actions">
              <button class="btn btn-outline btn-sm" [disabled]="deleting()" (click)="closeDeleteModal()">Cancel</button>
              <button
                class="btn btn-danger btn-sm"
                [disabled]="deleting() || !deletePasscode.trim()"
                (click)="executeDeleteProject()"
              >
                @if (deleting()) {
                  <span class="material-icons spin">sync</span> Verifying & Deleting...
                } @else {
                  <span class="material-icons">delete_forever</span> Confirm Deletion
                }
              </button>
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

    .project-hero-card {
      padding: 28px;
      margin-bottom: 20px;

      .hero-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 24px;
      }

      .hero-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;

        .p-code-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-blue);
          background: var(--color-light-blue);
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .project-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 8px 0;
      }

      .project-desc {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin: 0;
        max-width: 760px;
      }

      .hero-actions {
        display: flex;
        gap: 10px;
      }
    }

    .project-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);

      .metric-box {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .m-val {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-navy);
        }

        .m-lbl {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }

        .progress-bar-xs {
          height: 4px;
          background: #F1F5F9;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 4px;

          .progress-fill {
            height: 100%;
            background: var(--color-blue);
            border-radius: 999px;
          }
        }
      }
    }

    .tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 8px;

      .tab-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        .material-icons {
          font-size: 18px;
        }

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

    .milestones-tab-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .milestone-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;

        .m-left {
          display: flex;
          align-items: center;
          gap: 16px;

          .m-title {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .m-desc {
            margin: 0;
            font-size: 12px;
            color: var(--color-text-secondary);
          }
        }

        .m-right {
          font-size: 12px;
          color: var(--color-text-muted);

          .target-txt {
            display: flex;
            align-items: center;
            gap: 4px;

            .material-icons {
              font-size: 15px;
            }
          }
        }
      }
    }

    .overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;

      .detail-info-card {
        padding: 24px;

        .card-section-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-navy);
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-border);
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #F8FAFC;
          font-size: 13px;

          .spec-label {
            color: var(--color-text-muted);
            font-weight: 500;
          }

          .spec-val {
            color: var(--color-navy);
            font-weight: 600;
          }
        }
      }
    }

    .risk-alert-box {
      display: flex;
      gap: 12px;
      padding: 14px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;

      .risk-icon {
        color: #DC2626;
      }

      .risk-title {
        font-size: 13px;
        font-weight: 700;
        color: #B91C1C;
        display: block;
      }

      .risk-desc {
        font-size: 12px;
        color: #7F1D1D;
        margin: 4px 0 0 0;
      }
    }

    .health-good-box {
      display: flex;
      gap: 12px;
      padding: 14px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;

      .good-icon {
        color: #16A34A;
      }

      .good-title {
        font-size: 13px;
        font-weight: 700;
        color: #15803D;
        display: block;
      }

      .good-desc {
        font-size: 12px;
        color: #166534;
        margin: 4px 0 0 0;
      }
    }

    @media (max-width: 860px) {
      .project-metrics-grid {
        grid-template-columns: 1fr 1fr;
      }
      .overview-grid {
        grid-template-columns: 1fr;
      }
    }

    .btn-outline-danger {
      background: transparent;
      border: 1.5px solid #FCA5A5;
      color: #DC2626;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      &:hover { background: #FEF2F2; border-color: #DC2626; }
    }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.6);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .confirm-modal {
      max-width: 480px; width: 92%; background: white; border-radius: 14px;
      padding: 28px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
      border: 1px solid #F1F5F9;
      h3 { font-size: 19px; font-weight: 800; color: #0F172A; margin: 14px 0 8px; }
      .confirm-desc { font-size: 13px; color: #475569; margin: 0 0 18px; line-height: 1.5; text-align: left; }
      .code-tag { font-family: monospace; background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #0284C7; }
      .text-danger-sub { color: #DC2626; font-size: 12px; font-weight: 600; display: block; margin-top: 6px; }
      .confirm-icon {
        width: 56px; height: 56px; border-radius: 50%; background: #FEE2E2;
        color: #DC2626; display: flex; align-items: center; justify-content: center;
        margin: 0 auto;
        .material-icons { font-size: 30px; }
      }
      .passcode-box {
        margin: 0 0 16px; text-align: left;
        background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;
      }
      .passcode-label {
        display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700;
        color: #1E293B; margin-bottom: 8px;
        .label-icon { font-size: 16px; color: #64748B; }
      }
      .passcode-input-wrap {
        position: relative; display: flex; align-items: center;
      }
      .passcode-input {
        width: 100%; padding: 10px 42px 10px 12px; font-size: 14px;
        border: 1.5px solid #CBD5E1; border-radius: 8px; background: white;
        color: #0F172A; transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
        &:focus { outline: none; border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12); }
      }
      .btn-toggle-eye {
        position: absolute; right: 10px; background: none; border: none; cursor: pointer;
        color: #94A3B8; display: flex; align-items: center; justify-content: center; padding: 4px;
        &:hover { color: #475569; }
        .material-icons { font-size: 20px; }
      }
      .passcode-hint {
        display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748B; margin-top: 8px;
        .material-icons { font-size: 14px; color: #94A3B8; }
      }
      .error-banner {
        display: flex; align-items: center; gap: 8px; background: #FEF2F2;
        border: 1px solid #FCA5A5; color: #991B1B; padding: 10px 14px;
        border-radius: 8px; font-size: 12.5px; font-weight: 600; text-align: left;
        margin-bottom: 16px;
        .material-icons { font-size: 18px; color: #DC2626; flex-shrink: 0; }
      }
      .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    }
    .btn-danger {
      background: #DC2626; color: white; border: none; font-weight: 600;
      display: inline-flex; align-items: center; gap: 6px;
      &:hover:not(:disabled) { background: #B91C1C; }
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class ProjectDetailComponent implements OnInit {
  private authService = inject(AuthService);
  isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPER_ADMIN');

  loading = signal(true);
  project = signal<Project | null>(null);
  projectTasks = signal<Task[]>([]);
  milestones = signal<Milestone[]>([]);
  activeTab = signal<'tasks' | 'milestones' | 'details'>('tasks');

  showDeleteModal = signal(false);
  deleting = signal(false);
  deletePasscode = '';
  showPasscode = signal(false);
  deleteError = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectService.getProjectById(id).subscribe(p => {
        this.project.set(p || null);
        this.loading.set(false);
      });
      this.taskService.getTasks({ projectId: id }).subscribe(res => {
        this.projectTasks.set(res.data);
      });
      this.projectService.getMilestones(id).subscribe(m => {
        this.milestones.set(m);
      });
    } else {
      this.loading.set(false);
    }
  }

  openDeleteConfirm(): void {
    this.showDeleteModal.set(true);
    this.deletePasscode = '';
    this.showPasscode.set(false);
    this.deleteError.set('');
  }

  closeDeleteModal(): void {
    if (this.deleting()) return;
    this.showDeleteModal.set(false);
    this.deletePasscode = '';
    this.showPasscode.set(false);
    this.deleteError.set('');
  }

  executeDeleteProject(): void {
    const p = this.project();
    if (!p) return;
    if (!this.deletePasscode.trim()) {
      this.deleteError.set('Please enter your Super Admin passcode or password.');
      return;
    }
    this.deleting.set(true);
    this.deleteError.set('');

    this.projectService.deleteProject(p.id, this.deletePasscode.trim()).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/projects/all']);
      },
      error: (err) => {
        this.deleting.set(false);
        const errMsg = err?.error?.error || err?.message || 'Invalid passcode or deletion failed';
        this.deleteError.set(errMsg);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects/all']);
  }

  getStageClass(s: string): string {
    return {
      PROPOSED: 'badge-backlog',
      APPROVED: 'badge-todo',
      PLANNING: 'badge-inprogress',
      IN_PROGRESS: 'badge-inreview',
      TESTING: 'badge-blocked',
      CLIENT_REVIEW: 'priority-high',
      COMPLETED: 'badge-done'
    }[s] ?? '';
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

  fmtStage(s: string): string {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
