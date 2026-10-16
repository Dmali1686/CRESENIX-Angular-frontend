import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  Client,
  SalesOpportunity,
  SalesActivity,
  SalesMeeting,
  SalesDashboardMetrics,
  SalesPipelineStage
} from '../../../shared/models/index';
import { AddClientModalComponent } from '../shared/add-client-modal/add-client-modal.component';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';
import { MeetingMinutesModalComponent } from '../shared/meeting-minutes-modal/meeting-minutes-modal.component';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    AddClientModalComponent,
    ScheduleMeetingModalComponent,
    MeetingMinutesModalComponent
  ],
  template: `
    <div class="sales-dashboard-container">
      <!-- HEADER -->
      <div class="dashboard-header">
        <div class="header-left">
          <div class="greeting-badge">
            <span class="live-dot"></span> Sales Operations & CRM
          </div>
          <h1 class="page-title">
            {{ getGreeting() }}, {{ currentUserName() }}
          </h1>
          <p class="page-subtitle">
            <span class="material-icons date-icon">today</span>
            {{ todayFormatted }} &bull; Move leads forward and track deals
          </p>
        </div>

        <div class="header-actions">
          <button class="btn btn-outline btn-sm" (click)="showScheduleModal.set(true)">
            <span class="material-icons">event</span> Schedule Meeting / Visit
          </button>
          <button class="btn btn-gradient btn-sm" (click)="showAddClientModal.set(true)">
            <span class="material-icons">person_add</span> + Add Client
          </button>
        </div>
      </div>

      <!-- TOP SUMMARY KPI CARDS -->
      <div class="metrics-grid">
        <div class="metric-card" [routerLink]="['/sales/clients']">
          <div class="metric-icon-box bg-blue">
            <span class="material-icons">groups</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Total Leads</span>
            <span class="metric-value">{{ metrics().totalAssignedLeads }}</span>
            <span class="metric-sub text-muted">Across all channels</span>
          </div>
        </div>

        <div class="metric-card" [routerLink]="['/sales/pipeline']">
          <div class="metric-icon-box bg-cyan">
            <span class="material-icons">fiber_new</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">New Leads</span>
            <span class="metric-value">{{ metrics().newLeads }}</span>
            <span class="metric-sub text-cyan">Awaiting first contact</span>
          </div>
        </div>

        <div class="metric-card" [routerLink]="['/sales/activities']">
          <div class="metric-icon-box bg-amber">
            <span class="material-icons">schedule</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Due Today</span>
            <span class="metric-value">{{ metrics().followUpsDueToday }}</span>
            <span class="metric-sub text-amber">Follow-ups scheduled</span>
          </div>
        </div>

        <div class="metric-card" [routerLink]="['/sales/activities']" [class.has-alert]="metrics().overdueFollowUps > 0">
          <div class="metric-icon-box bg-red">
            <span class="material-icons">warning_amber</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Overdue Alerts</span>
            <span class="metric-value text-red">{{ metrics().overdueFollowUps }}</span>
            <span class="metric-sub text-red">Require immediate action</span>
          </div>
        </div>

        <div class="metric-card" [routerLink]="['/sales/meetings']">
          <div class="metric-icon-box bg-violet">
            <span class="material-icons">video_camera_front</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Meetings & Visits</span>
            <span class="metric-value">{{ metrics().meetingsScheduled }}</span>
            <span class="metric-sub text-muted">Scheduled sessions</span>
          </div>
        </div>

        <div class="metric-card" [routerLink]="['/sales/pipeline']">
          <div class="metric-icon-box bg-indigo">
            <span class="material-icons">trending_up</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Active Opportunities</span>
            <span class="metric-value">{{ metrics().activeOpportunities }}</span>
            <span class="metric-sub text-indigo">₹{{ (metrics().totalPipelineValue / 100000).toFixed(1) }}L in pipeline</span>
          </div>
        </div>

        <div class="metric-card card-won" [routerLink]="['/sales/pipeline']">
          <div class="metric-icon-box bg-green">
            <span class="material-icons">emoji_events</span>
          </div>
          <div class="metric-info">
            <span class="metric-label">Deals Won</span>
            <span class="metric-value text-green">{{ metrics().dealsWonThisMonth }}</span>
            <span class="metric-sub text-green">₹{{ (metrics().wonValueThisMonth / 100000).toFixed(1) }}L closed</span>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT TWO-COLUMN GRID -->
      <div class="dashboard-content-grid">
        <!-- LEFT COLUMN: TODAY'S ACTIVITIES & PIPELINE PREVIEW -->
        <div class="main-column">
          <!-- SECTION 1: TODAY'S ACTIVITIES -->
          <div class="card dashboard-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-icons header-icon text-blue">playlist_add_check</span>
                <div>
                  <h3 class="card-title">Today's Activities & Priorities</h3>
                  <p class="card-subtitle">Calls, client office visits, and high-priority follow-ups</p>
                </div>
              </div>
              <a routerLink="/sales/activities" class="card-link-action">View All ({{ activities().length }})</a>
            </div>

            <div class="activities-list">
              @for (act of todaysActivities(); track act.id) {
                <div class="activity-row" [class.is-overdue]="act.status === 'OVERDUE'">
                  <div class="act-type-icon" [style.background]="getActivityIconBg(act.type)" [style.color]="getActivityIconColor(act.type)">
                    <span class="material-icons">{{ getActivityIcon(act.type) }}</span>
                  </div>

                  <div class="act-details">
                    <div class="act-title-line">
                      <span class="act-client-name" [routerLink]="['/sales/clients', act.clientId]">{{ act.clientName }}</span>
                      <span class="badge" [class]="act.status === 'OVERDUE' ? 'badge-danger' : 'badge-info'">
                        {{ act.status === 'OVERDUE' ? 'Overdue' : 'Due Today' }}
                      </span>
                    </div>
                    <p class="act-title">{{ act.title }}</p>
                    <span class="act-time">
                      <span class="material-icons">schedule</span>
                      {{ formatActivityTime(act.dueAt) }} &bull; Owner: {{ act.assignedToName }}
                    </span>
                  </div>

                  <div class="act-actions">
                    <button class="btn btn-outline btn-xs" (click)="completeActivity(act)" title="Mark Complete">
                      <span class="material-icons">check</span> Done
                    </button>
                    <button class="btn btn-light btn-xs" (click)="rescheduleActivity(act)" title="Postpone to tomorrow">
                      <span class="material-icons">update</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-state-sm">
                  <span class="material-icons text-muted">task_alt</span>
                  <p>All activities for today are completed! Great job.</p>
                </div>
              }
            </div>
          </div>

          <!-- SECTION 2: SALES PIPELINE PREVIEW -->
          <div class="card dashboard-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-icons header-icon text-indigo">view_kanban</span>
                <div>
                  <h3 class="card-title">Sales Pipeline Overview</h3>
                  <p class="card-subtitle">Distribution of {{ opportunities().length }} opportunities across 9 stages</p>
                </div>
              </div>
              <a routerLink="/sales/pipeline" class="btn btn-outline btn-xs">
                Open Kanban <span class="material-icons">arrow_forward</span>
              </a>
            </div>

            <div class="pipeline-preview-bars">
              @for (stage of pipelineStages; track stage.key) {
                <div class="stage-preview-row" [routerLink]="['/sales/pipeline']">
                  <div class="stage-meta">
                    <span class="stage-dot" [style.background]="stage.color"></span>
                    <span class="stage-name">{{ stage.label }}</span>
                  </div>

                  <div class="stage-bar-wrap">
                    <div class="stage-bar-fill"
                         [style.width.%]="getStagePercentage(stage.key)"
                         [style.background]="stage.color">
                    </div>
                  </div>

                  <div class="stage-count-col">
                    <span class="count-pill">{{ getStageCount(stage.key) }}</span>
                    <span class="stage-value">₹{{ (getStageValue(stage.key) / 100000).toFixed(1) }}L</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: UPCOMING MEETINGS, FOLLOW-UP ALERTS, RECENT ACTIVITY -->
        <div class="side-column">
          <!-- SECTION 3: UPCOMING MEETINGS & VISITS -->
          <div class="card dashboard-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-icons header-icon text-violet">event</span>
                <div>
                  <h3 class="card-title">Upcoming Meetings & Visits</h3>
                  <p class="card-subtitle">Client office visits & online demos</p>
                </div>
              </div>
              <a routerLink="/sales/meetings" class="card-link-action">Calendar</a>
            </div>

            <div class="meetings-compact-list">
              @for (m of upcomingMeetings().slice(0, 4); track m.id) {
                <div class="meeting-compact-card">
                  <div class="meeting-type-tag" [class.visit-tag]="isVisit(m.type)">
                    <span class="material-icons">{{ isVisit(m.type) ? 'directions_car' : 'videocam' }}</span>
                    <span>{{ formatMeetingType(m.type) }}</span>
                  </div>

                  <h4 class="m-card-title">{{ m.title }}</h4>
                  <div class="m-client-line">
                    <span class="material-icons">business</span>
                    <span>{{ m.clientName }}</span>
                  </div>

                  <div class="m-schedule-line">
                    <span class="material-icons">schedule</span>
                    <span>{{ m.date }} &bull; {{ m.startTime }} - {{ m.endTime }}</span>
                  </div>

                  @if (m.visitAddress) {
                    <div class="m-location-line">
                      <span class="material-icons">place</span>
                      <span>{{ m.visitAddress }}</span>
                    </div>
                  } @else if (m.meetingUrl) {
                    <div class="m-location-line">
                      <a [href]="m.meetingUrl" target="_blank" class="join-link" (click)="$event.stopPropagation()">
                        <span class="material-icons">link</span> Join Video Call
                      </a>
                    </div>
                  }

                  <div class="m-card-footer">
                    <span class="m-host">Organizer: {{ m.organizerName }}</span>
                    <button class="btn btn-outline btn-xs" (click)="openMinutesModal(m)">
                      <span class="material-icons">notes</span> Log Minutes
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-state-sm">
                  <span class="material-icons text-muted">event_busy</span>
                  <p>No upcoming meetings scheduled</p>
                </div>
              }
            </div>
          </div>

          <!-- SECTION 4: FOLLOW-UP ALERTS -->
          <div class="card dashboard-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-icons header-icon text-red">notifications_active</span>
                <div>
                  <h3 class="card-title">Follow-up Alerts & Inactive Leads</h3>
                  <p class="card-subtitle">Clients requiring outreach attention</p>
                </div>
              </div>
            </div>

            <div class="alerts-list">
              @for (alert of followUpAlerts(); track alert.id) {
                <div class="alert-item" [routerLink]="['/sales/clients', alert.clientId]">
                  <div class="alert-icon-box">
                    <span class="material-icons">warning</span>
                  </div>
                  <div class="alert-info">
                    <span class="alert-client">{{ alert.clientName }}</span>
                    <p class="alert-desc">{{ alert.reason }}</p>
                    <span class="alert-days">{{ alert.timeContext }}</span>
                  </div>
                  <span class="material-icons alert-arrow">chevron_right</span>
                </div>
              } @empty {
                <div class="empty-state-sm">
                  <span class="material-icons text-muted">verified</span>
                  <p>No overdue follow-ups or inactive leads</p>
                </div>
              }
            </div>
          </div>

          <!-- SECTION 5: RECENT CLIENT ACTIVITY -->
          <div class="card dashboard-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-icons header-icon text-cyan">history</span>
                <div>
                  <h3 class="card-title">Recent Client Activity</h3>
                  <p class="card-subtitle">Log of recent client interactions</p>
                </div>
              </div>
            </div>

            <div class="timeline-compact">
              @for (act of recentCompletedActivities(); track act.id) {
                <div class="timeline-row">
                  <div class="t-line"></div>
                  <div class="t-dot"></div>
                  <div class="t-content">
                    <div class="t-title-row">
                      <span class="t-client" [routerLink]="['/sales/clients', act.clientId]">{{ act.clientName }}</span>
                      <span class="t-time">{{ timeAgo(act.completedAt || act.createdAt) }}</span>
                    </div>
                    <p class="t-desc">{{ act.title }}</p>
                    @if (act.outcome) {
                      <div class="t-outcome">Outcome: {{ act.outcome }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    @if (showAddClientModal()) {
      <app-add-client-modal (close)="showAddClientModal.set(false)" (clientCreated)="refresh()" />
    }

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
    .sales-dashboard-container {
      padding: 24px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .dashboard-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }
    .greeting-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EFF6FF;
      color: #2563EB;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 6px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    .page-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #101B35;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 0.86rem;
      color: #64748B;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .date-icon {
      font-size: 16px;
      color: #94A3B8;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* KPI METRICS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
      border-color: #CBD5E1;
    }
    .metric-card.has-alert {
      border-color: #FCA5A5;
      background: #FFFBFB;
    }
    .metric-card.card-won {
      border-color: #BBF7D0;
      background: #F8FFF9;
    }
    .metric-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .metric-icon-box .material-icons {
      font-size: 22px;
    }
    .bg-blue { background: #EFF6FF; color: #2563EB; }
    .bg-cyan { background: #ECFEFF; color: #0891B2; }
    .bg-amber { background: #FFFBEB; color: #D97706; }
    .bg-red { background: #FEF2F2; color: #DC2626; }
    .bg-violet { background: #F5F3FF; color: #7C3AED; }
    .bg-indigo { background: #EEF2FF; color: #4F46E5; }
    .bg-green { background: #F0FDF4; color: #16A34A; }

    .metric-info {
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 1.45rem;
      font-weight: 800;
      color: #101B35;
      line-height: 1.2;
    }
    .metric-sub {
      font-size: 0.72rem;
      margin-top: 2px;
    }
    .text-red { color: #DC2626; font-weight: 600; }
    .text-amber { color: #D97706; font-weight: 600; }
    .text-cyan { color: #0891B2; font-weight: 600; }
    .text-indigo { color: #4F46E5; font-weight: 600; }
    .text-green { color: #16A34A; font-weight: 600; }

    /* CONTENT GRID */
    .dashboard-content-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 20px;
    }
    .main-column, .side-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dashboard-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-icon {
      font-size: 24px;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #101B35;
      margin: 0;
    }
    .card-subtitle {
      font-size: 0.75rem;
      color: #64748B;
      margin: 0;
    }
    .card-link-action {
      font-size: 0.8rem;
      color: #2563EB;
      font-weight: 600;
      text-decoration: none;
    }
    .card-link-action:hover {
      text-decoration: underline;
    }

    /* ACTIVITIES LIST */
    .activities-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .activity-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      transition: all 0.15s;
    }
    .activity-row:hover {
      border-color: #CBD5E1;
      background: #F8FAFC;
    }
    .activity-row.is-overdue {
      border-left: 3px solid #DC2626;
      background: #FFFDFD;
    }
    .act-type-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .act-type-icon .material-icons {
      font-size: 20px;
    }
    .act-details {
      flex: 1;
      min-width: 0;
    }
    .act-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }
    .act-client-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: #2563EB;
      cursor: pointer;
    }
    .act-client-name:hover {
      text-decoration: underline;
    }
    .act-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #101B35;
      margin: 0 0 3px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .act-time {
      font-size: 0.74rem;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .act-time .material-icons {
      font-size: 14px;
    }
    .act-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* PIPELINE BARS */
    .pipeline-preview-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .stage-preview-row {
      display: grid;
      grid-template-columns: 180px 1fr 110px;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .stage-preview-row:hover {
      background: #F8FAFC;
    }
    .stage-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stage-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .stage-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stage-bar-wrap {
      height: 7px;
      background: #F1F5F9;
      border-radius: 4px;
      overflow: hidden;
    }
    .stage-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    .stage-count-col {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .count-pill {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 12px;
      background: #F1F5F9;
      color: #475569;
    }
    .stage-value {
      font-size: 0.78rem;
      font-weight: 700;
      color: #101B35;
      width: 48px;
      text-align: right;
    }

    /* MEETINGS LIST */
    .meetings-compact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meeting-compact-card {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      background: #FFFFFF;
      transition: all 0.15s;
    }
    .meeting-compact-card:hover {
      border-color: #CBD5E1;
      background: #F8FAFC;
    }
    .meeting-type-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #EFF6FF;
      color: #2563EB;
      margin-bottom: 6px;
    }
    .meeting-type-tag.visit-tag {
      background: #F5F3FF;
      color: #7C3AED;
    }
    .meeting-type-tag .material-icons {
      font-size: 14px;
    }
    .m-card-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #101B35;
      margin: 0 0 4px 0;
    }
    .m-client-line, .m-schedule-line, .m-location-line {
      font-size: 0.76rem;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 3px;
    }
    .m-client-line .material-icons,
    .m-schedule-line .material-icons,
    .m-location-line .material-icons {
      font-size: 14px;
      color: #94A3B8;
    }
    .join-link {
      color: #2563EB;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .join-link:hover {
      text-decoration: underline;
    }
    .m-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #E2E8F0;
    }
    .m-host {
      font-size: 0.72rem;
      color: #64748B;
    }

    /* ALERTS LIST */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      cursor: pointer;
      transition: background 0.15s;
    }
    .alert-item:hover {
      background: #FEE2E2;
    }
    .alert-icon-box {
      color: #DC2626;
      display: flex;
    }
    .alert-info {
      flex: 1;
      min-width: 0;
    }
    .alert-client {
      font-size: 0.82rem;
      font-weight: 700;
      color: #991B1B;
    }
    .alert-desc {
      font-size: 0.76rem;
      color: #7F1D1D;
      margin: 1px 0 0 0;
    }
    .alert-days {
      font-size: 0.7rem;
      color: #B91C1C;
      font-weight: 600;
    }
    .alert-arrow {
      color: #F87171;
      font-size: 18px;
    }

    /* TIMELINE */
    .timeline-compact {
      display: flex;
      flex-direction: column;
      padding-left: 6px;
    }
    .timeline-row {
      display: flex;
      position: relative;
      padding-bottom: 14px;
    }
    .timeline-row:last-child {
      padding-bottom: 0;
    }
    .t-line {
      position: absolute;
      left: 6px;
      top: 14px;
      bottom: 0;
      width: 2px;
      background: #E2E8F0;
    }
    .timeline-row:last-child .t-line {
      display: none;
    }
    .t-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #06B6D4;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 0 2px #E2E8F0;
      margin-right: 12px;
      flex-shrink: 0;
      z-index: 1;
    }
    .t-content {
      flex: 1;
    }
    .t-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .t-client {
      font-size: 0.8rem;
      font-weight: 700;
      color: #101B35;
      cursor: pointer;
    }
    .t-client:hover {
      color: #2563EB;
    }
    .t-time {
      font-size: 0.7rem;
      color: #94A3B8;
    }
    .t-desc {
      font-size: 0.76rem;
      color: #475569;
      margin: 0;
    }
    .t-outcome {
      font-size: 0.72rem;
      color: #16A34A;
      background: #F0FDF4;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 3px;
    }

    .empty-state-sm {
      text-align: center;
      padding: 24px;
      color: #64748B;
      font-size: 0.82rem;
    }
    .empty-state-sm .material-icons {
      font-size: 32px;
      display: block;
      margin-bottom: 6px;
    }

    @media (max-width: 1024px) {
      .dashboard-content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SalesDashboardComponent implements OnInit {
  private salesService = inject(SalesService);
  private auth = inject(AuthService);

  todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  metrics = signal<SalesDashboardMetrics>({
    totalAssignedLeads: 0,
    newLeads: 0,
    followUpsDueToday: 0,
    overdueFollowUps: 0,
    meetingsScheduled: 0,
    activeOpportunities: 0,
    dealsWonThisMonth: 0,
    totalPipelineValue: 0,
    wonValueThisMonth: 0
  });

  clients = signal<Client[]>([]);
  opportunities = signal<SalesOpportunity[]>([]);
  activities = signal<SalesActivity[]>([]);
  meetings = signal<SalesMeeting[]>([]);

  showAddClientModal = signal(false);
  showScheduleModal = signal(false);
  activeMinutesMeeting = signal<SalesMeeting | null>(null);

  pipelineStages: { key: SalesPipelineStage; label: string; color: string }[] = [
    { key: 'NEW_LEAD', label: 'New Lead', color: '#06B6D4' },
    { key: 'CONTACTED', label: 'Contacted', color: '#3B82F6' },
    { key: 'QUALIFIED', label: 'Qualified', color: '#6366F1' },
    { key: 'DISCOVERY_SCHEDULED', label: 'Discovery Scheduled', color: '#8B5CF6' },
    { key: 'DISCOVERY_COMPLETED', label: 'Discovery Completed', color: '#A855F7' },
    { key: 'PROPOSAL_QUOTATION', label: 'Proposal / Quotation', color: '#EC4899' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: '#F59E0B' },
    { key: 'CLOSED_WON', label: 'Closed Won', color: '#16A34A' },
    { key: 'CLOSED_LOST', label: 'Closed Lost', color: '#DC2626' }
  ];

  currentUserName = computed(() => {
    const user = this.auth.currentUser();
    return user ? user.firstName : 'Sales Leader';
  });

  todaysActivities = computed(() => {
    const acts = this.activities();
    const todayStr = new Date().toISOString().split('T')[0];
    return acts.filter(a => {
      if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
      return a.dueAt.startsWith(todayStr) || a.status === 'OVERDUE';
    }).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  });

  upcomingMeetings = computed(() => {
    return this.meetings()
      .filter(m => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
  });

  recentCompletedActivities = computed(() => {
    return this.activities()
      .filter(a => a.status === 'COMPLETED')
      .slice(0, 5);
  });

  followUpAlerts = computed(() => {
    const alerts: { id: string; clientId: string; clientName: string; reason: string; timeContext: string }[] = [];
    const now = Date.now();

    // 1. Overdue activities
    this.activities().forEach(a => {
      if (a.status === 'OVERDUE' || (a.status === 'PENDING' && new Date(a.dueAt).getTime() < now)) {
        const days = Math.floor((now - new Date(a.dueAt).getTime()) / 86400000);
        alerts.push({
          id: 'overdue-' + a.id,
          clientId: a.clientId,
          clientName: a.clientName,
          reason: `Overdue Follow-up: ${a.title}`,
          timeContext: days > 0 ? `${days} day(s) overdue` : 'Overdue today'
        });
      }
    });

    // 2. Inactive leads (> 5 days with no action)
    this.clients().forEach(c => {
      if (c.status !== 'INACTIVE') {
        const last = c.lastActivityAt ? new Date(c.lastActivityAt).getTime() : new Date(c.createdAt).getTime();
        const inactiveDays = Math.floor((now - last) / 86400000);
        if (inactiveDays >= 5) {
          alerts.push({
            id: 'inactive-' + c.id,
            clientId: c.id,
            clientName: c.companyName,
            reason: 'Inactive Lead: No activity recorded recently',
            timeContext: `${inactiveDays} days inactive`
          });
        }
      }
    });

    return alerts.slice(0, 5);
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.salesService.getDashboardMetrics().subscribe(m => this.metrics.set(m));
    this.salesService.getClients().subscribe(c => this.clients.set(c));
    this.salesService.getOpportunities().subscribe(o => this.opportunities.set(o));
    this.salesService.getActivities().subscribe(a => this.activities.set(a));
    this.salesService.getSalesMeetings().subscribe(m => this.meetings.set(m));
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getStageCount(stage: SalesPipelineStage): number {
    return this.opportunities().filter(o => o.stage === stage).length;
  }

  getStageValue(stage: SalesPipelineStage): number {
    return this.opportunities()
      .filter(o => o.stage === stage)
      .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
  }

  getStagePercentage(stage: SalesPipelineStage): number {
    const total = this.opportunities().length;
    if (total === 0) return 0;
    const count = this.getStageCount(stage);
    return Math.max(5, Math.round((count / total) * 100));
  }

  isVisit(type: string): boolean {
    return type === 'CLIENT_OFFICE_VISIT' || type === 'CRESENIX_OFFICE_VISIT';
  }

  formatMeetingType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  formatActivityTime(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getActivityIcon(type: string): string {
    const map: Record<string, string> = {
      CALL: 'call',
      EMAIL: 'email',
      MESSAGE: 'chat',
      MEETING: 'videocam',
      CLIENT_VISIT: 'directions_car',
      OFFICE_VISIT: 'corporate_fare',
      PROPOSAL_FOLLOWUP: 'request_quote',
      GENERAL_FOLLOWUP: 'alarm',
      NOTE: 'edit_note'
    };
    return map[type] || 'task';
  }

  getActivityIconBg(type: string): string {
    if (type === 'CLIENT_VISIT') return '#F5F3FF';
    if (type === 'CALL') return '#EFF6FF';
    if (type === 'EMAIL') return '#ECFEFF';
    if (type === 'PROPOSAL_FOLLOWUP') return '#FFFBEB';
    return '#F1F5F9';
  }

  getActivityIconColor(type: string): string {
    if (type === 'CLIENT_VISIT') return '#7C3AED';
    if (type === 'CALL') return '#2563EB';
    if (type === 'EMAIL') return '#0891B2';
    if (type === 'PROPOSAL_FOLLOWUP') return '#D97706';
    return '#475569';
  }

  completeActivity(act: SalesActivity): void {
    this.salesService.completeActivity(act.id, 'Completed from Dashboard').subscribe(() => {
      this.refresh();
    });
  }

  rescheduleActivity(act: SalesActivity): void {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    this.salesService.rescheduleActivity(act.id, tomorrow).subscribe(() => {
      this.refresh();
    });
  }

  openMinutesModal(m: SalesMeeting): void {
    this.activeMinutesMeeting.set(m);
  }

  timeAgo(iso: string): string {
    if (!iso) return 'just now';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
