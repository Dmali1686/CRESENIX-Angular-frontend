import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, TaskStatus, TaskPriority, Project } from '../../../shared/models/index';
import { CreateTaskModalComponent } from '../create-task-modal/create-task-modal.component';

@Component({
  selector: 'app-all-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CreateTaskModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <div style="display:flex;align-items:center;gap:12px">
            <h1 class="page-title">All Tasks</h1>
            <div class="live-status-pill" title="Connected to PostgreSQL Database">
              <span class="live-dot"></span>
              <span>Live Database</span>
            </div>
          </div>
          <p class="page-subtitle">Real tasks fetched from PostgreSQL — <strong>{{ total() }}</strong> total tasks found</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline btn-sm" (click)="exportCsv()">
            <span class="material-icons">download</span> Export
          </button>
          @if (isSuperAdmin()) {
            <button class="btn btn-gradient btn-sm" (click)="openCreateModal()">
              <span class="material-icons">add</span> New Task
            </button>
          }
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            placeholder="Search tasks..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
          />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
          <select [(ngModel)]="priorityFilter" (ngModelChange)="onFilterChange()" class="filter-select">
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select [(ngModel)]="projectFilter" (ngModelChange)="onFilterChange()" class="filter-select">
            <option value="">All Projects</option>
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="card" style="padding:24px">
          <div class="skeleton skeleton-text" style="width:100%;height:40px;margin-bottom:8px" *ngFor="let i of [1,2,3,4,5]"></div>
        </div>
      } @else {
        <div class="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" (change)="toggleSelectAll($event)" [checked]="isAllSelected()" /></th>
                <th>Task</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (task of tasks(); track task.id) {
                <tr [routerLink]="['/tasks', task.id]" class="clickable-row">
                  <td (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedTaskIds().has(task.id)" (change)="toggleSelectTask(task.id, $event)" />
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="status-dot" [class]="'dot-' + task.status"></div>
                      <div>
                        <p style="font-size:13px;font-weight:500;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" [title]="task.title">
                          {{ task.title }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="project-cell">
                      @if (task.projectCode) {
                        <span class="project-pill" [title]="task.projectName || ''">{{ task.projectCode }}</span>
                      }
                      <span class="project-name" [title]="task.projectName || ''">
                        {{ task.projectName || (task.projectCode ? '' : '—') }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      @if (task.assigneeName) {
                        <div class="avatar avatar-xs" [style.background]="getColor(task.assigneeName)">
                          {{ task.assigneeName.charAt(0) }}
                        </div>
                        <span style="font-size:12px">{{ task.assigneeName }}</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </div>
                  </td>
                  <td><span class="badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span></td>
                  <td><span class="badge" [class]="getStatusClass(task.status)">{{ fmtStatus(task.status) }}</span></td>
                  <td>
                    <span [class.text-error]="isOvd(task.dueDate ?? '') && task.status !== 'DONE'" style="font-size:12px">
                      {{ task.dueDate ? fmtDate(task.dueDate) : '—' }}
                    </span>
                  </td>
                  <td><span style="font-size:11px;color:var(--color-text-muted)">{{ timeAgo(task.updatedAt) }}</span></td>
                  <td (click)="$event.stopPropagation()">
                    <div class="row-menu-wrap">
                      <button class="icon-btn" (click)="toggleDropdown(task.id, $event)">
                        <span class="material-icons">more_vert</span>
                      </button>
                      @if (activeDropdownTaskId() === task.id) {
                        <div class="dropdown-menu">
                          <a [routerLink]="['/tasks', task.id]" class="dropdown-item">
                            <span class="material-icons">visibility</span> View Details
                          </a>
                          @if (task.status !== 'DONE') {
                            @if (isEmployee()) {
                              @if (task.status !== 'IN_REVIEW') {
                                <button class="dropdown-item" (click)="quickUpdateStatus(task, 'IN_REVIEW', $event)">
                                  <span class="material-icons">send</span> Submit for Review
                                </button>
                              }
                            } @else {
                              <button class="dropdown-item" (click)="quickUpdateStatus(task, 'DONE', $event)">
                                <span class="material-icons">check_circle</span> Approve & Mark Done
                              </button>
                              @if (task.status === 'IN_REVIEW') {
                                <button class="dropdown-item" (click)="quickUpdateStatus(task, 'IN_PROGRESS', $event)">
                                  <span class="material-icons">undo</span> Request Changes
                                </button>
                              }
                            }
                          } @else {
                            @if (!isEmployee()) {
                              <button class="dropdown-item" (click)="quickUpdateStatus(task, 'IN_PROGRESS', $event)">
                                <span class="material-icons">replay</span> Reopen
                              </button>
                            }
                          }
                          <div class="dropdown-divider"></div>
                          <button class="dropdown-item danger" (click)="deleteTask(task, $event)">
                            <span class="material-icons">delete</span> Delete
                          </button>
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9">
                    <div class="empty-state">
                      <span class="material-icons empty-icon">task</span>
                      <p class="empty-title">No tasks found</p>
                      <p style="font-size:12px;color:var(--color-text-muted);margin-top:4px">Try adjusting filters or create a new task</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="pag-info">Showing {{ tasks().length }} of {{ total() }} tasks (Live PostgreSQL)</span>
          <div class="pag-controls">
            <button class="btn btn-outline btn-sm" [disabled]="page() === 1" (click)="prevPage()">← Prev</button>
            <span class="pag-page">Page {{ page() }} of {{ totalPages() || 1 }}</span>
            <button class="btn btn-outline btn-sm" [disabled]="page() >= totalPages()" (click)="nextPage()">Next →</button>
          </div>
        </div>
      }

      @if (showCreateModal()) {
        <app-create-task-modal (close)="showCreateModal.set(false)" (created)="onTaskCreated($event)" />
      }
    </div>
  `,
  styles: [`
    .clickable-row {
      cursor: pointer;
      transition: background 0.15s ease;
      &:hover {
        background: #F8FAFC;
      }
    }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #059669;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      padding: 3px 8px;
      border-radius: 9999px;
      user-select: none;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
      animation: livePulse 2s infinite ease-in-out;
    }

    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .project-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 190px;
    }

    .project-pill {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-blue, #2563EB);
      background: var(--color-light-blue, #EFF6FF);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
      border: 1px solid rgba(37, 99, 235, 0.15);
    }

    .project-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary, #64748B);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-menu-wrap {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 100;
      background: white;
      border: 1px solid var(--color-border, #E2E8F0);
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      min-width: 150px;
      padding: 4px;
      display: flex;
      flex-direction: column;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-primary, #1E293B);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      text-decoration: none;
      transition: background 0.15s;

      .material-icons {
        font-size: 16px;
        color: var(--color-text-muted, #94A3B8);
      }

      &:hover {
        background: #F1F5F9;
      }

      &.danger {
        color: #DC2626;
        .material-icons { color: #DC2626; }
        &:hover { background: #FEE2E2; }
      }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--color-border, #E2E8F0);
      margin: 4px 0;
    }

    .icon-btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      transition: all 0.15s;

      .material-icons { font-size: 18px; }
      &:hover { background: var(--color-bg, #F8FAFC); }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;

      &.dot-BACKLOG { background: #CBD5E1; }
      &.dot-TODO { background: #94A3B8; }
      &.dot-IN_PROGRESS { background: #2563EB; }
      &.dot-IN_REVIEW { background: #6366F1; }
      &.dot-BLOCKED { background: #DC2626; }
      &.dot-DONE { background: #16A34A; }
    }

    .filters-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      border: 1.5px solid var(--color-border);
      border-radius: 8px;
      padding: 8px 14px;
      flex: 1;
      min-width: 200px;
      max-width: 320px;

      &:focus-within { border-color: var(--color-blue); }
      .material-icons { font-size: 18px; color: var(--color-text-muted); }
      input {
        border: none;
        outline: none;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: var(--color-text-primary);
        background: transparent;
        flex: 1;
        &::placeholder { color: var(--color-text-muted); }
      }
    }

    .filter-select {
      padding: 8px 12px;
      border: 1.5px solid var(--color-border);
      border-radius: 8px;
      background: white;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      &:focus { border-color: var(--color-blue); }
    }

    .filter-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-top: 1px solid var(--color-border);

      .pag-info {
        font-size: 13px;
        color: var(--color-text-secondary);
      }

      .pag-controls {
        display: flex;
        align-items: center;
        gap: 12px;

        .pag-page {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      }
    }
  `]
})
export class AllTasksComponent implements OnInit {
  loading = signal(true);
  tasks = signal<Task[]>([]);
  projects = signal<Project[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);

  searchQuery = '';
  statusFilter = '';
  priorityFilter = '';
  projectFilter = '';

  showCreateModal = signal(false);
  activeDropdownTaskId = signal<string | null>(null);
  selectedTaskIds = signal<Set<string>>(new Set());

  private auth = inject(AuthService);
  isSuperAdmin = computed(() => this.auth.isSuperAdmin);
  isEmployee = computed(() => this.auth.isEmployee);

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadTasks();
  }

  loadProjects() {
    this.projectService.projects$.subscribe(projs => {
      if (projs && projs.length > 0) {
        this.projects.set(projs);
      }
    });
  }

  loadTasks() {
    this.loading.set(true);

    this.taskService.getTasks({
      search: this.searchQuery,
      status: this.statusFilter as any,
      priority: this.priorityFilter as any,
      projectId: this.projectFilter || undefined,
      page: this.page(),
      limit: 20
    }).subscribe({
      next: r => {
        this.tasks.set(r.data);
        this.total.set(r.total);
        this.totalPages.set(r.totalPages || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange() {
    this.page.set(1);
    this.loadTasks();
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadTasks();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update(p => p + 1);
      this.loadTasks();
    }
  }

  toggleDropdown(taskId: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeDropdownTaskId() === taskId) {
      this.activeDropdownTaskId.set(null);
    } else {
      this.activeDropdownTaskId.set(taskId);
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.activeDropdownTaskId()) {
      this.activeDropdownTaskId.set(null);
    }
  }

  quickUpdateStatus(task: Task, newStatus: TaskStatus, event: MouseEvent) {
    event.stopPropagation();
    this.activeDropdownTaskId.set(null);
    let note: string | undefined;
    if (newStatus === 'IN_REVIEW') {
      note = 'Task submitted for Super Admin review.';
    } else if (newStatus === 'DONE') {
      note = 'Task approved and marked as Done by Super Admin.';
    }
    this.taskService.updateTaskStatus(task.id, { status: newStatus, note }).subscribe({
      next: () => this.loadTasks(),
      error: err => alert(err?.error?.error || 'Failed to update status')
    });
  }

  deleteTask(task: Task, event: MouseEvent) {
    event.stopPropagation();
    this.activeDropdownTaskId.set(null);
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskService.deleteTask(task.id).subscribe(() => {
        this.loadTasks();
      });
    }
  }

  openCreateModal() {
    if (!this.isSuperAdmin()) return;
    this.showCreateModal.set(true);
  }

  onTaskCreated(newTask: Task) {
    this.showCreateModal.set(false);
    this.loadTasks();
  }

  exportCsv() {
    const rows = this.tasks();
    if (!rows.length) return;
    const headers = ['ID', 'Title', 'Project Code', 'Project Name', 'Assignee', 'Priority', 'Status', 'Due Date'];
    const csvContent = [
      headers.join(','),
      ...rows.map(t => [
        `"${t.id}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.projectCode || ''}"`,
        `"${(t.projectName || '').replace(/"/g, '""')}"`,
        `"${(t.assigneeName || '').replace(/"/g, '""')}"`,
        `"${t.priority}"`,
        `"${t.status}"`,
        `"${t.dueDate || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    if (checked) {
      this.selectedTaskIds.set(new Set(this.tasks().map(t => t.id)));
    } else {
      this.selectedTaskIds.set(new Set());
    }
  }

  toggleSelectTask(taskId: string, event: any) {
    const checked = event.target.checked;
    const set = new Set(this.selectedTaskIds());
    if (checked) {
      set.add(taskId);
    } else {
      set.delete(taskId);
    }
    this.selectedTaskIds.set(set);
  }

  isAllSelected(): boolean {
    const count = this.tasks().length;
    return count > 0 && this.selectedTaskIds().size === count;
  }

  getPriorityClass(p: string) {
    return {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    }[p] ?? '';
  }

  getStatusClass(s: string) {
    return {
      BACKLOG: 'badge-backlog',
      TODO: 'badge-todo',
      IN_PROGRESS: 'badge-inprogress',
      IN_REVIEW: 'badge-inreview',
      BLOCKED: 'badge-blocked',
      DONE: 'badge-done'
    }[s] ?? '';
  }

  fmtStatus(s: string) {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  isOvd(d: string) {
    return d && new Date(d) < new Date();
  }

  timeAgo(iso?: string) {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  getColor(n: string) {
    const c = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    return c[n.charCodeAt(0) % c.length];
  }
}
