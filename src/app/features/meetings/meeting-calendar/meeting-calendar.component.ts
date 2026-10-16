import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingService } from '../../../core/services/meeting.service';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Meeting, MeetingType, Project, Employee } from '../../../shared/models/index';

@Component({
  selector: 'app-meeting-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Meetings & Schedules</h1>
          <p class="page-subtitle">Collaborative sessions, sprint reviews, and decision logging</p>
        </div>
        <div class="page-actions">
          <a routerLink="/meetings/minutes" class="btn btn-outline btn-sm">
            <span class="material-icons">description</span> Minutes of Meeting
          </a>
          <a routerLink="/meetings/all" class="btn btn-outline btn-sm">
            <span class="material-icons">list</span> List View
          </a>
          @if (isSuperAdmin()) {
            <button class="btn btn-gradient btn-sm" (click)="showScheduleModal.set(true)">
              <span class="material-icons">add</span> Schedule Meeting
            </button>
          }
        </div>
      </div>

      <!-- MAIN LAYOUT: UPCOMING TODAY & CALENDAR CARDS -->
      <div class="meetings-grid-layout">
        <!-- UPCOMING SESSIONS -->
        <div class="sessions-column">
          <div class="section-title-wrap">
            <span class="material-icons">today</span>
            <h3>Upcoming Sessions</h3>
          </div>

          <div class="sessions-list">
            @for (m of upcomingMeetings(); track m.id) {
              <div class="card session-card" [routerLink]="['/meetings', m.id]">
                <div class="session-top">
                  <span class="badge" [class]="getTypeBadgeClass(m.type)">{{ fmtType(m.type) }}</span>
                  <span class="time-tag">
                    <span class="material-icons">schedule</span> {{ m.startTime }} - {{ m.endTime }}
                  </span>
                </div>

                <h4 class="session-title">{{ m.title }}</h4>
                <p class="session-desc">{{ m.description || 'No description provided.' }}</p>

                <div class="session-bottom">
                  <div class="participants-stack">
                    <span class="material-icons">group</span>
                    <span>{{ m.participants.length }} attendees</span>
                  </div>
                  @if (m.meetingUrl) {
                    <a [href]="m.meetingUrl" target="_blank" (click)="$event.stopPropagation()" class="join-btn">
                      <span class="material-icons">videocam</span> Join
                    </a>
                  }
                </div>
              </div>
            } @empty {
              <div class="card empty-state">
                <span class="material-icons empty-icon text-muted">event_busy</span>
                <p class="empty-title">No upcoming meetings scheduled</p>
              </div>
            }
          </div>
        </div>

        <!-- WEEK SCHEDULE / MINI AGENDA -->
        <div class="agenda-column">
          <div class="card agenda-card">
            <div class="agenda-header">
              <h3>Weekly Schedule</h3>
              <span class="date-badge">October 12 - 18, 2026</span>
            </div>

            <div class="week-days-list">
              @for (day of weekSchedule(); track day.name) {
                <div class="day-slot">
                  <div class="day-label-col">
                    <span class="day-name">{{ day.name }}</span>
                    <span class="day-date">{{ day.date }}</span>
                  </div>
                  <div class="day-meetings-col">
                    @for (item of day.meetings; track item.id) {
                      <div class="meeting-slot-item" [routerLink]="['/meetings', item.id]">
                        <span class="slot-time">{{ item.startTime }}</span>
                        <div class="slot-details">
                          <span class="slot-title">{{ item.title }}</span>
                          <span class="slot-type">{{ item.type }}</span>
                        </div>
                      </div>
                    } @empty {
                      <div class="no-slot-text">No sessions booked</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- SCHEDULE MEETING MODAL -->
      @if (showScheduleModal()) {
        <div class="modal-overlay" (click)="showScheduleModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="m-title">
                <span class="material-icons">calendar_month</span>
                <h3>Schedule New Meeting</h3>
              </div>
              <button class="icon-btn" (click)="showScheduleModal.set(false)"><span class="material-icons">close</span></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Meeting Title <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newMeetingTitle" placeholder="e.g. Sprint 24 Planning & Estimation" class="form-control" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Meeting Type</label>
                  <select [(ngModel)]="newMeetingType" class="form-control">
                    <option value="STANDUP">Daily Standup</option>
                    <option value="PLANNING">Sprint Planning</option>
                    <option value="REVIEW">Sprint Review</option>
                    <option value="ONE_ON_ONE">1-on-1 Mentorship</option>
                    <option value="CLIENT_CALL">Client Call</option>
                    <option value="GENERAL">General Sync</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Project</label>
                  <select [(ngModel)]="newMeetingProject" class="form-control">
                    <option value="">No Project (General Sync)</option>
                    @for (p of projects(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.code }})</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Date</label>
                  <input type="date" [(ngModel)]="newMeetingDate" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Start Time</label>
                  <input type="time" [(ngModel)]="newMeetingStart" class="form-control" />
                </div>
              </div>

              <div class="form-group">
                <label>Video Call Link</label>
                <input type="url" [(ngModel)]="newMeetingLink" placeholder="https://meet.google.com/xyz-abc" class="form-control" />
              </div>

              <div class="form-group">
                <label>Invite Team Members (Participants)</label>
                <div class="participants-picker">
                  @for (emp of employees(); track emp.id) {
                    <button type="button" class="emp-pill"
                            [class.selected]="selectedParticipantIds().includes(emp.id)"
                            (click)="toggleParticipant(emp.id)">
                      <span class="emp-avatar">{{ emp.firstName.charAt(0) }}</span>
                      <span class="emp-name">{{ emp.firstName }} {{ emp.lastName }}</span>
                      @if (selectedParticipantIds().includes(emp.id)) {
                        <span class="material-icons pill-check">check</span>
                      }
                    </button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Agenda Overview</label>
                <textarea [(ngModel)]="newMeetingDesc" rows="3" placeholder="Key agenda items to cover..." class="form-control"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showScheduleModal.set(false)">Cancel</button>
              <button class="btn btn-gradient" (click)="saveMeeting()" [disabled]="!newMeetingTitle.trim()">Book Meeting</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .meetings-grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: var(--color-navy);

      .material-icons {
        color: var(--color-blue);
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .session-card {
      padding: 18px 20px;
      cursor: pointer;
      border-left: 4px solid var(--color-blue);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .session-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .time-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-navy);

          .material-icons {
            font-size: 15px;
            color: var(--color-blue);
          }
        }
      }

      .session-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0 0 6px 0;
      }

      .session-desc {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0 0 14px 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .session-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);

        .participants-stack {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-muted);

          .material-icons {
            font-size: 16px;
          }
        }

        .join-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #EFF6FF;
          color: var(--color-blue);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;

          .material-icons {
            font-size: 16px;
          }

          &:hover {
            background: var(--color-blue);
            color: white;
          }
        }
      }
    }

    .agenda-card {
      padding: 24px;

      .agenda-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy);
        }

        .date-badge {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
      }

      .week-days-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .day-slot {
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 14px;
        align-items: start;

        .day-label-col {
          display: flex;
          flex-direction: column;

          .day-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .day-date {
            font-size: 11px;
            color: var(--color-text-muted);
          }
        }

        .day-meetings-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .meeting-slot-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #F8FAFC;
          border-radius: 6px;
          cursor: pointer;
          transition: background var(--transition-fast);

          &:hover {
            background: #EFF6FF;
          }

          .slot-time {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-blue);
            min-width: 65px;
          }

          .slot-details {
            display: flex;
            flex-direction: column;

            .slot-title {
              font-size: 12px;
              font-weight: 600;
              color: var(--color-navy);
            }

            .slot-type {
              font-size: 10px;
              color: var(--color-text-muted);
            }
          }
        }

        .no-slot-text {
          font-size: 12px;
          color: var(--color-text-muted);
          font-style: italic;
          padding: 4px 0;
        }
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
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.25);
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
        .participants-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
          max-height: 140px;
          overflow-y: auto;
          padding: 6px;
          background: var(--color-bg-alt);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .emp-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-card);
          color: var(--color-text-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;

          .emp-avatar {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #2563EB;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
          }

          .pill-check {
            font-size: 14px;
            color: #10B981;
          }

          &.selected {
            border-color: #2563EB;
            background: rgba(37, 99, 235, 0.1);
            color: #2563EB;
            font-weight: 600;
          }

          &:hover {
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

    @media (max-width: 860px) {
      .meetings-grid-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MeetingCalendarComponent implements OnInit {
  loading = signal(true);
  meetings = signal<Meeting[]>([]);
  projects = signal<Project[]>([]);
  showScheduleModal = signal(false);

  newMeetingTitle = '';
  newMeetingType: MeetingType = 'PLANNING';
  newMeetingProject = '';
  newMeetingDate = new Date().toISOString().split('T')[0];
  newMeetingStart = '10:00';
  newMeetingLink = 'https://meet.google.com/cresenix-sync';
  newMeetingDesc = '';

  private meetingService = inject(MeetingService);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeService);
  private auth = inject(AuthService);

  employees = signal<Employee[]>([]);
  selectedParticipantIds = signal<string[]>([]);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');

  ngOnInit(): void {
    this.employeeService.getEmployees().subscribe(emps => {
      if (emps && Array.isArray(emps)) {
        this.employees.set(emps);
      }
    });

    this.projectService.projects$.subscribe(projs => {
      if (projs && projs.length > 0) {
        this.projects.set(projs);
      }
    });

    const user = this.auth.currentUser();
    this.meetingService.meetings$.subscribe(list => {
      if (list) {
        let filtered = list;
        if (this.auth.isEmployee && user) {
          filtered = filtered.filter(m =>
            m.organizerId === user.id || (m.participants && m.participants.some(p => p.userId === user.id))
          );
        }
        this.meetings.set(filtered);
        this.loading.set(false);
      }
    });

    this.meetingService.getMeetings({ sort: 'asc' }).subscribe(res => {
      let filtered = res.data;
      if (this.auth.isEmployee && user) {
        filtered = filtered.filter(m =>
          m.organizerId === user.id || (m.participants && m.participants.some(p => p.userId === user.id))
        );
      }
      this.meetings.set(filtered);
      this.loading.set(false);
    });
  }

  upcomingMeetings = computed(() => {
    return [...this.meetings()]
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
      .slice(0, 6);
  });

  weekSchedule = computed(() => {
    const list = this.meetings();
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const pad = (n: number) => n < 10 ? '0' + n : String(n);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return dayNames.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return {
        name,
        date: label,
        meetings: list.filter(m => m.date === iso)
      };
    });
  });

  toggleParticipant(id: string): void {
    const cur = this.selectedParticipantIds();
    if (cur.includes(id)) {
      this.selectedParticipantIds.set(cur.filter(x => x !== id));
    } else {
      this.selectedParticipantIds.set([...cur, id]);
    }
  }

  saveMeeting(): void {
    if (!this.isSuperAdmin() || !this.newMeetingTitle.trim()) return;
    const currentUser = this.auth.currentUser();
    const pIds = [...this.selectedParticipantIds()];
    if (currentUser?.id && !pIds.includes(currentUser.id)) {
      pIds.push(currentUser.id);
    }
    this.meetingService.scheduleMeeting({
      title: this.newMeetingTitle.trim(),
      type: this.newMeetingType,
      projectId: this.newMeetingProject || undefined,
      date: this.newMeetingDate,
      startTime: this.newMeetingStart,
      endTime: '11:00',
      meetingUrl: this.newMeetingLink,
      organizerId: currentUser?.id || '',
      participantIds: pIds,
      description: this.newMeetingDesc
    }).subscribe(m => {
      this.meetings.update(list => [m, ...list]);
      this.showScheduleModal.set(false);
      this.newMeetingTitle = '';
      this.newMeetingDesc = '';
      this.selectedParticipantIds.set([]);
      this.meetingService.refreshMeetings();
    });
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

  fmtType(t: string): string {
    return t.replace('_', ' ').replace(/\\b\\w/g, c => c.toUpperCase());
  }
}
