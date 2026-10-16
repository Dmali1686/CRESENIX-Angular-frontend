import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, TaskStatus, TaskPriority, ChecklistItem, TaskComment, Employee } from '../../../shared/models/index';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <!-- BREADCRUMBS -->
      <div class="breadcrumb-bar">
        <a routerLink="/tasks/all" class="breadcrumb-item">Tasks</a>
        <span class="material-icons breadcrumb-sep">chevron_right</span>
        <span class="breadcrumb-item active">{{ task()?.projectCode || 'Task' }}</span>
        <span class="material-icons breadcrumb-sep">chevron_right</span>
        <span class="breadcrumb-item active truncate-crumb">{{ task()?.title }}</span>
      </div>

      @if (loading()) {
        <div class="card" style="padding: 32px">
          <div class="skeleton skeleton-title" style="width: 50%; height: 28px; margin-bottom: 16px"></div>
          <div class="skeleton skeleton-text" style="width: 80%; height: 16px; margin-bottom: 8px"></div>
          <div class="skeleton skeleton-text" style="width: 60%; height: 16px"></div>
        </div>
      } @else if (task()) {
        <div class="detail-layout">
          <!-- MAIN CONTENT -->
          <div class="main-column">
            <div class="card detail-card">
              <div class="detail-header">
                <div class="badges-row">
                  <span class="project-badge">{{ task()!.projectCode }}</span>
                  <span class="badge" [class]="getPriorityClass(task()!.priority)">{{ task()!.priority }}</span>
                  <span class="badge" [class]="getStatusClass(task()!.status)">{{ fmtStatus(task()!.status) }}</span>
                  <span class="badge comment-jump-badge" (click)="scrollToComments()" title="Jump to comments">
                    <span class="material-icons">forum</span> {{ comments().length }}
                  </span>
                </div>
                <h1 class="task-detail-title">{{ task()!.title }}</h1>
                <p class="task-description">{{ task()!.description || 'No description provided for this task.' }}</p>
              </div>

              <!-- TOAST NOTIFICATION -->
              @if (actionToast()) {
                <div class="detail-toast" [class.toast-success]="actionToast()?.type === 'success'" [class.toast-error]="actionToast()?.type === 'error'">
                  <span class="material-icons">{{ actionToast()?.type === 'success' ? 'check_circle' : 'error' }}</span>
                  <span>{{ actionToast()?.message }}</span>
                  <button class="toast-close" (click)="clearToast()"><span class="material-icons">close</span></button>
                </div>
              }

              <!-- REVIEW & APPROVAL STATUS BANNER -->
              @if (task()!.status === 'IN_REVIEW') {
                @if (canDirectApprove()) {
                  <!-- SUPER ADMIN REVIEW CONTROLS -->
                  <div class="review-action-banner admin-banner">
                    <div class="banner-icon-col">
                      <span class="material-icons">rate_review</span>
                    </div>
                    <div class="banner-content">
                      <div class="banner-title">
                        Super Admin Verification Required
                        <span class="review-tag">In Review Queue</span>
                      </div>
                      <p class="banner-text">
                        Submitted by <strong>{{ task()!.assigneeName || 'Employee' }}</strong>
                        @if (task()!.reviewRequestedAt) {
                          on {{ task()!.reviewRequestedAt | date:'mediumDate' }}
                        }
                        — Please verify the deliverables, checklist, and approve to mark this task as Done.
                      </p>
                      <div class="banner-btn-group">
                        <button class="btn btn-outline btn-sm text-error" (click)="openRequestChangesModal()" [disabled]="isProcessingAction()">
                          <span class="material-icons">undo</span> Request Changes
                        </button>
                        <button class="btn btn-gradient btn-sm" (click)="approveTask()" [disabled]="isProcessingAction()">
                          <span class="material-icons">check_circle</span> Approve & Mark Done
                        </button>
                      </div>
                    </div>
                  </div>
                } @else {
                  <!-- EMPLOYEE AWAITING APPROVAL BANNER -->
                  <div class="review-action-banner employee-banner">
                    <div class="banner-icon-col">
                      <span class="material-icons">hourglass_top</span>
                    </div>
                    <div class="banner-content">
                      <div class="banner-title">
                        Task Submitted for Super Admin Review
                        <span class="review-tag pending">Under Verification</span>
                      </div>
                      <p class="banner-text">
                        Your task was submitted for review. Super Admin will verify your work and mark it as completed. You will receive an in-app notification once approved.
                      </p>
                      <div class="banner-btn-group">
                        <button class="btn btn-outline btn-xs text-muted" (click)="recallToInProgress()" [disabled]="isProcessingAction()">
                          <span class="material-icons">replay</span> Recall to In Progress
                        </button>
                      </div>
                    </div>
                  </div>
                }
              } @else if (task()!.status === 'IN_PROGRESS' || task()!.status === 'TODO') {
                <!-- SUBMIT TASK FOR REVIEW CALLOUT -->
                <div class="submit-review-card">
                  <div class="submit-review-text">
                    <span class="material-icons">task_alt</span>
                    <div>
                      <strong>Finished your work on this task?</strong>
                      <p>Submit this task for Super Admin review and verification when checklist and deliverables are complete.</p>
                    </div>
                  </div>
                  <button class="btn btn-gradient btn-sm submit-btn" (click)="submitForReview()" [disabled]="isProcessingAction()">
                    @if (isProcessingAction()) {
                      <span class="spinner-sm"></span> Submitting...
                    } @else {
                      <span class="material-icons">send</span> Submit for Review
                    }
                  </button>
                </div>
              } @else if (task()!.status === 'DONE') {
                <!-- COMPLETED TASK BANNER -->
                <div class="review-action-banner completed-banner">
                  <div class="banner-icon-col">
                    <span class="material-icons text-success">verified</span>
                  </div>
                  <div class="banner-content">
                    <div class="banner-title text-success">
                      Task Approved & Completed
                    </div>
                    <p class="banner-text">
                      This task has been verified and marked as Done by Super Admin.
                      @if (task()!.completedAt) {
                        Completed on {{ task()!.completedAt | date:'mediumDate' }}.
                      }
                    </p>
                  </div>
                </div>
              }

              <!-- CHECKLIST SECTION -->
              <div class="checklist-section">
                <div class="section-header">
                  <div class="header-left">
                    <span class="material-icons">checklist</span>
                    <h3>Checklist</h3>
                  </div>
                  <span class="checklist-progress-text">{{ completedChecklistCount() }} of {{ (task()!.checklist?.length || 0) }} completed</span>
                </div>

                <div class="progress-bar-container">
                  <div class="progress-bar-fill" [style.width.%]="checklistProgress()"></div>
                </div>

                <div class="checklist-list">
                  @for (item of task()!.checklist || []; track item.id) {
                    <div class="check-item-row" (click)="toggleChecklistItem(item)">
                      <span class="material-icons check-box-icon" [class.checked]="item.completed">
                        {{ item.completed ? 'check_box' : 'check_box_outline_blank' }}
                      </span>
                      <span class="item-text" [class.completed-text]="item.completed">{{ item.text }}</span>
                      <button class="delete-check-btn" (click)="deleteChecklistItem($event, item)" title="Delete item">
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  } @empty {
                    <p class="text-muted" style="font-size:13px">No checklist items defined for this task.</p>
                  }
                </div>

                <div class="add-checklist-row">
                  <input type="text" placeholder="Add checklist item..." [(ngModel)]="newChecklistText" (keyup.enter)="addChecklistItem()" class="checklist-input" />
                  <button class="btn btn-outline btn-xs" (click)="addChecklistItem()" [disabled]="!newChecklistText.trim()">Add</button>
                </div>
              </div>

              <!-- COMMENTS & ACTIVITY FEED -->
              <div class="comments-section" id="commentsSection">
                <div class="section-header">
                  <div class="header-left">
                    <span class="material-icons">forum</span>
                    <h3>Discussion & Activity</h3>
                  </div>
                  <span class="comment-count-badge">{{ comments().length }} {{ comments().length === 1 ? 'comment' : 'comments' }}</span>
                </div>

                <div class="add-comment-box">
                  <textarea [(ngModel)]="newCommentText" placeholder="Write a comment or update..." rows="2" class="comment-textarea"></textarea>
                  <div class="comment-box-actions">
                    <button class="btn btn-gradient btn-sm" (click)="addComment()" [disabled]="!newCommentText.trim() || submittingComment()">
                      <span class="material-icons" style="font-size:15px; margin-right:4px;">send</span>
                      {{ submittingComment() ? 'Posting...' : 'Post Comment' }}
                    </button>
                  </div>
                </div>

                <div class="comments-list">
                  @for (comm of comments(); track comm.id) {
                    <div class="comment-item" [id]="'comment-' + comm.id">
                      <div class="avatar avatar-sm comment-avatar" [style.background]="getAvatarColor(comm.userName)">
                        {{ getInitials(comm.userName) }}
                      </div>
                      <div class="comment-content-box">
                        <div class="comment-meta">
                          <div class="meta-left">
                            <span class="user-name">{{ comm.userName }}</span>
                            <span class="meta-dot">•</span>
                            <span class="time-ago">{{ formatCommentTime(comm.createdAt) }}</span>
                          </div>
                        </div>
                        <p class="comment-body">{{ comm.content }}</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-comments-state">
                      <span class="material-icons text-muted" style="font-size:28px">chat_bubble_outline</span>
                      <p class="text-muted" style="font-size:13px; margin:6px 0 0 0;">No comments yet. Start the discussion!</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- SIDEBAR METADATA -->
          <div class="side-column">
            <div class="card meta-card">
              <h3 class="meta-section-title">Task Properties</h3>

              <!-- Status Changer -->
              <div class="meta-field">
                <label>Status</label>
                <select [ngModel]="task()!.status" (ngModelChange)="onStatusChange($event)" class="status-select">
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="BLOCKED">Blocked</option>
                  @if (canDirectApprove()) {
                    <option value="DONE">Done</option>
                  } @else {
                    <option value="DONE" disabled>Done (Super Admin Approval Required)</option>
                  }
                </select>
                @if (!canDirectApprove() && task()!.status !== 'DONE') {
                  <span class="status-note">
                    <span class="material-icons">lock</span> Marking as Done requires Super Admin approval.
                  </span>
                }
              </div>

              <!-- Primary Assignee -->
              <div class="meta-field">
                <label>Primary Assignee</label>
                @if (canManageAssignees()) {
                  <select
                    id="reassign-primary-select"
                    [ngModel]="task()!.assigneeId || ''"
                    (ngModelChange)="reassignPrimary($event)"
                    class="status-select"
                    style="margin-bottom:8px">
                    <option value="">Unassigned</option>
                    @for (emp of employees(); track emp.id) {
                      <option [value]="emp.id">
                        {{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || emp.role }})
                      </option>
                    }
                  </select>
                }
                <div class="user-display">
                  <div class="avatar avatar-sm assignee-avatar" [style.background]="getAvatarColor(task()!.assigneeName)">
                    {{ getInitials(task()!.assigneeName) }}
                  </div>
                  <div class="user-info">
                    <span class="user-full-name">{{ task()!.assigneeName || 'Unassigned' }}</span>
                    <span class="user-role-label">Lead Assignee</span>
                  </div>
                </div>
              </div>

              <!-- Team Collaborators / Multiple Assignees -->
              <div class="meta-field">
                <div class="field-label-row">
                  <label>Additional Collaborators ({{ (task()!.assignees || []).length }})</label>
                  @if (canManageAssignees()) {
                    <button id="add-collaborator-btn" class="text-btn-xs" (click)="openAddCollaboratorModal()">
                      <span class="material-icons">person_add</span> Add
                    </button>
                  }
                </div>

                <div class="collaborators-list">
                  @for (collab of task()!.assignees || []; track collab.userId) {
                    <div class="collaborator-item">
                      <div class="avatar avatar-xs" [style.background]="getAvatarColor(collab.name)">
                        {{ getInitials(collab.name) }}
                      </div>
                      <div class="collab-name-role">
                        <span class="collab-name">{{ collab.name }}</span>
                        <span class="collab-role-tag">{{ collab.role }}</span>
                      </div>
                      @if (canManageAssignees()) {
                        <button class="remove-collab-btn" (click)="removeCollaborator(collab.userId)" title="Remove collaborator from task">
                          <span class="material-icons">close</span>
                        </button>
                      }
                    </div>
                  } @empty {
                    <span class="no-collab-text">No additional employees assigned yet.</span>
                  }
                </div>
              </div>

              <!-- Project -->
              <div class="meta-field">
                <label>Project</label>
                @if (task()!.projectId) {
                  <a [routerLink]="['/projects', task()!.projectId]" class="project-link">
                    <span class="material-icons">folder</span>
                    {{ task()!.projectName }}
                  </a>
                } @else {
                  <span class="text-muted" style="font-size:13px">General Task</span>
                }
              </div>

              <!-- Due Date -->
              <div class="meta-field">
                <label>Due Date</label>
                <div class="field-value"><span class="material-icons">event</span> {{ task()!.dueDate || 'No due date set' }}</div>
              </div>

              <!-- Estimated Hours -->
              <div class="meta-field">
                <label>Time Tracking</label>
                <div class="time-tracking-box">
                  <div class="time-stat">
                    <span class="time-num">{{ task()!.estimatedHours || 0 }}h</span>
                    <span class="time-lbl">Estimated</span>
                  </div>
                  <div class="time-stat">
                    <span class="time-num">{{ task()!.actualHours || 0 }}h</span>
                    <span class="time-lbl">Logged</span>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="meta-actions">
                <button class="btn btn-outline btn-sm full-btn" (click)="goBack()">
                  <span class="material-icons">arrow_back</span> Back to Tasks
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ADD COLLABORATOR MODAL -->
        @if (showAddCollaboratorModal()) {
          <div class="modal-overlay" (click)="closeAddCollaboratorModal()">
            <div class="modal-dialog" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div class="head-title">
                  <span class="material-icons text-primary">group_add</span>
                  <h3>Assign Employee to Task</h3>
                </div>
                <button class="icon-close-btn" (click)="closeAddCollaboratorModal()">
                  <span class="material-icons">close</span>
                </button>
              </div>

              <div class="modal-body">
                <p class="modal-instructions">
                  Assign another employee as a collaborator on <strong>{{ task()!.title }}</strong>. They will immediately see this task in their "My Tasks" view and have access to update status and checklists.
                </p>

                <div class="form-group" style="margin-bottom:14px">
                  <label for="select-collab-input">Select Employee</label>
                  <select id="select-collab-input" [(ngModel)]="selectedNewCollabId" class="status-select">
                    <option value="">-- Choose Employee --</option>
                    @for (emp of availableEmployeesForTask(); track emp.id) {
                      <option [value]="emp.id">
                        {{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || emp.role }})
                      </option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label for="select-collab-role">Assignment Role</label>
                  <select id="select-collab-role" [(ngModel)]="selectedNewCollabRole" class="status-select">
                    <option value="COLLABORATOR">Collaborator (Work on task, checklist & comments)</option>
                    <option value="REVIEWER">Reviewer (Quality review & sign-off)</option>
                  </select>
                </div>

                @if (collabError()) {
                  <div class="modal-error">
                    <span class="material-icons">error</span> {{ collabError() }}
                  </div>
                }
              </div>

              <div class="modal-foot">
                <button class="btn btn-outline btn-sm" (click)="closeAddCollaboratorModal()">Cancel</button>
                <button
                  id="confirm-assign-employee-btn"
                  class="btn btn-gradient btn-sm"
                  [disabled]="!selectedNewCollabId() || submittingCollab()"
                  (click)="confirmAddCollaborator()">
                  @if (submittingCollab()) { <span class="spinner-sm"></span> }
                  Assign to Task
                </button>
              </div>
            </div>
          </div>
        }

        <!-- REQUEST CHANGES MODAL -->
        @if (showRequestChangesModal()) {
          <div class="modal-overlay" (click)="closeRequestChangesModal()">
            <div class="modal-dialog" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div class="head-title">
                  <span class="material-icons text-error">undo</span>
                  <h3>Request Changes on Task</h3>
                </div>
                <button class="icon-close-btn" (click)="closeRequestChangesModal()">
                  <span class="material-icons">close</span>
                </button>
              </div>

              <div class="modal-body">
                <p class="modal-instructions">
                  Provide constructive review feedback for <strong>{{ task()!.assigneeName || 'the assigned employee' }}</strong>. The task will be returned to <strong>In Progress</strong> and your notes will be posted to the discussion feed.
                </p>

                <div class="form-group">
                  <label>Changes Required / Review Notes *</label>
                  <textarea
                    [(ngModel)]="changeRequestFeedback"
                    placeholder="Specify what needs to be changed, bug details, or missing requirements..."
                    rows="4"
                    class="feedback-modal-textarea"
                  ></textarea>
                </div>
              </div>

              <div class="modal-foot">
                <button class="btn btn-outline btn-sm" (click)="closeRequestChangesModal()">Cancel</button>
                <button
                  class="btn btn-danger btn-sm"
                  [disabled]="!changeRequestFeedback.trim() || isProcessingAction()"
                  (click)="confirmRequestChanges()">
                  @if (isProcessingAction()) { <span class="spinner-sm"></span> }
                  <span class="material-icons">send</span> Return with Feedback
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="card empty-state">
          <span class="material-icons empty-icon text-muted">error_outline</span>
          <h3 class="empty-title">Task Not Found</h3>
          <p class="empty-subtitle">The requested task could not be located.</p>
          <button class="btn btn-gradient btn-sm" (click)="goBack()">Return to Tasks</button>
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

        &.truncate-crumb {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .breadcrumb-sep {
        font-size: 16px;
        color: var(--color-text-muted);
      }
    }

    :host {
      display: block;
    }

    .page-container {
      padding: 24px 24px 120px 24px;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
    }

    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
    }

    .side-column {
      position: sticky;
      top: 24px;
    }

    .detail-card {
      padding: 32px 32px 40px 32px;
      margin-bottom: 40px;
      box-shadow: var(--shadow-sm);
    }

    .comment-jump-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      background: #F1F5F9;
      color: var(--color-blue);
      border: 1px solid #E2E8F0;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 6px;
      transition: all var(--transition-fast);

      .material-icons {
        font-size: 13px;
      }

      &:hover {
        background: var(--color-light-blue);
        border-color: var(--color-blue);
      }
    }

    .detail-header {
      margin-bottom: 32px;

      .badges-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;

        .project-badge {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-blue);
          background: var(--color-light-blue);
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .task-detail-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-navy);
        line-height: 1.3;
        margin: 0 0 12px 0;
      }

      .task-description {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.6;
        margin: 0;
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .material-icons {
          color: var(--color-blue);
          font-size: 20px;
        }

        h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy);
          margin: 0;
        }
      }

      .checklist-progress-text {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .comment-count-badge {
        font-size: 11px;
        font-weight: 700;
        background: #E2E8F0;
        padding: 2px 8px;
        border-radius: 999px;
        color: var(--color-text-secondary);
      }
    }

    .checklist-section {
      padding-top: 24px;
      border-top: 1px solid var(--color-border);
      margin-bottom: 32px;

      .progress-bar-container {
        height: 6px;
        background: #F1F5F9;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 16px;

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-blue), var(--color-cyan));
          border-radius: 999px;
          transition: width 0.3s ease;
        }
      }

      .checklist-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 14px;
      }

      .check-item-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: #F8FAFC;
        border-radius: 8px;
        cursor: pointer;
        transition: background var(--transition-fast);

        &:hover {
          background: #F1F5F9;
        }

        .check-box-icon {
          font-size: 20px;
          color: var(--color-text-muted);

          &.checked {
            color: var(--color-blue);
          }
        }

        .item-text {
          font-size: 13px;
          color: var(--color-text-primary);

          &.completed-text {
            text-decoration: line-through;
            color: var(--color-text-muted);
          }
        }

        .delete-check-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          opacity: 0;
          display: flex;
          align-items: center;
          transition: opacity 0.2s, color 0.2s;

          .material-icons {
            font-size: 16px;
          }

          &:hover {
            color: #DC2626;
          }
        }

        &:hover .delete-check-btn {
          opacity: 1;
        }
      }

      .add-checklist-row {
        display: flex;
        gap: 8px;

        .checklist-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          outline: none;

          &:focus {
            border-color: var(--color-blue);
          }
        }
      }
    }

    .comments-section {
      padding-top: 24px;
      margin-top: 28px;
      border-top: 1px solid var(--color-border);

      .add-comment-box {
        margin-bottom: 24px;

        .comment-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          border: 1.5px solid var(--color-border);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          line-height: 1.5;
          outline: none;
          box-sizing: border-box;
          resize: vertical;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

          &:focus {
            border-color: var(--color-blue);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
        }

        .comment-box-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        }
      }

      .comments-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 24px;
      }

      .comment-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .comment-avatar {
          color: white;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }

        .comment-content-box {
          flex: 1;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;

          &:hover {
            background: #FFFFFF;
            border-color: #CBD5E1;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          }

          .comment-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #EDF2F7;

            .meta-left {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .user-name {
              font-size: 13px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .meta-dot {
              font-size: 10px;
              color: var(--color-text-muted);
            }

            .time-ago {
              font-size: 11.5px;
              color: var(--color-text-muted);
              font-weight: 500;
            }
          }

          .comment-body {
            font-size: 13.5px;
            color: var(--color-navy);
            line-height: 1.6;
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
        }
      }

      .empty-comments-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 0;
        text-align: center;
      }
    }

    /* Meta Column */
    .meta-card {
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }

    .assignee-avatar {
      color: white;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
    }

    .meta-section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-navy);
      margin: 0 0 16px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-border);
    }

    .meta-field {
      margin-bottom: 18px;

      label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-muted);
        margin-bottom: 6px;
      }

      .field-label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;

        label {
          margin-bottom: 0;
        }

        .text-btn-xs {
          background: none;
          border: none;
          padding: 2px 6px;
          color: var(--color-blue);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 2px;
          cursor: pointer;
          border-radius: 4px;

          .material-icons {
            font-size: 14px;
          }

          &:hover {
            background: var(--color-light-blue);
          }
        }
      }

      .status-select {
        width: 100%;
        padding: 8px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        background: white;

        &:focus {
          border-color: var(--color-blue);
        }
      }

      .user-display {
        display: flex;
        align-items: center;
        gap: 10px;

        .user-full-name {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-navy);
        }

        .user-role-label {
          display: block;
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }

      .project-link {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-blue);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;

        .material-icons {
          font-size: 16px;
        }

        &:hover {
          text-decoration: underline;
        }
      }

      .field-value {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--color-text-primary);

        .material-icons {
          font-size: 16px;
          color: var(--color-text-muted);
        }
      }
    }

    .collaborators-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;

      .collaborator-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        transition: border-color var(--transition-fast);

        &:hover {
          border-color: #CBD5E1;

          .remove-collab-btn {
            opacity: 1;
          }
        }

        .avatar-xs {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          color: white;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .collab-name-role {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;

          .collab-name {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-navy);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .collab-role-tag {
            font-size: 9px;
            font-weight: 700;
            color: var(--color-text-muted);
            background: #E2E8F0;
            padding: 1px 4px;
            border-radius: 3px;
            text-transform: uppercase;
          }
        }

        .remove-collab-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          opacity: 0;
          display: flex;
          align-items: center;
          transition: opacity 0.2s, color 0.2s;

          .material-icons {
            font-size: 14px;
          }

          &:hover {
            color: #DC2626;
          }
        }
      }

      .no-collab-text {
        font-size: 12px;
        color: var(--color-text-muted);
        font-style: italic;
      }
    }

    .time-tracking-box {
      display: flex;
      gap: 12px;
      background: #F8FAFC;
      padding: 12px;
      border-radius: 8px;

      .time-stat {
        flex: 1;
        text-align: center;

        .time-num {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy);
        }

        .time-lbl {
          display: block;
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }
    }

    .meta-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);

      .full-btn {
        width: 100%;
        justify-content: center;
      }
    }

    /* MODAL STYLES */
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
    }

    .modal-dialog {
      background: white;
      border-radius: 14px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.25);
      border: 1px solid var(--color-border);
      overflow: hidden;
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);

      .head-title {
        display: flex;
        align-items: center;
        gap: 8px;

        .material-icons {
          font-size: 20px;
        }

        h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--color-navy);
        }
      }

      .icon-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--color-text-muted);
        display: flex;
        padding: 4px;

        &:hover {
          color: var(--color-navy);
        }
      }
    }

    .modal-body {
      padding: 20px;

      .modal-instructions {
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin: 0 0 16px 0;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
      }

      .modal-error {
        margin-top: 12px;
        padding: 8px 12px;
        background: #FEE2E2;
        border-radius: 6px;
        font-size: 12px;
        color: #DC2626;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }

    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--color-border);
      background: #F8FAFC;
    }

    .spinner-sm {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
      margin-right: 6px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Toast Notification */
    .detail-toast {
      display: flex;
      align-items: center;
      gap: 10px;
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

      .material-icons {
        font-size: 20px;
      }

      .toast-close {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        display: flex;
      }
    }

    /* Review Action Banners */
    .review-action-banner {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      border: 1px solid transparent;

      .banner-icon-col {
        display: flex;
        align-items: flex-start;
        justify-content: center;

        .material-icons {
          font-size: 32px;
        }
      }

      .banner-content {
        flex: 1;

        .banner-title {
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .banner-text {
          font-size: 13px;
          line-height: 1.5;
          margin: 0 0 14px 0;
        }

        .banner-btn-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
      }

      &.admin-banner {
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        border-color: #BFDBFE;
        color: #1E3A8A;

        .banner-icon-col .material-icons {
          color: #2563EB;
        }

        .review-tag {
          font-size: 11px;
          font-weight: 700;
          background: #2563EB;
          color: white;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
      }

      &.employee-banner {
        background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
        border-color: #FDE68A;
        color: #92400E;

        .banner-icon-col .material-icons {
          color: #D97706;
        }

        .review-tag {
          font-size: 11px;
          font-weight: 700;
          background: #D97706;
          color: white;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
      }

      &.completed-banner {
        background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
        border-color: #BBF7D0;
        color: #166534;

        .banner-icon-col .material-icons {
          color: #16A34A;
        }

        .banner-text {
          margin: 0;
        }
      }
    }

    /* Submit for Review card */
    .submit-review-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 10px;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      margin-bottom: 24px;

      .submit-review-text {
        display: flex;
        align-items: center;
        gap: 12px;

        .material-icons {
          font-size: 26px;
          color: var(--color-blue);
        }

        strong {
          font-size: 14px;
          color: var(--color-navy);
          display: block;
        }

        p {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 2px 0 0 0;
        }
      }

      .submit-btn {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }

    .status-note {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #B45309;
      margin-top: 6px;
      line-height: 1.3;

      .material-icons {
        font-size: 13px;
      }
    }

    .feedback-modal-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-blue);
      }
    }

    @media (max-width: 992px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TaskDetailComponent implements OnInit {
  loading = signal(true);
  task = signal<Task | null>(null);
  employees = signal<Employee[]>([]);

  newChecklistText = '';
  newCommentText = '';
  submittingComment = signal(false);
  comments = signal<TaskComment[]>([]);

  // Collaborator management
  showAddCollaboratorModal = signal(false);
  selectedNewCollabId = signal('');
  selectedNewCollabRole = signal('COLLABORATOR');
  submittingCollab = signal(false);
  collabError = signal('');

  // Review & Approval state
  actionToast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  isProcessingAction = signal(false);
  showRequestChangesModal = signal(false);
  changeRequestFeedback = '';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  currentUser = computed(() => this.authService.currentUser());
  isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin = computed(() => this.authService.currentUser()?.role === 'ADMIN');
  canDirectApprove = computed(() => this.isSuperAdmin() || this.isAdmin());

  canManageAssignees = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  availableEmployeesForTask = computed(() => {
    const curTask = this.task();
    if (!curTask) return this.employees();
    const existingIds = new Set<string>();
    if (curTask.assigneeId) existingIds.add(curTask.assigneeId);
    (curTask.assignees || []).forEach(a => existingIds.add(a.userId));
    return this.employees().filter(e => !existingIds.has(e.id));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.taskService.getTaskById(id).subscribe(t => {
        this.task.set(t || null);
        this.loading.set(false);
      });
      this.loadComments(id);
    } else {
      this.loading.set(false);
    }

    this.employeeService.getEmployees().subscribe({
      next: emps => {
        if (emps) {
          this.employees.set(emps);
        }
      },
      error: () => {}
    });
  }

  loadComments(taskId: string): void {
    this.taskService.getComments(taskId).subscribe(list => {
      this.comments.set(list);
    });
  }

  completedChecklistCount = computed(() => {
    return (this.task()?.checklist || []).filter(i => i.completed).length;
  });

  checklistProgress = computed(() => {
    const list = this.task()?.checklist || [];
    if (list.length === 0) return 0;
    return Math.round((this.completedChecklistCount() / list.length) * 100);
  });

  reassignPrimary(newAssigneeId: string): void {
    if (!this.task()) return;
    const curTask = this.task()!;
    this.taskService.updateTask(curTask.id, { assigneeId: newAssigneeId }).subscribe({
      next: updated => {
        this.task.set(updated);
      },
      error: err => {
        console.error('Failed to reassign primary assignee:', err);
      }
    });
  }

  openAddCollaboratorModal(): void {
    this.selectedNewCollabId.set('');
    this.selectedNewCollabRole.set('COLLABORATOR');
    this.collabError.set('');
    this.showAddCollaboratorModal.set(true);
  }

  closeAddCollaboratorModal(): void {
    this.showAddCollaboratorModal.set(false);
    this.collabError.set('');
  }

  confirmAddCollaborator(): void {
    const curTask = this.task();
    const userId = this.selectedNewCollabId();
    const role = this.selectedNewCollabRole();
    if (!curTask || !userId) return;

    this.submittingCollab.set(true);
    this.collabError.set('');

    this.taskService.addAssignee(curTask.id, userId, role).subscribe({
      next: updated => {
        this.task.set(updated);
        this.submittingCollab.set(false);
        this.showAddCollaboratorModal.set(false);
      },
      error: err => {
        this.submittingCollab.set(false);
        this.collabError.set(err?.error?.error || 'Failed to assign collaborator');
      }
    });
  }

  removeCollaborator(userId: string): void {
    const curTask = this.task();
    if (!curTask) return;

    this.taskService.removeAssignee(curTask.id, userId).subscribe({
      next: updated => {
        this.task.set(updated);
      },
      error: err => {
        console.error('Failed to remove collaborator:', err);
      }
    });
  }

  toggleChecklistItem(item: ChecklistItem): void {
    if (!this.task()) return;
    const taskId = this.task()!.id;
    this.taskService.toggleChecklistItem(taskId, item.id).subscribe(updated => {
      const current = this.task()!;
      const list = (current.checklist || []).map(i =>
        i.id === item.id ? { ...i, completed: updated.completed } : i
      );
      this.task.set({ ...current, checklist: list });
    });
  }

  addChecklistItem(): void {
    if (!this.newChecklistText.trim() || !this.task()) return;
    const taskId = this.task()!.id;
    const text = this.newChecklistText.trim();
    this.taskService.addChecklistItem(taskId, text).subscribe(newItem => {
      const current = this.task()!;
      this.task.set({
        ...current,
        checklist: [...(current.checklist || []), newItem]
      });
      this.newChecklistText = '';
    });
  }

  deleteChecklistItem(event: Event, item: ChecklistItem): void {
    event.stopPropagation();
    if (!this.task()) return;
    const taskId = this.task()!.id;
    this.taskService.deleteChecklistItem(taskId, item.id).subscribe(() => {
      const current = this.task()!;
      const list = (current.checklist || []).filter(i => i.id !== item.id);
      this.task.set({ ...current, checklist: list });
    });
  }

  addComment(): void {
    if (!this.newCommentText.trim() || !this.task()) return;
    const taskId = this.task()!.id;
    const text = this.newCommentText.trim();
    this.submittingComment.set(true);
    this.taskService.addComment(taskId, text).subscribe({
      next: (created) => {
        this.comments.update(list => [...list, created]);
        this.newCommentText = '';
        this.submittingComment.set(false);
        setTimeout(() => {
          this.scrollToBottom();
        }, 120);
      },
      error: () => {
        this.submittingComment.set(false);
      }
    });
  }

  scrollToComments(): void {
    const el = document.getElementById('commentsSection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToBottom(): void {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({
        top: mainContent.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  getAvatarColor(name?: string): string {
    if (!name) return '#64748B';
    const colors = [
      '#2563EB', '#0284C7', '#0D9488', '#16A34A',
      '#D97706', '#7C3AED', '#DB2777', '#4F46E5'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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

  submitForReview(): void {
    if (!this.task()) return;
    this.isProcessingAction.set(true);
    const taskId = this.task()!.id;
    this.taskService.updateTaskStatus(taskId, {
      status: 'IN_REVIEW',
      note: 'Task submitted for Super Admin review.'
    }).subscribe({
      next: (updated) => {
        this.task.set(updated);
        this.isProcessingAction.set(false);
        this.showToast('Task submitted for Super Admin review successfully!', 'success');
        this.loadComments(taskId);
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.showToast(err?.error?.error || 'Failed to submit task for review', 'error');
      }
    });
  }

  approveTask(): void {
    if (!this.task()) return;
    if (!this.canDirectApprove()) {
      this.showToast('Only Super Admin can approve and mark tasks as Done.', 'error');
      return;
    }
    this.isProcessingAction.set(true);
    const taskId = this.task()!.id;
    const reviewerName = this.authService.currentUser()?.firstName || 'Super Admin';
    this.taskService.updateTaskStatus(taskId, {
      status: 'DONE',
      note: `Task verified and approved by ${reviewerName} (Super Admin).`
    }).subscribe({
      next: (updated) => {
        this.task.set(updated);
        this.isProcessingAction.set(false);
        this.showToast(`Task "${this.task()!.title}" approved and completed successfully!`, 'success');
        this.loadComments(taskId);
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.showToast(err?.error?.error || 'Failed to approve task', 'error');
      }
    });
  }

  openRequestChangesModal(): void {
    this.changeRequestFeedback = '';
    this.showRequestChangesModal.set(true);
  }

  closeRequestChangesModal(): void {
    this.showRequestChangesModal.set(false);
    this.changeRequestFeedback = '';
  }

  confirmRequestChanges(): void {
    if (!this.task() || !this.changeRequestFeedback.trim()) return;
    this.isProcessingAction.set(true);
    const taskId = this.task()!.id;
    const reviewerName = this.authService.currentUser()?.firstName || 'Super Admin';
    const note = `[Change Request by ${reviewerName}]: ${this.changeRequestFeedback.trim()}`;

    this.taskService.updateTaskStatus(taskId, {
      status: 'IN_PROGRESS',
      note: note
    }).subscribe({
      next: (updated) => {
        this.task.set(updated);
        this.isProcessingAction.set(false);
        this.showRequestChangesModal.set(false);
        this.changeRequestFeedback = '';
        this.showToast('Changes requested. Task returned to In Progress.', 'success');
        this.loadComments(taskId);
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.showToast(err?.error?.error || 'Failed to request changes', 'error');
      }
    });
  }

  recallToInProgress(): void {
    if (!this.task()) return;
    this.isProcessingAction.set(true);
    const taskId = this.task()!.id;
    this.taskService.updateTaskStatus(taskId, {
      status: 'IN_PROGRESS',
      note: 'Task recalled to In Progress by author.'
    }).subscribe({
      next: (updated) => {
        this.task.set(updated);
        this.isProcessingAction.set(false);
        this.showToast('Task recalled to In Progress.', 'success');
        this.loadComments(taskId);
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.showToast(err?.error?.error || 'Failed to recall task', 'error');
      }
    });
  }

  onStatusChange(newStatus: TaskStatus): void {
    if (!this.task()) return;
    if (newStatus === 'DONE' && !this.canDirectApprove()) {
      this.showToast('Approval required: Only Super Admin can mark tasks as Done. Please submit for review.', 'error');
      return;
    }
    this.updateStatus(newStatus);
  }

  updateStatus(newStatus: TaskStatus): void {
    if (!this.task()) return;
    this.taskService.updateTaskStatus(this.task()!.id, { status: newStatus }).subscribe({
      next: updated => {
        this.task.set(updated);
        this.showToast(`Status updated to ${this.fmtStatus(newStatus)}`, 'success');
      },
      error: err => {
        this.showToast(err?.error?.error || 'Failed to update status', 'error');
      }
    });
  }

  formatCommentTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  goBack(): void {
    this.router.navigate(['/tasks/all']);
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

  fmtStatus(s: string): string {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
