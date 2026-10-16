import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  Task, Meeting, Project, Employee,
  CreateTaskRequest, CreateMeetingRequest,
  MeetingType, TaskPriority, TaskStatus
} from '../../../shared/models/index';

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  meetings: Meeting[];
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-task-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- HEADER -->
      <div class="page-header">
        <div class="page-title-group">
          <div class="title-with-badge">
            <h1 class="page-title">Task & Meeting Calendar</h1>
            <span class="role-pill">
              <span class="material-icons">verified_user</span>
              {{ isSuperAdmin() ? 'Super Admin Mode' : (canManageMeetings() ? 'Admin Mode' : 'Employee (Read-Only)') }}
            </span>
          </div>
          <p class="page-subtitle">
            @if (isSuperAdmin()) {
              Click any calendar day to schedule, drag & drop to reschedule, or edit and delete with PostgreSQL audit logs
            } @else if (canManageMeetings()) {
              Drag & drop to reschedule, or click to edit and manage scheduled items
            } @else {
              View company schedules and assigned project deadlines (Read-only for employees)
            }
          </p>
        </div>

        <div class="page-actions">
          <div class="month-nav">
            <button class="icon-btn" (click)="prevMonth()" title="Previous Month">
              <span class="material-icons">chevron_left</span>
            </button>
            <span class="current-month-label">{{ currentMonthName() }} {{ currentYear() }}</span>
            <button class="icon-btn" (click)="nextMonth()" title="Next Month">
              <span class="material-icons">chevron_right</span>
            </button>
            <button class="btn btn-outline btn-xs" (click)="goToToday()">Today</button>
          </div>

          @if (isSuperAdmin()) {
            <button class="btn btn-primary btn-sm" (click)="openQuickModalForToday()">
              <span class="material-icons">add</span> New Schedule
            </button>
          }

          <a routerLink="/tasks/board" class="btn btn-outline btn-sm">
            <span class="material-icons">view_kanban</span> Board
          </a>
        </div>
      </div>

      <!-- TOAST BANNER -->
      @if (toastMessage()) {
        <div class="toast-banner" [class]="'toast-' + toastType()">
          <span class="material-icons">{{ toastType() === 'success' ? 'check_circle' : 'error' }}</span>
          <span>{{ toastMessage() }}</span>
          <button class="toast-close" (click)="toastMessage.set(null)">
            <span class="material-icons">close</span>
          </button>
        </div>
      }

      <!-- CALENDAR GRID -->
      <div class="calendar-card card">
        <div class="calendar-legend">
          <div class="legend-item"><span class="legend-dot task-dot"></span> Tasks</div>
          <div class="legend-item"><span class="legend-dot meeting-dot"></span> Scheduled Meetings</div>
          <div class="legend-tip">
            @if (canRescheduleOrEdit()) {
              <span class="material-icons">drag_indicator</span> <strong>Drag & Drop</strong> any item to reschedule · Click to edit/delete
            } @else {
              <span class="material-icons">lock</span> <strong>Read-Only</strong> · Only Super Admin can create tasks or schedule meetings
            }
          </div>
        </div>

        <div class="calendar-weekdays">
          <div class="weekday">Sun</div>
          <div class="weekday">Mon</div>
          <div class="weekday">Tue</div>
          <div class="weekday">Wed</div>
          <div class="weekday">Thu</div>
          <div class="weekday">Fri</div>
          <div class="weekday">Sat</div>
        </div>

        <div class="calendar-grid">
          @for (day of calendarDays(); track day.dateStr) {
            <div
              class="calendar-cell"
              [class.not-current-month]="!day.isCurrentMonth"
              [class.today]="day.isToday"
              [class.drag-target]="dragOverDate() === day.dateStr"
              (click)="onDateClick(day.date)"
              (dragover)="onCellDragOver($event, day.dateStr)"
              (dragleave)="onCellDragLeave(day.dateStr)"
              (drop)="onCellDrop($event, day.dateStr)"
              [title]="'Click to schedule on ' + day.dateStr"
            >
              <div class="cell-header">
                <span class="day-number" [class.today-badge]="day.isToday">{{ day.dayNumber }}</span>

                <div class="header-right">
                  @if (day.tasks.length + day.meetings.length > 0) {
                    <span class="cell-counter" title="Total scheduled items">
                      {{ day.tasks.length + day.meetings.length }}
                    </span>
                  }
                  @if (isSuperAdmin()) {
                    <button
                      class="add-cell-btn"
                      (click)="$event.stopPropagation(); onDateClick(day.date)"
                      title="Quick schedule on {{ day.dateStr }}"
                    >
                      <span class="material-icons">add</span>
                    </button>
                  }
                </div>
              </div>

              <!-- ITEMS LIST -->
              <div class="cell-content-list">
                <!-- MEETINGS -->
                @for (meeting of day.meetings; track meeting.id) {
                  <div
                    class="cal-item meeting-item"
                    [attr.draggable]="canManageMeetings() ? true : null"
                    (dragstart)="canManageMeetings() ? onDragStart($event, meeting, 'MEETING') : $event.preventDefault()"
                    (dragend)="onDragEnd()"
                    (click)="$event.stopPropagation(); openMeetingDetails(meeting)"
                    [title]="'Meeting: ' + meeting.title + ' (' + meeting.startTime + ' - ' + meeting.endTime + ')'"
                  >
                    @if (canManageMeetings()) {
                      <span class="material-icons drag-handle">drag_indicator</span>
                    }
                    <span class="material-icons item-icon">videocam</span>
                    <span class="item-time">{{ meeting.startTime }}</span>
                    <span class="item-title">{{ meeting.title }}</span>

                    @if (canManageMeetings()) {
                      <div class="item-hover-actions">
                        <button
                          class="item-act-btn edit-act"
                          (click)="$event.stopPropagation(); openMeetingEdit(meeting)"
                          title="Edit Meeting"
                        >
                          <span class="material-icons">edit</span>
                        </button>
                        <button
                          class="item-act-btn del-act"
                          (click)="$event.stopPropagation(); promptDelete('MEETING', meeting.id, meeting.title)"
                          title="Delete Meeting"
                        >
                          <span class="material-icons">delete</span>
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- TASKS -->
                @for (task of day.tasks; track task.id) {
                  <div
                    class="cal-item task-item"
                    [attr.draggable]="canManageTasks() ? true : null"
                    (dragstart)="canManageTasks() ? onDragStart($event, task, 'TASK') : $event.preventDefault()"
                    (dragend)="onDragEnd()"
                    (click)="$event.stopPropagation(); openTaskDetails(task)"
                    [class]="'priority-' + task.priority.toLowerCase()"
                    [title]="'Task: ' + task.title + ' (' + task.status + ')'"
                  >
                    @if (canManageTasks()) {
                      <span class="material-icons drag-handle">drag_indicator</span>
                    }
                    <span class="cal-task-dot" [class]="'dot-' + task.status"></span>
                    <span class="item-title">{{ task.title }}</span>

                    @if (canManageTasks()) {
                      <div class="item-hover-actions">
                        <button
                          class="item-act-btn edit-act"
                          (click)="$event.stopPropagation(); openTaskEdit(task)"
                          title="Edit Task"
                        >
                          <span class="material-icons">edit</span>
                        </button>
                        <button
                          class="item-act-btn del-act"
                          (click)="$event.stopPropagation(); promptDelete('TASK', task.id, task.title)"
                          title="Delete Task"
                        >
                          <span class="material-icons">delete</span>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- DROP HINT OVERLAY -->
              @if (dragOverDate() === day.dateStr) {
                <div class="drop-hint-overlay">
                  <span class="material-icons">move_to_inbox</span>
                  <span>Drop to Reschedule</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- UPCOMING DEADLINES & MEETINGS SUMMARY -->
      <div class="upcoming-summary-grid">
        <div class="summary-col">
          <div class="section-header-row">
            <h3 class="section-title">
              <span class="material-icons">assignment_late</span> Upcoming Tasks & Deadlines (7 Days)
            </h3>
            <span class="count-badge">{{ upcomingDeadlines().length }}</span>
          </div>

          <div class="deadlines-list">
            @for (task of upcomingDeadlines(); track task.id) {
              <div class="summary-item-card card" (click)="openTaskDetails(task)">
                <div class="item-left">
                  <span class="badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span>
                  <span class="task-title-text">{{ task.title }}</span>
                </div>
                <div class="item-right">
                  <span class="project-tag">{{ task.projectCode || 'General' }}</span>
                  <span class="due-tag"><span class="material-icons">event</span> {{ task.dueDate }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-state">No upcoming deadlines within the next 7 days.</p>
            }
          </div>
        </div>

        <div class="summary-col">
          <div class="section-header-row">
            <h3 class="section-title">
              <span class="material-icons">groups</span> Scheduled Meetings
            </h3>
            <span class="count-badge">{{ upcomingMeetings().length }}</span>
          </div>

          <div class="deadlines-list">
            @for (meeting of upcomingMeetings(); track meeting.id) {
              <div class="summary-item-card card" (click)="openMeetingDetails(meeting)">
                <div class="item-left">
                  <span class="meeting-type-pill">{{ meeting.type }}</span>
                  <span class="task-title-text">{{ meeting.title }}</span>
                </div>
                <div class="item-right">
                  <span class="time-tag"><span class="material-icons">schedule</span> {{ meeting.date }} · {{ meeting.startTime }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-state">No upcoming meetings scheduled.</p>
            }
          </div>
        </div>
      </div>

      <!-- QUICK ACTION / CREATION MODAL -->
      @if (showQuickModal()) {
        <div class="modal-overlay" (click)="closeQuickModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <!-- MODAL HEADER -->
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="date-badge">
                  <span class="material-icons">calendar_today</span>
                  <span>{{ selectedDateFormatted() }}</span>
                </div>
                <h2 class="modal-heading">Calendar Quick Action</h2>
              </div>
              <button class="close-btn" (click)="closeQuickModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <!-- TABS SWITCHER -->
            <div class="modal-tabs">
              <button
                class="tab-btn"
                [class.active]="activeTab() === 'TASK'"
                (click)="activeTab.set('TASK')"
              >
                <span class="material-icons">add_task</span>
                <span>Create Task</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab() === 'MEETING'"
                (click)="activeTab.set('MEETING')"
              >
                <span class="material-icons">event</span>
                <span>Schedule Meeting</span>
              </button>
            </div>

            <!-- TAB CONTENT: CREATE TASK -->
            @if (activeTab() === 'TASK') {
              <form [formGroup]="taskForm" (ngSubmit)="submitTask()" class="modal-form">
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label for="task-title">Task Title <span class="required">*</span></label>
                    <input
                      id="task-title"
                      formControlName="title"
                      type="text"
                      class="form-control"
                      placeholder="e.g. Implement security headers and CORS policy"
                    />
                  </div>

                  <div class="form-group">
                    <label for="task-project">Project</label>
                    <select id="task-project" formControlName="projectId" class="form-control">
                      <option value="">No Project (General)</option>
                      @for (p of projects(); track p.id) {
                        <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                      }
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="task-assignee">Assignee</label>
                    <select id="task-assignee" formControlName="assigneeId" class="form-control">
                      <option value="">Unassigned</option>
                      @for (emp of employees(); track emp.id) {
                        <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation }})</option>
                      }
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="task-priority">Priority</label>
                    <select id="task-priority" formControlName="priority" class="form-control">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="task-status">Status</label>
                    <select id="task-status" formControlName="status" class="form-control">
                      <option value="BACKLOG">Backlog</option>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="task-due-date">Due Date <span class="required">*</span></label>
                    <input
                      id="task-due-date"
                      type="date"
                      formControlName="dueDate"
                      class="form-control"
                    />
                  </div>

                  <div class="form-group">
                    <label for="task-hours">Estimated Hours</label>
                    <input
                      id="task-hours"
                      type="number"
                      step="0.5"
                      min="0"
                      formControlName="estimatedHours"
                      class="form-control"
                    />
                  </div>

                  <div class="form-group full-width">
                    <label for="task-desc">Description</label>
                    <textarea
                      id="task-desc"
                      rows="3"
                      formControlName="description"
                      class="form-control"
                      placeholder="Detailed requirements, checklist or test criteria..."
                    ></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-outline btn-sm" (click)="closeQuickModal()">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary btn-sm"
                    [disabled]="taskForm.invalid || isSubmitting()"
                  >
                    @if (isSubmitting()) {
                      <span class="spinner-sm"></span> Creating...
                    } @else {
                      <span class="material-icons">add_task</span> Create Task & Log
                    }
                  </button>
                </div>
              </form>
            }

            <!-- TAB CONTENT: SCHEDULE MEETING -->
            @if (activeTab() === 'MEETING') {
              <form [formGroup]="meetingForm" (ngSubmit)="submitMeeting()" class="modal-form">
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label for="meeting-title">Meeting Title <span class="required">*</span></label>
                    <input
                      id="meeting-title"
                      formControlName="title"
                      type="text"
                      class="form-control"
                      placeholder="e.g. Sprint Architecture & Roadmap Review"
                    />
                  </div>

                  <div class="form-group">
                    <label for="meeting-type">Meeting Type</label>
                    <select id="meeting-type" formControlName="type" class="form-control">
                      <option value="STANDUP">Daily Standup</option>
                      <option value="PLANNING">Sprint Planning</option>
                      <option value="REVIEW">Sprint Review / Demo</option>
                      <option value="RETROSPECTIVE">Retrospective</option>
                      <option value="CLIENT">Client Meeting</option>
                      <option value="ONE_ON_ONE">1-on-1 Sync</option>
                      <option value="OTHER">Other / General</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="meeting-project">Project (Optional)</label>
                    <select id="meeting-project" formControlName="projectId" class="form-control">
                      <option value="">General (No Project)</option>
                      @for (p of projects(); track p.id) {
                        <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                      }
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="meeting-date">Date <span class="required">*</span></label>
                    <input
                      id="meeting-date"
                      type="date"
                      formControlName="date"
                      class="form-control"
                    />
                  </div>

                  <div class="form-group time-range-group">
                    <label>Time Window <span class="required">*</span></label>
                    <div class="time-inputs">
                      <input type="time" formControlName="startTime" class="form-control" />
                      <span class="time-sep">to</span>
                      <input type="time" formControlName="endTime" class="form-control" />
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label for="meeting-url">Meeting URL / Room Location</label>
                    <div class="input-with-icon">
                      <span class="material-icons">link</span>
                      <input
                        id="meeting-url"
                        type="text"
                        formControlName="meetingUrl"
                        class="form-control"
                        placeholder="https://meet.google.com/abc-defg-hij or Conference Room A"
                      />
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label>Attendees / Participants</label>
                    <div class="attendees-selector">
                      @for (emp of employees(); track emp.id) {
                        <label class="attendee-checkbox">
                          <input
                            type="checkbox"
                            [checked]="isAttendeeSelected(emp.id)"
                            (change)="toggleAttendee(emp.id)"
                          />
                          <span class="attendee-name">{{ emp.firstName }} {{ emp.lastName }}</span>
                        </label>
                      }
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label for="meeting-agenda">Agenda / Notes</label>
                    <textarea
                      id="meeting-agenda"
                      rows="3"
                      formControlName="agenda"
                      class="form-control"
                      placeholder="Outline topics, expected outcomes, or shared document links..."
                    ></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-outline btn-sm" (click)="closeQuickModal()">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary btn-sm"
                    [disabled]="meetingForm.invalid || isSubmitting()"
                  >
                    @if (isSubmitting()) {
                      <span class="spinner-sm"></span> Scheduling...
                    } @else {
                      <span class="material-icons">event</span> Schedule Meeting & Log
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      }

      <!-- TASK DETAILS / EDIT MODAL -->
      @if (showTaskModal() && selectedTask()) {
        <div class="modal-overlay" (click)="showTaskModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="badge" [class]="getPriorityClass(selectedTask()!.priority)">
                  {{ selectedTask()!.priority }} PRIORITY
                </span>
                <h2 class="modal-heading">{{ isEditingTask() ? 'Edit Task' : selectedTask()!.title }}</h2>
              </div>
              <button class="close-btn" (click)="showTaskModal.set(false)">
                <span class="material-icons">close</span>
              </button>
            </div>

            @if (!isEditingTask()) {
              <!-- VIEW MODE -->
              <div class="detail-body">
                <div class="detail-row">
                  <span class="material-icons detail-icon">info</span>
                  <div>
                    <div class="detail-label">Status</div>
                    <div class="detail-val">
                      <span class="status-pill" [class]="'pill-' + selectedTask()!.status">
                        {{ selectedTask()!.status }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="detail-row">
                  <span class="material-icons detail-icon">event</span>
                  <div>
                    <div class="detail-label">Due Date</div>
                    <div class="detail-val">{{ selectedTask()!.dueDate || 'No due date set' }}</div>
                  </div>
                </div>

                @if (selectedTask()!.projectName) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">folder</span>
                    <div>
                      <div class="detail-label">Project</div>
                      <div class="detail-val">{{ selectedTask()!.projectName }} ({{ selectedTask()!.projectCode }})</div>
                    </div>
                  </div>
                }

                @if (selectedTask()!.assigneeName) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">person</span>
                    <div>
                      <div class="detail-label">Assignee</div>
                      <div class="detail-val">{{ selectedTask()!.assigneeName }}</div>
                    </div>
                  </div>
                }

                @if (selectedTask()!.estimatedHours) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">schedule</span>
                    <div>
                      <div class="detail-label">Estimated Hours</div>
                      <div class="detail-val">{{ selectedTask()!.estimatedHours }} hrs</div>
                    </div>
                  </div>
                }

                @if (selectedTask()!.description) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">description</span>
                    <div>
                      <div class="detail-label">Description</div>
                      <div class="detail-val agenda-box">{{ selectedTask()!.description }}</div>
                    </div>
                  </div>
                }
              </div>

              <div class="modal-footer space-between">
                @if (canManageTasks()) {
                  <button
                    type="button"
                    class="btn btn-danger-outline btn-sm"
                    (click)="promptDelete('TASK', selectedTask()!.id, selectedTask()!.title)"
                  >
                    <span class="material-icons">delete</span> Delete Task
                  </button>
                } @else {
                  <div></div>
                }
                <div class="footer-actions-right">
                  <button type="button" class="btn btn-outline btn-sm" (click)="showTaskModal.set(false)">
                    Close
                  </button>
                  @if (canManageTasks()) {
                    <button type="button" class="btn btn-primary btn-sm" (click)="startEditingTask()">
                      <span class="material-icons">edit</span> Edit Task
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- EDIT MODE -->
              <form [formGroup]="editTaskForm" (ngSubmit)="saveTaskEdit()" class="modal-form">
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label>Title <span class="required">*</span></label>
                    <input type="text" formControlName="title" class="form-control" />
                  </div>

                  <div class="form-group">
                    <label>Status</label>
                    <select formControlName="status" class="form-control">
                      <option value="BACKLOG">Backlog</option>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Priority</label>
                    <select formControlName="priority" class="form-control">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Due Date <span class="required">*</span></label>
                    <input type="date" formControlName="dueDate" class="form-control" />
                  </div>

                  <div class="form-group">
                    <label>Estimated Hours</label>
                    <input type="number" step="0.5" formControlName="estimatedHours" class="form-control" />
                  </div>

                  <div class="form-group">
                    <label>Assignee</label>
                    <select formControlName="assigneeId" class="form-control">
                      <option value="">Unassigned</option>
                      @for (emp of employees(); track emp.id) {
                        <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
                      }
                    </select>
                  </div>

                  <div class="form-group full-width">
                    <label>Description</label>
                    <textarea rows="3" formControlName="description" class="form-control"></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-outline btn-sm" (click)="isEditingTask.set(false)">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="editTaskForm.invalid || isSubmitting()">
                    @if (isSubmitting()) {
                      <span class="spinner-sm"></span> Saving...
                    } @else {
                      <span class="material-icons">save</span> Save Changes
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      }

      <!-- MEETING DETAILS / EDIT MODAL -->
      @if (showMeetingModal() && selectedMeeting()) {
        <div class="modal-overlay" (click)="showMeetingModal.set(false)">
          <div class="modal-card meeting-detail-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="meeting-type-badge">{{ selectedMeeting()!.type }}</span>
                <h2 class="modal-heading">{{ isEditingMeeting() ? 'Edit Meeting' : selectedMeeting()!.title }}</h2>
              </div>
              <button class="close-btn" (click)="showMeetingModal.set(false)">
                <span class="material-icons">close</span>
              </button>
            </div>

            @if (!isEditingMeeting()) {
              <!-- VIEW MODE -->
              <div class="meeting-detail-body">
                <div class="detail-row">
                  <span class="material-icons detail-icon">event</span>
                  <div>
                    <div class="detail-label">Date & Time</div>
                    <div class="detail-val">
                      {{ selectedMeeting()!.date }} · {{ selectedMeeting()!.startTime }} - {{ selectedMeeting()!.endTime }}
                    </div>
                  </div>
                </div>

                @if (selectedMeeting()!.projectName) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">folder</span>
                    <div>
                      <div class="detail-label">Project</div>
                      <div class="detail-val">{{ selectedMeeting()!.projectName }}</div>
                    </div>
                  </div>
                }

                @if (selectedMeeting()!.meetingUrl) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">videocam</span>
                    <div>
                      <div class="detail-label">Meeting URL</div>
                      <a [href]="selectedMeeting()!.meetingUrl" target="_blank" class="detail-link">
                        {{ selectedMeeting()!.meetingUrl }}
                        <span class="material-icons link-external">open_in_new</span>
                      </a>
                    </div>
                  </div>
                }

                @if (selectedMeeting()!.location) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">place</span>
                    <div>
                      <div class="detail-label">Location</div>
                      <div class="detail-val">{{ selectedMeeting()!.location }}</div>
                    </div>
                  </div>
                }

                @if (selectedMeeting()!.agenda) {
                  <div class="detail-row">
                    <span class="material-icons detail-icon">description</span>
                    <div>
                      <div class="detail-label">Agenda / Objectives</div>
                      <div class="detail-val agenda-box">{{ selectedMeeting()!.agenda }}</div>
                    </div>
                  </div>
                }

                <div class="detail-row">
                  <span class="material-icons detail-icon">people</span>
                  <div>
                    <div class="detail-label">Participants ({{ selectedMeeting()!.participants?.length || 0 }})</div>
                    <div class="participants-pills">
                      @for (p of selectedMeeting()!.participants; track p.userId) {
                        <span class="participant-pill">{{ p.userName }}</span>
                      } @empty {
                        <span class="text-muted">No specific participants attached</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer space-between">
                @if (canManageMeetings()) {
                  <button
                    type="button"
                    class="btn btn-danger-outline btn-sm"
                    (click)="promptDelete('MEETING', selectedMeeting()!.id, selectedMeeting()!.title)"
                  >
                    <span class="material-icons">delete</span> Delete Meeting
                  </button>
                } @else {
                  <div></div>
                }
                <div class="footer-actions-right">
                  <button class="btn btn-outline btn-sm" (click)="showMeetingModal.set(false)">
                    Close
                  </button>
                  @if (canManageMeetings()) {
                    <button class="btn btn-primary btn-sm" (click)="startEditingMeeting()">
                      <span class="material-icons">edit</span> Edit Meeting
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- EDIT MODE -->
              <form [formGroup]="editMeetingForm" (ngSubmit)="saveMeetingEdit()" class="modal-form">
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label>Title <span class="required">*</span></label>
                    <input type="text" formControlName="title" class="form-control" />
                  </div>

                  <div class="form-group">
                    <label>Meeting Type</label>
                    <select formControlName="type" class="form-control">
                      <option value="STANDUP">Daily Standup</option>
                      <option value="PLANNING">Sprint Planning</option>
                      <option value="REVIEW">Sprint Review</option>
                      <option value="RETROSPECTIVE">Retrospective</option>
                      <option value="CLIENT">Client Meeting</option>
                      <option value="ONE_ON_ONE">1-on-1 Sync</option>
                      <option value="OTHER">Other / General</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Date <span class="required">*</span></label>
                    <input type="date" formControlName="date" class="form-control" />
                  </div>

                  <div class="form-group time-range-group">
                    <label>Time Window <span class="required">*</span></label>
                    <div class="time-inputs">
                      <input type="time" formControlName="startTime" class="form-control" />
                      <span class="time-sep">to</span>
                      <input type="time" formControlName="endTime" class="form-control" />
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label>Meeting URL / Room</label>
                    <input type="text" formControlName="meetingUrl" class="form-control" />
                  </div>

                  <div class="form-group full-width">
                    <label>Agenda / Description</label>
                    <textarea rows="3" formControlName="agenda" class="form-control"></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-outline btn-sm" (click)="isEditingMeeting.set(false)">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="editMeetingForm.invalid || isSubmitting()">
                    @if (isSubmitting()) {
                      <span class="spinner-sm"></span> Saving...
                    } @else {
                      <span class="material-icons">save</span> Save Changes
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      }

      <!-- DELETE CONFIRMATION MODAL -->
      @if (deleteTarget()) {
        <div class="modal-overlay" (click)="deleteTarget.set(null)">
          <div class="modal-card delete-confirm-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="material-icons text-danger-icon">warning</span>
                <h2 class="modal-heading">Confirm Permanent Deletion</h2>
              </div>
              <button class="close-btn" (click)="deleteTarget.set(null)">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="delete-body">
              <p>Are you sure you want to permanently delete this {{ deleteTarget()!.type.toLowerCase() }}?</p>
              <div class="delete-target-preview">
                <strong>"{{ deleteTarget()!.title }}"</strong>
              </div>
              <p class="delete-note">
                <span class="material-icons">info</span>
                This action will be immediately recorded in the PostgreSQL audit log.
              </p>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline btn-sm" (click)="deleteTarget.set(null)">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                [disabled]="isSubmitting()"
                (click)="confirmDelete()"
              >
                @if (isSubmitting()) {
                  <span class="spinner-sm"></span> Deleting...
                } @else {
                  <span class="material-icons">delete_forever</span> Confirm Delete
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;

      .material-icons {
        font-size: 14px;
      }
    }

    .month-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 4px 8px;

      .current-month-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-navy);
        min-width: 130px;
        text-align: center;
      }
    }

    /* TOAST BANNER */
    .toast-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 18px;
      font-size: 13px;
      font-weight: 600;
      animation: fadeIn 0.2s ease-out;

      &.toast-success {
        background: #ECFDF5;
        color: #065F46;
        border: 1px solid #A7F3D0;
      }

      &.toast-error {
        background: #FEF2F2;
        color: #991B1B;
        border: 1px solid #FECACA;
      }

      .toast-close {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        &:hover { opacity: 1; }
      }
    }

    /* LEGEND */
    .calendar-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);
      font-size: 12px;
      color: var(--color-text-secondary);

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
      }

      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.task-dot { background: #2563EB; }
        &.meeting-dot { background: #D97706; }
      }

      .legend-tip {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 4px;
        color: #475569;
        font-weight: 500;

        .material-icons {
          font-size: 16px;
          color: #2563EB;
        }
      }
    }

    .calendar-card {
      padding: 0;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #F1F5F9;
      border-bottom: 1px solid var(--color-border);
      text-align: center;

      .weekday {
        padding: 10px;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-auto-rows: minmax(130px, 1fr);

      .calendar-cell {
        border-right: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: white;
        cursor: pointer;
        position: relative;
        transition: background 0.15s ease, border-color 0.15s ease;

        &:nth-child(7n) {
          border-right: none;
        }

        &:hover {
          background: #F8FAFC;

          .add-cell-btn {
            opacity: 1;
            transform: scale(1);
          }
        }

        &.drag-target {
          background: #EFF6FF !important;
          border: 2px dashed #2563EB !important;
          box-shadow: inset 0 0 12px rgba(37, 99, 235, 0.15);
        }

        &.not-current-month {
          background: #FAFAFA;
          opacity: 0.55;
        }

        &.today {
          background: #EFF6FF;
          border-top: 2px solid #2563EB;
        }
      }
    }

    .drop-hint-overlay {
      position: absolute;
      inset: 0;
      background: rgba(239, 246, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #1D4ED8;
      pointer-events: none;
      z-index: 5;

      .material-icons {
        font-size: 24px;
      }
    }

    .cell-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .day-number {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;

        &.today-badge {
          background: var(--color-blue);
          color: white;
          font-weight: 700;
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .cell-counter {
        font-size: 10px;
        font-weight: 700;
        background: #E2E8F0;
        color: var(--color-text-secondary);
        border-radius: 999px;
        padding: 1px 6px;
      }

      .add-cell-btn {
        opacity: 0;
        transform: scale(0.85);
        transition: all 0.15s ease;
        background: #EEF2FF;
        border: 1px solid #C7D2FE;
        color: #4F46E5;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;

        .material-icons {
          font-size: 14px;
        }

        &:hover {
          background: #4F46E5;
          color: white;
        }
      }
    }

    .cell-content-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      overflow: hidden;
    }

    .cal-item {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-primary);
      text-decoration: none;
      background: white;
      border: 1px solid var(--color-border);
      transition: all 0.15s ease;
      cursor: grab;
      position: relative;

      &:active {
        cursor: grabbing;
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);

        .item-hover-actions {
          display: flex;
        }
      }

      .drag-handle {
        font-size: 12px;
        color: #94A3B8;
        cursor: grab;
        margin-right: -2px;
      }

      .item-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .item-hover-actions {
        display: none;
        align-items: center;
        gap: 2px;
        position: absolute;
        right: 4px;
        background: white;
        padding: 1px 2px;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);

        .item-act-btn {
          border: none;
          background: none;
          padding: 2px;
          cursor: pointer;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;

          .material-icons {
            font-size: 13px;
          }

          &.edit-act:hover {
            background: #EFF6FF;
            color: #2563EB;
          }

          &.del-act:hover {
            background: #FEE2E2;
            color: #DC2626;
          }
        }
      }
    }

    .meeting-item {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #92400E;

      .item-icon {
        font-size: 13px;
        color: #D97706;
      }

      .item-time {
        font-size: 10px;
        font-weight: 700;
        color: #B45309;
        flex-shrink: 0;
      }

      &:hover {
        border-color: #D97706;
        color: #78350F;
      }
    }

    .task-item {
      &:hover {
        border-color: var(--color-blue);
        color: var(--color-blue);
      }

      .cal-task-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;

        &.dot-BACKLOG { background: #CBD5E1; }
        &.dot-TODO { background: #94A3B8; }
        &.dot-IN_PROGRESS { background: #2563EB; }
        &.dot-IN_REVIEW { background: #6366F1; }
        &.dot-BLOCKED { background: #DC2626; }
        &.dot-DONE { background: #16A34A; }
      }
    }

    /* SUMMARY SECTIONS */
    .upcoming-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 16px;
    }

    .section-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .section-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-navy);
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;

        .material-icons {
          font-size: 18px;
          color: #2563EB;
        }
      }

      .count-badge {
        font-size: 11px;
        font-weight: 700;
        background: #E2E8F0;
        color: #475569;
        border-radius: 999px;
        padding: 1px 8px;
      }
    }

    .deadlines-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .summary-item-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .item-left {
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;

        .task-title-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-navy);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meeting-type-pill {
          font-size: 10px;
          font-weight: 700;
          background: #FEF3C7;
          color: #92400E;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .item-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        .project-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-blue);
          background: var(--color-light-blue);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .due-tag, .time-tag {
          font-size: 11px;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          gap: 3px;

          .material-icons {
            font-size: 14px;
          }
        }
      }
    }

    .empty-state {
      font-size: 13px;
      padding: 16px;
      background: #F8FAFC;
      border-radius: 8px;
      text-align: center;
    }

    /* MODAL STYLES */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .date-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;
        color: #2563EB;
        background: #EFF6FF;
        padding: 3px 8px;
        border-radius: 999px;
        margin-bottom: 6px;

        .material-icons {
          font-size: 13px;
        }
      }

      .modal-heading {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0;
      }

      .close-btn {
        background: none;
        border: none;
        color: #94A3B8;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;

        &:hover {
          color: #1E293B;
          background: #F1F5F9;
        }
      }
    }

    .modal-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border);
      background: #F8FAFC;
      padding: 6px 12px;
      gap: 8px;

      .tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        background: transparent;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        .material-icons {
          font-size: 18px;
        }

        &.active {
          background: white;
          color: #2563EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        &:hover:not(.active) {
          background: #F1F5F9;
          color: var(--color-navy);
        }
      }
    }

    .modal-form {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;

      .full-width {
        grid-column: 1 / -1;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-navy);

        .required {
          color: #DC2626;
        }
      }

      .form-control {
        padding: 8px 12px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        font-size: 13px;
        outline: none;
        transition: border 0.15s ease;

        &:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
      }

      .input-with-icon {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 0 10px;
        background: white;

        .material-icons {
          color: #94A3B8;
          font-size: 18px;
        }

        .form-control {
          border: none;
          padding: 8px 0;
          flex: 1;

          &:focus {
            box-shadow: none;
          }
        }
      }
    }

    .time-inputs {
      display: flex;
      align-items: center;
      gap: 8px;

      .time-sep {
        font-size: 12px;
        color: var(--color-text-secondary);
        font-weight: 600;
      }
    }

    .attendees-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 120px;
      overflow-y: auto;
      padding: 8px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: #F8FAFC;

      .attendee-checkbox {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        background: white;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #E2E8F0;
        cursor: pointer;

        input {
          cursor: pointer;
        }
      }
    }

    .modal-footer {
      padding: 16px 24px;
      background: #F8FAFC;
      border-top: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-bottom-left-radius: 14px;
      border-bottom-right-radius: 14px;

      &.space-between {
        justify-content: space-between;
      }

      .footer-actions-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }
    }

    /* DETAILS VIEW BODY */
    .detail-body, .meeting-detail-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      .detail-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .detail-icon {
          color: #2563EB;
          font-size: 20px;
          margin-top: 2px;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .detail-val {
          font-size: 13px;
          color: var(--color-navy);
          font-weight: 500;
        }

        .agenda-box {
          background: #F8FAFC;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          white-space: pre-line;
          line-height: 1.5;
        }

        .status-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;

          &.pill-BACKLOG { background: #E2E8F0; color: #475569; }
          &.pill-TODO { background: #EEF2FF; color: #4338CA; }
          &.pill-IN_PROGRESS { background: #DBEAFE; color: #1D4ED8; }
          &.pill-IN_REVIEW { background: #EDE9FE; color: #6D28D9; }
          &.pill-DONE { background: #DCFCE7; color: #15803D; }
          &.pill-BLOCKED { background: #FEE2E2; color: #B91C1C; }
        }

        .detail-link {
          font-size: 13px;
          color: #2563EB;
          font-weight: 600;
          text-decoration: underline;
          display: inline-flex;
          align-items: center;
          gap: 4px;

          .link-external {
            font-size: 14px;
          }
        }

        .participants-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 4px;

          .participant-pill {
            font-size: 11px;
            background: #EFF6FF;
            color: #1E40AF;
            padding: 2px 8px;
            border-radius: 999px;
            font-weight: 600;
          }
        }
      }
    }

    .btn-danger-outline {
      background: white;
      border: 1px solid #FECACA;
      color: #DC2626;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;

      .material-icons {
        font-size: 16px;
      }

      &:hover {
        background: #FEE2E2;
        border-color: #DC2626;
      }
    }

    .btn-danger {
      background: #DC2626;
      border: 1px solid #B91C1C;
      color: white;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;

      &:hover {
        background: #B91C1C;
      }
    }

    /* DELETE MODAL */
    .delete-confirm-card {
      max-width: 480px;

      .text-danger-icon {
        color: #DC2626;
        font-size: 24px;
      }

      .delete-body {
        padding: 20px 24px;
        font-size: 13px;
        color: var(--color-navy);

        .delete-target-preview {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          padding: 10px 14px;
          border-radius: 6px;
          margin: 12px 0;
          color: #991B1B;
          font-size: 14px;
        }

        .delete-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 12px;

          .material-icons {
            font-size: 16px;
            color: #2563EB;
          }
        }
      }
    }

    .spinner-sm {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .calendar-grid .calendar-cell {
        min-height: 80px;
        padding: 4px;
      }
      .upcoming-summary-grid {
        grid-template-columns: 1fr;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TaskCalendarComponent implements OnInit {
  private taskService = inject(TaskService);
  private meetingService = inject(MeetingService);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentDate = signal(new Date(2026, 9, 1)); // October 2026
  tasks = signal<Task[]>([]);
  meetings = signal<Meeting[]>([]);
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);

  isSuperAdmin = computed(() => {
    return this.authService.currentUser()?.role === 'SUPER_ADMIN';
  });

  canManageMeetings = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  canManageTasks = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  canRescheduleOrEdit = computed(() => {
    return this.canManageMeetings() || this.canManageTasks();
  });

  // Modal State
  showQuickModal = signal(false);
  activeTab = signal<'TASK' | 'MEETING'>('TASK');
  selectedDateStr = signal<string>('');
  selectedDateFormatted = signal<string>('');

  // Task Details & Edit
  showTaskModal = signal(false);
  selectedTask = signal<Task | null>(null);
  isEditingTask = signal(false);

  // Meeting Details & Edit
  showMeetingModal = signal(false);
  selectedMeeting = signal<Meeting | null>(null);
  isEditingMeeting = signal(false);

  // Drag and drop state
  draggedItem = signal<{ type: 'TASK' | 'MEETING'; task?: Task; meeting?: Meeting } | null>(null);
  dragOverDate = signal<string | null>(null);

  // Delete target modal
  deleteTarget = signal<{ type: 'TASK' | 'MEETING'; id: string; title: string } | null>(null);

  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  currentMonthName = computed(() => this.monthNames[this.currentDate().getMonth()]);
  currentYear = computed(() => this.currentDate().getFullYear());

  // Reactive Forms
  taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    projectId: [''],
    assigneeId: [''],
    priority: ['MEDIUM' as TaskPriority, Validators.required],
    status: ['TODO' as TaskStatus, Validators.required],
    dueDate: ['', Validators.required],
    estimatedHours: [4],
    description: ['']
  });

  editTaskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    assigneeId: [''],
    priority: ['MEDIUM' as TaskPriority, Validators.required],
    status: ['TODO' as TaskStatus, Validators.required],
    dueDate: ['', Validators.required],
    estimatedHours: [4],
    description: ['']
  });

  meetingForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['PLANNING' as MeetingType, Validators.required],
    projectId: [''],
    date: ['', Validators.required],
    startTime: ['10:00', Validators.required],
    endTime: ['11:00', Validators.required],
    meetingUrl: [''],
    agenda: [''],
    participantIds: [[] as string[]]
  });

  editMeetingForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['PLANNING' as MeetingType, Validators.required],
    date: ['', Validators.required],
    startTime: ['10:00', Validators.required],
    endTime: ['11:00', Validators.required],
    meetingUrl: [''],
    agenda: ['']
  });

  ngOnInit(): void {
    this.loadCalendarData();
    this.loadSelectOptions();
  }

  loadCalendarData(): void {
    this.taskService.getTasks({ limit: 100 }).subscribe(res => {
      this.tasks.set(res.data);
    });

    this.meetingService.getMeetings({ limit: 100 }).subscribe(res => {
      this.meetings.set(res.data);
    });
  }

  loadSelectOptions(): void {
    this.projectService.getProjects({ limit: 50 }).subscribe(res => {
      this.projects.set(res.data);
    });

    this.employeeService.employees$.subscribe(list => {
      this.employees.set(list);
    });
  }

  calendarDays = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayIndex = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = lastDay.getDate();

    const days: CalendarDay[] = [];
    const today = new Date();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        tasks: this.getTasksForDate(dStr),
        meetings: this.getMeetingsForDate(dStr)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = toLocalDateStr(d);
      const isToday = d.getDate() === today.getDate() &&
                      d.getMonth() === today.getMonth() &&
                      d.getFullYear() === today.getFullYear();
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday,
        tasks: this.getTasksForDate(dStr),
        meetings: this.getMeetingsForDate(dStr)
      });
    }

    // Next month padding to complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        tasks: this.getTasksForDate(dStr),
        meetings: this.getMeetingsForDate(dStr)
      });
    }

    return days;
  });

  upcomingDeadlines = computed(() => {
    return this.tasks()
      .filter(t => t.dueDate && t.status !== 'DONE')
      .slice(0, 6);
  });

  upcomingMeetings = computed(() => {
    return this.meetings()
      .filter(m => m.status !== 'CANCELLED')
      .slice(0, 6);
  });

  private getTasksForDate(dateStr: string): Task[] {
    return this.tasks().filter(t => {
      if (!t.dueDate) return false;
      const tDue = t.dueDate.split('T')[0];
      return tDue === dateStr;
    });
  }

  private getMeetingsForDate(dateStr: string): Meeting[] {
    return this.meetings().filter(m => {
      if (!m.date) return false;
      const mDate = m.date.split('T')[0];
      return mDate === dateStr;
    });
  }

  onDateClick(d: Date): void {
    if (!this.isSuperAdmin()) {
      return;
    }
    const dateStr = toLocalDateStr(d);
    this.openQuickModalForDate(dateStr, d);
  }

  openQuickModalForToday(): void {
    if (!this.isSuperAdmin()) {
      return;
    }
    const today = new Date(2026, 9, 12);
    this.openQuickModalForDate(toLocalDateStr(today), today);
  }

  openQuickModalForDate(dateStr: string, d: Date): void {
    this.selectedDateStr.set(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    this.selectedDateFormatted.set(d.toLocaleDateString('en-US', options));

    this.taskForm.patchValue({
      dueDate: dateStr,
      title: '',
      projectId: '',
      assigneeId: '',
      priority: 'MEDIUM',
      status: 'TODO',
      estimatedHours: 4,
      description: ''
    });

    this.meetingForm.patchValue({
      date: dateStr,
      title: '',
      type: 'PLANNING',
      projectId: '',
      startTime: '10:00',
      endTime: '11:00',
      meetingUrl: '',
      agenda: '',
      participantIds: []
    });

    this.showQuickModal.set(true);
  }

  closeQuickModal(): void {
    this.showQuickModal.set(false);
  }

  // --- DRAG & DROP RESCHEDULING ---
  onDragStart(e: DragEvent, item: Task | Meeting, type: 'TASK' | 'MEETING'): void {
    if (type === 'MEETING' && !this.canManageMeetings()) {
      e.preventDefault();
      this.showToast('Employees are not permitted to reschedule meetings.', 'error');
      return;
    }
    if (type === 'TASK' && !this.canManageTasks()) {
      e.preventDefault();
      this.showToast('Employees are not permitted to reschedule tasks.', 'error');
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type }));
      e.dataTransfer.effectAllowed = 'move';
    }
    this.draggedItem.set({
      type,
      task: type === 'TASK' ? (item as Task) : undefined,
      meeting: type === 'MEETING' ? (item as Meeting) : undefined
    });
  }

  onDragEnd(): void {
    this.draggedItem.set(null);
    this.dragOverDate.set(null);
  }

  onCellDragOver(e: DragEvent, dateStr: string): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    this.dragOverDate.set(dateStr);
  }

  onCellDragLeave(dateStr: string): void {
    if (this.dragOverDate() === dateStr) {
      this.dragOverDate.set(null);
    }
  }

  onCellDrop(e: DragEvent, targetDateStr: string): void {
    e.preventDefault();
    this.dragOverDate.set(null);
    const item = this.draggedItem();
    if (!item) return;

    if (item.type === 'TASK' && item.task) {
      if (!this.canManageTasks()) {
        this.showToast('Employees are not permitted to reschedule tasks.', 'error');
        this.draggedItem.set(null);
        return;
      }
      const task = item.task;
      const currentDue = (task.dueDate || '').split('T')[0];
      if (currentDue === targetDateStr) return;

      // Optimistic update
      const updated = { ...task, dueDate: targetDateStr };
      this.tasks.update(list => list.map(t => t.id === task.id ? updated : t));

      this.taskService.updateTask(task.id, { dueDate: targetDateStr }).subscribe({
        next: () => {
          this.showToast(`Rescheduled task "${task.title}" to ${targetDateStr}!`, 'success');
          this.loadCalendarData();
        },
        error: () => {
          this.showToast('Failed to reschedule task on backend', 'error');
          this.loadCalendarData();
        }
      });
    } else if (item.type === 'MEETING' && item.meeting) {
      if (!this.canManageMeetings()) {
        this.showToast('Employees are not permitted to reschedule meetings.', 'error');
        this.draggedItem.set(null);
        return;
      }
      const meeting = item.meeting;
      const currentDate = (meeting.date || '').split('T')[0];
      if (currentDate === targetDateStr) return;

      // Optimistic update
      const updated = { ...meeting, date: targetDateStr };
      this.meetings.update(list => list.map(m => m.id === meeting.id ? updated : m));

      this.meetingService.updateMeeting(meeting.id, {
        date: targetDateStr,
        startTime: meeting.startTime,
        endTime: meeting.endTime
      }).subscribe({
        next: () => {
          this.showToast(`Rescheduled meeting "${meeting.title}" to ${targetDateStr}!`, 'success');
          this.loadCalendarData();
        },
        error: () => {
          this.showToast('Failed to reschedule meeting on backend', 'error');
          this.loadCalendarData();
        }
      });
    }

    this.draggedItem.set(null);
  }

  // --- TASK DETAILS & EDIT ---
  openTaskDetails(task: Task): void {
    this.selectedTask.set(task);
    this.isEditingTask.set(false);
    this.showTaskModal.set(true);
  }

  openTaskEdit(task: Task): void {
    if (!this.canManageTasks()) {
      this.showToast('Employees are not permitted to edit tasks.', 'error');
      return;
    }
    this.selectedTask.set(task);
    this.startEditingTask();
    this.showTaskModal.set(true);
  }

  startEditingTask(): void {
    if (!this.canManageTasks()) {
      this.showToast('Employees are not permitted to edit tasks.', 'error');
      return;
    }
    const t = this.selectedTask();
    if (!t) return;
    this.editTaskForm.patchValue({
      title: t.title,
      assigneeId: t.assigneeId || '',
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      estimatedHours: t.estimatedHours || 4,
      description: t.description || ''
    });
    this.isEditingTask.set(true);
  }

  saveTaskEdit(): void {
    if (!this.canManageTasks()) {
      this.showToast('Employees are not permitted to edit tasks.', 'error');
      return;
    }
    if (this.editTaskForm.invalid || this.isSubmitting() || !this.selectedTask()) return;
    this.isSubmitting.set(true);
    const formVal = this.editTaskForm.value;
    const taskId = this.selectedTask()!.id;

    const updates: Partial<Task> = {
      title: formVal.title || undefined,
      assigneeId: formVal.assigneeId || undefined,
      priority: (formVal.priority as TaskPriority) || undefined,
      status: (formVal.status as TaskStatus) || undefined,
      dueDate: formVal.dueDate || undefined,
      estimatedHours: formVal.estimatedHours ? Number(formVal.estimatedHours) : undefined,
      description: formVal.description || undefined
    };

    this.taskService.updateTask(taskId, updates).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.isEditingTask.set(false);
        this.showTaskModal.set(false);
        this.showToast(`Task "${updated.title}" successfully updated & logged!`, 'success');
        this.loadCalendarData();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to update task. Check backend server logs.', 'error');
      }
    });
  }

  // --- MEETING DETAILS & EDIT ---
  openMeetingDetails(meeting: Meeting): void {
    this.selectedMeeting.set(meeting);
    this.isEditingMeeting.set(false);
    this.showMeetingModal.set(true);
  }

  openMeetingEdit(meeting: Meeting): void {
    if (!this.canManageMeetings()) {
      this.showToast('Employees are not permitted to edit meetings.', 'error');
      return;
    }
    this.selectedMeeting.set(meeting);
    this.startEditingMeeting();
    this.showMeetingModal.set(true);
  }

  startEditingMeeting(): void {
    if (!this.canManageMeetings()) {
      this.showToast('Employees are not permitted to edit meetings.', 'error');
      return;
    }
    const m = this.selectedMeeting();
    if (!m) return;
    this.editMeetingForm.patchValue({
      title: m.title,
      type: m.type,
      date: m.date ? m.date.split('T')[0] : '',
      startTime: m.startTime || '10:00',
      endTime: m.endTime || '11:00',
      meetingUrl: m.meetingUrl || '',
      agenda: m.agenda || ''
    });
    this.isEditingMeeting.set(true);
  }

  saveMeetingEdit(): void {
    if (!this.canManageMeetings()) {
      this.showToast('Employees are not permitted to edit meetings.', 'error');
      return;
    }
    if (this.editMeetingForm.invalid || this.isSubmitting() || !this.selectedMeeting()) return;
    this.isSubmitting.set(true);
    const formVal = this.editMeetingForm.value;
    const meetingId = this.selectedMeeting()!.id;

    const updates: Partial<Meeting> = {
      title: formVal.title || undefined,
      type: (formVal.type as MeetingType) || undefined,
      date: formVal.date || undefined,
      startTime: formVal.startTime || undefined,
      endTime: formVal.endTime || undefined,
      meetingUrl: formVal.meetingUrl || undefined,
      agenda: formVal.agenda || undefined
    };

    this.meetingService.updateMeeting(meetingId, updates).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.isEditingMeeting.set(false);
        this.showMeetingModal.set(false);
        this.showToast(`Meeting "${updated.title}" successfully updated & logged!`, 'success');
        this.loadCalendarData();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to update meeting. Check backend server logs.', 'error');
      }
    });
  }

  // --- DELETE FUNCTIONALITY ---
  promptDelete(type: 'TASK' | 'MEETING', id: string, title: string): void {
    if (type === 'MEETING' && !this.canManageMeetings()) {
      this.showToast('Employees are not permitted to delete meetings.', 'error');
      return;
    }
    if (type === 'TASK' && !this.canManageTasks()) {
      this.showToast('Employees are not permitted to delete tasks.', 'error');
      return;
    }
    this.deleteTarget.set({ type, id, title });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.isSubmitting()) return;
    if (target.type === 'MEETING' && !this.canManageMeetings()) {
      this.showToast('Employees are not permitted to delete meetings.', 'error');
      this.deleteTarget.set(null);
      return;
    }
    if (target.type === 'TASK' && !this.canManageTasks()) {
      this.showToast('Employees are not permitted to delete tasks.', 'error');
      this.deleteTarget.set(null);
      return;
    }
    this.isSubmitting.set(true);

    if (target.type === 'TASK') {
      this.taskService.deleteTask(target.id).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.deleteTarget.set(null);
          this.showTaskModal.set(false);
          this.showToast(`Task "${target.title}" permanently deleted and logged to audit!`, 'success');
          this.loadCalendarData();
        },
        error: () => {
          this.isSubmitting.set(false);
          this.showToast('Failed to delete task', 'error');
        }
      });
    } else {
      this.meetingService.deleteMeeting(target.id).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.deleteTarget.set(null);
          this.showMeetingModal.set(false);
          this.showToast(`Meeting "${target.title}" permanently deleted and logged to audit!`, 'success');
          this.loadCalendarData();
        },
        error: () => {
          this.isSubmitting.set(false);
          this.showToast('Failed to delete meeting', 'error');
        }
      });
    }
  }

  isAttendeeSelected(empId: string): boolean {
    const selected = (this.meetingForm.get('participantIds')?.value as string[]) || [];
    return selected.includes(empId);
  }

  toggleAttendee(empId: string): void {
    const current = (this.meetingForm.get('participantIds')?.value as string[]) || [];
    let updated: string[];
    if (current.includes(empId)) {
      updated = current.filter(id => id !== empId);
    } else {
      updated = [...current, empId];
    }
    this.meetingForm.patchValue({ participantIds: updated });
  }

  submitTask(): void {
    if (!this.isSuperAdmin()) {
      this.showToast('Only Super Admin is authorized to create tasks.', 'error');
      return;
    }
    if (this.taskForm.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const formVal = this.taskForm.value;
    const req: CreateTaskRequest = {
      title: formVal.title || '',
      description: formVal.description || undefined,
      projectId: formVal.projectId || undefined,
      assigneeId: formVal.assigneeId || undefined,
      priority: (formVal.priority as TaskPriority) || 'MEDIUM',
      status: (formVal.status as TaskStatus) || 'TODO',
      dueDate: formVal.dueDate || undefined,
      estimatedHours: formVal.estimatedHours ? Number(formVal.estimatedHours) : undefined
    };

    this.taskService.createTask(req).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeQuickModal();
        this.showToast(`Task "${created.title}" successfully created and logged to audit!`, 'success');
        this.loadCalendarData();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to create task. Check backend server logs.', 'error');
      }
    });
  }

  submitMeeting(): void {
    if (!this.isSuperAdmin()) {
      this.showToast('Only Super Admin is authorized to schedule meetings.', 'error');
      return;
    }
    if (this.meetingForm.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const formVal = this.meetingForm.value;
    const req: CreateMeetingRequest = {
      title: formVal.title || '',
      type: (formVal.type as MeetingType) || 'OTHER',
      projectId: formVal.projectId || undefined,
      date: formVal.date || '',
      startTime: formVal.startTime || '10:00',
      endTime: formVal.endTime || '11:00',
      organizerId: this.authService.currentUser()?.id || '',
      participantIds: (formVal.participantIds as string[]) || [],
      meetingUrl: formVal.meetingUrl || undefined,
      agenda: formVal.agenda || undefined
    };

    this.meetingService.scheduleMeeting(req).subscribe({
      next: (scheduled) => {
        this.isSubmitting.set(false);
        this.closeQuickModal();
        this.showToast(`Meeting "${scheduled.title}" scheduled for ${scheduled.date} and logged!`, 'success');
        this.loadCalendarData();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to schedule meeting. Check backend server logs.', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }

  prevMonth(): void {
    const cur = this.currentDate();
    this.currentDate.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const cur = this.currentDate();
    this.currentDate.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }

  goToToday(): void {
    this.currentDate.set(new Date(2026, 9, 12));
  }

  getPriorityClass(p: string): string {
    return {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    }[p] ?? '';
  }
}
