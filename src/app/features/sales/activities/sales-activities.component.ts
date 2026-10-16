import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { Client, SalesOpportunity, SalesActivity, ActivityType } from '../../../shared/models/index';

type ActivityTab = 'today' | 'overdue' | 'upcoming' | 'completed' | 'all';

@Component({
  selector: 'app-sales-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="sales-activities-container">
      <!-- HEADER -->
      <div class="activities-header">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Activities & Follow-ups</h1>
            <span class="count-badge">{{ filteredActivities().length }} Items</span>
          </div>
          <p class="page-subtitle">Ensure no client or opportunity is left unattended</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-primary btn-sm" (click)="showCreateModal.set(true)">
            <span class="material-icons">add_task</span> + Add Follow-up
          </button>
        </div>
      </div>

      <!-- TABS & FILTER BAR -->
      <div class="activities-toolbar">
        <div class="tabs-list">
          <button class="act-tab" [class.active]="currentTab() === 'today'" (click)="setTab('today')">
            Due Today
            <span class="tab-count">{{ dueTodayCount() }}</span>
          </button>
          <button class="act-tab tab-overdue" [class.active]="currentTab() === 'overdue'" (click)="setTab('overdue')">
            Overdue
            @if (overdueCount() > 0) {
              <span class="tab-count-alert">{{ overdueCount() }}</span>
            }
          </button>
          <button class="act-tab" [class.active]="currentTab() === 'upcoming'" (click)="setTab('upcoming')">
            Upcoming
            <span class="tab-count">{{ upcomingCount() }}</span>
          </button>
          <button class="act-tab" [class.active]="currentTab() === 'completed'" (click)="setTab('completed')">
            Completed
            <span class="tab-count">{{ completedCount() }}</span>
          </button>
          <button class="act-tab" [class.active]="currentTab() === 'all'" (click)="setTab('all')">
            All ({{ activities().length }})
          </button>
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="selectedType" class="type-filter">
            <option value="">All Activity Types</option>
            <option value="CALL">Phone Calls</option>
            <option value="EMAIL">Emails</option>
            <option value="MESSAGE">WhatsApp / Messages</option>
            <option value="CLIENT_VISIT">Client Visits</option>
            <option value="MEETING">Meetings</option>
            <option value="PROPOSAL_FOLLOWUP">Proposal Follow-ups</option>
            <option value="GENERAL_FOLLOWUP">General Follow-ups</option>
          </select>
        </div>
      </div>

      <!-- ACTIVITIES LIST -->
      <div class="card activities-card">
        <div class="activities-table-wrap">
          <table class="act-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Activity & Client</th>
                <th>Opportunity</th>
                <th>Due Date & Time</th>
                <th>Assigned Owner</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (act of filteredActivities(); track act.id) {
                <tr class="act-row" [class.is-overdue]="act.status === 'OVERDUE' || isOverdue(act.dueAt, act.status)">
                  <!-- STATUS ICON -->
                  <td class="status-col">
                    @if (act.status === 'COMPLETED') {
                      <span class="material-icons text-success" title="Completed">check_circle</span>
                    } @else if (act.status === 'OVERDUE' || isOverdue(act.dueAt, act.status)) {
                      <span class="material-icons text-danger" title="Overdue">warning</span>
                    } @else {
                      <span class="material-icons text-amber" title="Pending">schedule</span>
                    }
                  </td>

                  <!-- TYPE BADGE -->
                  <td>
                    <span class="type-badge" [style.background]="getTypeBg(act.type)" [style.color]="getTypeColor(act.type)">
                      <span class="material-icons">{{ getTypeIcon(act.type) }}</span>
                      <span>{{ formatType(act.type) }}</span>
                    </span>
                  </td>

                  <!-- TITLE & CLIENT -->
                  <td>
                    <div class="act-title-box">
                      <span class="act-main-title">{{ act.title }}</span>
                      <a [routerLink]="['/sales/clients', act.clientId]" class="act-client-link">
                        <span class="material-icons">business</span> {{ act.clientName }}
                      </a>
                      @if (act.description) {
                        <p class="act-desc-snippet">{{ act.description }}</p>
                      }
                      @if (act.outcome) {
                        <span class="act-outcome-badge">Outcome: {{ act.outcome }}</span>
                      }
                    </div>
                  </td>

                  <!-- OPPORTUNITY -->
                  <td>
                    @if (act.opportunityTitle) {
                      <a [routerLink]="['/sales/opportunities', act.opportunityId]" class="act-opp-link">
                        {{ act.opportunityTitle }}
                      </a>
                    } @else {
                      <span class="text-muted">General Account</span>
                    }
                  </td>

                  <!-- DUE DATE -->
                  <td>
                    <div class="date-cell">
                      <span class="date-main" [class.text-danger]="isOverdue(act.dueAt, act.status)">
                        {{ act.dueAt | date:'mediumDate' }}
                      </span>
                      <span class="time-sub text-muted">{{ act.dueAt | date:'shortTime' }}</span>
                      @if (isOverdue(act.dueAt, act.status)) {
                        <span class="overdue-tag">Overdue</span>
                      }
                    </div>
                  </td>

                  <!-- OWNER -->
                  <td>
                    <div class="owner-cell">
                      <div class="avatar avatar-xs" [style.background]="getAvatarColor(act.assignedToName)">
                        {{ act.assignedToName.charAt(0) }}
                      </div>
                      <span class="owner-name">{{ act.assignedToName }}</span>
                    </div>
                  </td>

                  <!-- ACTIONS -->
                  <td class="text-right">
                    <div class="row-btns">
                      @if (act.status !== 'COMPLETED') {
                        <button class="btn btn-outline btn-xs" (click)="openCompleteModal(act)" title="Mark as Done">
                          <span class="material-icons">check</span> Done
                        </button>
                        <button class="btn btn-light btn-xs" (click)="openRescheduleModal(act)" title="Reschedule">
                          <span class="material-icons">update</span>
                        </button>
                      } @else {
                        <span class="badge badge-success">Done</span>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7">
                    <div class="empty-state-card">
                      <span class="material-icons">task_alt</span>
                      <h4>No activities found in this view</h4>
                      <p>All follow-ups for this tab are up to date.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CREATE ACTIVITY MODAL -->
    @if (showCreateModal()) {
      <div class="modal-overlay" (click)="showCreateModal.set(false)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Schedule New Follow-up</h3>
            <button class="icon-btn" (click)="showCreateModal.set(false)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Client *</label>
              <select [(ngModel)]="newClientId" class="form-control">
                <option value="">Select Client...</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.companyName }} ({{ c.contactPerson }})</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Title / Action Item *</label>
              <input type="text" [(ngModel)]="newTitle" placeholder="e.g. Call Rahul to review proposal quotation" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Activity Type *</label>
              <select [(ngModel)]="newType" class="form-control">
                <option value="CALL">Phone Call</option>
                <option value="EMAIL">Email Outreach</option>
                <option value="MESSAGE">WhatsApp Message</option>
                <option value="PROPOSAL_FOLLOWUP">Proposal Follow-up</option>
                <option value="CLIENT_VISIT">Client Office Visit</option>
                <option value="GENERAL_FOLLOWUP">General Follow-up</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Due Date *</label>
                <input type="date" [(ngModel)]="newDate" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Time</label>
                <input type="time" [(ngModel)]="newTime" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notes & Agenda</label>
              <textarea [(ngModel)]="newDesc" rows="2" placeholder="Key points to discuss..." class="form-control"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showCreateModal.set(false)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" (click)="submitCreate()">Save Activity</button>
          </div>
        </div>
      </div>
    }

    <!-- COMPLETE MODAL (LOG OUTCOME) -->
    @if (activeCompleteAct()) {
      <div class="modal-overlay" (click)="activeCompleteAct.set(null)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Complete Follow-up</h3>
            <button class="icon-btn" (click)="activeCompleteAct.set(null)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <p class="m-hint">Record the outcome of your conversation with <strong>{{ activeCompleteAct()!.clientName }}</strong>:</p>
            <div class="form-group">
              <label class="form-label">Discussion Outcome / Result *</label>
              <textarea [(ngModel)]="outcomeText" rows="3" placeholder="e.g. Client agreed to review commercial quote by Friday. Requested reference architecture." class="form-control"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="activeCompleteAct.set(null)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-gradient" (click)="confirmComplete()">Mark Completed</button>
          </div>
        </div>
      </div>
    }

    <!-- RESCHEDULE MODAL -->
    @if (activeRescheduleAct()) {
      <div class="modal-overlay" (click)="activeRescheduleAct.set(null)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Reschedule Follow-up</h3>
            <button class="icon-btn" (click)="activeRescheduleAct.set(null)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">New Follow-up Date *</label>
              <input type="date" [(ngModel)]="rescheduleDate" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Time</label>
              <input type="time" [(ngModel)]="rescheduleTime" class="form-control" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="activeRescheduleAct.set(null)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" (click)="confirmReschedule()">Update Schedule</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sales-activities-container {
      padding: 24px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .activities-header {
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
    .activities-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #FFFFFF;
      padding: 8px 14px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .tabs-list {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .act-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 0.15s;
    }
    .act-tab:hover {
      background: #F8FAFC;
      color: #101B35;
    }
    .act-tab.active {
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 700;
    }
    .act-tab.tab-overdue.active {
      background: #FEF2F2;
      color: #DC2626;
    }
    .tab-count {
      font-size: 0.7rem;
      background: #E2E8F0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }
    .tab-count-alert {
      font-size: 0.7rem;
      background: #FEE2E2;
      color: #DC2626;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }
    .type-filter {
      padding: 6px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.8rem;
      background: #FFFFFF;
      color: #334155;
      outline: none;
    }

    /* TABLE */
    .activities-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .activities-table-wrap {
      overflow-x: auto;
    }
    .act-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .act-table th {
      background: #F8FAFC;
      padding: 12px 16px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      border-bottom: 1px solid #E2E8F0;
      white-space: nowrap;
    }
    .act-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 0.84rem;
      vertical-align: middle;
    }
    .act-row {
      transition: background 0.15s;
    }
    .act-row:hover {
      background: #F8FAFC;
    }
    .act-row.is-overdue {
      border-left: 3px solid #DC2626;
      background: #FFFDFD;
    }
    .status-col {
      width: 40px;
      text-align: center;
    }
    .status-col .material-icons {
      font-size: 20px;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .type-badge .material-icons {
      font-size: 14px;
    }

    .act-title-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 380px;
    }
    .act-main-title {
      font-weight: 700;
      color: #101B35;
      font-size: 0.88rem;
    }
    .act-client-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #2563EB;
      text-decoration: none;
      font-weight: 600;
    }
    .act-client-link:hover {
      text-decoration: underline;
    }
    .act-client-link .material-icons {
      font-size: 13px;
    }
    .act-desc-snippet {
      font-size: 0.76rem;
      color: #64748B;
      margin: 2px 0 0 0;
    }
    .act-outcome-badge {
      font-size: 0.72rem;
      color: #16A34A;
      background: #F0FDF4;
      padding: 2px 6px;
      border-radius: 4px;
      align-self: flex-start;
      margin-top: 3px;
      font-weight: 500;
    }

    .act-opp-link {
      font-size: 0.82rem;
      color: #334155;
      text-decoration: none;
      font-weight: 600;
    }
    .act-opp-link:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .date-cell {
      display: flex;
      flex-direction: column;
    }
    .date-main {
      font-weight: 600;
      color: #101B35;
      font-size: 0.82rem;
    }
    .time-sub {
      font-size: 0.72rem;
    }
    .overdue-tag {
      font-size: 0.68rem;
      color: #DC2626;
      background: #FEF2F2;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
      align-self: flex-start;
      margin-top: 2px;
    }

    .owner-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .avatar-xs {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      color: #FFFFFF;
      font-size: 0.68rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .owner-name {
      font-size: 0.8rem;
      color: #475569;
    }

    .row-btns {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .empty-state-card {
      text-align: center;
      padding: 40px 20px;
      color: #64748B;
    }
    .empty-state-card .material-icons {
      font-size: 38px;
      color: #16A34A;
      margin-bottom: 6px;
    }
    .empty-state-card h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      color: #101B35;
    }

    /* MODAL BASE */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 18, 38, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-card {
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 480px;
      overflow: hidden;
    }
    .modal-header {
      padding: 14px 18px;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #F8FAFC;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #101B35;
    }
    .modal-body {
      padding: 18px;
    }
    .modal-footer {
      padding: 12px 18px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      background: #F8FAFC;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #172033;
      margin-bottom: 5px;
    }
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .spacer {
      flex: 1;
    }
    .m-hint {
      font-size: 0.84rem;
      color: #475569;
      margin-bottom: 12px;
    }
  `]
})
export class SalesActivitiesComponent implements OnInit {
  private salesService = inject(SalesService);

  activities = signal<SalesActivity[]>([]);
  clients = signal<Client[]>([]);

  currentTab = signal<ActivityTab>('today');
  selectedType = '';

  showCreateModal = signal(false);
  activeCompleteAct = signal<SalesActivity | null>(null);
  activeRescheduleAct = signal<SalesActivity | null>(null);

  // Form fields
  newClientId = '';
  newTitle = '';
  newType: ActivityType = 'CALL';
  newDate = new Date().toISOString().split('T')[0];
  newTime = '11:00';
  newDesc = '';

  outcomeText = '';
  rescheduleDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  rescheduleTime = '11:00';

  todayStr = new Date().toISOString().split('T')[0];

  dueTodayCount = computed(() => {
    return this.activities().filter(a => a.status === 'PENDING' && a.dueAt.startsWith(this.todayStr)).length;
  });

  overdueCount = computed(() => {
    const now = Date.now();
    return this.activities().filter(a => {
      if (a.status !== 'PENDING' && a.status !== 'OVERDUE') return false;
      return new Date(a.dueAt).getTime() < now && !a.dueAt.startsWith(this.todayStr);
    }).length;
  });

  upcomingCount = computed(() => {
    const now = Date.now();
    return this.activities().filter(a => a.status === 'PENDING' && new Date(a.dueAt).getTime() > now && !a.dueAt.startsWith(this.todayStr)).length;
  });

  completedCount = computed(() => {
    return this.activities().filter(a => a.status === 'COMPLETED').length;
  });

  filteredActivities = computed(() => {
    let list = this.activities();
    const tab = this.currentTab();
    const now = Date.now();

    if (tab === 'today') {
      list = list.filter(a => a.status === 'PENDING' && a.dueAt.startsWith(this.todayStr));
    } else if (tab === 'overdue') {
      list = list.filter(a => (a.status === 'OVERDUE' || a.status === 'PENDING') && new Date(a.dueAt).getTime() < now && !a.dueAt.startsWith(this.todayStr));
    } else if (tab === 'upcoming') {
      list = list.filter(a => a.status === 'PENDING' && new Date(a.dueAt).getTime() > now && !a.dueAt.startsWith(this.todayStr));
    } else if (tab === 'completed') {
      list = list.filter(a => a.status === 'COMPLETED');
    }

    if (this.selectedType) {
      list = list.filter(a => a.type === this.selectedType);
    }

    return list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.salesService.getActivities().subscribe(a => this.activities.set(a));
    this.salesService.getClients().subscribe(c => this.clients.set(c));
  }

  setTab(tab: ActivityTab): void {
    this.currentTab.set(tab);
  }

  isOverdue(dueAt: string, status: string): boolean {
    if (status === 'COMPLETED') return false;
    return new Date(dueAt).getTime() < Date.now();
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      CALL: 'call',
      EMAIL: 'email',
      MESSAGE: 'chat',
      MEETING: 'videocam',
      CLIENT_VISIT: 'directions_car',
      PROPOSAL_FOLLOWUP: 'request_quote',
      GENERAL_FOLLOWUP: 'alarm'
    };
    return map[type] || 'task';
  }

  getTypeBg(type: string): string {
    if (type === 'CLIENT_VISIT') return '#F5F3FF';
    if (type === 'CALL') return '#EFF6FF';
    if (type === 'EMAIL') return '#ECFEFF';
    if (type === 'PROPOSAL_FOLLOWUP') return '#FFFBEB';
    return '#F1F5F9';
  }

  getTypeColor(type: string): string {
    if (type === 'CLIENT_VISIT') return '#7C3AED';
    if (type === 'CALL') return '#2563EB';
    if (type === 'EMAIL') return '#0891B2';
    if (type === 'PROPOSAL_FOLLOWUP') return '#D97706';
    return '#475569';
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    const idx = (name || 'U').charCodeAt(0) % colors.length;
    return colors[idx];
  }

  openCompleteModal(act: SalesActivity): void {
    this.activeCompleteAct.set(act);
    this.outcomeText = '';
  }

  confirmComplete(): void {
    const act = this.activeCompleteAct();
    if (!act) return;
    this.salesService.completeActivity(act.id, this.outcomeText || 'Completed').subscribe(() => {
      this.activeCompleteAct.set(null);
      this.refresh();
    });
  }

  openRescheduleModal(act: SalesActivity): void {
    this.activeRescheduleAct.set(act);
    this.rescheduleDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  }

  confirmReschedule(): void {
    const act = this.activeRescheduleAct();
    if (!act) return;
    const newDueAt = `${this.rescheduleDate}T${this.rescheduleTime}:00Z`;
    this.salesService.rescheduleActivity(act.id, newDueAt).subscribe(() => {
      this.activeRescheduleAct.set(null);
      this.refresh();
    });
  }

  submitCreate(): void {
    if (!this.newClientId || !this.newTitle.trim()) return;
    const client = this.clients().find(c => c.id === this.newClientId);

    this.salesService.createActivity({
      clientId: this.newClientId,
      clientName: client?.companyName || 'Client',
      title: this.newTitle,
      type: this.newType,
      description: this.newDesc,
      dueAt: `${this.newDate}T${this.newTime}:00Z`
    }).subscribe(() => {
      this.showCreateModal.set(false);
      this.newTitle = '';
      this.newDesc = '';
      this.refresh();
    });
  }
}
