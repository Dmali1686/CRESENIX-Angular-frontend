import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { EmployeeService } from '../../../core/services/employee.service';
import {
  SalesOpportunity,
  SalesPipelineStage,
  OpportunityPriority,
  LeadSource
} from '../../../shared/models/index';
import { AddClientModalComponent } from '../shared/add-client-modal/add-client-modal.component';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';
import { StageChangeModalComponent } from '../shared/stage-change-modal/stage-change-modal.component';
import { ConvertProjectModalComponent } from '../shared/convert-project-modal/convert-project-modal.component';

interface StageColumnDef {
  id: SalesPipelineStage;
  label: string;
  color: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-sales-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    AddClientModalComponent,
    ScheduleMeetingModalComponent,
    StageChangeModalComponent,
    ConvertProjectModalComponent
  ],
  template: `
    <div class="sales-pipeline-container">
      <!-- HEADER -->
      <div class="pipeline-header">
        <div class="header-left">
          <div class="header-title-row">
            <h1 class="page-title">Sales Pipeline</h1>
            <span class="total-badge">{{ filteredOpportunities().length }} Opportunities</span>
            <span class="pipeline-val-badge">₹{{ (totalFilteredValue() / 100000).toFixed(2) }} Lakh Value</span>
          </div>
          <p class="page-subtitle">Track potential software development clients from inquiry to project handover</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-outline btn-sm" (click)="toggleHideClosed()">
            <span class="material-icons">{{ hideClosed() ? 'visibility' : 'visibility_off' }}</span>
            {{ hideClosed() ? 'Show Closed Won/Lost' : 'Hide Closed Deals' }}
          </button>
          <a routerLink="/sales/clients" class="btn btn-outline btn-sm">
            <span class="material-icons">business</span> Client Directory
          </a>
          <button class="btn btn-gradient btn-sm" (click)="showAddClientModal.set(true)">
            <span class="material-icons">person_add</span> + Add Client
          </button>
        </div>
      </div>

      <!-- FILTER TOOLBAR -->
      <div class="filter-toolbar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search by client, title, contact..." [(ngModel)]="searchQuery" />
          @if (searchQuery) {
            <button class="clear-search" (click)="searchQuery = ''"><span class="material-icons">close</span></button>
          }
        </div>

        <div class="filters-group">
          <select [(ngModel)]="selectedOwner" class="filter-select">
            <option value="">All Sales Owners</option>
            @for (emp of salesEmployees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
            }
          </select>

          <select [(ngModel)]="selectedSource" class="filter-select">
            <option value="">All Lead Sources</option>
            <option value="WEBSITE_ENQUIRY">Website Enquiry</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="REFERRAL">Referral</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="COLD_CALLING">Cold Calling</option>
            <option value="EXISTING_CLIENT">Existing Client</option>
          </select>

          <select [(ngModel)]="selectedPriority" class="filter-select">
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          @if (hasActiveFilters()) {
            <button class="btn-clear-filters" (click)="clearFilters()">
              <span class="material-icons">filter_alt_off</span> Reset
            </button>
          }
        </div>
      </div>

      <!-- KANBAN BOARD HORIZONTAL SCROLL -->
      <div class="kanban-board-wrapper">
        <div class="kanban-board">
          @for (col of visibleColumns(); track col.id) {
            <div class="kanban-column"
                 (dragover)="onDragOver($event)"
                 (drop)="onDrop($event, col.id)">
              <!-- COLUMN HEADER -->
              <div class="column-header" [style.border-top-color]="col.color">
                <div class="col-title-line">
                  <span class="col-dot" [style.background]="col.color"></span>
                  <span class="col-title">{{ col.label }}</span>
                  <span class="col-count-pill">{{ getColumnOpportunities(col.id).length }}</span>
                </div>
                <div class="col-val-line">
                  <span>Total: <strong>₹{{ (getColumnValue(col.id) / 100000).toFixed(1) }}L</strong></span>
                </div>
              </div>

              <!-- COLUMN CARDS CONTAINER -->
              <div class="column-cards-container">
                @for (opp of getColumnOpportunities(col.id); track opp.id) {
                  <div class="opportunity-card"
                       draggable="true"
                       (dragstart)="onDragStart($event, opp)"
                       [class.is-won]="opp.stage === 'CLOSED_WON'"
                       [class.is-lost]="opp.stage === 'CLOSED_LOST'"
                       [routerLink]="['/sales/opportunities', opp.id]">
                    <!-- CARD TOP: CLIENT & PRIORITY -->
                    <div class="card-top-meta">
                      <span class="client-name">{{ opp.clientName }}</span>
                      <span class="badge" [class]="getPriorityClass(opp.priority)">{{ opp.priority }}</span>
                    </div>

                    <!-- OPPORTUNITY TITLE & SERVICE -->
                    <h4 class="card-opp-title">{{ opp.title }}</h4>
                    <div class="service-pill">
                      <span class="material-icons">category</span>
                      <span>{{ opp.serviceType }}</span>
                    </div>

                    <!-- ESTIMATED VALUE & SOURCE -->
                    <div class="card-value-line">
                      <div class="deal-value">
                        <span class="rupee-sym">₹</span>
                        <span class="val-num">{{ (opp.estimatedValue || 0).toLocaleString('en-IN') }}</span>
                      </div>
                      <span class="source-tag">{{ formatSource(opp.leadSource) }}</span>
                    </div>

                    <!-- NEXT ACTION / MEETING HIGHLIGHT -->
                    @if (opp.nextMeetingAt) {
                      <div class="next-meeting-box">
                        <span class="material-icons">event</span>
                        <div class="nm-text">
                          <span class="nm-label">Meeting:</span>
                          <span class="nm-val">{{ formatDateTime(opp.nextMeetingAt) }}</span>
                        </div>
                      </div>
                    } @else if (opp.nextAction) {
                      <div class="next-action-box">
                        <span class="material-icons">schedule</span>
                        <span class="na-text">{{ opp.nextAction }}</span>
                      </div>
                    }

                    <!-- CARD FOOTER: OWNER, STAGE DAYS & QUICK ACTIONS -->
                    <div class="card-footer-meta" (click)="$event.stopPropagation()">
                      <div class="owner-pill" [title]="'Assigned to: ' + opp.assignedToName">
                        <div class="avatar avatar-xs" [style.background]="getAvatarColor(opp.assignedToName)">
                          {{ opp.assignedToName.charAt(0) }}
                        </div>
                        <span class="owner-name">{{ opp.assignedToName }}</span>
                      </div>

                      <div class="footer-actions">
                        <span class="days-pill" [title]="opp.stageDays + ' days in this stage'">
                          <span class="material-icons">history</span> {{ opp.stageDays }}d
                        </span>

                        <!-- ACTION POPUP / STAGE BUTTON -->
                        <div class="card-dropdown-wrap">
                          <button class="card-action-btn" (click)="openQuickStage(opp)" title="Move Stage">
                            <span class="material-icons">swap_horiz</span>
                          </button>
                        </div>

                        @if (opp.stage === 'CLOSED_WON' && !opp.isConvertedToProject) {
                          <button class="btn btn-gradient btn-xxs" (click)="openConvertModal(opp)" title="Convert Deal to Project Pipeline">
                            <span class="material-icons">rocket_launch</span> Handover
                          </button>
                        } @else if (opp.isConvertedToProject) {
                          <span class="converted-pill" title="Project already active in pipeline">
                            <span class="material-icons">check_circle</span> Active PRJ
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="column-empty-state">
                    <span class="material-icons">inbox</span>
                    <span>No leads in this stage</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- MODALS -->
    @if (showAddClientModal()) {
      <app-add-client-modal (close)="showAddClientModal.set(false)" (clientCreated)="refresh()" />
    }

    @if (selectedOpportunityForStage()) {
      <app-stage-change-modal
        [opportunity]="selectedOpportunityForStage()!"
        [initialTargetStage]="dragTargetStage()"
        (close)="selectedOpportunityForStage.set(null)"
        (updated)="refresh()"
      />
    }

    @if (selectedOpportunityForConvert()) {
      <app-convert-project-modal
        [opportunity]="selectedOpportunityForConvert()!"
        (close)="selectedOpportunityForConvert.set(null)"
        (converted)="refresh()"
      />
    }

    @if (selectedOpportunityForMeeting()) {
      <app-schedule-meeting-modal
        [preselectedClientId]="selectedOpportunityForMeeting()!.clientId"
        [preselectedOpportunityId]="selectedOpportunityForMeeting()!.id"
        (close)="selectedOpportunityForMeeting.set(null)"
        (scheduled)="refresh()"
      />
    }
  `,
  styles: [`
    .sales-pipeline-container {
      padding: 20px 24px;
      height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }
    .pipeline-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 16px;
      flex-shrink: 0;
    }
    .header-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #101B35;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .total-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      background: #EFF6FF;
      color: #2563EB;
    }
    .pipeline-val-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      background: #F0FDF4;
      color: #16A34A;
      border: 1px solid #BBF7D0;
    }
    .page-subtitle {
      font-size: 0.84rem;
      color: #64748B;
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* FILTER TOOLBAR */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #FFFFFF;
      padding: 10px 14px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 14px;
      flex-shrink: 0;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 6px 10px;
      width: 280px;
    }
    .search-box .material-icons {
      font-size: 18px;
      color: #94A3B8;
    }
    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.82rem;
      width: 100%;
      color: #172033;
    }
    .clear-search {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: #94A3B8;
      display: flex;
    }
    .filters-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-select {
      padding: 6px 10px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #334155;
      background: #FFFFFF;
      outline: none;
      cursor: pointer;
    }
    .filter-select:focus {
      border-color: #2563EB;
    }
    .btn-clear-filters {
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

    /* KANBAN BOARD */
    .kanban-board-wrapper {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 8px;
    }
    .kanban-board {
      display: inline-flex;
      gap: 14px;
      height: 100%;
      min-width: 100%;
      align-items: stretch;
    }
    .kanban-column {
      width: 290px;
      flex-shrink: 0;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .column-header {
      padding: 12px 14px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      border-top: 3.5px solid #2563EB;
      flex-shrink: 0;
    }
    .col-title-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 4px;
    }
    .col-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .col-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: #101B35;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .col-count-pill {
      font-size: 0.72rem;
      font-weight: 700;
      background: #F1F5F9;
      color: #475569;
      padding: 1px 7px;
      border-radius: 10px;
    }
    .col-val-line {
      font-size: 0.72rem;
      color: #64748B;
    }
    .col-val-line strong {
      color: #101B35;
    }

    .column-cards-container {
      padding: 12px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* CARD STYLES */
    .opportunity-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      cursor: grab;
      user-select: none;
      transition: all 0.15s ease-out;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .opportunity-card:hover {
      border-color: #2563EB;
      box-shadow: 0 6px 14px rgba(37, 99, 235, 0.08);
      transform: translateY(-2px);
    }
    .opportunity-card:active {
      cursor: grabbing;
    }
    .opportunity-card.is-won {
      border-left: 3.5px solid #16A34A;
      background: #FAFDFB;
    }
    .opportunity-card.is-lost {
      border-left: 3.5px solid #94A3B8;
      opacity: 0.85;
    }
    .card-top-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .client-name {
      font-size: 0.76rem;
      font-weight: 700;
      color: #2563EB;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-opp-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #101B35;
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .service-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      color: #475569;
      background: #F1F5F9;
      padding: 2px 7px;
      border-radius: 4px;
      align-self: flex-start;
    }
    .service-pill .material-icons {
      font-size: 13px;
      color: #64748B;
    }
    .card-value-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2px;
    }
    .deal-value {
      display: flex;
      align-items: baseline;
      color: #101B35;
    }
    .rupee-sym {
      font-size: 0.76rem;
      font-weight: 700;
      color: #16A34A;
      margin-right: 2px;
    }
    .val-num {
      font-size: 0.95rem;
      font-weight: 800;
      color: #16A34A;
    }
    .source-tag {
      font-size: 0.68rem;
      color: #64748B;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* NEXT ACTION BOX */
    .next-meeting-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 6px;
      padding: 5px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .next-meeting-box .material-icons {
      font-size: 15px;
      color: #2563EB;
    }
    .nm-text {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
    }
    .nm-label {
      color: #1D4ED8;
      font-weight: 600;
    }
    .nm-val {
      color: #1E3A8A;
      font-weight: 700;
    }
    .next-action-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      padding: 5px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .next-action-box .material-icons {
      font-size: 15px;
      color: #D97706;
    }
    .na-text {
      font-size: 0.72rem;
      color: #92400E;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* CARD FOOTER */
    .card-footer-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px dashed #F1F5F9;
    }
    .owner-pill {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .avatar-xs {
      width: 20px;
      height: 20px;
      font-size: 0.65rem;
      border-radius: 50%;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .owner-name {
      font-size: 0.72rem;
      color: #64748B;
      font-weight: 500;
    }
    .footer-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .days-pill {
      font-size: 0.68rem;
      color: #94A3B8;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .days-pill .material-icons {
      font-size: 13px;
    }
    .card-action-btn {
      background: #F1F5F9;
      border: none;
      border-radius: 6px;
      padding: 4px;
      cursor: pointer;
      display: flex;
      color: #64748B;
      transition: all 0.15s;
    }
    .card-action-btn:hover {
      background: #E2E8F0;
      color: #2563EB;
    }
    .card-action-btn .material-icons {
      font-size: 16px;
    }
    .btn-xxs {
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .btn-xxs .material-icons {
      font-size: 13px;
    }
    .converted-pill {
      font-size: 0.68rem;
      color: #16A34A;
      background: #F0FDF4;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 3px;
      font-weight: 700;
    }
    .converted-pill .material-icons {
      font-size: 13px;
    }

    .column-empty-state {
      padding: 30px 10px;
      text-align: center;
      color: #94A3B8;
      font-size: 0.78rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .column-empty-state .material-icons {
      font-size: 28px;
    }
  `]
})
export class SalesPipelineComponent implements OnInit {
  private salesService = inject(SalesService);
  private empService = inject(EmployeeService);
  private router = inject(Router);

