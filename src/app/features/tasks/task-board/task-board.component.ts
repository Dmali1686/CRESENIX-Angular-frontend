import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, TaskStatus, Project } from '../../../shared/models/index';
import { CreateTaskModalComponent } from '../create-task-modal/create-task-modal.component';

interface KanbanColumn {
  id: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CreateTaskModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Task Board</h1>
          <p class="page-subtitle">{{ isEmployee() ? 'Showing tasks assigned to you or created by you' : 'Drag tasks between columns to update status' }}</p>
        </div>
        <div class="page-actions">
          <div class="search-box-sm">
            <span class="material-icons">search</span>
            <input type="text" placeholder="Filter tasks..." [(ngModel)]="searchQuery" (ngModelChange)="filterTasks()" />
          </div>
          <select [(ngModel)]="projectFilter" (ngModelChange)="filterTasks()" class="filter-select">
            <option value="">All Projects</option>
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            }
          </select>
          @if (canCreateTask()) {
            <button class="btn btn-gradient btn-sm" (click)="openCreateModal()">
              <span class="material-icons">add</span> New Task
            </button>
          }
        </div>
      </div>

      <!-- BOARD TOAST BANNER -->
      @if (boardToast()) {
        <div class="board-toast-banner" [class.toast-info]="boardToast()?.type === 'info'" [class.toast-error]="boardToast()?.type === 'error'">
          <span class="material-icons">{{ boardToast()?.type === 'info' ? 'info' : 'error' }}</span>
          <span>{{ boardToast()?.message }}</span>
          <button class="toast-close-btn" (click)="boardToast.set(null)"><span class="material-icons">close</span></button>
        </div>
      }

      <!-- KANBAN BOARD -->
      @if (loading()) {
        <div class="kanban-board">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="kanban-column">
              <div class="column-header">
                <div class="skeleton skeleton-text" style="width:80px;height:12px"></div>
              </div>
              <div class="column-body">
                @for (j of [1,2]; track j) {
                  <div class="skeleton" style="height:100px;border-radius:8px"></div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="kanban-board" id="kanban-board">
          @for (col of columns(); track col.id) {
            <div class="kanban-column"
                 (dragover)="onDragOver($event, col.id)"
                 (drop)="onDrop($event, col.id)"
                 (dragleave)="dragOverColumn.set(null)"
                 [class.drop-target]="dragOverColumn() === col.id">
              <div class="column-header">
                <div class="column-title-wrap">
                  <div class="column-indicator" [style.background]="col.color"></div>
                  <span class="column-title">{{ col.label }}</span>
                </div>
                <div class="column-right">
                  <span class="column-count">{{ col.tasks.length }}</span>
                  <button class="icon-btn-xs" (click)="addToColumn(col.id)" title="Add task">
                    <span class="material-icons">add</span>
                  </button>
                </div>
              </div>

              <div class="column-body" [class.over]="dragOverColumn() === col.id">
                @if (col.tasks.length === 0) {
                  <div class="column-empty">
                    <span class="material-icons">inbox</span>
                    <p>Drop tasks here</p>
                  </div>
                }
                @for (task of col.tasks; track task.id) {
                  <div class="task-card"
                       draggable="true"
                       (dragstart)="onDragStart($event, task)"
                       (dragend)="onDragEnd()"
                       [class.dragging]="draggingTaskId() === task.id"
                       [routerLink]="['/tasks', task.id]"
                       (click)="$event.preventDefault()">
                    <!-- Priority stripe -->
                    <div class="task-priority-stripe" [class]="'stripe-' + task.priority.toLowerCase()"></div>

                    <div class="tc-body">
                      <!-- Task ID -->
                      <p class="tc-id">{{ task.projectCode }}-{{ task.id.slice(-3) }}</p>
                      <!-- Title -->
                      <p class="tc-title" [routerLink]="['/tasks', task.id]" (click)="$event.stopPropagation()">{{ task.title }}</p>

                      <!-- Project -->
                      @if (task.projectName) {
                        <p class="tc-project">
                          <span class="material-icons" style="font-size:12px">folder_open</span>
                          {{ task.projectName }}
                        </p>
                      }

                      <!-- Checklist progress -->
                      @if (task.checklist && task.checklist.length > 0) {
                        <div class="tc-checklist">
                          <div class="checklist-bar">
                            <div class="checklist-fill" [style.width]="getChecklistPct(task) + '%'"></div>
                          </div>
                          <span>{{ getDoneCount(task) }}/{{ task.checklist.length }}</span>
                        </div>
                      }

                      <div class="tc-footer">
                        <!-- Priority badge -->
                        <span class="badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span>

                        <div class="tc-footer-right">
                          <!-- Due date -->
                          @if (task.dueDate) {
                            <span class="tc-due" [class.overdue]="isOverdue(task.dueDate)">
                              <span class="material-icons">event</span>
                              {{ formatDate(task.dueDate) }}
                            </span>
                          }

                          <!-- Assignee avatar -->
                          @if (task.assigneeName) {
                            <div class="avatar avatar-xs" [style.background]="getAvatarColor(task.assigneeName)" [title]="task.assigneeName">
                              {{ task.assigneeName.charAt(0) }}
                            </div>
                          }

                          <!-- Comments count -->
                          @if (task.commentsCount && task.commentsCount > 0) {
                            <span class="tc-comments">
                              <span class="material-icons">chat_bubble_outline</span>{{ task.commentsCount }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- TASK DETAIL DRAWER -->
    @if (selectedTask()) {
      <div class="drawer-overlay" (click)="selectedTask.set(null)">
        <div class="task-drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <p class="drawer-task-id">{{ selectedTask()!.projectCode }}-{{ selectedTask()!.id.slice(-3) }}</p>
              <h3 class="drawer-task-title">{{ selectedTask()!.title }}</h3>
            </div>
            <button class="icon-btn" (click)="selectedTask.set(null)"><span class="material-icons">close</span></button>
          </div>
          <div class="drawer-body">
            @if (selectedTask()!.description) {
              <p class="drawer-desc">{{ selectedTask()!.description }}</p>
            }
            <div class="drawer-fields">
              <div class="drawer-field">
                <span class="field-label">Status</span>
                <span class="badge" [class]="getStatusClass(selectedTask()!.status)">{{ formatStatus(selectedTask()!.status) }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Priority</span>
                <span class="badge" [class]="getPriorityClass(selectedTask()!.priority)">{{ selectedTask()!.priority }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Assignee</span>
                <span class="field-value">{{ selectedTask()!.assigneeName ?? '—' }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Due Date</span>
                <span class="field-value" [class.text-error]="isOverdue(selectedTask()!.dueDate ?? '')">{{ selectedTask()!.dueDate ? formatDate(selectedTask()!.dueDate!) : '—' }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Project</span>
                <span class="field-value">{{ selectedTask()!.projectName ?? '—' }}</span>
              </div>
              @if (selectedTask()!.estimatedHours) {
                <div class="drawer-field">
                  <span class="field-label">Estimated</span>
                  <span class="field-value">{{ selectedTask()!.estimatedHours }}h</span>
                </div>
              }
            </div>

            @if (selectedTask()!.checklist && selectedTask()!.checklist!.length > 0) {
              <div class="drawer-checklist">
                <p class="field-label" style="margin-bottom:8px">Checklist ({{ getDoneCount(selectedTask()!) }}/{{ selectedTask()!.checklist!.length }})</p>
                @for (item of selectedTask()!.checklist!; track item.id) {
                  <label class="check-item">
                    <input type="checkbox" [checked]="item.completed" (change)="toggleCheck(item.id)" />
                    <span [class.done]="item.completed">{{ item.text }}</span>
                  </label>
                }
              </div>
            }
          </div>
          <div class="drawer-footer">
            <a [routerLink]="['/tasks', selectedTask()!.id]" class="btn btn-outline btn-sm" (click)="selectedTask.set(null)">View Full Details</a>
            @if (selectedTask()!.status !== 'DONE') {
              @if (isEmployee()) {
                <button class="btn btn-gradient btn-sm" (click)="markDone()">
                  <span class="material-icons">send</span> Submit for Review
                </button>
              } @else {
                <button class="btn btn-success btn-sm" (click)="markDone()">
                  <span class="material-icons">check_circle</span> Approve & Mark Done
                </button>
              }
            }
          </div>
        </div>
      </div>
    }

    <!-- CREATE TASK MODAL -->
    @if (showCreate()) {
      <app-create-task-modal
        [initialStatus]="createInitialStatus()"
        [initialProjectId]="projectFilter || undefined"
        (close)="showCreate.set(false)"
        (created)="onTaskCreated($event)"
      />
    }
  `,
  styleUrl: './task-board.component.scss'
})
export class TaskBoardComponent implements OnInit {
  loading = signal(true);
  showCreate = signal(false);
  createInitialStatus = signal<TaskStatus>('TODO');
  projects = signal<Project[]>([]);
  draggingTask = signal<Task | null>(null);
  draggingTaskId = computed(() => this.draggingTask()?.id ?? null);
  dragOverColumn = signal<TaskStatus | null>(null);
  selectedTask = signal<Task | null>(null);
  boardToast = signal<{ message: string; type: 'info' | 'error' } | null>(null);
  searchQuery = '';
  projectFilter = '';
  allTasks = signal<Task[]>([]);

  COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'BACKLOG', label: 'Backlog', color: '#94A3B8' },
    { id: 'TODO', label: 'To Do', color: '#64748B' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#2563EB' },
    { id: 'IN_REVIEW', label: 'In Review', color: '#6366F1' },
    { id: 'BLOCKED', label: 'Blocked', color: '#DC2626' },
    { id: 'DONE', label: 'Done', color: '#16A34A' },
  ];

  columns = computed(() => {
    let tasks = this.allTasks();
    const user = this.auth.currentUser();
    if (this.auth.isEmployee && user) {
      tasks = tasks.filter(t => t.assigneeId === user.id || t.createdBy === user.id);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.projectName?.toLowerCase().includes(q));
    }
    if (this.projectFilter) tasks = tasks.filter(t => t.projectId === this.projectFilter);
    return this.COLUMNS.map(col => ({ ...col, tasks: tasks.filter(t => t.status === col.id) }));
  });

  private auth = inject(AuthService);
  private projectService = inject(ProjectService);
  isEmployee = computed(() => this.auth.isEmployee);
  canCreateTask = computed(() => true);

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();

    this.projectService.getProjects({ limit: 100 }).subscribe(res => {
      if (res?.data) {
        this.projects.set(res.data);
      }
    });
  }

  loadTasks(): void {
    const user = this.auth.currentUser();
    if (this.auth.isEmployee && user) {
      this.taskService.getMyTasks(user.id).subscribe(tasks => {
        this.allTasks.set(tasks);
        this.loading.set(false);
      });
    } else {
      this.taskService.getTasks({ limit: 100 }).subscribe(res => {
        if (res && res.data) {
          this.allTasks.set(res.data);
        }
        this.loading.set(false);
      });
    }
  }

  filterTasks(): void { /* computed handles */ }

  onDragStart(event: DragEvent, task: Task): void {
    this.draggingTask.set(task);
    event.dataTransfer?.setData('taskId', task.id);
  }

  onDragEnd(): void {
    this.draggingTask.set(null);
    this.dragOverColumn.set(null);
  }

  onDragOver(event: DragEvent, colId: TaskStatus): void {
    event.preventDefault();
    this.dragOverColumn.set(colId);
  }

  onDrop(event: DragEvent, colId: TaskStatus): void {
    event.preventDefault();
    const task = this.draggingTask();
    if (task && task.status !== colId) {
      let targetStatus: TaskStatus = colId;
      if (colId === 'DONE' && this.auth.isEmployee) {
        targetStatus = 'IN_REVIEW';
        this.boardToast.set({
          message: 'Tasks completed by employees are submitted to Super Admin for verification. Task moved to "In Review".',
          type: 'info'
        });
        setTimeout(() => this.boardToast.set(null), 5000);
      }

      const updatedList = this.allTasks().map(t => t.id === task.id ? { ...t, status: targetStatus } : t);
      this.allTasks.set(updatedList);
      this.taskService.updateTaskStatus(task.id, {
        status: targetStatus,
        note: targetStatus === 'IN_REVIEW' ? 'Task submitted for Super Admin review.' : undefined
      }).subscribe({
        next: () => this.taskService.refreshTasks(),
        error: (err) => {
          this.boardToast.set({
            message: err?.error?.error || 'Failed to update task status',
            type: 'error'
          });
          setTimeout(() => this.boardToast.set(null), 5000);
          this.loadTasks();
        }
      });
    }
    this.dragOverColumn.set(null);
    this.draggingTask.set(null);
  }

  openCreateModal(): void {
    this.createInitialStatus.set('TODO');
    this.showCreate.set(true);
  }

  addToColumn(status: TaskStatus): void {
    this.createInitialStatus.set(status);
    this.showCreate.set(true);
  }

  onTaskCreated(task: Task): void {
    this.showCreate.set(false);
    this.loadTasks();
    this.taskService.refreshTasks();
  }

  openDetail(task: Task, event: Event): void {
    event.stopPropagation();
    this.selectedTask.set(task);
  }

  toggleCheck(itemId: string): void {
    const task = this.selectedTask();
    if (!task) return;
    this.taskService.toggleChecklist(task.id, itemId).subscribe(updated => {
      this.selectedTask.set(updated);
    });
  }

  markDone(): void {
    const task = this.selectedTask();
    if (!task) return;
    const targetStatus: TaskStatus = this.auth.isEmployee ? 'IN_REVIEW' : 'DONE';
    const note = this.auth.isEmployee
      ? 'Task submitted for Super Admin review.'
      : 'Task approved and marked as Done by Super Admin.';

    this.taskService.updateTaskStatus(task.id, { status: targetStatus, note }).subscribe({
      next: updated => {
        this.selectedTask.set(updated);
        this.taskService.refreshTasks();
        if (this.auth.isEmployee) {
          this.boardToast.set({
            message: 'Task submitted for Super Admin review successfully!',
            type: 'info'
          });
          setTimeout(() => this.boardToast.set(null), 5000);
        }
      },
      error: err => {
        this.boardToast.set({
          message: err?.error?.error || 'Failed to update status',
          type: 'error'
        });
        setTimeout(() => this.boardToast.set(null), 5000);
      }
    });
  }

  getPriorityClass(p: string): string {
    const map: Record<string, string> = { LOW: 'priority-low', MEDIUM: 'priority-medium', HIGH: 'priority-high', CRITICAL: 'priority-critical' };
    return map[p] ?? '';
  }

  getStatusClass(s: TaskStatus): string {
    const map: Record<string, string> = { BACKLOG: 'badge-backlog', TODO: 'badge-todo', IN_PROGRESS: 'badge-inprogress', IN_REVIEW: 'badge-inreview', BLOCKED: 'badge-blocked', DONE: 'badge-done' };
    return map[s] ?? '';
  }

  formatStatus(s: string): string { return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  formatDate(d: string): string { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  isOverdue(d: string): boolean { return d && new Date(d) < new Date() ? true : false; }
  getAvatarColor(name: string): string { const c = ['#2563EB','#06B6D4','#6366F1','#16A34A','#D97706','#8B5CF6']; return c[name.charCodeAt(0) % c.length]; }
  getChecklistPct(task: Task): number { const cl = task.checklist ?? []; if (cl.length === 0) return 0; return (cl.filter(c => c.completed).length / cl.length) * 100; }
  getDoneCount(task: Task): number { return (task.checklist ?? []).filter(c => c.completed).length; }
}
