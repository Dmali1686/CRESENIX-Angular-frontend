import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { SalesMeeting, SalesMeetingType, SalesMeetingStatus } from '../../../shared/models/index';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';
import { MeetingMinutesModalComponent } from '../shared/meeting-minutes-modal/meeting-minutes-modal.component';

@Component({
  selector: 'app-sales-meetings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ScheduleMeetingModalComponent,
    MeetingMinutesModalComponent
  ],
  template: `
    <div class="sales-meetings-container">
      <!-- HEADER -->
      <div class="meetings-header">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Sales Meetings & Client Visits</h1>
            <span class="count-badge">{{ filteredMeetings().length }} Sessions</span>
          </div>
          <p class="page-subtitle">Schedule discovery calls, technical reviews, and client on-site visits</p>
        </div>

        <div class="header-actions">
          <a routerLink="/meetings/calendar" class="btn btn-outline btn-sm" title="View in Company Wide Calendar">
            <span class="material-icons">calendar_month</span> Company Calendar
          </a>
          <button class="btn btn-primary btn-sm" (click)="showScheduleModal.set(true)">
            <span class="material-icons">event</span> + Schedule Meeting / Visit
          </button>
        </div>
      </div>

      <!-- FILTER TOOLBAR -->
      <div class="meetings-toolbar">
        <div class="filter-controls">
          <select [(ngModel)]="selectedType" class="toolbar-select">
            <option value="">All Meeting Types</option>
            <option value="CLIENT_OFFICE_VISIT">Client Office Visits (On-Site)</option>
            <option value="CRESENIX_OFFICE_VISIT">Client Visiting CRESENIX</option>
            <option value="DISCOVERY_CALL">Discovery Calls (Online)</option>
            <option value="REQUIREMENT_GATHERING">Requirement Gathering</option>
            <option value="PRODUCT_DEMO">Product Demos</option>
            <option value="PROPOSAL_PRESENTATION">Proposal Presentations</option>
            <option value="NEGOTIATION">Negotiation</option>
          </select>

          <select [(ngModel)]="selectedStatus" class="toolbar-select">
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          @if (selectedType || selectedStatus) {
            <button class="btn-reset" (click)="resetFilters()">
              <span class="material-icons">filter_alt_off</span> Reset
            </button>
          }
        </div>

        <div class="view-toggles">
          <button class="view-btn" [class.active]="viewMode() === 'agenda'" (click)="viewMode.set('agenda')">
            <span class="material-icons">view_agenda</span> Agenda List
          </button>
          <button class="view-btn" [class.active]="viewMode() === 'cards'" (click)="viewMode.set('cards')">
            <span class="material-icons">grid_view</span> Session Cards
          </button>
        </div>
      </div>

      <!-- SESSIONS CONTENT -->
      @if (viewMode() === 'agenda') {
        <div class="card agenda-card">
          <div class="agenda-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Meeting Title & Client</th>
                  <th>Date & Time</th>
                  <th>Location / Link</th>
                  <th>Organizer & Attendees</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (m of filteredMeetings(); track m.id) {
                  <tr class="meeting-row">
                    <td>
                      <span class="badge" [class]="m.status === 'COMPLETED' ? 'badge-success' : 'badge-info'">
                        {{ m.status }}
                      </span>
                    </td>
                    <td>
                      <span class="type-pill" [class.visit-pill]="isVisit(m.type)">
                        <span class="material-icons">{{ isVisit(m.type) ? 'directions_car' : 'videocam' }}</span>
                        <span>{{ formatType(m.type) }}</span>
                      </span>
                    </td>
                    <td>
                      <div class="m-title-cell">
                        <span class="m-main-title">{{ m.title }}</span>
                        <a [routerLink]="['/sales/clients', m.clientId]" class="m-client-link">
                          <span class="material-icons">business</span> {{ m.clientName }}
                        </a>
                      </div>
                    </td>
                    <td>
                      <div class="m-date-cell">
                        <span class="m-date-val">{{ m.date }}</span>
                        <span class="m-time-val text-muted">{{ m.startTime }} - {{ m.endTime }}</span>
                      </div>
                    </td>
                    <td>
                      @if (m.visitAddress) {
                        <div class="loc-cell" [title]="m.visitAddress">
                          <span class="material-icons">place</span>
                          <span class="loc-text">{{ m.visitAddress }}</span>
                        </div>
                      } @else if (m.meetingUrl) {
                        <a [href]="m.meetingUrl" target="_blank" class="join-link">
                          <span class="material-icons">link</span> Join Video Call
                        </a>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <div class="attendees-cell">
                        <span class="host-name">Host: {{ m.organizerName }}</span>
                        @if (m.clientParticipants && m.clientParticipants.length > 0) {
                          <span class="client-att text-muted">{{ m.clientParticipants[0] }}</span>
                        }
                      </div>
                    </td>
                    <td class="text-right">
                      <div class="row-actions">
                        @if (m.status !== 'COMPLETED') {
                          <button class="btn btn-outline btn-xs" (click)="openMinutes(m)">
                            <span class="material-icons">notes</span> Log Minutes
                          </button>
                        } @else {
                          <button class="btn btn-light btn-xs" (click)="openMinutes(m)">View Minutes</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7">
                      <div class="empty-state-lg">
                        <span class="material-icons">event_available</span>
                        <h4>No scheduled sessions found</h4>
                        <p>Click "+ Schedule Meeting / Visit" to create your first sales event.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <!-- CARDS VIEW -->
        <div class="sessions-cards-grid">
          @for (m of filteredMeetings(); track m.id) {
            <div class="session-large-card card">
              <div class="sl-header">
                <span class="type-pill" [class.visit-pill]="isVisit(m.type)">
                  <span class="material-icons">{{ isVisit(m.type) ? 'directions_car' : 'videocam' }}</span>
                  <span>{{ formatType(m.type) }}</span>
                </span>
                <span class="badge" [class]="m.status === 'COMPLETED' ? 'badge-success' : 'badge-info'">{{ m.status }}</span>
              </div>

              <h3 class="sl-title">{{ m.title }}</h3>
              <a [routerLink]="['/sales/clients', m.clientId]" class="sl-client">
                <span class="material-icons">business</span> {{ m.clientName }}
              </a>

              <div class="sl-time-row">
                <span class="material-icons">schedule</span>
                <span>{{ m.date }} &bull; {{ m.startTime }} - {{ m.endTime }}</span>
              </div>

              @if (m.visitAddress) {
                <div class="sl-loc-row">
                  <span class="material-icons">place</span>
                  <span>{{ m.visitAddress }}</span>
                </div>
              } @else if (m.meetingUrl) {
                <div class="sl-loc-row">
                  <a [href]="m.meetingUrl" target="_blank" class="join-link">
                    <span class="material-icons">link</span> Open Google Meet / Zoom
                  </a>
                </div>
              }

              @if (m.agenda) {
                <div class="sl-agenda-box">
                  <strong>Agenda:</strong> {{ m.agenda }}
                </div>
              }

              <div class="sl-footer">
                <span class="sl-host">Organizer: {{ m.organizerName }}</span>
                <button class="btn btn-outline btn-xs" (click)="openMinutes(m)">
                  <span class="material-icons">notes</span> {{ m.status === 'COMPLETED' ? 'View Minutes' : 'Log Minutes' }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- MODALS -->
    @if (showScheduleModal()) {
      <app-schedule-meeting-modal (close)="showScheduleModal.set(false)" (scheduled)="refresh()" />
    }

    @if (activeMinutesMeeting()) {
      <app-meeting-minutes-modal
        [meeting]="activeMinutesMeeting()!"
        (close)="activeMinutesMeeting.set(null)"
        (saved)="refresh()"
      />
    }
  `,
  styles: [`
    .sales-meetings-container {
      padding: 24px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .meetings-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 16px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .page-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #101B35;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .count-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      background: #EFF6FF;
      color: #2563EB;
    }
    .page-subtitle {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* TOOLBAR */
    .meetings-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #FFFFFF;
      padding: 10px 16px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      margin-bottom: 18px;
    }
    .filter-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-select {
      padding: 6px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.82rem;
      background: #FFFFFF;
      color: #334155;
      outline: none;
    }
    .btn-reset {
      background: none;
      border: none;
      color: #DC2626;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .view-toggles {
      display: flex;
      gap: 4px;
    }
    .view-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
    }
    .view-btn.active {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #2563EB;
    }
    .view-btn .material-icons {
      font-size: 16px;
    }

    /* AGENDA TABLE */
    .agenda-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .agenda-table-wrap {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      background: #F8FAFC;
      padding: 12px 16px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      border-bottom: 1px solid #E2E8F0;
    }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 0.84rem;
      vertical-align: middle;
    }
    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #EFF6FF;
      color: #2563EB;
      white-space: nowrap;
    }
    .type-pill.visit-pill {
      background: #F5F3FF;
      color: #7C3AED;
    }
    .type-pill .material-icons {
      font-size: 14px;
    }

    .m-title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 320px;
    }
    .m-main-title {
      font-weight: 700;
      color: #101B35;
      font-size: 0.88rem;
    }
    .m-client-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #2563EB;
      text-decoration: none;
      font-weight: 600;
    }
    .m-client-link:hover {
      text-decoration: underline;
    }
    .m-client-link .material-icons {
      font-size: 14px;
    }

    .m-date-cell {
      display: flex;
      flex-direction: column;
    }
    .m-date-val {
      font-weight: 600;
      color: #101B35;
    }
    .m-time-val {
      font-size: 0.74rem;
    }

    .loc-cell {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      color: #475569;
      max-width: 220px;
    }
    .loc-cell .material-icons {
      font-size: 16px;
      color: #94A3B8;
      flex-shrink: 0;
    }
    .loc-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .join-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #2563EB;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .join-link:hover {
      text-decoration: underline;
    }
    .join-link .material-icons {
      font-size: 15px;
    }

    .attendees-cell {
      display: flex;
      flex-direction: column;
      font-size: 0.76rem;
    }
    .host-name {
      font-weight: 600;
      color: #101B35;
    }

    .row-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    /* CARDS GRID */
    .sessions-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }
    .session-large-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .sl-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sl-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #101B35;
      margin: 2px 0 0 0;
    }
    .sl-client {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      color: #2563EB;
      text-decoration: none;
      font-weight: 600;
    }
    .sl-client .material-icons {
      font-size: 14px;
    }
    .sl-time-row, .sl-loc-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: #64748B;
    }
    .sl-time-row .material-icons, .sl-loc-row .material-icons {
      font-size: 15px;
      color: #94A3B8;
    }
    .sl-agenda-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 0.78rem;
      color: #334155;
    }
    .sl-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px dashed #E2E8F0;
      font-size: 0.74rem;
      margin-top: auto;
    }
    .sl-host {
      color: #64748B;
    }

    .empty-state-lg {
      text-align: center;
      padding: 40px 20px;
      color: #64748B;
    }
    .empty-state-lg .material-icons {
      font-size: 40px;
      color: #94A3B8;
      margin-bottom: 8px;
    }
  `]
})
export class SalesMeetingsComponent implements OnInit {
  private salesService = inject(SalesService);

  meetings = signal<SalesMeeting[]>([]);
  viewMode = signal<'agenda' | 'cards'>('agenda');

  selectedType = '';
  selectedStatus = '';

  showScheduleModal = signal(false);
  activeMinutesMeeting = signal<SalesMeeting | null>(null);

  filteredMeetings = computed(() => {
    let list = this.meetings();
    if (this.selectedType) {
      list = list.filter(m => m.type === this.selectedType);
    }
    if (this.selectedStatus) {
      list = list.filter(m => m.status === this.selectedStatus);
    }
    return list.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.salesService.getSalesMeetings().subscribe(list => this.meetings.set(list));
  }

  resetFilters(): void {
    this.selectedType = '';
    this.selectedStatus = '';
  }

  isVisit(type: string): boolean {
    return type === 'CLIENT_OFFICE_VISIT' || type === 'CRESENIX_OFFICE_VISIT';
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  openMinutes(m: SalesMeeting): void {
    this.activeMinutesMeeting.set(m);
  }
}