  opportunities = signal<SalesOpportunity[]>([]);
  salesEmployees = signal<any[]>([]);

  searchQuery = '';
  selectedOwner = '';
  selectedSource = '';
  selectedPriority = '';
  hideClosed = signal(false);

  showAddClientModal = signal(false);
  selectedOpportunityForStage = signal<SalesOpportunity | null>(null);
  dragTargetStage = signal<SalesPipelineStage | undefined>(undefined);
  selectedOpportunityForConvert = signal<SalesOpportunity | null>(null);
  selectedOpportunityForMeeting = signal<SalesOpportunity | null>(null);

  draggedOpportunity: SalesOpportunity | null = null;

  stageDefinitions: StageColumnDef[] = [
    { id: 'NEW_LEAD', label: '1. New Lead', color: '#06B6D4', icon: 'fiber_new', description: 'Capture contact details & source' },
    { id: 'CONTACTED', label: '2. Contacted', color: '#3B82F6', icon: 'call', description: 'Initial outreach made' },
    { id: 'QUALIFIED', label: '3. Qualified', color: '#6366F1', icon: 'verified', description: 'Requirement & budget confirmed' },
    { id: 'DISCOVERY_SCHEDULED', label: '4. Discovery Scheduled', color: '#8B5CF6', icon: 'event', description: 'Meeting on calendar' },
    { id: 'DISCOVERY_COMPLETED', label: '5. Discovery Completed', color: '#A855F7', icon: 'description', description: 'Requirements logged' },
    { id: 'PROPOSAL_QUOTATION', label: '6. Proposal / Quotation', color: '#EC4899', icon: 'request_quote', description: 'Commercial quote sent' },
    { id: 'NEGOTIATION', label: '7. Negotiation', color: '#F59E0B', icon: 'handshake', description: 'Finalizing terms & scope' },
    { id: 'CLOSED_WON', label: '8. Closed Won', color: '#16A34A', icon: 'emoji_events', description: 'Agreed! Ready for handover' },
    { id: 'CLOSED_LOST', label: '9. Closed Lost', color: '#64748B', icon: 'cancel', description: 'Opportunity closed with reason' },
  ];

