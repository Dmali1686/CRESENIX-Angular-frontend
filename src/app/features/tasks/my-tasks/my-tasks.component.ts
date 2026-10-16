import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, TaskStatus, TaskPriority } from '../../../shared/models/index';
import { CreateTaskModalComponent } from '../create-task-modal/create-task-modal.component';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CreateTaskModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">My Tasks</h1>
          <p class="page-subtitle">Tasks assigned to you across all projects</p>
        </div>
        <div class="page-actions">
          <a routerLink="/tasks/board" class="btn btn-outline btn-sm">
            <span class="material-icons">view_kanban</span> Board View
          </a>
          @if (canCreateTask()) {
            <button class="btn btn-gradient btn-sm" (click)="showCreateModal.set(true)">
              <span class="material-icons">add</span> New Task
            </button>
          }
        </div>
      </div>

      <!-- FILTERS & SEARCH -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search tasks..." [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
          <select [(ngModel)]="priorityFilter" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <!-- TABS -->
      <div class="tab-nav">
        @for (tab of tabs; track tab.key) {
          <button class="tab-item" [class.active]="activeTab() === tab.key" (click)="setTab(tab.key)">
            {{ tab.label }}
            <span class="tab-count">{{ getTabCount(tab.key) }}</span>
          </button>
        }
      </div>

      <!-- TASK TABLE -->
      @if (loading()) {
        <div class="data-table-wrapper">
          @for (i of [1,2,3,4,5]; track i) {
            <div style="padding:16px;border-bottom:1px solid var(--color-border)">
              <div class="skeleton skeleton-text" style="width:60%"></div>
              <div class="skeleton skeleton-text" style="width:30%;margin-top:6px"></div>
            </div>
          }
        </div>
      } @else if (filteredTasks().length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon">task_alt</span>
          <p class="empty-title">No tasks found</p>
          <p class="empty-desc">{{ emptyMessage() }}</p>
          @if (canCreateTask()) {
            <button class="btn btn-gradient" (click)="showCreateModal.set(true)">
              <span class="material-icons">add</span> Create Task
            </button>
          }
        </div>
      } @else {
        <div class="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (task of filteredTasks(); track task.id) {
                <tr [routerLink]="['/tasks', task.id]">
                  <td>
                    <div class="task-title-cell">
                      <div class="status-dot" [class]="'dot-' + task.status"></div>
                      <div>
                        <p class="task-name">{{ task.title }}</p>
                        @if (task.commentsCount && task.commentsCount > 0) {
                          <span class="task-comments"><span class="material-icons">chat_bubble_outline</span>{{ task.commentsCount }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="project-chip">{{ task.projectCode }}</span>
                    <span class="project-name">{{ task.projectName }}</span>
                  </td>
                  <td><span class="badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span></td>
                  <td><span class="badge" [class]="getStatusClass(task.status)">{{ formatStatus(task.status) }}</span></td>
                  <td>
                    @if (task.dueDate) {
                      <span [class.text-error]="isOverdue(task.dueDate) && task.status !== 'DONE'" [class.font-medium]="isOverdue(task.dueDate)">
                        {{ formatDate(task.dueDate) }}
                      </span>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td><span class="text-secondary" style="font-size:12px">{{ timeAgo(task.updatedAt) }}</span></td>
                  <td>
                    <button class="icon-btn" (click)="$event.stopPropagation()" title="More options">
                      <span class="material-icons">more_vert</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- CREATE TASK MODAL -->
    @if (showCreateModal()) {
      <app-create-task-modal (close)="showCreateModal.set(false)" (created)="onTaskCreated($event)"></app-create-task-modal>
    }
  `,
  styleUrl: './my-tasks.component.scss'
})
export class MyTasksComponent implements OnInit {
  loading = signal(true);
  showCreateModal = signal(false);
  isSuperAdmin = computed(() => this.auth.isSuperAdmin);
  canCreateTask = computed(() => true);
  allTasks = signal<Task[]>([]);
  searchQuery = '';
  statusFilter = '';
  priorityFilter = '';
  activeTab = signal<string>('all');

  tabs = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Due Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'done', label: 'Completed' },
  ];

  filteredTasks = computed(() => {
    let tasks = this.allTasks();
    const today = new Date().toISOString().split('T')[0];

    if (this.activeTab() === 'today') tasks = tasks.filter(t => t.dueDate === today);
    else if (this.activeTab() === 'upcoming') tasks = tasks.filter(t => t.dueDate && t.dueDate > today && t.status !== 'DONE');
    else if (this.activeTab() === 'overdue') tasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'DONE');
    else if (this.activeTab() === 'done') tasks = tasks.filter(t => t.status === 'DONE');
    else tasks = tasks.filter(t => t.status !== 'DONE');

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.projectName?.toLowerCase().includes(q));
    }
    if (this.statusFilter) tasks = tasks.filter(t => t.status === this.statusFilter);
    if (this.priorityFilter) tasks = tasks.filter(t => t.priority === this.priorityFilter);

    return tasks;
  });

  emptyMessage = computed(() => {
    if (this.searchQuery || this.statusFilter || this.priorityFilter) return 'No tasks match your filters. Try adjusting your search.';
    return 'You have no assigned tasks in this category. Tasks assigned to you by Super Admin will appear here.';
  });

  constructor(private taskService: TaskService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const user = this.auth.currentUser();
    const userId = user?.id || '';
    this.taskService.getMyTasks(userId).subscribe(tasks => {
      this.allTasks.set(tasks);
      this.loading.set(false);
    });
  }

  setTab(tab: string): void { this.activeTab.set(tab); }

  getTabCount(tab: string): number {
    const tasks = this.allTasks();
    const today = new Date().toISOString().split('T')[0];
    if (tab === 'all') return tasks.filter(t => t.status !== 'DONE').length;
    if (tab === 'today') return tasks.filter(t => t.dueDate === today).length;
    if (tab === 'upcoming') return tasks.filter(t => t.dueDate && t.dueDate > today && t.status !== 'DONE').length;
    if (tab === 'overdue') return tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'DONE').length;
    if (tab === 'done') return tasks.filter(t => t.status === 'DONE').length;
    return 0;
  }

  applyFilters(): void { /* computed handles it */ }

  getPriorityClass(p: TaskPriority): string {
    const map: Record<string, string> = { LOW: 'priority-low', MEDIUM: 'priority-medium', HIGH: 'priority-high', CRITICAL: 'priority-critical' };
    return map[p] ?? '';
  }

  getStatusClass(s: TaskStatus): string {
    const map: Record<string, string> = { BACKLOG: 'badge-backlog', TODO: 'badge-todo', IN_PROGRESS: 'badge-inprogress', IN_REVIEW: 'badge-inreview', BLOCKED: 'badge-blocked', DONE: 'badge-done' };
    return map[s] ?? '';
  }

  formatStatus(s: TaskStatus): string {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  isOverdue(d: string): boolean { return new Date(d) < new Date(); }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  onTaskCreated(task: Task): void {
    this.showCreateModal.set(false);
    this.loadTasks();
    this.taskService.refreshTasks();
  }
}
