import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingService } from '../../../core/services/meeting.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Meeting } from '../../../shared/models/index';

@Component({
  selector: 'app-all-meetings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">All Meetings</h1>
          <p class="page-subtitle">{{ isEmployee() ? 'Scheduled company sessions and records for you' : 'Historical records and scheduled company sessions' }}</p>
        </div>
        <div class="page-actions">
          <a routerLink="/meetings/calendar" class="btn btn-outline btn-sm">
            <span class="material-icons">calendar_month</span> Calendar View
          </a>
          <a routerLink="/meetings/minutes" class="btn btn-outline btn-sm">
            <span class="material-icons">description</span> Minutes of Meeting
          </a>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search meetings..." [(ngModel)]="searchQuery" (ngModelChange)="filterMeetings()" />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="typeFilter" (ngModelChange)="filterMeetings()" class="filter-select">
            <option value="">All Types</option>
            <option value="STANDUP">Standup</option>
            <option value="SPRINT_PLANNING">Sprint Planning</option>
            <option value="SPRINT_REVIEW">Sprint Review</option>
            <option value="ONE_ON_ONE">1-on-1</option>
            <option value="CLIENT_REVIEW">Client Review</option>
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="filterMeetings()" class="filter-select">
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- TABLE -->
      @if (loading()) {
        <div class="card" style="padding: 24px">
          <div class="skeleton skeleton-text" style="width:100%;height:40px;margin-bottom:8px" *ngFor="let i of [1,2,3,4]"></div>
        </div>
      } @else {
        <div class="card data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Meeting Title</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Project</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>MoM</th>
                <th>Action Items</th>
              </tr>
            </thead>
            <tbody>
              @for (m of filteredMeetings(); track m.id) {
                <tr [routerLink]="['/meetings', m.id]">
                  <td>
                    <span class="m-title-bold">{{ m.title }}</span>
                  </td>
                  <td>
                    <span class="badge" [class]="getTypeBadgeClass(m.type)">{{ fmtType(m.type) }}</span>
                  </td>
                  <td>
                    <div class="time-cell">
                      <span class="date-txt">{{ m.date }}</span>
                      <span class="hours-txt">{{ m.startTime }} - {{ m.endTime }}</span>
                    </div>
                  </td>
                  <td><span class="project-tag">{{ m.projectName || 'General' }}</span></td>
                  <td>
                    <div class="attendees-cell">
                      <span class="material-icons">people</span>
                      <span>{{ m.participants.length }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="getStatusClass(m.status)">{{ m.status }}</span>
                  </td>
                  <td>
                    @if (m.hasMinutes) {
                      <span class="badge badge-done" style="font-size:11px">Recorded</span>
                    } @else {
                      <span class="text-muted" style="font-size:11px">Pending</span>
                    }
                  </td>
                  <td>
                    <span class="action-items-count">{{ m.actionItemCount }} tasks</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <span class="material-icons empty-icon">event_busy</span>
                      <p class="empty-title">No meetings match your filter</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 8px 14px;
        flex: 1;
        min-width: 240px;
        max-width: 400px;

        &:focus-within { border-color: var(--color-blue); }
        .material-icons { font-size: 18px; color: var(--color-text-muted); }
        input {
          border: none;
          outline: none;
          font-size: 13px;
          flex: 1;
          background: transparent;
        }
      }

      .filter-group {
        display: flex;
        gap: 8px;
      }

      .filter-select {
        padding: 8px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        background: white;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        &:focus { border-color: var(--color-blue); }
      }
    }

    .m-title-bold {
      font-weight: 600;
      color: var(--color-navy);
      font-size: 13px;
    }

    .time-cell {
      display: flex;
      flex-direction: column;
      font-size: 12px;

      .date-txt {
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .hours-txt {
        color: var(--color-text-muted);
        font-size: 11px;
      }
    }

    .project-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-blue);
      background: var(--color-light-blue);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .attendees-cell {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--color-text-secondary);

      .material-icons {
        font-size: 16px;
        color: var(--color-text-muted);
      }
    }

    .action-items-count {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-navy);
    }
  `]
})
export class AllMeetingsComponent implements OnInit {
  loading = signal(true);
  meetings = signal<Meeting[]>([]);
  searchQuery = '';
  typeFilter = '';
  statusFilter = '';

  filteredMeetings = signal<Meeting[]>([]);

  private auth = inject(AuthService);
  isEmployee = computed(() => this.auth.isEmployee);

  constructor(private meetingService: MeetingService) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    this.meetingService.getMeetings().subscribe(res => {
      let data = res.data;
      if (this.auth.isEmployee && user) {
        data = data.filter(m =>
          m.organizerId === user.id || (m.participants && m.participants.some(p => p.userId === user.id))
        );
      }
      this.meetings.set(data);
      this.filteredMeetings.set(data);
      this.loading.set(false);
    });
  }

  filterMeetings(): void {
    let list = this.meetings();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q));
    }
    if (this.typeFilter) {
      list = list.filter(m => m.type === this.typeFilter);
    }
    if (this.statusFilter) {
      list = list.filter(m => m.status === this.statusFilter);
    }
    this.filteredMeetings.set(list);
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

  fmtType(t: string): string {
    return t.replace('_', ' ').replace(/\\b\\w/g, c => c.toUpperCase());
  }
}
