import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, AuthUser } from '../../../shared/models/index';

type ReviewTab = 'ALL' | 'NEEDS_MY_REVIEW' | 'MY_SUBMISSIONS' | 'BLOCKED';

@Component({
  selector: 'app-task-review',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <!-- PAGE HEADER -->
      <div class="page-header">
        <div class="page-title-group">
          <div class="title-row">
            <h1 class="page-title">Review & Approvals</h1>
            <span class="badge badge-inreview queue-badge">
              <span class="material-icons queue-icon">rate_review</span>
              Queue Active
            </span>
          </div>
          <p class="page-subtitle">
            Quality assurance and peer review queue — <strong>{{ reviewTasks().length }}</strong> tasks awaiting verification
          </p>
        </div>

        <div class="page-actions">
          <a routerLink="/tasks/board" class="btn btn-outline btn-sm">
            <span class="material-icons">view_kanban</span> Task Board
          </a>
          <a routerLink="/tasks/all" class="btn btn-outline btn-sm">
            <span class="material-icons">list</span> All Tasks
          </a>
        </div>
      </div>

      <!-- ROLE GOVERNANCE BANNER -->
      <div class="role-governance-card" [class.admin-role]="isAdminRole()" [class.employee-role]="!isAdminRole()">
        <div class="role-info-left">
          <div class="role-avatar-circle">
            <span class="material-icons">{{ isAdminRole() ? 'verified_user' : 'badge' }}</span>
          </div>
          <div class="role-text-block">
            <div class="role-title">
              Reviewer Mode: <strong>{{ currentUserName() }}</strong>
              <span class="user-role-pill" [class.role-super]="currentUserRole() === 'SUPER_ADMIN'" [class.role-admin]="currentUserRole() === 'ADMIN'">
                {{ currentUserRole() }}
              </span>
            </div>
            <p class="role-desc">
              @if (isAdminRole()) {
                Super Admin Review Authority: Inspect employee task deliverables, request changes, and approve tasks to complete them.
              } @else {
                Employee Task Queue: All completed tasks submitted by you are reviewed and verified by Super Admin before being marked as Done.
              }
            </p>
          </div>
        </div>

        <div class="role-stats-summary">
          <div class="mini-stat">
            <span class="stat-num">{{ actionRequiredCount() }}</span>
            <span class="stat-lbl">You Can Review</span>
          </div>
          <div class="mini-stat">
            <span class="stat-num">{{ mySubmissionsCount() }}</span>
            <span class="stat-lbl">Your Submissions</span>
          </div>
        </div>
      </div>

      <!-- SUMMARY KPI METRICS -->
      <div class="kpi-metrics-row">
        <div class="kpi-card card" [class.active-kpi]="activeTab() === 'ALL'" (click)="setTab('ALL')">
          <div class="kpi-icon-wrap in-review-color">
            <span class="material-icons">fact_check</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">{{ reviewTasks().length }}</span>
            <span class="kpi-label">Total in Queue</span>
          </div>
        </div>

        <div class="kpi-card card" [class.active-kpi]="activeTab() === 'NEEDS_MY_REVIEW'" (click)="setTab('NEEDS_MY_REVIEW')">
          <div class="kpi-icon-wrap action-color">
            <span class="material-icons">assignment_turned_in</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">{{ actionRequiredCount() }}</span>
            <span class="kpi-label">Awaiting Your Review</span>
          </div>
        </div>

        <div class="kpi-card card" [class.active-kpi]="activeTab() === 'MY_SUBMISSIONS'" (click)="setTab('MY_SUBMISSIONS')">
          <div class="kpi-icon-wrap my-color">
            <span class="material-icons">schedule_send</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">{{ mySubmissionsCount() }}</span>
            <span class="kpi-label">Your Submissions</span>
          </div>
        </div>

        <div class="kpi-card card" [class.active-kpi]="activeTab() === 'BLOCKED'" (click)="setTab('BLOCKED')">
          <div class="kpi-icon-wrap blocked-color">
            <span class="material-icons">block</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-value">{{ blockedTasksCount() }}</span>
            <span class="kpi-label">Blocked / Attention</span>
          </div>
        </div>
      </div>

      <!-- FILTER TABS BAR -->
      <div class="filter-tabs-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'ALL'" (click)="setTab('ALL')">
          All Tasks <span class="tab-count">{{ reviewTasks().length }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'NEEDS_MY_REVIEW'" (click)="setTab('NEEDS_MY_REVIEW')">
          Needs My Review <span class="tab-count highlight">{{ actionRequiredCount() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'MY_SUBMISSIONS'" (click)="setTab('MY_SUBMISSIONS')">
          Submitted by Me <span class="tab-count">{{ mySubmissionsCount() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'BLOCKED'" (click)="setTab('BLOCKED')">
          Blocked <span class="tab-count danger">{{ blockedTasksCount() }}</span>
        </button>
      </div>

      <!-- TOAST NOTIFICATION -->
      @if (actionToast()) {
        <div class="action-toast-banner" [class.toast-success]="actionToast()?.type === 'success'" [class.toast-error]="actionToast()?.type === 'error'">
          <span class="material-icons">{{ actionToast()?.type === 'success' ? 'check_circle' : 'error' }}</span>
          <span>{{ actionToast()?.message }}</span>
          <button class="toast-close-btn" (click)="clearToast()"><span class="material-icons">close</span></button>
        </div>
      }

      <!-- REVIEW QUEUE LIST -->
      @if (loading()) {
        <div class="loading-container card">
          <div class="loading-spinner"></div>
          <p>Loading tasks awaiting verification...</p>
        </div>
      } @else {
        <div class="review-grid">
          @for (task of filteredTasks(); track task.id) {
            <div class="review-card card" [class.is-self-card]="isSelfTask(task)" [class.is-blocked-card]="task.status === 'BLOCKED'">
              
              <!-- TOP CARD HEADER -->
              <div class="review-header">
                <div class="header-left">
                  <span class="project-code">{{ task.projectCode || task.projectName || 'TASK' }}</span>
                  <span class="badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span>
                  @if (task.status === 'BLOCKED') {
                    <span class="badge badge-blocked">BLOCKED</span>
                  }
                </div>
                <div class="header-right">
                  <span class="due-label">
                    <span class="material-icons date-icon">event</span>
                    {{ task.dueDate ? 'Due ' + task.dueDate : 'No due date' }}
                  </span>
                </div>
              </div>

              <!-- CARD MAIN BODY -->
              <div class="review-body">
                <h3 class="task-title" [routerLink]="['/tasks', task.id]" title="Open task details">
                  {{ task.title }}
                </h3>
                
                <p class="task-desc">
                  {{ task.description || 'No detailed description provided for this verification item.' }}
                </p>

                <!-- ASSIGNEE / SUBMITTER BADGE -->
                <div class="review-assignee" [class.assignee-self-bg]="isSelfTask(task)">
                  <div class="avatar avatar-sm author-avatar">
                    {{ task.assigneeName ? task.assigneeName.charAt(0) : '?' }}
                  </div>
                  <div class="assignee-details">
                    <div class="name-row">
                      <span class="author-name">{{ task.assigneeName || 'Unassigned' }}</span>
                      @if (isSelfTask(task)) {
                        <span class="badge badge-self-tag">You</span>
                      }
                    </div>
                    <span class="author-label">
                      {{ isSelfTask(task) ? 'Submitted by you for review' : 'Submitted for peer verification' }}
                    </span>
                  </div>
                </div>

                <!-- BLOCKED REASON CALLOUT -->
                @if (task.status === 'BLOCKED' && task.blockedReason) {
                  <div class="blocked-reason-box">
                    <span class="material-icons">warning</span>
                    <div>
                      <strong>Blocker:</strong> {{ task.blockedReason }}
                    </div>
                  </div>
                }

                <!-- CHECKLIST ITEMS -->
                @if (task.checklist && task.checklist.length > 0) {
                  <div class="checklist-preview">
                    <span class="checklist-label">Verification Checklist ({{ getCompletedChecklistCount(task) }}/{{ task.checklist.length }}):</span>
                    <div class="checklist-items">
                      @for (item of task.checklist; track item.id) {
                        <div class="check-item">
                          <span class="material-icons check-icon" [class.checked]="item.completed">
                            {{ item.completed ? 'check_circle' : 'radio_button_unchecked' }}
                          </span>
                          <span [class.done-text]="item.completed">{{ item.text }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- INLINE CHANGE REQUEST FORM -->
                @if (activeFeedbackTaskId() === task.id) {
                  <div class="feedback-input-box">
                    <div class="feedback-header">
                      <span class="material-icons">feedback</span>
                      <strong>Request Changes on {{ task.title }}</strong>
                    </div>
                    <textarea
                      [(ngModel)]="changeRequestFeedback"
                      placeholder="Specify what needs to be changed, bug details, or missing requirements..."
                      class="feedback-textarea"
                      rows="3"
                    ></textarea>
                    <div class="feedback-actions">
                      <button class="btn btn-outline btn-xs" (click)="cancelFeedback()">Cancel</button>
                      <button
                        class="btn btn-danger btn-xs"
                        [disabled]="!changeRequestFeedback.trim() || isProcessing(task.id)"
                        (click)="submitChangeRequest(task)"
                      >
                        @if (isProcessing(task.id)) {
                          <span class="material-icons spin">sync</span> Sending...
                        } @else {
                          <span class="material-icons">send</span> Submit Changes
                        }
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- CARD FOOTER ACTIONS -->
              <div class="review-footer">
                @if (isSelfTask(task)) {
                  <!-- SELF TASK ACTIONS -->
                  <div class="self-warning-wrap">
                    <span class="self-helper-msg">
                      <span class="material-icons">hourglass_top</span> Awaiting Super Admin approval
                    </span>
                    <button class="btn btn-outline btn-sm text-muted" (click)="recallTask(task)" [disabled]="isProcessing(task.id)" title="Pull back to In Progress to make edits">
                      <span class="material-icons">replay</span> Recall to In Progress
                    </button>
                  </div>
                } @else if (!isAdminRole()) {
                  <!-- EMPLOYEE VIEWING OTHER'S SUBMISSION -->
                  <div class="self-warning-wrap">
                    <span class="self-helper-msg">
                      <span class="material-icons">lock</span> Super Admin review required
                    </span>
                    <a [routerLink]="['/tasks', task.id]" class="btn btn-outline btn-sm">
                      <span class="material-icons">visibility</span> View Details
                    </a>
                  </div>
                } @else {
                  <!-- REVIEWER ACTIONS -->
                  <div class="reviewer-action-btns">
                    <button
                      class="btn btn-outline btn-sm text-error"
                      (click)="openFeedback(task)"
                      [disabled]="isProcessing(task.id)"
                      title="Send task back to developer with feedback"
                    >
                      <span class="material-icons">undo</span> Request Changes
                    </button>

                    <button
                      class="btn btn-gradient btn-sm"
                      (click)="approveTask(task)"
                      [disabled]="isProcessing(task.id)"
                      title="Approve changes and mark task as completed"
                    >
                      @if (isProcessing(task.id)) {
                        <span class="material-icons spin">sync</span> Approving...
                      } @else {
                        <span class="material-icons">check_circle</span> Approve & Complete
                      }
                    </button>
                  </div>
                }
              </div>

            </div>
          } @empty {
            <div class="card empty-state-card">
              <div class="empty-state">
                <span class="material-icons empty-icon text-success">verified</span>
                <h3 class="empty-title">Queue Clear!</h3>
                <p class="empty-subtitle">
                  @if (activeTab() === 'NEEDS_MY_REVIEW') {
                    There are no peer tasks currently awaiting your review. Great job!
                  } @else if (activeTab() === 'MY_SUBMISSIONS') {
                    You don't have any tasks currently submitted for review.
                  } @else if (activeTab() === 'BLOCKED') {
                    No tasks are currently flagged as blocked.
                  } @else {
                    There are no tasks currently waiting for review or approval.
                  }
                </p>
                <div class="empty-actions">
                  <a routerLink="/tasks/all" class="btn btn-outline btn-sm">View All Tasks</a>
                  <a routerLink="/tasks/board" class="btn btn-gradient btn-sm">Task Kanban</a>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .queue-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      .queue-icon {
        font-size: 14px;
      }
    }

    /* Role Governance Banner */
    .role-governance-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 16px 20px;
      border-radius: var(--radius-lg);
      margin-bottom: 24px;
      border: 1px solid var(--color-border);
      background: white;
      box-shadow: var(--shadow-sm);

      &.admin-role {
        border-left: 4px solid #10B981;
        background: linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 60%);

        .role-avatar-circle {
          background: #DCFCE7;
          color: #059669;
        }
      }

      &.employee-role {
        border-left: 4px solid #3B82F6;
        background: linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 60%);

        .role-avatar-circle {
          background: #DBEAFE;
          color: #2563EB;
        }
      }

      .role-info-left {
        display: flex;
        align-items: center;
        gap: 14px;

        .role-avatar-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          .material-icons {
            font-size: 22px;
          }
        }

        .role-text-block {
          .role-title {
            font-size: 14px;
            color: var(--color-navy);
            display: flex;
            align-items: center;
            gap: 8px;

            .user-role-pill {
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 10px;
              background: #F1F5F9;
              color: #475569;

              &.role-super {
                background: #FEE2E2;
                color: #DC2626;
              }

              &.role-admin {
                background: #FEF3C7;
                color: #D97706;
              }
            }
          }

          .role-desc {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: var(--color-text-secondary);
            line-height: 1.4;
            max-width: 750px;
          }
        }
      }

      .role-stats-summary {
        display: flex;
        gap: 16px;

        .mini-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 14px;
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 8px;

          .stat-num {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
          }

          .stat-lbl {
            font-size: 10px;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
          }
        }
      }
    }

    /* KPI Summary Cards */
    .kpi-metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;

      .kpi-card {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        border: 1.5px solid var(--color-border);
        transition: all 0.15s ease;

        &:hover {
          transform: translateY(-2px);
          border-color: var(--color-blue);
        }

        &.active-kpi {
          border-color: var(--color-blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .kpi-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;

          &.in-review-color { background: #EFF6FF; color: #2563EB; }
          &.action-color    { background: #ECFDF5; color: #059669; }
          &.my-color        { background: #F5F3FF; color: #7C3AED; }
          &.blocked-color   { background: #FEF2F2; color: #DC2626; }

          .material-icons { font-size: 24px; }
        }

        .kpi-meta {
          display: flex;
          flex-direction: column;

          .kpi-value {
            font-size: 20px;
            font-weight: 800;
            color: var(--color-navy);
            line-height: 1.2;
          }

          .kpi-label {
            font-size: 12px;
            color: var(--color-text-secondary);
            font-weight: 500;
          }
        }
      }
    }

    /* Filter Tabs Bar */
    .filter-tabs-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 12px;

      .tab-btn {
        background: transparent;
        border: 1px solid transparent;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;

        &:hover {
          color: var(--color-navy);
          background: #F1F5F9;
        }

        &.active {
          background: var(--color-navy);
          color: white;

          .tab-count {
            background: rgba(255, 255, 255, 0.25);
            color: white;
          }
        }

        .tab-count {
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 10px;
          background: #E2E8F0;
          color: #475569;

          &.highlight { background: #DCFCE7; color: #166534; }
          &.danger    { background: #FEE2E2; color: #991B1B; }
        }
      }
    }

    /* Toast Notification */
    .action-toast-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      font-weight: 500;

      &.toast-success {
        background: #DCFCE7;
        color: #166534;
        border: 1px solid #BBF7D0;
      }

      &.toast-error {
        background: #FEE2E2;
        color: #991B1B;
        border: 1px solid #FECACA;
      }

      .toast-close-btn {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        display: flex;
      }
    }

    /* Grid Layout */
    .review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
      gap: 20px;
    }

    /* Review Card with Generous Inner Padding */
    .review-card {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1.5px solid var(--color-border);
      border-left: 5px solid var(--color-blue);
      border-radius: var(--radius-lg);
      background: white;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &.is-self-card {
        border-left-color: #8B5CF6;
      }

      &.is-blocked-card {
        border-left-color: #EF4444;
      }
    }

    .review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .project-code {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-blue);
          background: #EFF6FF;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.3px;
        }

        .badge-blocked {
          background: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
        }
      }

      .header-right {
        .due-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-muted);

          .date-icon { font-size: 15px; }
        }
      }
    }

    .review-body {
      flex: 1;

      .task-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 8px 0;
        cursor: pointer;
        line-height: 1.4;
        transition: color 0.15s ease;

        &:hover {
          color: var(--color-blue);
        }
      }

      .task-desc {
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.55;
        margin: 0 0 16px 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .review-assignee {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #F8FAFC;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        margin-bottom: 14px;

        &.assignee-self-bg {
          background: #F5F3FF;
          border-color: #DDD6FE;
        }

        .author-avatar {
          background: var(--color-navy);
          color: white;
          font-weight: 700;
          font-size: 12px;
        }

        .assignee-details {
          .name-row {
            display: flex;
            align-items: center;
            gap: 6px;

            .author-name {
              font-size: 13px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .badge-self-tag {
              background: #EDE9FE;
              color: #7C3AED;
              font-size: 10px;
              padding: 1px 6px;
              border-radius: 4px;
              font-weight: 700;
            }
          }

          .author-label {
            display: block;
            font-size: 11px;
            color: var(--color-text-muted);
          }
        }
      }

      .blocked-reason-box {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        background: #FEF2F2;
        border: 1px solid #FECACA;
        border-radius: 6px;
        color: #991B1B;
        font-size: 12px;
        margin-bottom: 14px;

        .material-icons {
          font-size: 16px;
          color: #DC2626;
          margin-top: 1px;
        }
      }

      .checklist-preview {
        margin-bottom: 16px;
        background: #F8FAFC;
        padding: 10px 12px;
        border-radius: 6px;

        .checklist-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 6px;
          display: block;
        }

        .checklist-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .check-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-primary);

          .check-icon {
            font-size: 16px;
            color: var(--color-text-muted);

            &.checked {
              color: #10B981;
            }
          }

          .done-text {
            text-decoration: line-through;
            color: var(--color-text-muted);
          }
        }
      }

      /* Feedback Drawer */
      .feedback-input-box {
        margin-top: 14px;
        padding: 14px;
        background: #FFFBEB;
        border: 1.5px solid #FDE68A;
        border-radius: 8px;

        .feedback-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #92400E;
          margin-bottom: 8px;

          .material-icons { font-size: 16px; }
        }

        .feedback-textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid #FCD34D;
          border-radius: 6px;
          font-family: inherit;
          font-size: 12px;
          outline: none;
          resize: vertical;

          &:focus {
            border-color: #D97706;
          }
        }

        .feedback-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
      }
    }

    .review-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 1px solid var(--color-border);

      .self-warning-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        .self-helper-msg {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #7C3AED;

          .material-icons { font-size: 16px; }
        }
      }

      .reviewer-action-btns {
        display: flex;
        align-items: center;
        gap: 10px;
      }
    }

    .empty-state-card {
      grid-column: 1 / -1;
      padding: 64px 24px;
      text-align: center;

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;

        .empty-icon {
          font-size: 48px;
          color: #10B981;
          margin-bottom: 4px;
        }

        .empty-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: var(--color-navy);
        }

        .empty-subtitle {
          margin: 0;
          font-size: 14px;
          color: var(--color-text-secondary);
          max-width: 440px;
        }

        .empty-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
      }
    }

    .loading-container {
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--color-text-secondary);

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #E2E8F0;
        border-top-color: var(--color-blue);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 1000px) {
      .kpi-metrics-row {
        grid-template-columns: repeat(2, 1fr);
      }
      .role-governance-card {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (max-width: 600px) {
      .kpi-metrics-row {
        grid-template-columns: 1fr;
      }
      .review-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TaskReviewComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  loading = signal(true);
  tasks = signal<Task[]>([]);
  activeTab = signal<ReviewTab>('ALL');
  processingIds = signal<Set<string>>(new Set());

  // Change request feedback drawer
  activeFeedbackTaskId = signal<string | null>(null);
  changeRequestFeedback = '';

  // Toast banner
  actionToast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  currentUser = this.authService.currentUser;

  currentUserRole = computed(() => {
    return this.currentUser()?.role || 'EMPLOYEE';
  });

  currentUserName = computed(() => {
    const u = this.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Reviewer';
  });

  isAdminRole = computed(() => {
    const role = this.currentUserRole();
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  // Base list of review tasks: IN_REVIEW or BLOCKED
  reviewTasks = computed(() => {
    return this.tasks().filter(t => t.status === 'IN_REVIEW' || t.status === 'BLOCKED');
  });

  // Tasks needing review (available for Super Admin/Admin)
  actionRequiredCount = computed(() => {
    if (!this.isAdminRole()) return 0;
    return this.reviewTasks().length;
  });

  // Tasks submitted by current user waiting for review
  mySubmissionsCount = computed(() => {
    const myId = this.currentUser()?.id;
    return this.reviewTasks().filter(t => t.assigneeId === myId).length;
  });

  blockedTasksCount = computed(() => {
    return this.reviewTasks().filter(t => t.status === 'BLOCKED').length;
  });

  // Filtered tasks depending on selected tab
  filteredTasks = computed(() => {
    const tab = this.activeTab();
    const all = this.reviewTasks();
    const myId = this.currentUser()?.id;

    if (tab === 'NEEDS_MY_REVIEW') {
      if (this.isAdminRole()) return all;
      return all.filter(t => t.assigneeId !== myId);
    }
    if (tab === 'MY_SUBMISSIONS') {
      return all.filter(t => t.assigneeId === myId);
    }
    if (tab === 'BLOCKED') {
      return all.filter(t => t.status === 'BLOCKED');
    }
    return all;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.taskService.getTasks({ limit: 100 }).subscribe({
      next: (res) => {
        this.tasks.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tasks for review queue:', err);
        this.loading.set(false);
      }
    });
  }

  setTab(tab: ReviewTab): void {
    this.activeTab.set(tab);
  }

  isSelfTask(task: Task): boolean {
    const myId = this.currentUser()?.id;
    if (this.isAdminRole()) {
      // Super Admin and Admin can review everything, but we can still highlight if they created it
      return false;
    }
    return task.assigneeId === myId;
  }

  isProcessing(taskId: string): boolean {
    return this.processingIds().has(taskId);
  }

  getCompletedChecklistCount(task: Task): number {
    return (task.checklist || []).filter(c => c.completed).length;
  }

  approveTask(task: Task): void {
    if (!this.isAdminRole()) {
      this.showToast('Super Admin approval required: only Super Admin can approve and mark tasks as Done.', 'error');
      return;
    }
    if (this.isSelfTask(task)) {
      this.showToast('Self-approval restricted: a peer or project admin must review your work.', 'error');
      return;
    }

    const curSet = new Set(this.processingIds());
    curSet.add(task.id);
    this.processingIds.set(curSet);

    const reviewerName = this.currentUserName();
    const approvalNote = `Task approved and verified by ${reviewerName} (${this.currentUserRole()}).`;

    this.taskService.updateTaskStatus(task.id, {
      status: 'DONE',
      note: approvalNote
    }).subscribe({
      next: (updated) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        this.tasks.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.showToast(`Task "${task.title}" approved and completed successfully!`, 'success');
      },
      error: (err) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        const msg = err.error?.error || 'Failed to approve task.';
        this.showToast(msg, 'error');
      }
    });
  }

  openFeedback(task: Task): void {
    this.activeFeedbackTaskId.set(task.id);
    this.changeRequestFeedback = '';
  }

  cancelFeedback(): void {
    this.activeFeedbackTaskId.set(null);
    this.changeRequestFeedback = '';
  }

  submitChangeRequest(task: Task): void {
    if (!this.changeRequestFeedback.trim()) return;

    const curSet = new Set(this.processingIds());
    curSet.add(task.id);
    this.processingIds.set(curSet);

    const reviewerName = this.currentUserName();
    const feedbackNote = `[Change Request by ${reviewerName}]: ${this.changeRequestFeedback.trim()}`;

    this.taskService.updateTaskStatus(task.id, {
      status: 'IN_PROGRESS',
      note: feedbackNote
    }).subscribe({
      next: (updated) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        this.activeFeedbackTaskId.set(null);
        this.changeRequestFeedback = '';

        this.tasks.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.showToast(`Changes requested on "${task.title}". Task returned to developer.`, 'success');
      },
      error: (err) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        const msg = err.error?.error || 'Failed to request changes.';
        this.showToast(msg, 'error');
      }
    });
  }

  recallTask(task: Task): void {
    const curSet = new Set(this.processingIds());
    curSet.add(task.id);
    this.processingIds.set(curSet);

    this.taskService.updateTaskStatus(task.id, {
      status: 'IN_PROGRESS',
      note: 'Recalled back to In Progress by author.'
    }).subscribe({
      next: (updated) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        this.tasks.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.showToast(`Task "${task.title}" recalled back to In Progress.`, 'success');
      },
      error: (err) => {
        const nextSet = new Set(this.processingIds());
        nextSet.delete(task.id);
        this.processingIds.set(nextSet);

        const msg = err.error?.error || 'Failed to recall task.';
        this.showToast(msg, 'error');
      }
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.actionToast.set({ message, type });
    setTimeout(() => {
      this.clearToast();
    }, 4500);
  }

  clearToast(): void {
    this.actionToast.set(null);
  }

  getPriorityClass(p: string): string {
    return {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    }[p] ?? 'priority-medium';
  }
}
