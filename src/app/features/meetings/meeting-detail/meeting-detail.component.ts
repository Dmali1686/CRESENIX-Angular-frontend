import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingService } from '../../../core/services/meeting.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Meeting, Employee } from '../../../shared/models/index';

@Component({
  selector: 'app-meeting-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <!-- BREADCRUMBS -->
      <div class="breadcrumb-bar">
        <a routerLink="/meetings/calendar" class="breadcrumb-item">Meetings</a>
        <span class="material-icons breadcrumb-sep">chevron_right</span>
        <span class="breadcrumb-item active">{{ meeting()?.title || 'Meeting Details' }}</span>
      </div>

      @if (loading()) {
        <div class="card" style="padding: 32px">
          <div class="skeleton skeleton-title" style="width: 40%; height: 28px; margin-bottom: 16px"></div>
          <div class="skeleton skeleton-text" style="width: 70%; height: 16px; margin-bottom: 8px"></div>
        </div>
      } @else if (meeting()) {
        <div class="meeting-layout">
          <!-- MAIN CARD -->
          <div class="main-col">
            <div class="card detail-card">
              <div class="detail-header">
                <div class="badges-row">
                  <span class="badge" [class]="getTypeBadgeClass(meeting()!.type)">{{ meeting()!.type }}</span>
                  <span class="badge" [class]="getStatusClass(meeting()!.status)">{{ meeting()!.status }}</span>
                  <span class="project-tag">{{ meeting()!.projectName || 'General Sync' }}</span>
                </div>
                <h1 class="meeting-title">{{ meeting()!.title }}</h1>
                <p class="meeting-desc">{{ meeting()!.description || 'No detailed agenda provided.' }}</p>

                @if (meeting()!.meetingUrl) {
                  <div class="join-box">
                    <div class="join-info">
                      <span class="material-icons">videocam</span>
                      <div>
                        <span class="join-title">Virtual Meeting Room</span>
                        <a [href]="meeting()!.meetingUrl" target="_blank" class="join-url">{{ meeting()!.meetingUrl }}</a>
                      </div>
                    </div>
                    <a [href]="meeting()!.meetingUrl" target="_blank" class="btn btn-gradient btn-sm">
                      <span class="material-icons">open_in_new</span> Join Call
                    </a>
                  </div>
                }
              </div>

              <!-- PARTICIPANTS SECTION -->
              <div class="section-block">
                <div class="header-split">
                  <h3 class="section-heading" style="margin-bottom:0">Invited Participants ({{ meeting()!.participants.length }})</h3>
                  @if (canManageParticipants()) {
                    <button id="add-meeting-participant-btn" class="btn btn-outline btn-xs add-participant-btn" (click)="openAddModal()">
                      <span class="material-icons" style="font-size:15px; margin-right:4px;">person_add</span> Add Participant
                    </button>
                  }
                </div>

                <div class="attendees-grid">
                  @for (p of meeting()!.participants; track p.userId) {
                    <div class="attendee-card">
                      <div class="avatar avatar-sm">{{ p.userName ? p.userName.charAt(0) : 'U' }}</div>
                      <div class="att-info">
                        <span class="att-name">{{ p.userName }}</span>
                        <span class="att-status" [class]="'status-' + (p.status?.toLowerCase() || 'pending')">
                          {{ p.status || 'Invited' }}
                        </span>
                      </div>
                      @if (canManageParticipants()) {
                        <button class="remove-attendee-btn" (click)="removeParticipant(p.userId)" title="Remove employee from meeting">
                          <span class="material-icons">close</span>
                        </button>
                      }
                    </div>
                  } @empty {
                    <p class="text-muted" style="font-size:13px">No participants invited yet.</p>
                  }
                </div>
              </div>

              <!-- ACTIONS TAKEN -->
              <div class="section-block">
                <div class="header-split">
                  <h3 class="section-heading">Recorded Decisions & Next Steps</h3>
                  <a routerLink="/meetings/minutes" class="btn btn-outline btn-xs">
                    <span class="material-icons">edit_note</span> Edit Minutes
                  </a>
                </div>
                <p class="text-secondary" style="font-size:13px">
                  Official minutes of this meeting have been saved. Action items assigned during this session can be tracked in the tasks pipeline.
                </p>
              </div>
            </div>
          </div>

          <!-- SIDEBAR -->
          <div class="side-col">
            <div class="card meta-card">
              <h3 class="side-heading">Schedule Info</h3>

              <div class="meta-row">
                <span class="meta-lbl">Date</span>
                <span class="meta-val"><span class="material-icons">event</span> {{ meeting()!.date }}</span>
              </div>

              <div class="meta-row">
                <span class="meta-lbl">Time</span>
                <span class="meta-val"><span class="material-icons">schedule</span> {{ meeting()!.startTime }} - {{ meeting()!.endTime }}</span>
              </div>

              <div class="meta-row">
                <span class="meta-lbl">Minutes Status</span>
                <span class="meta-val">
                  <span class="badge" [class]="meeting()!.hasMinutes ? 'badge-done' : 'badge-todo'">
                    {{ meeting()!.hasMinutes ? 'Minutes Logged' : 'Pending MoM' }}
                  </span>
                </span>
              </div>

              <div class="meta-row">
                <span class="meta-lbl">Action Items</span>
                <span class="meta-val">{{ meeting()!.actionItemCount }} Tasks Generated</span>
              </div>

              <div class="side-actions">
                <button class="btn btn-outline btn-sm full-btn" (click)="goBack()">
                  <span class="material-icons">arrow_back</span> Return to List
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ADD PARTICIPANT MODAL -->
        @if (showAddModal()) {
          <div class="modal-overlay" (click)="closeAddModal()">
            <div class="modal-dialog" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div class="head-title">
                  <span class="material-icons text-primary">person_add</span>
                  <h3>Add Employee to Meeting</h3>
                </div>
                <button class="icon-close-btn" (click)="closeAddModal()">
                  <span class="material-icons">close</span>
                </button>
              </div>

              <div class="modal-body">
                <p class="modal-instructions">
                  Select an employee to invite them to <strong>{{ meeting()!.title }}</strong>. They will immediately gain access to this meeting and receive notifications.
                </p>

                @if (uninvitedEmployees().length === 0) {
                  <div class="all-invited-box">
                    <span class="material-icons">check_circle</span>
                    <p>All active employees are already invited to this meeting.</p>
                  </div>
                } @else {
                  <div class="form-group">
                    <label for="select-employee-input">Choose Employee</label>
                    <select id="select-employee-input" [(ngModel)]="selectedEmployeeId" class="employee-select-input">
                      <option value="">-- Select Employee --</option>
                      @for (emp of uninvitedEmployees(); track emp.id) {
                        <option [value]="emp.id">
                          {{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || emp.role }})
                        </option>
                      }
                    </select>
                  </div>
                }

                @if (addError()) {
                  <div class="modal-error">
                    <span class="material-icons">error</span> {{ addError() }}
                  </div>
                }
              </div>

              <div class="modal-foot">
                <button class="btn btn-outline btn-sm" (click)="closeAddModal()">Cancel</button>
                <button
                  id="confirm-add-participant-btn"
                  class="btn btn-gradient btn-sm"
                  [disabled]="!selectedEmployeeId() || addingParticipant()"
                  (click)="confirmAddParticipant()">
                  @if (addingParticipant()) { <span class="spinner-sm"></span> }
                  Add to Meeting
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="card empty-state">
          <span class="material-icons empty-icon text-muted">event_busy</span>
          <h3 class="empty-title">Meeting Not Found</h3>
          <button class="btn btn-gradient btn-sm" (click)="goBack()">Return to Meetings</button>
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
      }

      .breadcrumb-sep {
        font-size: 16px;
        color: var(--color-text-muted);
      }
    }

    .meeting-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
      align-items: start;
    }

    .detail-card {
      padding: 32px;
    }

    .detail-header {
      margin-bottom: 28px;

      .badges-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;

        .project-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-blue);
          background: var(--color-light-blue);
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .meeting-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 10px 0;
      }

      .meeting-desc {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.6;
        margin: 0 0 20px 0;
      }
    }

    .join-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 10px;

      .join-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .material-icons {
          font-size: 24px;
          color: var(--color-blue);
        }

        .join-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-navy);
          display: block;
        }

        .join-url {
          font-size: 12px;
          color: var(--color-blue);
          text-decoration: underline;
        }
      }
    }

    .section-block {
      padding-top: 24px;
      border-top: 1px solid var(--color-border);
      margin-top: 24px;

      .section-heading {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 16px 0;
      }

      .header-split {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
    }

    .add-participant-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-blue);
      border-color: var(--color-blue);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-light-blue);
      }
    }

    .attendees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .attendee-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        border-color: #CBD5E1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

        .remove-attendee-btn {
          opacity: 1;
        }
      }

      .att-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;

        .att-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-navy);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .att-status {
          font-size: 11px;
          color: var(--color-text-muted);

          &.status-accepted { color: #16A34A; font-weight: 600; }
          &.status-pending { color: #D97706; }
          &.status-declined { color: #DC2626; }
        }
      }

      .remove-attendee-btn {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0;
        display: flex;
        align-items: center;
        transition: opacity 0.2s, color 0.2s, background-color 0.2s;

        .material-icons {
          font-size: 16px;
        }

        &:hover {
          color: #DC2626;
          background: #FEE2E2;
        }
      }
    }

    .meta-card {
      padding: 24px;

      .side-heading {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--color-border);
      }

      .meta-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;

        .meta-lbl {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }

        .meta-val {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-navy);
          display: flex;
          align-items: center;
          gap: 6px;

          .material-icons {
            font-size: 16px;
            color: var(--color-blue);
          }
        }
      }

      .side-actions {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);

        .full-btn {
          width: 100%;
          justify-content: center;
        }
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

      .all-invited-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px;
        background: #F0FDF4;
        border: 1px solid #BBF7D0;
        border-radius: 8px;
        color: #166534;
        font-size: 13px;
        font-weight: 500;

        .material-icons {
          font-size: 20px;
          color: #16A34A;
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
        }

        .employee-select-input {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid var(--color-border);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          outline: none;
          background: white;

          &:focus {
            border-color: var(--color-blue);
          }
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

    @media (max-width: 860px) {
      .meeting-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MeetingDetailComponent implements OnInit {
  loading = signal(true);
  meeting = signal<Meeting | null>(null);
  employees = signal<Employee[]>([]);

  showAddModal = signal(false);
  selectedEmployeeId = signal('');
  addingParticipant = signal(false);
  addError = signal('');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meetingService = inject(MeetingService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  canManageParticipants = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  uninvitedEmployees = computed(() => {
    const current = this.meeting();
    if (!current) return [];
    const invitedUserIds = new Set((current.participants || []).map(p => p.userId));
    return this.employees().filter(e => !invitedUserIds.has(e.id));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.meetingService.getMeetingById(id).subscribe(m => {
        this.meeting.set(m || null);
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }

    this.employeeService.getEmployees().subscribe({
      next: (list) => {
        if (list) {
          this.employees.set(list);
        }
      },
      error: () => {}
    });
  }

  openAddModal(): void {
    this.selectedEmployeeId.set('');
    this.addError.set('');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.addError.set('');
  }

  confirmAddParticipant(): void {
    const empId = this.selectedEmployeeId();
    const curMeeting = this.meeting();
    if (!empId || !curMeeting) return;

    this.addingParticipant.set(true);
    this.addError.set('');

    this.meetingService.addParticipant(curMeeting.id, empId).subscribe({
      next: (updated) => {
        this.meeting.set(updated);
        this.addingParticipant.set(false);
        this.showAddModal.set(false);
      },
      error: (err) => {
        this.addingParticipant.set(false);
        this.addError.set(err?.error?.error || 'Failed to add participant. Please try again.');
      }
    });
  }

  removeParticipant(userId: string): void {
    const curMeeting = this.meeting();
    if (!curMeeting) return;

    this.meetingService.removeParticipant(curMeeting.id, userId).subscribe({
      next: (updated) => {
        this.meeting.set(updated);
      },
      error: (err) => {
        console.error('Failed to remove participant', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/meetings/calendar']);
  }

  getTypeBadgeClass(t: string): string {
    return {
      STANDUP: 'badge-inprogress',
      SPRINT_PLANNING: 'badge-inreview',
      SPRINT_REVIEW: 'badge-done',
      ONE_ON_ONE: 'badge-todo',
      CLIENT_REVIEW: 'priority-high',
      GENERAL: 'badge-backlog'
    }[t] ?? '';
  }

  getStatusClass(s: string): string {
    return {
      SCHEDULED: 'badge-inprogress',
      IN_PROGRESS: 'priority-high',
      COMPLETED: 'badge-done',
      CANCELLED: 'badge-blocked'
    }[s] ?? '';
  }
}
