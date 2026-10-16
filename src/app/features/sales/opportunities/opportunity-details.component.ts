import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import {
  SalesOpportunity,
  SalesPipelineStage,
  SalesActivity,
  SalesMeeting,
  StageHistoryEntry
} from '../../../shared/models/index';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';
import { StageChangeModalComponent } from '../shared/stage-change-modal/stage-change-modal.component';
import { ConvertProjectModalComponent } from '../shared/convert-project-modal/convert-project-modal.component';

@Component({
  selector: 'app-opportunity-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ScheduleMeetingModalComponent,
    StageChangeModalComponent,
    ConvertProjectModalComponent
  ],
  template: `
    @if (opportunity()) {
      <div class="opportunity-detail-container">
        <!-- BREADCRUMB -->
        <div class="opp-breadcrumb">
          <a routerLink="/sales/pipeline" class="crumb-link">
            <span class="material-icons">arrow_back</span> Sales Pipeline
          </a>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ opportunity()!.title }}</span>
        </div>

        <!-- HEADER BANNER -->
        <div class="card opp-header-banner">
          <div class="opp-header-left">
            <div class="opp-client-tag" [routerLink]="['/sales/clients', opportunity()!.clientId]">
              <span class="material-icons">business</span>
              <span>{{ opportunity()!.clientName }}</span>
            </div>
            <h1 class="opp-main-title">{{ opportunity()!.title }}</h1>
            <div class="opp-meta-pills">
              <span class="pill-service">{{ opportunity()!.serviceType }}</span>
              <span class="pill-source">Source: {{ opportunity()!.leadSource }}</span>
              <span class="pill-owner">Owner: <strong>{{ opportunity()!.assignedToName }}</strong></span>
              <span class="badge" [class]="getPriorityClass(opportunity()!.priority)">{{ opportunity()!.priority }}</span>
            </div>
          </div>

          <div class="opp-header-right">
            <div class="value-highlight">
              <span class="val-title">Estimated Deal Value</span>
              <span class="val-num">₹{{ (opportunity()!.estimatedValue || 0).toLocaleString('en-IN') }}</span>
              <span class="val-sub">{{ opportunity()!.budgetStatus || 'Budget discussed' }}</span>
            </div>

            <div class="header-btns">
              <button class="btn btn-outline btn-sm" (click)="openStageModal()">
                <span class="material-icons">swap_horiz</span> Change Stage
              </button>
              <button class="btn btn-outline btn-sm" (click)="showScheduleModal.set(true)">
                <span class="material-icons">event</span> Schedule Meeting
              </button>
              @if (opportunity()!.stage === 'CLOSED_WON' && !opportunity()!.isConvertedToProject) {
                <button class="btn btn-gradient btn-sm" (click)="openConvertModal()">
                  <span class="material-icons">rocket_launch</span> Convert to Project
                </button>
              } @else if (opportunity()!.isConvertedToProject) {
                <span class="badge badge-success px-3 py-2">
                  <span class="material-icons">check_circle</span> Converted into Project
                </span>
              }
            </div>
          </div>
        </div>

        <!-- STAGE PROGRESSION COMPONENT -->
        <div class="card stage-progression-card">
          <div class="progression-bar">
            @for (stg of pipelineStages; track stg.key; let idx = $index) {
              <div class="prog-step"
                   [class.active]="opportunity()!.stage === stg.key"
                   [class.completed]="isStepCompleted(stg.key)"
                   (click)="quickMoveToStage(stg.key)">
                <div class="step-circle">
                  @if (isStepCompleted(stg.key)) {
                    <span class="material-icons">check</span>
                  } @else {
                    {{ idx + 1 }}
                  }
                </div>
                <span class="step-title">{{ stg.label }}</span>
              </div>
              @if (idx < pipelineStages.length - 1) {
                <div class="step-connector" [class.filled]="isStepCompleted(pipelineStages[idx + 1].key)"></div>
              }
            }
          </div>
        </div>

        <!-- TWO COLUMN DETAILS GRID -->
        <div class="opp-details-grid">
          <!-- LEFT: SPECIFICATIONS & SCOPE -->
          <div class="opp-details-col">
            <div class="card detail-panel">
              <h3 class="panel-title">Requirement Summary & Problem Statement</h3>
              <div class="scope-text-box">
                {{ opportunity()!.requirementSummary || 'No requirement summary captured yet.' }}
              </div>

              <div class="specs-grid mt-3">
                <div class="spec-card">
                  <span class="spec-label">Expected Close Date</span>
                  <span class="spec-val font-semibold">{{ opportunity()!.expectedCloseDate || 'Not set' }}</span>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Decision Maker</span>
                  <span class="spec-val">{{ opportunity()!.decisionMaker || opportunity()!.contactPerson }}</span>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Decision Maker Role</span>
                  <span class="spec-val">{{ opportunity()!.decisionMakerRole || 'Stakeholder' }}</span>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Proposal Status</span>
                  <span class="spec-val">
                    <span class="badge badge-info">{{ opportunity()!.proposalStatus }}</span>
                  </span>
                </div>
              </div>

              <!-- NEXT ACTION PROMPT -->
              <div class="next-action-prompt mt-4">
                <span class="material-icons text-amber">alarm</span>
                <div class="na-info">
                  <span class="na-label">Next Agreed Action:</span>
                  <p class="na-desc">{{ opportunity()!.nextAction || 'Schedule follow-up' }}</p>
                  @if (opportunity()!.nextFollowUpAt) {
                    <span class="na-date">Due: {{ opportunity()!.nextFollowUpAt | date:'mediumDate' }}</span>
                  }
                </div>
                <button class="btn btn-outline btn-xs" (click)="showScheduleModal.set(true)">Act Now</button>
              </div>
            </div>

            <!-- ASSOCIATED MEETINGS -->
            <div class="card detail-panel mt-3">
              <div class="panel-header-inline">
                <h3 class="panel-title">Associated Meetings & Client Visits</h3>
                <button class="btn btn-outline btn-xs" (click)="showScheduleModal.set(true)">+ Schedule</button>
              </div>

              <div class="meetings-sub-list">
                @for (m of associatedMeetings(); track m.id) {
                  <div class="meeting-sub-item">
                    <span class="material-icons">{{ m.type.includes('VISIT') ? 'directions_car' : 'videocam' }}</span>
                    <div class="m-sub-info">
                      <span class="m-sub-title">{{ m.title }}</span>
                      <span class="m-sub-time">{{ m.date }} &bull; {{ m.startTime }} - {{ m.endTime }}</span>
                    </div>
                    <span class="badge badge-gray">{{ m.status }}</span>
                  </div>
                } @empty {
                  <div class="empty-state-sm">No meetings scheduled for this opportunity</div>
                }
              </div>
            </div>
          </div>

          <!-- RIGHT: STAGE HISTORY & CONTACT DETAILS -->
          <div class="opp-details-col">
            <div class="card detail-panel">
              <h3 class="panel-title">Client & Contact Overview</h3>
              <div class="contact-details-box">
                <div class="cd-row">
                  <span class="cd-label">Company:</span>
                  <a [routerLink]="['/sales/clients', opportunity()!.clientId]" class="cd-val link">{{ opportunity()!.clientName }}</a>
                </div>
                <div class="cd-row">
                  <span class="cd-label">Contact Person:</span>
                  <span class="cd-val">{{ opportunity()!.contactPerson }}</span>
                </div>
                <div class="cd-row">
                  <span class="cd-label">Phone:</span>
                  <a [href]="'tel:' + opportunity()!.contactPhone" class="cd-val link">{{ opportunity()!.contactPhone }}</a>
                </div>
                <div class="cd-row">
                  <span class="cd-label">Email:</span>
                  <a [href]="'mailto:' + opportunity()!.contactEmail" class="cd-val link">{{ opportunity()!.contactEmail }}</a>
                </div>
              </div>
            </div>

            <!-- STAGE TRANSITION HISTORY -->
            <div class="card detail-panel mt-3">
              <h3 class="panel-title">Stage Transition History</h3>
              <div class="stage-history-timeline">
                @for (entry of opportunityHistory(); track entry.id) {
                  <div class="sh-entry">
                    <div class="sh-dot"></div>
                    <div class="sh-body">
                      <div class="sh-top">
                        <span class="sh-stage">{{ formatStage(entry.toStage) }}</span>
                        <span class="sh-time">{{ entry.timestamp | date:'short' }}</span>
                      </div>
                      <p class="sh-notes">{{ entry.notes || 'Stage moved' }}</p>
                      <span class="sh-by">By {{ entry.changedByName }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state-sm">No stage transition history recorded</div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="loading-state">
        <span class="spinner-sm"></span> Loading opportunity details...
      </div>
    }

    <!-- MODALS -->
    @if (showScheduleModal()) {
      <app-schedule-meeting-modal
        [preselectedClientId]="opportunity()?.clientId"
        [preselectedOpportunityId]="opportunity()?.id"
        (close)="showScheduleModal.set(false)"
        (scheduled)="refresh()"
      />
    }

    @if (showStageModal()) {
      <app-stage-change-modal
        [opportunity]="opportunity()!"
        [initialTargetStage]="selectedTargetStage()"
        (close)="showStageModal.set(false)"
        (updated)="refresh()"
      />
    }

    @if (showConvertModal()) {
      <app-convert-project-modal
        [opportunity]="opportunity()!"
        (close)="showConvertModal.set(false)"
        (converted)="refresh()"
      />
    }
  `,
  styles: [`
    .opportunity-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .opp-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #64748B;
      margin-bottom: 16px;
    }
    .crumb-link {
      color: #2563EB;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    .crumb-link .material-icons {
      font-size: 16px;
    }
    .crumb-current {
      font-weight: 700;
      color: #101B35;
    }

    /* HEADER BANNER */
    .opp-header-banner {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 22px 26px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .opp-client-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #2563EB;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      margin-bottom: 6px;
    }
    .opp-client-tag:hover {
      text-decoration: underline;
    }
    .opp-client-tag .material-icons {
      font-size: 16px;
    }
    .opp-main-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #101B35;
      margin: 0 0 10px 0;
    }
    .opp-meta-pills {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .pill-service {
      background: #EFF6FF;
      color: #1D4ED8;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 6px;
    }
    .pill-source, .pill-owner {
      background: #F1F5F9;
      color: #475569;
      font-size: 0.76rem;
      padding: 3px 9px;
      border-radius: 6px;
    }
    .opp-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }
    .value-highlight {
      text-align: right;
    }
    .val-title {
      display: block;
      font-size: 0.74rem;
      color: #64748B;
      text-transform: uppercase;
      font-weight: 600;
    }
    .val-num {
      display: block;
      font-size: 1.6rem;
      font-weight: 800;
      color: #16A34A;
      line-height: 1.2;
    }
    .val-sub {
      font-size: 0.72rem;
      color: #64748B;
    }
    .header-btns {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* STAGE PROGRESSION */
    .stage-progression-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .progression-bar {
      display: flex;
      align-items: center;
      min-width: 800px;
      justify-content: space-between;
    }
    .prog-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s;
    }
    .prog-step:hover {
      transform: translateY(-2px);
    }
    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #F1F5F9;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      margin-bottom: 6px;
      border: 2px solid #CBD5E1;
      transition: all 0.2s;
    }
    .step-title {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748B;
      white-space: nowrap;
    }
    .prog-step.active .step-circle {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
    }
    .prog-step.active .step-title {
      color: #2563EB;
      font-weight: 700;
    }
    .prog-step.completed .step-circle {
      background: #16A34A;
      color: #FFFFFF;
      border-color: #16A34A;
    }
    .prog-step.completed .step-circle .material-icons {
      font-size: 16px;
    }
    .step-connector {
      flex: 1;
      height: 3px;
      background: #E2E8F0;
      margin: 0 8px 20px 8px;
    }
    .step-connector.filled {
      background: #16A34A;
    }

    /* GRID */
    .opp-details-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
    }
    .opp-details-col {
      display: flex;
      flex-direction: column;
    }
    .detail-panel {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .panel-title {
      font-size: 1rem;
      font-weight: 700;
      color: #101B35;
      margin: 0 0 12px 0;
    }
    .panel-header-inline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .scope-text-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px;
      font-size: 0.86rem;
      color: #334155;
      line-height: 1.5;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .spec-card {
      background: #F8FAFC;
      padding: 10px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }
    .spec-label {
      font-size: 0.72rem;
      color: #64748B;
    }
    .spec-val {
      font-size: 0.86rem;
      color: #101B35;
    }

    .next-action-prompt {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .next-action-prompt .material-icons {
      font-size: 24px;
    }
    .na-info {
      flex: 1;
    }
    .na-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #92400E;
      text-transform: uppercase;
    }
    .na-desc {
      font-size: 0.84rem;
      font-weight: 700;
      color: #78350F;
      margin: 1px 0 2px 0;
    }
    .na-date {
      font-size: 0.74rem;
      color: #B45309;
    }

    .contact-details-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cd-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.84rem;
      padding-bottom: 8px;
      border-bottom: 1px solid #F8FAFC;
    }
    .cd-label {
      color: #64748B;
    }
    .cd-val {
      color: #101B35;
      font-weight: 500;
    }
    .cd-val.link {
      color: #2563EB;
      text-decoration: none;
    }

    /* HISTORY TIMELINE */
    .stage-history-timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 6px;
    }
    .sh-entry {
      display: flex;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .sh-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #2563EB;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .sh-body {
      flex: 1;
    }
    .sh-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .sh-stage {
      font-size: 0.84rem;
      font-weight: 700;
      color: #101B35;
    }
    .sh-time {
      font-size: 0.72rem;
      color: #94A3B8;
    }
    .sh-notes {
      font-size: 0.8rem;
      color: #475569;
      margin: 0 0 2px 0;
    }
    .sh-by {
      font-size: 0.72rem;
      color: #64748B;
    }

    .meetings-sub-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meeting-sub-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #F8FAFC;
    }
    .meeting-sub-item .material-icons {
      font-size: 20px;
      color: #2563EB;
    }
    .m-sub-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .m-sub-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #101B35;
    }
    .m-sub-time {
      font-size: 0.72rem;
      color: #64748B;
    }
  `]
})
export class OpportunityDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);

  opportunity = signal<SalesOpportunity | null>(null);
  meetings = signal<SalesMeeting[]>([]);
  history = signal<StageHistoryEntry[]>([]);

  showScheduleModal = signal(false);
  showStageModal = signal(false);
  showConvertModal = signal(false);
  selectedTargetStage = signal<SalesPipelineStage | undefined>(undefined);

  pipelineStages: { key: SalesPipelineStage; label: string }[] = [
    { key: 'NEW_LEAD', label: '1. New Lead' },
    { key: 'CONTACTED', label: '2. Contacted' },
    { key: 'QUALIFIED', label: '3. Qualified' },
    { key: 'DISCOVERY_SCHEDULED', label: '4. Discovery' },
    { key: 'DISCOVERY_COMPLETED', label: '5. Disc. Done' },
    { key: 'PROPOSAL_QUOTATION', label: '6. Proposal' },
    { key: 'NEGOTIATION', label: '7. Negotiation' },
    { key: 'CLOSED_WON', label: '8. Won' },
  ];

  associatedMeetings = computed(() => {
    const opp = this.opportunity();
    if (!opp) return [];
    return this.meetings().filter(m => m.opportunityId === opp.id || m.clientId === opp.clientId);
  });

  opportunityHistory = computed(() => {
    const opp = this.opportunity();
    if (!opp) return [];
    return this.history().filter(h => h.opportunityId === opp.id);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadOpportunity(id);
      }
    });
  }

  loadOpportunity(id: string): void {
    this.salesService.getOpportunityById(id).subscribe(opp => {
      if (opp) {
        this.opportunity.set(opp);
      }
    });
    this.salesService.getSalesMeetings().subscribe(m => this.meetings.set(m));
    this.salesService.stageHistory$.subscribe(h => this.history.set(h));
  }

  refresh(): void {
    const opp = this.opportunity();
    if (opp) this.loadOpportunity(opp.id);
  }

  isStepCompleted(stage: SalesPipelineStage): boolean {
    const opp = this.opportunity();
    if (!opp) return false;
    const stages = this.pipelineStages.map(s => s.key);
    const currIdx = stages.indexOf(opp.stage);
    const stepIdx = stages.indexOf(stage);
    return stepIdx < currIdx || opp.stage === 'CLOSED_WON';
  }

  quickMoveToStage(stage: SalesPipelineStage): void {
    this.selectedTargetStage.set(stage);
    this.showStageModal.set(true);
  }

  openStageModal(): void {
    this.selectedTargetStage.set(undefined);
    this.showStageModal.set(true);
  }

  openConvertModal(): void {
    this.showConvertModal.set(true);
  }

  formatStage(stage: SalesPipelineStage): string {
    return stage.replace(/_/g, ' ');
  }

  getPriorityClass(priority: string): string {
    if (priority === 'CRITICAL') return 'badge-danger';
    if (priority === 'HIGH') return 'badge-warning';
    if (priority === 'MEDIUM') return 'badge-info';
    return 'badge-gray';
  }
}
