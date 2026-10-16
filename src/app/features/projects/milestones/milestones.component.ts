import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Milestone, Project, Employee, CreateMilestonePayload } from '../../../shared/models/index';

@Component({
  selector: 'app-milestones',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <div style="display:flex;align-items:center;gap:10px;">
            <h1 class="page-title">Project Milestones</h1>
            <span class="badge badge-primary">Hybrid Intelligent Engine</span>
          </div>
          <p class="page-subtitle">Automated progress calculation, task-dependency risk detection, and governed stage approvals</p>
        </div>
        <div class="page-actions">
          <select [(ngModel)]="selectedProjectId" (ngModelChange)="loadMilestones()" class="filter-select">
            <option value="">All Projects</option>
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            }
          </select>

          <button class="btn btn-outline btn-sm" (click)="openTemplateModal()">
            <span class="material-icons">auto_fix_high</span> Auto-Generate Plan
          </button>

          <button class="btn btn-gradient btn-sm" (click)="openAddModal()">
            <span class="material-icons">add</span> Add Milestone
          </button>

          <a routerLink="/projects/pipeline" class="btn btn-ghost btn-sm">
            <span class="material-icons">view_column</span> Pipeline
          </a>
        </div>
      </div>

      <!-- TIMELINE VIEW -->
      @if (loading()) {
        <div class="card" style="padding: 24px">
          <div class="skeleton skeleton-text" style="width:100%;height:80px;margin-bottom:16px" *ngFor="let i of [1,2,3]"></div>
        </div>
      } @else {
        <div class="milestones-timeline">
          @for (m of milestones(); track m.id) {
            <div class="milestone-card card" 
                 [class.completed]="m.status === 'COMPLETED'"
                 [class.at-risk]="m.scheduleCondition === 'AT_RISK'"
                 [class.overdue]="m.scheduleCondition === 'OVERDUE'">
              
              <!-- Timeline Indicator / Node -->
              <div class="milestone-indicator">
                <div class="milestone-node" [class]="'node-' + (m.scheduleCondition || m.status).toLowerCase()">
                  <span class="material-icons">
                    {{ m.status === 'COMPLETED' ? 'check' : (m.scheduleCondition === 'AT_RISK' ? 'warning' : (m.scheduleCondition === 'OVERDUE' ? 'priority_high' : 'hourglass_top')) }}
                  </span>
                </div>
                <div class="timeline-line"></div>
              </div>

              <!-- Main Card Content -->
              <div class="milestone-content">
                <div class="milestone-header">
                  <div class="title-wrap">
                    <span class="badge" [class]="getStatusClass(m.status)">{{ m.status }}</span>

                    <!-- Schedule Condition Badge -->
                    <span class="badge" [class]="getScheduleConditionClass(m.scheduleCondition)">
                      <span class="material-icons badge-icon">{{ getScheduleConditionIcon(m.scheduleCondition) }}</span>
                      {{ formatCondition(m.scheduleCondition) }}
                    </span>

                    <!-- Ready For Verification -->
                    @if (m.readyForVerification && m.status !== 'COMPLETED') {
                      <span class="badge badge-verification">
                        <span class="material-icons badge-icon">verified</span> Ready For Approval
                      </span>
                    }

                    <h3 class="milestone-title">{{ m.title }}</h3>
                  </div>

                  <div class="date-badge">
                    <span class="material-icons">event</span> 
                    Target: {{ m.dueDate }}
                    @if (m.originalDueDate && m.originalDueDate !== m.dueDate) {
                      <span class="baseline-date" title="Original Baseline Commitment">(Base: {{ m.originalDueDate }})</span>
                    }
                  </div>
                </div>

                <p class="milestone-desc">{{ m.description }}</p>

                <!-- Intelligent Progress Bar & Task Analytics -->
                <div class="progress-section">
                  <div class="progress-meta">
                    <div class="progress-text">
                      <span class="material-icons text-icon">task_alt</span>
                      <strong>{{ m.completedTasks || 0 }}/{{ m.totalTasks || 0 }}</strong> tasks completed
                      @if (m.blockedTasks && m.blockedTasks > 0) {
                        <span class="blocked-alert">
                          <span class="material-icons" style="font-size:13px">block</span>
                          {{ m.blockedTasks }} task blocked
                        </span>
                      }
                    </div>
                    <span class="progress-percent-val">{{ m.progressPercent || 0 }}%</span>
                  </div>

                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" 
                         [class.fill-risk]="m.scheduleCondition === 'AT_RISK'"
                         [class.fill-overdue]="m.scheduleCondition === 'OVERDUE'"
                         [class.fill-done]="m.status === 'COMPLETED'"
                         [style.width.%]="m.progressPercent || 0">
                    </div>
                  </div>
                </div>

                <!-- Footer with Metadata and Governed Action -->
                <div class="milestone-footer">
                  <div class="meta-tags-row">
                    <span class="project-tag">
                      <span class="material-icons">folder</span> {{ m.projectName || 'Project Milestone' }}
                    </span>
                    @if (m.ownerName) {
                      <span class="project-tag">
                        <span class="material-icons">person</span> {{ m.ownerName }}
                      </span>
                    }
                    <span class="project-tag">
                      <span class="material-icons">rule</span> 
                      {{ m.completionRule === 'MANUAL_CONFIRMATION' ? 'Explicit Approval' : 'Task Driven' }}
                    </span>
                    @if (m.completedByName) {
                      <span class="project-tag confirmed-tag">
                        <span class="material-icons">verified_user</span> Approved by {{ m.completedByName }}
                      </span>
                    }
                  </div>

                  <!-- Action Buttons -->
                  @if (m.status !== 'COMPLETED') {
                    @if (m.readyForVerification) {
                      <button class="btn btn-primary btn-xs" (click)="markComplete(m)">
                        <span class="material-icons">verified</span> Approve & Complete
                      </button>
                    } @else {
                      <button class="btn btn-outline btn-xs" (click)="markComplete(m)">
                        <span class="material-icons">done_all</span> Mark Completed
                      </button>
                    }
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="card empty-state">
              <span class="material-icons empty-icon">flag</span>
              <h3 class="empty-title">No Milestones Found</h3>
              <p class="empty-subtitle">Create project milestones or auto-generate a phased plan using templates.</p>
              <div style="margin-top:16px;display:flex;gap:12px;">
                <button class="btn btn-primary btn-sm" (click)="openTemplateModal()">
                  <span class="material-icons">auto_fix_high</span> Auto-Generate Template Plan
                </button>
                <button class="btn btn-outline btn-sm" (click)="openAddModal()">
                  <span class="material-icons">add</span> Add Milestone
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- MODAL: ADD MILESTONE -->
    @if (showAddModal()) {
      <div class="modal-backdrop" (click)="closeAddModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add Project Milestone</h3>
            <button class="btn-close" (click)="closeAddModal()">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Project <span class="required">*</span></label>
              <select [(ngModel)]="newMilestone.project_id" class="form-input">
                <option value="">Select Project</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Milestone Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newMilestone.name" placeholder="e.g. Core Architecture Approved" class="form-input" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newMilestone.description" placeholder="Deliverables and completion criteria..." class="form-input" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Target Due Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="newMilestone.due_date" class="form-input" />
              </div>

              <div class="form-group">
                <label>Owner / Phase Lead</label>
                <select [(ngModel)]="newMilestone.owner_id" class="form-input">
                  <option value="">Assign Phase Owner (Optional)</option>
                  @for (emp of employees(); track emp.id) {
                    <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation }})</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Completion Rule</label>
                <select [(ngModel)]="newMilestone.completion_rule" class="form-input">
                  <option value="ALL_TASKS_DONE">Automatic: All linked tasks completed</option>
                  <option value="MANUAL_CONFIRMATION">Governed: Explicit authorization required</option>
                </select>
              </div>

              <div class="form-group" style="display:flex;align-items:center;padding-top:28px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" [(ngModel)]="newMilestone.requires_approval" />
                  Requires Lead/Admin Approval
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeAddModal()">Cancel</button>
            <button class="btn btn-primary" [disabled]="submitting() || !newMilestone.project_id || !newMilestone.name || !newMilestone.due_date" (click)="saveMilestone()">
              {{ submitting() ? 'Saving...' : 'Create Milestone' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- MODAL: AUTO-GENERATE PLAN -->
    @if (showTemplateModal()) {
      <div class="modal-backdrop" (click)="closeTemplateModal()">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Auto-Generate Intelligent Milestone Plan</h3>
              <p class="modal-subtitle">Automatically suggests phased deliverables and proportional target dates based on project timeline</p>
            </div>
            <button class="btn-close" (click)="closeTemplateModal()">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Select Target Project <span class="required">*</span></label>
              <select [(ngModel)]="templateProjectId" class="form-input">
                <option value="">Select Project</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                }
              </select>
            </div>

            <label style="margin-bottom:8px;display:block;font-weight:600;font-size:13px;">Select Industry Template</label>
            <div class="template-grid">
              <div class="template-card" [class.selected]="selectedTemplate === 'SOFTWARE'" (click)="selectedTemplate = 'SOFTWARE'">
                <div class="tmpl-icon">🚀</div>
                <h4>Software Development</h4>
                <p>Requirements $\rightarrow$ UI Design $\rightarrow$ Backend API $\rightarrow$ Testing $\rightarrow$ Production Release</p>
              </div>

              <div class="template-card" [class.selected]="selectedTemplate === 'WEBSITE'" (click)="selectedTemplate = 'WEBSITE'">
                <div class="tmpl-icon">🌐</div>
                <h4>Website Development</h4>
                <p>Requirements $\rightarrow$ UI/UX Approval $\rightarrow$ CMS & Frontend $\rightarrow$ Cross-Browser QA $\rightarrow$ Launch</p>
              </div>

              <div class="template-card" [class.selected]="selectedTemplate === 'MARKETING'" (click)="selectedTemplate = 'MARKETING'">
                <div class="tmpl-icon">📢</div>
                <h4>Marketing Campaign</h4>
                <p>Strategy Approval $\rightarrow$ Creative Assets $\rightarrow$ Campaign Launch $\rightarrow$ Performance Audit</p>
              </div>

              <div class="template-card" [class.selected]="selectedTemplate === 'INTERNAL'" (click)="selectedTemplate = 'INTERNAL'">
                <div class="tmpl-icon">🏢</div>
                <h4>Internal Operations</h4>
                <p>Charter Approval $\rightarrow$ Implementation $\rightarrow$ Internal Testing $\rightarrow$ Operational Handover</p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeTemplateModal()">Cancel</button>
            <button class="btn btn-primary" [disabled]="submitting() || !templateProjectId" (click)="generatePlan()">
              {{ submitting() ? 'Generating Plan...' : 'Generate 5-Phase Plan' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .filter-select {
      padding: 8px 12px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      background: white;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      outline: none;
      &:focus { border-color: var(--color-blue); }
    }

    .milestones-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 960px;
    }

    .milestone-card {
      display: flex;
      gap: 20px;
      padding: 20px 24px;
      position: relative;
      transition: all var(--transition-fast);

      &:hover {
        transform: translateX(4px);
      }

      &.completed {
        background: #F8FAFC;
        border-color: #E2E8F0;
      }

      &.at-risk {
        border-left: 4px solid #F59E0B;
      }

      &.overdue {
        border-left: 4px solid #EF4444;
      }
    }

    .milestone-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;

      .milestone-node {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        background: #94A3B8;
        box-shadow: 0 0 0 4px #F1F5F9;

        .material-icons {
          font-size: 18px;
        }

        &.node-completed {
          background: #10B981;
          box-shadow: 0 0 0 4px #D1FAE5;
        }

        &.node-on_track {
          background: #2563EB;
          box-shadow: 0 0 0 4px #DBEAFE;
        }

        &.node-at_risk {
          background: #F59E0B;
          box-shadow: 0 0 0 4px #FEF3C7;
        }

        &.node-overdue {
          background: #EF4444;
          box-shadow: 0 0 0 4px #FEE2E2;
        }
      }

      .timeline-line {
        flex: 1;
        width: 2px;
        background: #E2E8F0;
        margin-top: 8px;
      }
    }

    .milestone-content {
      flex: 1;
    }

    .milestone-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 10px;

      .title-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;

        .milestone-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-navy);
          margin: 0;
        }
      }

      .date-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-secondary);
        background: #F1F5F9;
        padding: 4px 8px;
        border-radius: 6px;

        .material-icons {
          font-size: 15px;
          color: var(--color-text-muted);
        }

        .baseline-date {
          color: #94A3B8;
          font-weight: normal;
        }
      }
    }

    .milestone-desc {
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin: 0 0 12px 0;
    }

    /* Progress Section */
    .progress-section {
      background: #F8FAFC;
      border: 1px solid #EDF2F7;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;

      .progress-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 12px;

        .progress-text {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-secondary);

          .text-icon {
            font-size: 14px;
            color: #10B981;
          }

          .blocked-alert {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            color: #EF4444;
            font-weight: 600;
            background: #FEE2E2;
            padding: 1px 6px;
            border-radius: 4px;
            margin-left: 8px;
          }
        }

        .progress-percent-val {
          font-weight: 700;
          color: var(--color-navy);
        }
      }

      .progress-bar-bg {
        width: 100%;
        height: 7px;
        background: #E2E8F0;
        border-radius: 10px;
        overflow: hidden;

        .progress-bar-fill {
          height: 100%;
          background: #2563EB;
          border-radius: 10px;
          transition: width 0.4s ease;

          &.fill-done { background: #10B981; }
          &.fill-risk { background: #F59E0B; }
          &.fill-overdue { background: #EF4444; }
        }
      }
    }

    /* Footer */
    .milestone-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);
      flex-wrap: wrap;
      gap: 10px;

      .meta-tags-row {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;

        .project-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);

          .material-icons {
            font-size: 14px;
          }

          &.confirmed-tag {
            color: #059669;
          }
        }
      }
    }

    /* Badges */
    .badge-icon {
      font-size: 13px;
      vertical-align: -2px;
      margin-right: 2px;
    }

    .badge-ontrack {
      background: #D1FAE5;
      color: #065F46;
    }

    .badge-atrisk {
      background: #FEF3C7;
      color: #92400E;
    }

    .badge-overdue {
      background: #FEE2E2;
      color: #991B1B;
    }

    .badge-verification {
      background: #EDE9FE;
      color: #5B21B6;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-card {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      &.modal-lg {
        max-width: 700px;
      }
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--color-navy); }
      .modal-subtitle { margin: 4px 0 0 0; font-size: 12px; color: var(--color-text-secondary); }
      .btn-close {
        border: none; background: none; cursor: pointer; color: #94A3B8;
        &:hover { color: #334155; }
      }
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #F8FAFC;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-navy);
      }

      .required { color: #EF4444; }
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-input {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      &:focus { border-color: var(--color-blue); }
    }

    .template-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .template-card {
      border: 1.5px solid var(--color-border);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;

      .tmpl-icon { font-size: 24px; margin-bottom: 6px; }
      h4 { margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--color-navy); }
      p { margin: 0; font-size: 11px; color: var(--color-text-muted); line-height: 1.4; }

      &:hover { border-color: #2563EB; background: #F8FAFC; }
      &.selected { border-color: #2563EB; background: #EFF6FF; }
    }
  `]
})
export class MilestonesComponent implements OnInit {
  loading = signal(true);
  submitting = signal(false);
  milestones = signal<Milestone[]>([]);
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);
  selectedProjectId = '';

  showAddModal = signal(false);
  showTemplateModal = signal(false);

  newMilestone: CreateMilestonePayload = {
    project_id: '',
    name: '',
    description: '',
    due_date: '',
    completion_rule: 'ALL_TASKS_DONE',
    requires_approval: true,
    owner_id: ''
  };

  templateProjectId = '';
  selectedTemplate = 'SOFTWARE';

  constructor(
    private projectService: ProjectService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p.data));
    this.employeeService.getEmployees().subscribe(emps => this.employees.set(emps));
    this.loadMilestones();
  }

  loadMilestones(): void {
    this.loading.set(true);
    this.projectService.getMilestones(this.selectedProjectId || undefined).subscribe(res => {
      this.milestones.set(res);
      this.loading.set(false);
    });
  }

  markComplete(m: Milestone): void {
    const prevStatus = m.status;
    this.milestones.update(list => list.map(item => item.id === m.id ? { ...item, status: 'COMPLETED', scheduleCondition: 'COMPLETED', progressPercent: 100 } : item));
    this.projectService.updateMilestoneStatus(m.id, 'COMPLETED').subscribe({
      next: (updated) => {
        this.milestones.update(list => list.map(item => item.id === m.id ? { ...item, ...updated } : item));
      },
      error: (err) => {
        console.error('[CRESENIX] Failed to update milestone status in backend:', err);
        this.milestones.update(list => list.map(item => item.id === m.id ? { ...item, status: prevStatus } : item));
      }
    });
  }

  openAddModal(): void {
    this.newMilestone = {
      project_id: this.selectedProjectId || (this.projects().length > 0 ? this.projects()[0].id : ''),
      name: '',
      description: '',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      completion_rule: 'ALL_TASKS_DONE',
      requires_approval: true,
      owner_id: ''
    };
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  saveMilestone(): void {
    if (!this.newMilestone.project_id || !this.newMilestone.name || !this.newMilestone.due_date) return;
    this.submitting.set(true);
    this.projectService.createMilestone(this.newMilestone).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.closeAddModal();
        this.loadMilestones();
      },
      error: (err) => {
        console.error('Failed to create milestone', err);
        this.submitting.set(false);
      }
    });
  }

  openTemplateModal(): void {
    this.templateProjectId = this.selectedProjectId || (this.projects().length > 0 ? this.projects()[0].id : '');
    this.selectedTemplate = 'SOFTWARE';
    this.showTemplateModal.set(true);
  }

  closeTemplateModal(): void {
    this.showTemplateModal.set(false);
  }

  generatePlan(): void {
    if (!this.templateProjectId) return;
    this.submitting.set(true);
    this.projectService.generateMilestonesFromTemplate(this.templateProjectId, this.selectedTemplate).subscribe({
      next: (generated) => {
        this.submitting.set(false);
        this.closeTemplateModal();
        this.loadMilestones();
      },
      error: (err) => {
        console.error('Failed to generate template milestones', err);
        this.submitting.set(false);
      }
    });
  }

  getStatusClass(s: string): string {
    return {
      PENDING: 'badge-todo',
      IN_PROGRESS: 'badge-inprogress',
      COMPLETED: 'badge-done',
      MISSED: 'badge-blocked'
    }[s] ?? '';
  }

  getScheduleConditionClass(sc?: string): string {
    return {
      ON_TRACK: 'badge-ontrack',
      AT_RISK: 'badge-atrisk',
      OVERDUE: 'badge-overdue',
      COMPLETED: 'badge-done'
    }[sc ?? 'ON_TRACK'] ?? 'badge-ontrack';
  }

  getScheduleConditionIcon(sc?: string): string {
    return {
      ON_TRACK: 'check_circle',
      AT_RISK: 'warning',
      OVERDUE: 'error',
      COMPLETED: 'task_alt'
    }[sc ?? 'ON_TRACK'] ?? 'check_circle';
  }

  formatCondition(sc?: string): string {
    return {
      ON_TRACK: 'On Track',
      AT_RISK: 'At Risk',
      OVERDUE: 'Overdue',
      COMPLETED: 'Completed'
    }[sc ?? 'ON_TRACK'] ?? 'On Track';
  }
}
