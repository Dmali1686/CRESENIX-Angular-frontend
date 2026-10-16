import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Project, ProjectStage, ProjectPriority } from '../../../shared/models/index';

@Component({
  selector: 'app-all-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">All Projects</h1>
          <p class="page-subtitle">Master list of company projects, deliverables, and team workloads</p>
        </div>
        <div class="page-actions">
          <a routerLink="/projects/pipeline" class="btn btn-outline btn-sm">
            <span class="material-icons">view_column</span> Pipeline Board
          </a>
          <a routerLink="/projects/milestones" class="btn btn-outline btn-sm">
            <span class="material-icons">flag</span> Milestones
          </a>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search projects by name, code or client..." [(ngModel)]="searchQuery" (ngModelChange)="filterProjects()" />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="stageFilter" (ngModelChange)="filterProjects()" class="filter-select">
            <option value="">All Stages</option>
            <option value="PROPOSED">Proposed</option>
            <option value="APPROVED">Approved</option>
            <option value="PLANNING">Planning</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TESTING">Testing</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select [(ngModel)]="priorityFilter" (ngModelChange)="filterProjects()" class="filter-select">
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <!-- PROJECTS DATA TABLE -->
      @if (loading()) {
        <div class="card" style="padding: 24px">
          <div class="skeleton skeleton-text" style="width:100%;height:40px;margin-bottom:8px" *ngFor="let i of [1,2,3,4]"></div>
        </div>
      } @else {
        <div class="data-table-wrapper card">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Project Name</th>
                <th>Client / Dept</th>
                <th>Manager</th>
                <th>Stage</th>
                <th>Progress</th>
                <th>Tasks</th>
                <th>Target Date</th>
                <th>Risk</th>
                @if (isSuperAdmin()) {
                  <th style="width: 50px; text-align: center;">Action</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (proj of filteredProjects(); track proj.id) {
                <tr [routerLink]="['/projects', proj.id]">
                  <td>
                    <span class="project-code-badge">{{ proj.code }}</span>
                  </td>
                  <td>
                    <div class="project-name-cell">
                      <span class="p-name">{{ proj.name }}</span>
                      <span class="p-type-tag">{{ proj.type }}</span>
                    </div>
                  </td>
                  <td><span class="client-dept">{{ proj.clientOrDepartment || '—' }}</span></td>
                  <td>
                    <div class="manager-cell">
                      <div class="avatar avatar-xs">{{ proj.managerName ? proj.managerName.charAt(0) : 'M' }}</div>
                      <span>{{ proj.managerName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="getStageClass(proj.stage)">{{ fmtStage(proj.stage) }}</span>
                  </td>
                  <td>
                    <div class="progress-cell">
                      <div class="progress-bar-sm">
                        <div class="progress-fill" [style.width.%]="proj.progress" [style.background]="getProgressColor(proj.progress)"></div>
                      </div>
                      <span class="progress-text">{{ proj.progress }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="tasks-ratio">{{ proj.openTaskCount }} / {{ proj.totalTaskCount }}</span>
                  </td>
                  <td>
                    <span class="target-date">{{ proj.targetDate }}</span>
                  </td>
                  <td>
                    @if (proj.hasRisk) {
                      <span class="risk-pill" [class]="'risk-' + (proj.riskLevel?.toLowerCase() || 'medium')">
                        <span class="material-icons">warning</span> {{ proj.riskLevel || 'Risk' }}
                      </span>
                    } @else {
                      <span class="badge badge-done" style="font-size:11px">On Track</span>
                    }
                  </td>
                  @if (isSuperAdmin()) {
                    <td (click)="$event.stopPropagation()" style="text-align: center;">
                      <button class="btn-icon-danger" title="Delete Project" (click)="openDeleteConfirm(proj)">
                        <span class="material-icons">delete_outline</span>
                      </button>
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="isSuperAdmin() ? 10 : 9">
                    <div class="empty-state">
                      <span class="material-icons empty-icon">folder_off</span>
                      <p class="empty-title">No projects match the selected criteria</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- CONFIRM DELETE MODAL WITH PASSCODE VERIFICATION -->
      @if (projectToDelete()) {
        <div class="modal-backdrop" (click)="closeDeleteModal()">
          <div class="modal-card confirm-modal" (click)="$event.stopPropagation()">
            <div class="confirm-icon">
              <span class="material-icons">shield</span>
            </div>
            <h3>Super Admin Security Check</h3>
            <p class="confirm-desc">
              You are about to permanently delete <strong>"{{ projectToDelete()?.name }}"</strong> (<span class="code-tag">{{ projectToDelete()?.code }}</span>).
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
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 8px 14px;
        flex: 1;
        min-width: 240px;
        max-width: 400px;

        &:focus-within { border-color: var(--color-blue); }
        .material-icons { font-size: 18px; color: var(--color-text-muted); }
        input {
          border: none;
          outline: none;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          flex: 1;
          background: transparent;
        }
      }

      .filter-group {
        display: flex;
        gap: 8px;
      }

      .filter-select {
        padding: 8px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        background: white;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        &:focus { border-color: var(--color-blue); }
      }
    }

    .project-code-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-blue);
      background: var(--color-light-blue);
      padding: 3px 7px;
      border-radius: 4px;
    }

    .project-name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .p-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-navy);
      }

      .p-type-tag {
        font-size: 10px;
        color: var(--color-text-muted);
      }
    }

    .client-dept {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .manager-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-primary);
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .progress-bar-sm {
        width: 70px;
        height: 6px;
        background: #F1F5F9;
        border-radius: 999px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          border-radius: 999px;
        }
      }

      .progress-text {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-secondary);
        min-width: 30px;
      }
    }

    .tasks-ratio {
      font-size: 12px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .target-date {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .risk-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;

      .material-icons {
        font-size: 14px;
      }

      &.risk-high, &.risk-critical {
        background: #FEE2E2;
        color: #DC2626;
      }

      &.risk-medium {
        background: #FEF3C7;
        color: #D97706;
      }

      &.risk-low {
        background: #F1F5F9;
        color: #64748B;
      }
    }

    .btn-icon-danger {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      .material-icons { font-size: 18px; }
      &:hover { color: #DC2626; background: #FEE2E2; }
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
export class AllProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPER_ADMIN');

  loading = signal(true);
  allProjects = signal<Project[]>([]);
  searchQuery = '';
  stageFilter = '';
  priorityFilter = '';

  filteredProjects = signal<Project[]>([]);
  projectToDelete = signal<Project | null>(null);
  deleting = signal(false);
  deletePasscode = '';
  showPasscode = signal(false);
  deleteError = signal('');

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe(res => {
      this.allProjects.set(res.data);
      this.filteredProjects.set(res.data);
      this.loading.set(false);
    });
  }

  openDeleteConfirm(p: Project): void {
    this.projectToDelete.set(p);
    this.deletePasscode = '';
    this.showPasscode.set(false);
    this.deleteError.set('');
  }

  closeDeleteModal(): void {
    if (this.deleting()) return;
    this.projectToDelete.set(null);
    this.deletePasscode = '';
    this.showPasscode.set(false);
    this.deleteError.set('');
  }

  executeDeleteProject(): void {
    const p = this.projectToDelete();
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
        this.projectToDelete.set(null);
        this.deletePasscode = '';
        this.deleteError.set('');
        // Refresh list
        this.allProjects.set(this.allProjects().filter(item => item.id !== p.id));
        this.filteredProjects.set(this.filteredProjects().filter(item => item.id !== p.id));
      },
      error: (err) => {
        this.deleting.set(false);
        const errMsg = err?.error?.error || err?.message || 'Invalid passcode or deletion failed';
        this.deleteError.set(errMsg);
      }
    });
  }

  filterProjects(): void {
    let projs = this.allProjects();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      projs = projs.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.clientOrDepartment && p.clientOrDepartment.toLowerCase().includes(q))
      );
    }
    if (this.stageFilter) {
      projs = projs.filter(p => p.stage === this.stageFilter);
    }
    if (this.priorityFilter) {
      projs = projs.filter(p => p.priority === this.priorityFilter);
    }
    this.filteredProjects.set(projs);
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

  fmtStage(s: string): string {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getProgressColor(p: number): string {
    if (p >= 80) return '#10B981';
    if (p >= 50) return '#2563EB';
    if (p >= 25) return '#06B6D4';
    return '#F59E0B';
  }
}
