import { Component, EventEmitter, Input, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Task, Project, Employee, TaskStatus } from '../../../shared/models/index';

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-title">
            <span class="material-icons header-icon">add_task</span>
            <h3>Create New Task</h3>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal-body">
          <div class="form-grid">
            <div class="form-group full-width">
              <label for="task-title-input">Task Title <span class="required">*</span></label>
              <input id="task-title-input" formControlName="title" class="form-control" placeholder="What needs to be done?" />
            </div>

            <div class="form-group full-width">
              <label for="task-description-input">Description</label>
              <textarea id="task-description-input" formControlName="description" class="form-control" rows="2" placeholder="Provide background, requirements, or steps..."></textarea>
            </div>

            <div class="form-group">
              <label for="task-project-select">Project</label>
              <select id="task-project-select" formControlName="projectId" class="form-control">
                <option value="">No Project (General Task)</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="task-priority-select">Priority</label>
              <select id="task-priority-select" formControlName="priority" class="form-control">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div class="form-group">
              <label for="task-status-select">Initial Status</label>
              <select id="task-status-select" formControlName="status" class="form-control">
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </div>

            <div class="form-group">
              <label for="task-due-date-input">Due Date</label>
              <input id="task-due-date-input" type="date" formControlName="dueDate" class="form-control" />
            </div>

            <div class="form-group">
              <label for="task-estimated-hours-input">Estimated Hours</label>
              <input id="task-estimated-hours-input" type="number" formControlName="estimatedHours" class="form-control" placeholder="e.g. 8" min="1" />
            </div>

            <div class="form-group">
              <label for="task-assignee-select">Lead Assignee</label>
              <select id="task-assignee-select" formControlName="assigneeId" class="form-control">
                <option value="">Unassigned</option>
                @for (emp of employees(); track emp.id) {
                  <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || emp.role }})</option>
                }
              </select>
            </div>

            <!-- Additional Team Collaborators -->
            <div class="form-group full-width">
              <label>Assign Additional Employees (Collaborators)</label>
              <div class="collaborators-picker">
                @for (emp of employees(); track emp.id) {
                  @if (form.value.assigneeId !== emp.id) {
                    <button
                      type="button"
                      class="collab-chip"
                      [class.selected]="isCollaboratorSelected(emp.id)"
                      (click)="toggleCollaborator(emp.id)">
                      <span class="material-icons collab-check-icon">
                        {{ isCollaboratorSelected(emp.id) ? 'check_circle' : 'add_circle_outline' }}
                      </span>
                      {{ emp.firstName }} {{ emp.lastName }}
                    </button>
                  }
                }
              </div>
              <span class="field-hint">Click employees to assign them as team collaborators to this task.</span>
            </div>
          </div>

          @if (errorMsg()) {
            <div class="error-banner">
              <span class="material-icons">error</span>
              {{ errorMsg() }}
            </div>
          }

          <div class="modal-footer">
            <button id="create-task-cancel-btn" type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
            <button id="create-task-submit-btn" type="submit" class="btn btn-gradient" [disabled]="form.invalid || saving()">
              @if (saving()) { <span class="spinner-sm"></span> }
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 620px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.25);
      border: 1px solid var(--color-border);
      overflow: hidden;
      animation: scaleUp 0.2s ease;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid var(--color-border);
      background: #F8FAFC;

      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;

        .header-icon {
          color: var(--color-blue);
          font-size: 22px;
        }

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy);
        }
      }
    }
    .modal-body {
      padding: 24px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;

      .full-width {
        grid-column: 1 / -1;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-secondary);

        .required {
          color: var(--color-error);
        }
      }

      .field-hint {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-top: 2px;
      }

      .form-control {
        padding: 9px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: var(--color-text-primary);
        outline: none;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

        &:focus {
          border-color: var(--color-blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      }
    }

    .collaborators-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 10px;
      background: #F8FAFC;
      border: 1.5px solid var(--color-border);
      border-radius: 8px;
      min-height: 42px;

      .collab-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #CBD5E1;
        background: white;
        color: var(--color-navy);
        cursor: pointer;
        transition: all 0.15s ease;

        .collab-check-icon {
          font-size: 15px;
          color: #94A3B8;
        }

        &:hover {
          border-color: var(--color-blue);
          background: #EFF6FF;
        }

        &.selected {
          background: #EFF6FF;
          border-color: var(--color-blue);
          color: var(--color-blue);
          font-weight: 600;

          .collab-check-icon {
            color: var(--color-blue);
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }
    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @media (max-width: 540px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CreateTaskModalComponent implements OnInit {
  @Input() initialStatus?: TaskStatus;
  @Input() initialProjectId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Task>();

  saving = signal(false);
  errorMsg = signal('');
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);
  selectedCollaboratorIds = signal<string[]>([]);

  form;

  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeService);

  constructor() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      projectId: [''],
      priority: ['MEDIUM'],
      status: ['TODO'],
      dueDate: [''],
      estimatedHours: [null],
      assigneeId: ['']
    });
  }

  ngOnInit(): void {
    if (this.initialStatus) {
      this.form.patchValue({ status: this.initialStatus });
    }
    if (this.initialProjectId) {
      this.form.patchValue({ projectId: this.initialProjectId });
    }

    // Load live projects
    this.projectService.getProjects({ limit: 100 }).subscribe({
      next: res => {
        if (res && res.data) {
          this.projects.set(res.data);
          if (res.data.length > 0 && !this.initialProjectId) {
            this.form.patchValue({ projectId: res.data[0].id });
          }
        }
      },
      error: () => {}
    });

    // Load live employees for assignee dropdown and collaborator pills
    this.employeeService.getEmployees().subscribe({
      next: emps => {
        if (emps && emps.length > 0) {
          this.employees.set(emps);
        }
      },
      error: () => {}
    });
  }

  isCollaboratorSelected(empId: string): boolean {
    return this.selectedCollaboratorIds().includes(empId);
  }

  toggleCollaborator(empId: string): void {
    const cur = this.selectedCollaboratorIds();
    if (cur.includes(empId)) {
      this.selectedCollaboratorIds.set(cur.filter(id => id !== empId));
    } else {
      this.selectedCollaboratorIds.set([...cur, empId]);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMsg.set('');

    const v = this.form.value;
    const additionalAssignees = this.selectedCollaboratorIds().filter(id => id !== v.assigneeId);

    this.taskService.createTask({
      title: v.title!.trim(),
      description: v.description?.trim() || undefined,
      projectId: v.projectId ? v.projectId : undefined,
      priority: v.priority as any,
      status: v.status as any,
      dueDate: v.dueDate || undefined,
      estimatedHours: v.estimatedHours ? Number(v.estimatedHours) : undefined,
      assigneeId: v.assigneeId ? v.assigneeId : undefined,
      assigneeIds: additionalAssignees
    }).subscribe({
      next: (task) => {
        this.saving.set(false);
        this.created.emit(task);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.error || 'Failed to create task on the backend server. Please try again.');
      }
    });
  }
}
