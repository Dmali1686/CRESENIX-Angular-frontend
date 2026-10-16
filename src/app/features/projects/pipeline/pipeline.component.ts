import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectStage } from '../../../shared/models/index';

interface StageColumn {
  id: ProjectStage;
  label: string;
  color: string;
  projects: Project[];
}

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Project Pipeline</h1>
          <p class="page-subtitle">Visual workflow from proposal to final delivery</p>
        </div>
        <div class="page-actions">
          <div class="search-box-sm">
            <span class="material-icons">search</span>
            <input type="text" placeholder="Search projects..." [(ngModel)]="searchQuery" />
          </div>
          <a routerLink="/projects/all" class="btn btn-outline btn-sm">
            <span class="material-icons">table_rows</span> Table View
          </a>
          <button class="btn btn-gradient btn-sm" (click)="showCreateModal.set(true)">
            <span class="material-icons">add</span> New Project
          </button>
        </div>
      </div>

      <!-- STAGE PIPELINE BOARD -->
      @if (loading()) {
        <div class="pipeline-board">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="pipeline-col card">
              <div class="skeleton skeleton-text" style="height:20px;width:100px;margin-bottom:12px"></div>
              <div class="skeleton skeleton-text" style="height:90px;width:100%"></div>
            </div>
          }
        </div>
      } @else {
        <div class="pipeline-board">
          @for (col of stageColumns(); track col.id) {
            <div class="pipeline-col card">
              <div class="col-header" [style.border-top-color]="col.color">
                <div class="col-title-wrap">
                  <span class="col-dot" [style.background]="col.color"></span>
                  <span class="col-label">{{ col.label }}</span>
                </div>
                <span class="col-count">{{ col.projects.length }}</span>
              </div>

              <div class="col-body">
                @for (project of col.projects; track project.id) {
                  <div class="project-card" [routerLink]="['/projects', project.id]">
                    <div class="p-header">
                      <span class="p-code">{{ project.code }}</span>
                      @if (project.hasRisk) {
                        <span class="risk-badge" [title]="'Risk Level: ' + (project.riskLevel || 'Medium')">
                          <span class="material-icons">warning</span>
                        </span>
                      }
                    </div>

                    <h4 class="p-title">{{ project.name }}</h4>
                    <p class="p-desc">{{ project.description }}</p>

                    <div class="p-progress-section">
                      <div class="progress-labels">
                        <span>Progress</span>
                        <span class="progress-num">{{ project.progress }}%</span>
                      </div>
                      <div class="progress-bar-bg">
                        <div class="progress-bar-val" [style.width.%]="project.progress" [style.background]="col.color"></div>
                      </div>
                    </div>

                    <div class="p-meta">
                      <div class="manager-info">
                        <div class="avatar avatar-xs" [style.background]="getAvatarColor(project.managerName)">
                          {{ project.managerName ? project.managerName.charAt(0) : 'M' }}
                        </div>
                        <span class="manager-name">{{ project.managerName }}</span>
                      </div>
                      <div class="tasks-counter">
                        <span class="material-icons">check_circle_outline</span>
                        <span>{{ project.openTaskCount }}/{{ project.totalTaskCount }}</span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="col-empty">
                    <span class="material-icons">inventory_2</span>
                    <span>No projects in this stage</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- NEW PROJECT MODAL -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="m-title">
                <span class="material-icons">create_new_folder</span>
                <h3>Initiate New Project</h3>
              </div>
              <button class="icon-btn" (click)="showCreateModal.set(false)"><span class="material-icons">close</span></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Project Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newProjectName" placeholder="e.g. AI Workflow Optimization" class="form-control" />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newProjectDesc" rows="3" placeholder="Scope and business goals..." class="form-control"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Initial Stage</label>
                  <select [(ngModel)]="newProjectStage" class="form-control">
                    <option value="PROPOSED">Proposed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="newProjectPriority" class="form-control">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Target Date</label>
                  <input type="date" [(ngModel)]="newProjectTargetDate" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Department / Client</label>
                  <input type="text" [(ngModel)]="newProjectClient" placeholder="e.g. Operations" class="form-control" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showCreateModal.set(false)">Cancel</button>
              <button class="btn btn-gradient" (click)="createProject()" [disabled]="!newProjectName.trim()">Create Project</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-box-sm {
      display: flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 6px 12px;
      font-size: 13px;

      .material-icons {
        font-size: 18px;
        color: var(--color-text-muted);
      }

      input {
        border: none;
        outline: none;
        font-size: 13px;
        background: transparent;
      }
    }

    .pipeline-board {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 16px;
      min-height: calc(100vh - 220px);
    }

    .pipeline-col {
      flex: 0 0 310px;
      background: #F8FAFC;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: white;
      border-bottom: 1px solid var(--color-border);
      border-top: 3px solid transparent;

      .col-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .col-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .col-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-navy);
        }
      }

      .col-count {
        font-size: 11px;
        font-weight: 700;
        background: #F1F5F9;
        padding: 2px 7px;
        border-radius: 999px;
        color: var(--color-text-secondary);
      }
    }

    .col-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      overflow-y: auto;
    }

    .project-card {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--color-blue);
      }
    }

    .p-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .p-code {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-blue);
        background: var(--color-light-blue);
        padding: 2px 6px;
        border-radius: 4px;
      }

      .risk-badge {
        color: #DC2626;
        .material-icons {
          font-size: 16px;
        }
      }
    }

    .p-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-navy);
      margin: 0 0 6px 0;
      line-height: 1.3;
    }

    .p-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      margin: 0 0 12px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .p-progress-section {
      margin-bottom: 12px;

      .progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-muted);
        margin-bottom: 4px;
      }

      .progress-bar-bg {
        height: 5px;
        background: #F1F5F9;
        border-radius: 999px;
        overflow: hidden;

        .progress-bar-val {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }
      }
    }

    .p-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);

      .manager-info {
        display: flex;
        align-items: center;
        gap: 6px;

        .manager-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
      }

      .tasks-counter {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        color: var(--color-text-muted);

        .material-icons {
          font-size: 14px;
        }
      }
    }

    .col-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: var(--color-text-muted);
      font-size: 12px;
      gap: 6px;

      .material-icons {
        font-size: 28px;
        opacity: 0.5;
      }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(4px);
    }

    .modal-card {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.25);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);

      .m-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-blue);

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
      display: flex;
      flex-direction: column;
      gap: 14px;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .form-control {
          padding: 8px 12px;
          border: 1.5px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          font-family: 'Inter', sans-serif;

          &:focus {
            border-color: var(--color-blue);
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid var(--color-border);
    }
  `]
})
export class PipelineComponent implements OnInit {
  loading = signal(true);
  projects = signal<Project[]>([]);
  searchQuery = '';
  showCreateModal = signal(false);

  newProjectName = '';
  newProjectDesc = '';
  newProjectStage: ProjectStage = 'PLANNING';
  newProjectPriority = 'HIGH';
  newProjectTargetDate = '2026-12-31';
  newProjectClient = 'Operations';

  stages: { id: ProjectStage; label: string; color: string }[] = [
    { id: 'PROPOSED', label: 'Proposed', color: '#94A3B8' },
    { id: 'APPROVED', label: 'Approved', color: '#6366F1' },
    { id: 'PLANNING', label: 'Planning', color: '#06B6D4' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#2563EB' },
    { id: 'TESTING', label: 'Testing', color: '#F59E0B' },
    { id: 'CLIENT_REVIEW', label: 'Client Review', color: '#EC4899' },
    { id: 'DELIVERED', label: 'Delivered', color: '#10B981' },
  ];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.projectService.getProjects().subscribe(res => {
      this.projects.set(res.data);
      this.loading.set(false);
    });
  }

  stageColumns = computed<StageColumn[]>(() => {
    const q = this.searchQuery.toLowerCase();
    const filtered = this.projects().filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );

    return this.stages.map(st => ({
      ...st,
      projects: filtered.filter(p => p.stage === st.id)
    }));
  });

  createProject(): void {
    if (!this.newProjectName.trim()) return;
    this.projectService.createProject({
      name: this.newProjectName,
      description: this.newProjectDesc,
      stage: this.newProjectStage,
      priority: this.newProjectPriority as any,
      targetDate: this.newProjectTargetDate,
      startDate: '2026-10-12',
      managerId: 'u2',
      clientOrDepartment: this.newProjectClient,
      type: 'Internal'
    }).subscribe(p => {
      this.projects.update(list => [p, ...list]);
      this.showCreateModal.set(false);
      this.newProjectName = '';
      this.newProjectDesc = '';
    });
  }

  getAvatarColor(name?: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#10B981', '#F59E0B'];
    if (!name) return colors[0];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