  visibleColumns = computed(() => {
    if (this.hideClosed()) {
      return this.stageDefinitions.filter(s => s.id !== 'CLOSED_WON' && s.id !== 'CLOSED_LOST');
    }
    return this.stageDefinitions;
  });

  filteredOpportunities = computed(() => {
    let list = this.opportunities();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.contactPerson.toLowerCase().includes(q) ||
        o.serviceType.toLowerCase().includes(q)
      );
    }

    if (this.selectedOwner) {
      list = list.filter(o => o.assignedTo === this.selectedOwner);
    }

    if (this.selectedSource) {
      list = list.filter(o => o.leadSource === this.selectedSource);
    }

    if (this.selectedPriority) {
      list = list.filter(o => o.priority === this.selectedPriority);
    }

    return list;
  });

  totalFilteredValue = computed(() => {
    return this.filteredOpportunities().reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
  });

  ngOnInit(): void {
    this.refresh();
    this.empService.getEmployees().subscribe(res => {
      if (res && Array.isArray(res)) {
        this.salesEmployees.set(res);
      }
    });
  }

  refresh(): void {
    this.salesService.getOpportunities().subscribe(list => this.opportunities.set(list));
  }

  getColumnOpportunities(stage: SalesPipelineStage): SalesOpportunity[] {
    return this.filteredOpportunities().filter(o => o.stage === stage);
  }

  getColumnValue(stage: SalesPipelineStage): number {
    return this.getColumnOpportunities(stage).reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
  }

  toggleHideClosed(): void {
    this.hideClosed.update(v => !v);
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedOwner || this.selectedSource || this.selectedPriority);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedOwner = '';
    this.selectedSource = '';
    this.selectedPriority = '';
  }

  formatSource(src: LeadSource): string {
    const map: Record<string, string> = {
      WEBSITE_ENQUIRY: 'Website',
      LINKEDIN: 'LinkedIn',
      INSTAGRAM: 'Instagram',
      REFERRAL: 'Referral',
      COLD_CALLING: 'Cold Call',
      WHATSAPP: 'WhatsApp',
      EMAIL: 'Email',
      ADVERTISEMENT: 'Ads',
      EXISTING_CLIENT: 'Existing',
      WALK_IN: 'Walk-in',
      OTHER: 'Other'
    };
    return map[src] || src;
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
             d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getPriorityClass(priority: OpportunityPriority): string {
    if (priority === 'CRITICAL') return 'badge-danger';
    if (priority === 'HIGH') return 'badge-warning';
    if (priority === 'MEDIUM') return 'badge-info';
    return 'badge-gray';
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    const idx = (name || 'U').charCodeAt(0) % colors.length;
    return colors[idx];
  }

  // DRAG & DROP
  onDragStart(event: DragEvent, opp: SalesOpportunity): void {
    this.draggedOpportunity = opp;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', opp.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetStage: SalesPipelineStage): void {
    event.preventDefault();
    if (!this.draggedOpportunity) return;
    if (this.draggedOpportunity.stage === targetStage) return;

    // Prompt stage transition modal
    this.dragTargetStage.set(targetStage);
    this.selectedOpportunityForStage.set(this.draggedOpportunity);
    this.draggedOpportunity = null;
  }

  openQuickStage(opp: SalesOpportunity): void {
    this.dragTargetStage.set(undefined);
    this.selectedOpportunityForStage.set(opp);
  }

  openConvertModal(opp: SalesOpportunity): void {
    this.selectedOpportunityForConvert.set(opp);
  }
}
