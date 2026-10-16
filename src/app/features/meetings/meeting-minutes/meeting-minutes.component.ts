import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingService } from '../../../core/services/meeting.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Meeting, MeetingActionItem, Employee } from '../../../shared/models/index';

@Component({
  selector: 'app-meeting-minutes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Minutes of Meeting (MoM)</h1>
          <p class="page-subtitle">Record official agendas, decisions, and turn action items into executable tasks</p>
        </div>
        <div class="page-actions">
          <select [(ngModel)]="selectedMeetingId" (ngModelChange)="loadMinutes()" class="meeting-picker-select">
            @for (m of meetings(); track m.id) {
              <option [value]="m.id">{{ m.title }} ({{ m.date }})</option>
            }
          </select>
          <a routerLink="/meetings/calendar" class="btn btn-outline btn-sm">
            <span class="material-icons">arrow_back</span> Calendar
          </a>
        </div>
      </div>

      <!-- ROLE ACCESS NOTICE IF READ-ONLY -->
      @if (!canEdit() && !isForbidden() && !isLoading()) {
        <div class="role-notice-banner">
          <span class="material-icons">lock</span>
          <div>
            <strong>Read-Only Mode:</strong> You are viewing this meeting as a viewer. Only administrators, the meeting organizer, or invited participants can edit notes, record decisions, or add action items.
          </div>
        </div>
      }

      @if (isForbidden()) {
        <div class="card forbidden-card">
          <span class="material-icons forbidden-icon">lock</span>
          <div class="forbidden-content">
            <h3>Access Restricted</h3>
            <p>You are not an organizer or invited participant of this meeting. Minutes are protected under company meeting privacy policy.</p>
          </div>
        </div>
      } @else {
        <!-- MAIN MoM EDITOR LAYOUT -->
        <div class="mom-editor-layout">
          <!-- LEFT: AGENDA & DECISIONS -->
          <div class="mom-main-col">
            <!-- Meeting Context Banner -->
            <div class="card context-card">
              <div class="context-top">
                <div class="badge-group">
                  <span class="badge badge-done">MoM Document</span>
                  @if (canEdit()) {
                    <span class="badge badge-editor"><span class="material-icons badge-icon">edit</span> Editor</span>
                  } @else {
                    <span class="badge badge-readonly"><span class="material-icons badge-icon">visibility</span> Read-Only</span>
                  }
                  @if (isSaving()) {
                    <span class="saving-indicator"><span class="material-icons spin">sync</span> Saving...</span>
                  }
                </div>
                <span class="context-date">Date: {{ currentMeeting()?.date || 'Today' }}</span>
              </div>
              <h2 class="context-title">{{ currentMeeting()?.title || 'Team Session' }}</h2>
              <p class="context-meta">
                <strong>Location/Link:</strong>
                @if (currentMeeting()?.meetingUrl) {
                  <a [href]="currentMeeting()?.meetingUrl" target="_blank" class="context-link">{{ currentMeeting()?.meetingUrl }}</a>
                } @else {
                  <span>{{ currentMeeting()?.location || 'Conference Room 1' }}</span>
                }
                · <strong>Attendees:</strong> {{ currentMeeting()?.participants?.length || 2 }} members
                @if (recordedByName()) {
                  · <strong>Recorded by:</strong> {{ recordedByName() }}
                }
              </p>
            </div>

            <!-- DISCUSSION AGENDAS & NOTES -->
            <div class="card section-card">
              <div class="card-header-row">
                <div class="title-with-icon">
                  <span class="material-icons">format_list_numbered</span>
                  <h3>Discussion Agenda & Notes</h3>
                </div>
                <span class="badge badge-neutral">{{ agendaPoints().length }} Items</span>
              </div>

              @if (isLoading()) {
                <div class="loading-state">
                  <span class="material-icons spin">sync</span> Loading discussion points...
                </div>
              } @else {
                <div class="agenda-items-list">
                  @for (point of agendaPoints(); track $index) {
                    <div class="agenda-item-row">
                      <span class="agenda-num">{{ $index + 1 }}</span>
                      <div class="agenda-content">
                        <p class="agenda-text">{{ point }}</p>
                      </div>
                      @if (canEdit()) {
                        <button class="btn-icon-danger" (click)="removeAgendaPoint($index)" title="Remove item">
                          <span class="material-icons">close</span>
                        </button>
                      }
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <span class="material-icons">notes</span>
                      <p>No discussion notes recorded yet. Add agenda topics and notes below.</p>
                    </div>
                  }
                </div>
              }

              @if (canEdit()) {
                <div class="add-point-row">
                  <input
                    type="text"
                    [(ngModel)]="newAgendaPoint"
                    placeholder="Add discussion note or agenda topic..."
                    class="form-control"
                    (keyup.enter)="addAgendaPoint()"
                  />
                  <button class="btn btn-outline btn-sm" (click)="addAgendaPoint()" [disabled]="!newAgendaPoint.trim()">
                    Add Note
                  </button>
                </div>
              }
            </div>

            <!-- KEY DECISIONS REACHED -->
            <div class="card section-card">
              <div class="card-header-row">
                <div class="title-with-icon">
                  <span class="material-icons text-success">verified</span>
                  <h3>Decisions Reached</h3>
                </div>
                <span class="badge badge-success">{{ decisions().length }} Agreed</span>
              </div>

              @if (isLoading()) {
                <div class="loading-state">
                  <span class="material-icons spin">sync</span> Loading decisions...
                </div>
              } @else {
                <div class="decisions-list">
                  @for (dec of decisions(); track $index) {
                    <div class="decision-box">
                      <span class="material-icons dec-icon">check_circle</span>
                      <p class="dec-text">{{ dec }}</p>
                      @if (canEdit()) {
                        <button class="btn-icon-danger dec-delete" (click)="removeDecision($index)" title="Remove decision">
                          <span class="material-icons">close</span>
                        </button>
                      }
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <span class="material-icons">verified</span>
                      <p>No decisions recorded yet. Log resolutions and agreed actions below.</p>
                    </div>
                  }
                </div>
              }

              @if (canEdit()) {
                <div class="add-point-row">
                  <input
                    type="text"
                    [(ngModel)]="newDecision"
                    placeholder="Record agreed decision or resolution..."
                    class="form-control"
                    (keyup.enter)="addDecision()"
                  />
                  <button class="btn btn-outline btn-sm" (click)="addDecision()" [disabled]="!newDecision.trim()">
                    Record Decision
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- RIGHT: ACTION ITEMS & CONVERSION TO TASKS -->
          <div class="mom-side-col">
            <div class="card action-items-card">
              <div class="card-header-row">
                <div class="title-with-icon">
                  <span class="material-icons" style="color:var(--color-blue)">bolt</span>
                  <h3>Action Items</h3>
                </div>
                <span class="badge badge-inprogress">{{ actionItems().length }} Total</span>
              </div>

              <p class="helper-text">
                Action items can be converted directly into tasks assigned on the project pipeline.
              </p>

              @if (isLoading()) {
                <div class="loading-state">
                  <span class="material-icons spin">sync</span> Loading action items...
                </div>
              } @else {
                <div class="actions-list">
                  @for (item of actionItems(); track item.id) {
                    <div class="action-item-card" [class.converted]="item.convertedTaskId">
                      <div class="action-top">
                        <span class="action-desc">{{ item.description }}</span>
                        @if (canEdit() && !item.convertedTaskId) {
                          <button class="btn-icon-danger" (click)="deleteActionItem(item)" title="Delete action item">
                            <span class="material-icons">delete_outline</span>
                          </button>
                        }
                      </div>

                      <div class="action-meta">
                        <span class="assignee-tag" title="Assignee">
                          <span class="material-icons">person</span> {{ item.assigneeName || 'Unassigned' }}
                        </span>
                        <span class="due-tag" title="Due Date">
                          <span class="material-icons">event</span> {{ item.dueDate || 'No due date' }}
                        </span>
                      </div>

                      <div class="action-footer">
                        @if (item.convertedTaskId) {
                          <a [routerLink]="['/tasks']" class="converted-link">
                            <span class="material-icons">task_alt</span> Converted (View Task)
                          </a>
                        } @else {
                          <button
                            class="btn btn-gradient btn-xs"
                            (click)="convertToActionTask(item)"
                            [disabled]="isConverting(item.id)"
                          >
                            @if (isConverting(item.id)) {
                              <span class="material-icons spin">sync</span> Converting...
                            } @else {
                              <span class="material-icons">arrow_forward</span> Convert to Task
                            }
                          </button>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <span class="material-icons">task_alt</span>
                      <p>No action items yet. Create one below to delegate responsibilities.</p>
                    </div>
                  }
                </div>
              }

              <!-- ADD NEW ACTION ITEM FORM -->
              @if (canEdit()) {
                <div class="add-action-box">
                  <h4 class="box-title">New Action Item</h4>
                  <input
                    type="text"
                    [(ngModel)]="newActionDesc"
                    placeholder="Action item description..."
                    class="form-control"
                    style="margin-bottom:8px"
                  />
                  <div class="action-inputs-row">
                    <select [(ngModel)]="newActionAssigneeId" class="form-control">
                      @for (emp of employees(); track emp.id) {
                        <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || 'Staff' }})</option>
                      }
                    </select>
                    <input type="date" [(ngModel)]="newActionDueDate" class="form-control" />
                  </div>
                  <button
                    class="btn btn-outline btn-sm full-btn"
                    (click)="addActionItem()"
                    [disabled]="!newActionDesc.trim() || isSubmittingAction()"
                    style="margin-top:8px"
                  >
                    @if (isSubmittingAction()) {
                      <span class="material-icons spin">sync</span> Adding...
                    } @else {
                      <span class="material-icons">add</span> Add Action Item
                    }
                  </button>
                </div>
              } @else {
                <div class="readonly-action-box">
                  <span class="material-icons">lock</span>
                  <span>Action item creation is restricted to meeting organizers and admins.</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .meeting-picker-select {
      padding: 8px 12px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      background: white;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-navy);
      outline: none;
      cursor: pointer;
      &:focus { border-color: var(--color-blue); }
    }

    .role-notice-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #92400E;
      padding: 12px 18px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.5;

      .material-icons {
        font-size: 20px;
        color: #D97706;
      }
    }

    .forbidden-card {
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;

      .forbidden-icon {
        font-size: 48px;
        color: #EF4444;
      }

      h3 {
        margin: 0;
        font-size: 18px;
        color: var(--color-navy);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--color-text-secondary);
        max-width: 500px;
      }
    }

    .mom-editor-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 24px;
      align-items: start;
    }

    .context-card {
      padding: 24px;
      margin-bottom: 20px;
      border-left: 4px solid var(--color-blue);

      .context-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .badge-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge-editor {
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .badge-readonly {
          background: #F1F5F9;
          color: #64748B;
          border: 1px solid #CBD5E1;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .badge-icon {
          font-size: 12px;
        }

        .saving-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #2563EB;
          font-weight: 600;
        }

        .context-date {
          font-size: 12px;
          color: var(--color-text-muted);
        }
      }

      .context-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 6px 0;
      }

      .context-meta {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0;

        .context-link {
          color: var(--color-blue);
          text-decoration: underline;
        }
      }
    }

    .section-card {
      padding: 24px;
      margin-bottom: 20px;

      .card-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--color-border);

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;

          h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--color-navy);
          }
        }
      }
    }

    .agenda-items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;

      .agenda-item-row {
        display: flex;
        gap: 12px;
        align-items: center;
        background: #F8FAFC;
        padding: 12px 16px;
        border-radius: 8px;
        transition: background 0.15s ease;

        &:hover {
          background: #F1F5F9;
        }

        .agenda-num {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-blue);
          background: #EFF6FF;
          width: 24px;
          height: 24px;
          min-width: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .agenda-content {
          flex: 1;
        }

        .agenda-text {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.5;
        }
      }
    }

    .decisions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;

      .decision-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: #F0FDF4;
        border: 1px solid #DCFCE7;
        border-radius: 8px;

        .dec-icon {
          color: #16A34A;
          font-size: 18px;
          min-width: 18px;
        }

        .dec-text {
          flex: 1;
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: #166534;
          line-height: 1.4;
        }
      }
    }

    .btn-icon-danger {
      background: none;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: color 0.15s, background 0.15s;

      .material-icons {
        font-size: 16px;
      }

      &:hover {
        color: #EF4444;
        background: #FEE2E2;
      }
    }

    .add-point-row {
      display: flex;
      gap: 8px;

      .form-control {
        flex: 1;
        padding: 8px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: 6px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        outline: none;
        &:focus { border-color: var(--color-blue); }
      }
    }

    .action-items-card {
      padding: 24px;

      .card-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 6px;

          h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--color-navy);
          }
        }
      }

      .helper-text {
        font-size: 12px;
        color: var(--color-text-muted);
        margin: 0 0 16px 0;
        line-height: 1.4;
      }
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .action-item-card {
      padding: 14px;
      background: #F8FAFC;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.15s ease;

      &.converted {
        background: #EFF6FF;
        border-color: #BFDBFE;
      }

      .action-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;

        .action-desc {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-navy);
          line-height: 1.4;
        }
      }

      .action-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: var(--color-text-muted);

        .assignee-tag, .due-tag {
          display: flex;
          align-items: center;
          gap: 3px;

          .material-icons {
            font-size: 14px;
          }
        }
      }

      .action-footer {
        display: flex;
        justify-content: flex-end;
        padding-top: 6px;
        border-top: 1px solid rgba(0,0,0,0.05);

        .converted-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #10B981;
          text-decoration: none;

          .material-icons {
            font-size: 16px;
          }
        }
      }
    }

    .add-action-box {
      padding: 16px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 8px;

      .box-title {
        margin: 0 0 10px 0;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .form-control {
        width: 100%;
        padding: 8px 10px;
        border: 1.5px solid var(--color-border);
        border-radius: 6px;
        font-size: 12px;
        box-sizing: border-box;
        outline: none;
        &:focus { border-color: var(--color-blue); }
      }

      .action-inputs-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .full-btn {
        width: 100%;
        justify-content: center;
      }
    }

    .readonly-action-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #F8FAFC;
      border: 1px dashed var(--color-border);
      border-radius: 6px;
      font-size: 12px;
      color: var(--color-text-muted);

      .material-icons {
        font-size: 16px;
        color: #94A3B8;
      }
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 13px;
      gap: 6px;

      .material-icons {
        font-size: 28px;
        color: #CBD5E1;
      }

      p {
        margin: 0;
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 900px) {
      .mom-editor-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MeetingMinutesComponent implements OnInit {
  private meetingService = inject(MeetingService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  meetings = signal<Meeting[]>([]);
  employees = signal<Employee[]>([]);
  selectedMeetingId = '';

  agendaPoints = signal<string[]>([]);
  decisions = signal<string[]>([]);
  actionItems = signal<MeetingActionItem[]>([]);
  recordedByName = signal<string>('');

  canEdit = signal<boolean>(true);
  isForbidden = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isSubmittingAction = signal<boolean>(false);
  convertingIds = signal<Set<string>>(new Set<string>());

  newAgendaPoint = '';
  newDecision = '';
  newActionDesc = '';
  newActionAssigneeId = '';
  newActionDueDate = '';

  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    // Set default due date to 7 days in the future
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 7);
    this.newActionDueDate = defaultDue.toISOString().substring(0, 10);

    // Fetch live company employees
    this.employeeService.getEmployees().subscribe({
      next: (emps) => {
        this.employees.set(emps);
        if (emps.length > 0) {
          this.newActionAssigneeId = emps[0].id;
        }
      },
      error: (err) => console.error('Failed to load employees:', err)
    });

    // Fetch live meetings from PostgreSQL
    this.meetingService.getMeetings({ limit: 100 }).subscribe({
      next: (res) => {
        this.meetings.set(res.data);
        if (res.data.length > 0) {
          // If a Test Sync Meeting or selected meeting is present, pick it, else first meeting
          const testSync = res.data.find(m => m.title.toLowerCase().includes('test sync'));
          this.selectedMeetingId = testSync ? testSync.id : res.data[0].id;
          this.loadMinutes();
        }
      },
      error: (err) => console.error('Failed to load meetings:', err)
    });
  }

  currentMeeting = computed(() => {
    return this.meetings().find(m => m.id === this.selectedMeetingId);
  });

  loadMinutes(): void {
    if (!this.selectedMeetingId) return;
    this.isLoading.set(true);
    this.isForbidden.set(false);

    this.meetingService.getMeetingMinutes(this.selectedMeetingId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.canEdit.set(res.canEdit ?? false);
        this.recordedByName.set(res.recordedByName || '');

        // Parse discussion points
        const points = (res.discussionPoints || '')
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        this.agendaPoints.set(points);

        // Parse decisions
        const decs = (res.decisions || '')
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        this.decisions.set(decs);

        // Set action items
        this.actionItems.set(res.actionItems || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 403) {
          this.isForbidden.set(true);
          this.canEdit.set(false);
        } else {
          console.error('Failed to load minutes:', err);
        }
      }
    });
  }

  addAgendaPoint(): void {
    if (!this.newAgendaPoint.trim() || !this.canEdit()) return;
    const updated = [...this.agendaPoints(), this.newAgendaPoint.trim()];
    this.agendaPoints.set(updated);
    this.newAgendaPoint = '';
    this.persistMinutes();
  }

  removeAgendaPoint(index: number): void {
    if (!this.canEdit()) return;
    const updated = this.agendaPoints().filter((_, i) => i !== index);
    this.agendaPoints.set(updated);
    this.persistMinutes();
  }

  addDecision(): void {
    if (!this.newDecision.trim() || !this.canEdit()) return;
    const updated = [...this.decisions(), this.newDecision.trim()];
    this.decisions.set(updated);
    this.newDecision = '';
    this.persistMinutes();
  }

  removeDecision(index: number): void {
    if (!this.canEdit()) return;
    const updated = this.decisions().filter((_, i) => i !== index);
    this.decisions.set(updated);
    this.persistMinutes();
  }

  persistMinutes(): void {
    if (!this.selectedMeetingId || !this.canEdit()) return;
    this.isSaving.set(true);
    const meetingTitle = this.currentMeeting()?.title || 'Meeting';
    this.meetingService.saveMeetingMinutes(this.selectedMeetingId, {
      summary: `Official Minutes of ${meetingTitle}`,
      discussionPoints: this.agendaPoints().join('\n'),
      decisions: this.decisions().join('\n')
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.recordedByName) {
          this.recordedByName.set(res.recordedByName);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Failed to persist meeting minutes:', err);
      }
    });
  }

  addActionItem(): void {
    if (!this.newActionDesc.trim() || !this.canEdit()) return;
    this.isSubmittingAction.set(true);

    const cur = this.currentMeeting();
    this.meetingService.addActionItem(this.selectedMeetingId, {
      description: this.newActionDesc.trim(),
      assigneeId: this.newActionAssigneeId,
      dueDate: this.newActionDueDate,
      priority: 'HIGH',
      relatedProject: cur?.projectId
    }).subscribe({
      next: (created) => {
        this.isSubmittingAction.set(false);
        this.actionItems.update(list => [...list, created]);
        this.newActionDesc = '';
      },
      error: (err) => {
        this.isSubmittingAction.set(false);
        console.error('Failed to create action item:', err);
      }
    });
  }

  deleteActionItem(item: MeetingActionItem): void {
    if (!this.canEdit()) return;
    this.meetingService.deleteActionItem(this.selectedMeetingId, item.id).subscribe({
      next: () => {
        this.actionItems.update(list => list.filter(a => a.id !== item.id));
      },
      error: (err) => console.error('Failed to delete action item:', err)
    });
  }

  isConverting(itemId: string): boolean {
    return this.convertingIds().has(itemId);
  }

  convertToActionTask(item: MeetingActionItem): void {
    const curSet = new Set(this.convertingIds());
    curSet.add(item.id);
    this.convertingIds.set(curSet);

    this.meetingService.convertActionItemToTask(this.selectedMeetingId, item.id).subscribe({
      next: (res) => {
        const nextSet = new Set(this.convertingIds());
        nextSet.delete(item.id);
        this.convertingIds.set(nextSet);

        this.actionItems.update(list => list.map(a =>
          a.id === item.id ? { ...a, convertedTaskId: res.taskId, status: 'IN_PROGRESS' } : a
        ));
      },
      error: (err) => {
        const nextSet = new Set(this.convertingIds());
        nextSet.delete(item.id);
        this.convertingIds.set(nextSet);
        console.error('Failed to convert action item to task:', err);
      }
    });
  }
}
