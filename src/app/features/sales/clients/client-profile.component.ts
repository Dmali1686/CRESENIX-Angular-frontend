import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import {
  Client,
  SalesOpportunity,
  SalesActivity,
  SalesMeeting,
  StageHistoryEntry,
  SalesPipelineStage
} from '../../../shared/models/index';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';
import { MeetingMinutesModalComponent } from '../shared/meeting-minutes-modal/meeting-minutes-modal.component';
import { StageChangeModalComponent } from '../shared/stage-change-modal/stage-change-modal.component';
import { ConvertProjectModalComponent } from '../shared/convert-project-modal/convert-project-modal.component';

type ProfileTab = 'overview' | 'requirements' | 'opportunities' | 'activities' | 'meetings' | 'documents' | 'history';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ScheduleMeetingModalComponent,
    MeetingMinutesModalComponent,
    StageChangeModalComponent,
    ConvertProjectModalComponent
  ],
  template: `
    @if (client()) {
      <div class="client-profile-container">
        <!-- TOP NAVIGATION BREADCRUMB -->
        <div class="profile-breadcrumb">
          <a routerLink="/sales/clients" class="crumb-link">
            <span class="material-icons">arrow_back</span> Client Directory
          </a>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ client()!.companyName }}</span>
        </div>

        <!-- PROFILE HEADER CARD -->
        <div class="card client-banner-card">
          <div class="banner-main">
            <div class="client-avatar-lg" [style.background]="getAvatarColor(client()!.companyName)">
              {{ client()!.companyName.charAt(0) }}
            </div>

            <div class="client-title-block">
              <div class="client-title-row">
                <h1 class="client-h1">{{ client()!.companyName }}</h1>
                <span class="badge" [class]="getStatusClass(client()!.status)">{{ client()!.status }}</span>
                <span class="type-pill">{{ client()!.clientType === 'COMPANY' ? 'Business Account' : 'Individual' }}</span>
              </div>

              <div class="client-meta-row">
                <span class="meta-item">
                  <span class="material-icons">person</span>
                  {{ client()!.contactPerson }} ({{ client()!.designation || 'Primary Contact' }})
                </span>
                <span class="meta-item">
                  <span class="material-icons">place</span>
                  {{ client()!.city }}
                </span>
                <span class="meta-item">
                  <span class="material-icons">work_outline</span>
                  {{ client()!.industry || 'Technology' }}
                </span>
                <span class="meta-item">
                  <span class="material-icons">badge</span>
                  Owner: <strong>{{ client()!.assignedToName }}</strong>
                </span>
              </div>
            </div>
          </div>

          <div class="banner-actions">
            <button class="btn btn-outline btn-sm" (click)="showNoteModal.set(true)">
              <span class="material-icons">edit_note</span> Add Note
            </button>
            <button class="btn btn-outline btn-sm" (click)="openMeetingModal()">
              <span class="material-icons">event</span> Schedule Meeting / Visit
            </button>
            <button class="btn btn-primary btn-sm" (click)="showNewOppModal.set(true)">
              <span class="material-icons">add</span> New Opportunity
            </button>
          </div>
        </div>

        <!-- PROFILE TABS -->
        <div class="profile-tabs-bar">
          <button class="tab-btn" [class.active]="activeTab() === 'overview'" (click)="setTab('overview')">
            <span class="material-icons">dashboard</span> Overview
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'requirements'" (click)="setTab('requirements')">
            <span class="material-icons">tune</span> Requirements
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'opportunities'" (click)="setTab('opportunities')">
            <span class="material-icons">trending_up</span> Opportunities ({{ clientOpportunities().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'activities'" (click)="setTab('activities')">
            <span class="material-icons">checklist</span> Activities & Follow-ups
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'meetings'" (click)="setTab('meetings')">
            <span class="material-icons">groups</span> Meetings & Visits ({{ clientMeetings().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'documents'" (click)="setTab('documents')">
            <span class="material-icons">description</span> Documents & Proposals
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'history'" (click)="setTab('history')">
            <span class="material-icons">history</span> History & Audit
          </button>
        </div>

        <!-- TAB CONTENT PANELS -->
        <div class="tab-panel-container">
          <!-- TAB 1: OVERVIEW -->
          @if (activeTab() === 'overview') {
            <div class="tab-grid animate-fade-in">
              <!-- LEFT: CONTACT & KEY STATS -->
              <div class="tab-col">
                <div class="card panel-card">
                  <h3 class="panel-title">Contact & Communication</h3>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">Primary Contact</span>
                      <span class="info-val font-semibold">{{ client()!.contactPerson }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Designation</span>
                      <span class="info-val">{{ client()!.designation || 'Not specified' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Business Email</span>
                      <span class="info-val">
                        <a [href]="'mailto:' + client()!.email" class="link-val">{{ client()!.email }}</a>
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Phone Number</span>
                      <span class="info-val">
                        <a [href]="'tel:' + client()!.phone" class="link-val">{{ client()!.phone }}</a>
                      </span>
                    </div>
                    @if (client()!.whatsapp) {
                      <div class="info-item">
                        <span class="info-label">WhatsApp</span>
                        <span class="info-val text-success font-semibold">{{ client()!.whatsapp }}</span>
                      </div>
                    }
                    @if (client()!.website) {
                      <div class="info-item">
                        <span class="info-label">Website</span>
                        <span class="info-val">
                          <a [href]="client()!.website" target="_blank" class="link-val">{{ client()!.website }}</a>
                        </span>
                      </div>
                    }
                    <div class="info-item">
                      <span class="info-label">Office Location</span>
                      <span class="info-val">{{ client()!.address || client()!.city }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Lead Source</span>
                      <span class="info-val">{{ client()!.leadSource }}</span>
                    </div>
                  </div>
                </div>

                @if (client()!.notes) {
                  <div class="card panel-card mt-3">
                    <h3 class="panel-title">Client Notes</h3>
                    <p class="notes-content">{{ client()!.notes }}</p>
                  </div>
                }
              </div>

              <!-- RIGHT: ACTIVE DEALS & SCHEDULED ACTIVITIES -->
              <div class="tab-col">
                <div class="card panel-card">
                  <div class="panel-header-inline">
                    <h3 class="panel-title">Active Sales Opportunities</h3>
                    <button class="btn btn-outline btn-xs" (click)="showNewOppModal.set(true)">+ Add Deal</button>
                  </div>

                  <div class="opp-mini-list">
                    @for (opp of clientOpportunities(); track opp.id) {
                      <div class="opp-mini-card">
                        <div class="opp-m-top">
                          <span class="opp-m-title">{{ opp.title }}</span>
                          <span class="opp-m-val">₹{{ (opp.estimatedValue || 0).toLocaleString('en-IN') }}</span>
                        </div>
                        <div class="opp-m-sub">
                          <span class="badge badge-info">{{ formatStage(opp.stage) }}</span>
                          <span class="opp-m-owner">Owner: {{ opp.assignedToName }}</span>
                        </div>
                        <div class="opp-m-actions">
                          <button class="btn btn-light btn-xs" (click)="openStageModal(opp)">Update Stage</button>
                          @if (opp.stage === 'CLOSED_WON' && !opp.isConvertedToProject) {
                            <button class="btn btn-gradient btn-xs" (click)="openConvertModal(opp)">Convert to Project</button>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="empty-state-sm">No active opportunities for this client</div>
                    }
                  </div>
                </div>

                <div class="card panel-card mt-3">
                  <div class="panel-header-inline">
                    <h3 class="panel-title">Upcoming Schedule</h3>
                    <button class="btn btn-outline btn-xs" (click)="openMeetingModal()">Schedule</button>
                  </div>

                  <div class="schedule-mini-list">
                    @for (m of clientMeetings().slice(0, 3); track m.id) {
                      <div class="schedule-mini-card">
                        <div class="s-date-col">
                          <span class="material-icons">{{ m.type.includes('VISIT') ? 'directions_car' : 'videocam' }}</span>
                        </div>
                        <div class="s-info-col">
                          <span class="s-title">{{ m.title }}</span>
                          <span class="s-time">{{ m.date }} &bull; {{ m.startTime }} - {{ m.endTime }}</span>
                        </div>
                        <span class="badge badge-gray">{{ m.status }}</span>
                      </div>
                    } @empty {
                      <div class="empty-state-sm">No upcoming meetings or visits scheduled</div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: REQUIREMENTS -->
          @if (activeTab() === 'requirements') {
            <div class="card panel-card animate-fade-in">
              <h3 class="panel-title">Service & Technical Requirements</h3>

              <div class="req-section mb-4">
                <label class="section-label">Requested Services</label>
                <div class="services-pills-wrap">
                  @for (srv of client()!.serviceRequirements; track srv) {
                    <span class="srv-badge">{{ srv }}</span>
                  }
                </div>
              </div>

              <div class="req-section mb-4">
                <label class="section-label">Core Business Problem</label>
                <div class="problem-box">
                  {{ client()!.businessProblem || 'No problem description logged.' }}
                </div>
              </div>

              <div class="req-section mb-4">
                <label class="section-label">Detailed Scope & Requirements</label>
                <div class="details-box">
                  {{ client()!.detailedRequirements || 'Requirements to be elaborated during discovery phase.' }}
                </div>
              </div>

              <div class="info-grid-2col">
                <div class="info-box">
                  <span class="ib-label">Existing Legacy System</span>
                  <span class="ib-val">{{ client()!.hasExistingSystem === 'YES' ? 'Yes (Replacement / Upgrade)' : client()!.hasExistingSystem === 'NO' ? 'No (Fresh build)' : 'Under evaluation' }}</span>
                </div>
                <div class="info-box">
                  <span class="ib-label">Preferred Start Timeline</span>
                  <span class="ib-val">{{ client()!.preferredTimeline || 'Within 30 days' }}</span>
                </div>
                <div class="info-box">
                  <span class="ib-label">Estimated Budget Range</span>
                  <span class="ib-val font-semibold text-green">{{ client()!.estimatedBudgetRange || 'Not discussed' }}</span>
                </div>
                <div class="info-box">
                  <span class="ib-label">Budget Status</span>
                  <span class="ib-val">{{ client()!.budgetConfirmation || 'APPROXIMATE' }}</span>
                </div>
              </div>

              @if (client()!.referenceUrl) {
                <div class="mt-4">
                  <label class="section-label">Reference System / App</label>
                  <a [href]="client()!.referenceUrl" target="_blank" class="ref-link">
                    <span class="material-icons">open_in_new</span> {{ client()!.referenceUrl }}
                  </a>
                </div>
              }
            </div>
          }

          <!-- TAB 3: OPPORTUNITIES -->
          @if (activeTab() === 'opportunities') {
            <div class="card panel-card animate-fade-in">
              <div class="panel-header-inline mb-3">
                <div>
                  <h3 class="panel-title">Sales Opportunities</h3>
                  <p class="panel-sub">Each client can have multiple project enquiries with their own pipeline stages</p>
                </div>
                <button class="btn btn-primary btn-sm" (click)="showNewOppModal.set(true)">
                  <span class="material-icons">add</span> New Opportunity
                </button>
              </div>

              <div class="opps-detailed-list">
                @for (opp of clientOpportunities(); track opp.id) {
                  <div class="opp-full-card">
                    <div class="opp-card-header">
                      <div>
                        <h4 class="opp-full-title">{{ opp.title }}</h4>
                        <span class="opp-full-service">{{ opp.serviceType }} &bull; Created {{ opp.createdAt | date:'mediumDate' }}</span>
                      </div>
                      <div class="opp-val-badge">
                        ₹{{ (opp.estimatedValue || 0).toLocaleString('en-IN') }}
                      </div>
                    </div>

                    <!-- STAGE PROGRESS TRACKER -->
                    <div class="opp-stage-tracker">
                      <span class="badge" [class]="getStageClass(opp.stage)">{{ formatStage(opp.stage) }}</span>
                      <span class="stage-days-note">{{ opp.stageDays }} days in stage</span>
                      @if (opp.expectedCloseDate) {
                        <span class="close-date-note">Expected close: {{ opp.expectedCloseDate }}</span>
                      }
                    </div>

                    <p class="opp-summary-text">{{ opp.requirementSummary || 'No summary provided.' }}</p>

                    <div class="opp-card-footer">
                      <div class="opp-owner">Owner: <strong>{{ opp.assignedToName }}</strong></div>
                      <div class="opp-actions-group">
                        <button class="btn btn-outline btn-xs" (click)="openStageModal(opp)">Change Stage</button>
                        @if (opp.stage === 'CLOSED_WON' && !opp.isConvertedToProject) {
                          <button class="btn btn-gradient btn-xs" (click)="openConvertModal(opp)">
                            <span class="material-icons">rocket_launch</span> Convert to Project
                          </button>
                        } @else if (opp.isConvertedToProject) {
                          <span class="badge badge-success">Converted into Active Project</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 4: ACTIVITIES -->
          @if (activeTab() === 'activities') {
            <div class="card panel-card animate-fade-in">
              <div class="panel-header-inline mb-3">
                <h3 class="panel-title">Activity Timeline & Follow-ups</h3>
                <button class="btn btn-outline btn-sm" (click)="showAddActivityModal.set(true)">
                  <span class="material-icons">add</span> Log Activity
                </button>
              </div>

              <div class="activities-timeline">
                @for (act of clientActivities(); track act.id) {
                  <div class="timeline-entry" [class.completed]="act.status === 'COMPLETED'">
                    <div class="t-icon-box">
                      <span class="material-icons">{{ getActivityIcon(act.type) }}</span>
                    </div>
                    <div class="t-entry-content">
                      <div class="t-entry-header">
                        <span class="t-entry-title">{{ act.title }}</span>
                        <span class="t-entry-time">{{ act.dueAt | date:'medium' }}</span>
                      </div>
                      <p class="t-entry-desc">{{ act.description }}</p>
                      @if (act.outcome) {
                        <div class="t-entry-outcome">Outcome: {{ act.outcome }}</div>
                      }
                      <div class="t-entry-footer">
                        <span>Logged by: {{ act.assignedToName }}</span>
                        @if (act.status !== 'COMPLETED') {
                          <button class="btn btn-outline btn-xxs" (click)="completeActivity(act)">Mark Done</button>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state-sm">No activity records logged for this client</div>
                }
              </div>
            </div>
          }

          <!-- TAB 5: MEETINGS -->
          @if (activeTab() === 'meetings') {
            <div class="card panel-card animate-fade-in">
              <div class="panel-header-inline mb-3">
                <h3 class="panel-title">Meetings & Client Visits</h3>
                <button class="btn btn-primary btn-sm" (click)="openMeetingModal()">
                  <span class="material-icons">event</span> Schedule Meeting / Visit
                </button>
              </div>

              <div class="meetings-full-list">
                @for (m of clientMeetings(); track m.id) {
                  <div class="meeting-block-card">
                    <div class="mb-top">
                      <div class="mb-title-group">
                        <span class="badge" [class]="m.type.includes('VISIT') ? 'badge-violet' : 'badge-info'">
                          {{ formatMeetingType(m.type) }}
                        </span>
                        <h4 class="mb-title">{{ m.title }}</h4>
                      </div>
                      <span class="badge" [class]="m.status === 'COMPLETED' ? 'badge-success' : 'badge-gray'">
                        {{ m.status }}
                      </span>
                    </div>

                    <div class="mb-meta">
                      <span><span class="material-icons">calendar_today</span> {{ m.date }} ({{ m.startTime }} - {{ m.endTime }})</span>
                      @if (m.visitAddress) {
                        <span><span class="material-icons">place</span> {{ m.visitAddress }}</span>
                      }
                      @if (m.meetingUrl) {
                        <span>
                          <a [href]="m.meetingUrl" target="_blank" class="link-val">
                            <span class="material-icons">link</span> Video Call Link
                          </a>
                        </span>
                      }
                    </div>

                    @if (m.agenda) {
                      <div class="mb-agenda">
                        <strong>Agenda:</strong> {{ m.agenda }}
                      </div>
                    }

                    <!-- MINUTES IF LOGGED -->
                    @if (m.minutes) {
                      <div class="mb-minutes-box">
                        <h5>Meeting Minutes & Outcomes</h5>
                        <p><strong>Discussion:</strong> {{ m.minutes.discussionSummary }}</p>
                        @if (m.minutes.requirementsIdentified) {
                          <p><strong>Requirements:</strong> {{ m.minutes.requirementsIdentified }}</p>
                        }
                        @if (m.minutes.agreedDecisions) {
                          <p><strong>Decisions:</strong> {{ m.minutes.agreedDecisions }}</p>
                        }
                        <p class="next-act-highlight"><strong>Next Step:</strong> {{ m.minutes.nextAction }} (Owner: {{ m.minutes.actionOwner }})</p>
                      </div>
                    }

                    <div class="mb-footer">
                      <span>Organizer: {{ m.organizerName }}</span>
                      @if (m.status !== 'COMPLETED') {
                        <button class="btn btn-outline btn-xs" (click)="openMinutesModal(m)">
                          <span class="material-icons">notes</span> Log Minutes
                        </button>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state-sm">No meetings or office visits recorded</div>
                }
              </div>
            </div>
          }

          <!-- TAB 6: DOCUMENTS -->
          @if (activeTab() === 'documents') {
            <div class="card panel-card animate-fade-in">
              <div class="panel-header-inline mb-3">
                <h3 class="panel-title">Proposals, Quotations & Documents</h3>
                <button class="btn btn-outline btn-sm" (click)="addSampleDoc()">
                  <span class="material-icons">upload_file</span> Upload / Link Document
                </button>
              </div>

              <div class="docs-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Type</th>
                      <th>Associated Opportunity</th>
                      <th>Uploaded On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (doc of documents(); track doc.name) {
                      <tr>
                        <td>
                          <div class="doc-title-cell">
                            <span class="material-icons text-blue">description</span>
                            <strong>{{ doc.name }}</strong>
                          </div>
                        </td>
                        <td><span class="badge badge-gray">{{ doc.type }}</span></td>
                        <td>{{ doc.opportunity }}</td>
                        <td>{{ doc.date }}</td>
                        <td>
                          <a [href]="doc.url" target="_blank" class="btn btn-outline btn-xxs">Download</a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB 7: HISTORY -->
          @if (activeTab() === 'history') {
            <div class="card panel-card animate-fade-in">
              <h3 class="panel-title">Audit Log & Stage Changes</h3>
              <p class="panel-sub">Complete chronological history of changes to this client and its opportunities</p>

              <div class="history-list">
                @for (h of clientHistory(); track h.id) {
                  <div class="history-item">
                    <span class="h-dot"></span>
                    <div class="h-content">
                      <div class="h-top">
                        <span class="h-action">Stage Transition: {{ formatStage(h.toStage) }}</span>
                        <span class="h-time">{{ h.timestamp | date:'medium' }}</span>
                      </div>
                      <p class="h-notes">{{ h.notes || 'Stage updated' }}</p>
                      <span class="h-author">Updated by: {{ h.changedByName }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state-sm">No audit history entries yet</div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="loading-state">
        <span class="spinner-sm"></span> Loading client details...
      </div>
    }

    <!-- MODALS -->
    @if (showScheduleModal()) {
      <app-schedule-meeting-modal
        [preselectedClientId]="client()?.id"
        (close)="showScheduleModal.set(false)"
        (scheduled)="refresh()"
      />
    }

    @if (activeMinutesMeeting()) {
      <app-meeting-minutes-modal
        [meeting]="activeMinutesMeeting()!"
        (close)="activeMinutesMeeting.set(null)"
        (saved)="refresh()"
      />
    }

    @if (selectedOppForStage()) {
      <app-stage-change-modal
        [opportunity]="selectedOppForStage()!"
        (close)="selectedOppForStage.set(null)"
        (updated)="refresh()"
      />
    }

    @if (selectedOppForConvert()) {
      <app-convert-project-modal
        [opportunity]="selectedOppForConvert()!"
        (close)="selectedOppForConvert.set(null)"
        (converted)="refresh()"
      />
    }

    <!-- QUICK ADD OPPORTUNITY MODAL -->
    @if (showNewOppModal()) {
      <div class="modal-overlay" (click)="showNewOppModal.set(false)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add New Opportunity</h3>
            <button class="icon-btn" (click)="showNewOppModal.set(false)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Opportunity Title *</label>
              <input type="text" [(ngModel)]="newOppTitle" placeholder="e.g. Mobile Application Enquiry" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Service Type *</label>
              <input type="text" [(ngModel)]="newOppService" placeholder="e.g. Android / iOS Application" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Estimated Value (₹) *</label>
              <input type="number" [(ngModel)]="newOppValue" class="form-control" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showNewOppModal.set(false)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" (click)="saveNewOpp()">Create Opportunity</button>
          </div>
        </div>
      </div>
    }

    <!-- QUICK NOTE MODAL -->
    @if (showNoteModal()) {
      <div class="modal-overlay" (click)="showNoteModal.set(false)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add Client Note</h3>
            <button class="icon-btn" (click)="showNoteModal.set(false)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Note Content *</label>
              <textarea [(ngModel)]="newNoteContent" rows="4" class="form-control" placeholder="Enter notes from recent call or stakeholder update..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showNoteModal.set(false)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" (click)="saveNote()">Save Note</button>
          </div>
        </div>
      </div>
    }

    <!-- QUICK ADD ACTIVITY MODAL -->
    @if (showAddActivityModal()) {
      <div class="modal-overlay" (click)="showAddActivityModal.set(false)">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Log Activity / Follow-up</h3>
            <button class="icon-btn" (click)="showAddActivityModal.set(false)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input type="text" [(ngModel)]="newActTitle" placeholder="e.g. Call Rahul to review proposal v2" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select [(ngModel)]="newActType" class="form-control">
                <option value="CALL">Call</option>
                <option value="EMAIL">Email</option>
                <option value="MESSAGE">WhatsApp / Message</option>
                <option value="PROPOSAL_FOLLOWUP">Proposal Follow-up</option>
                <option value="GENERAL_FOLLOWUP">General Follow-up</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input type="date" [(ngModel)]="newActDate" class="form-control" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showAddActivityModal.set(false)">Cancel</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" (click)="saveActivity()">Save Activity</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .client-profile-container {
      padding: 24px;
      max-width: 1440px;
      margin: 0 auto;
    }
    .profile-breadcrumb {
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

    /* BANNER CARD */
    .client-banner-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .banner-main {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .client-avatar-lg {
      width: 58px;
      height: 58px;
      border-radius: 12px;
      color: #FFFFFF;
      font-size: 1.5rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .client-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .client-h1 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #101B35;
      margin: 0;
    }
    .type-pill {
      font-size: 0.72rem;
      background: #F1F5F9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .client-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: #64748B;
    }
    .meta-item .material-icons {
      font-size: 15px;
      color: #94A3B8;
    }
    .banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* TABS */
    .profile-tabs-bar {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid #E2E8F0;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border: none;
      background: transparent;
      font-size: 0.84rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .tab-btn:hover {
      color: #2563EB;
    }
    .tab-btn.active {
      color: #2563EB;
      border-bottom-color: #2563EB;
    }
    .tab-btn .material-icons {
      font-size: 18px;
    }

    /* PANELS */
    .panel-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #101B35;
      margin: 0 0 14px 0;
    }
    .panel-sub {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0;
    }
    .panel-header-inline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .tab-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .tab-col {
      display: flex;
      flex-direction: column;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 8px;
      border-bottom: 1px solid #F8FAFC;
    }
    .info-label {
      font-size: 0.78rem;
      color: #64748B;
      font-weight: 500;
    }
    .info-val {
      font-size: 0.84rem;
      color: #172033;
      text-align: right;
    }
    .link-val {
      color: #2563EB;
      text-decoration: none;
    }
    .link-val:hover {
      text-decoration: underline;
    }
    .font-semibold {
      font-weight: 600;
    }

    /* OPP MINI CARDS */
    .opp-mini-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .opp-mini-card {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #F8FAFC;
    }
    .opp-m-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .opp-m-title {
      font-weight: 700;
      font-size: 0.86rem;
      color: #101B35;
    }
    .opp-m-val {
      font-weight: 700;
      color: #16A34A;
      font-size: 0.88rem;
    }
    .opp-m-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.74rem;
      color: #64748B;
      margin-bottom: 6px;
    }
    .opp-m-actions {
      display: flex;
      gap: 6px;
    }

    /* REQUIREMENTS */
    .section-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .services-pills-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .srv-badge {
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .problem-box, .details-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 0.86rem;
      color: #334155;
      line-height: 1.5;
    }
    .info-grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .info-box {
      background: #F8FAFC;
      padding: 10px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }
    .ib-label {
      font-size: 0.72rem;
      color: #64748B;
    }
    .ib-val {
      font-size: 0.86rem;
      font-weight: 600;
      color: #101B35;
    }

    /* OPP FULL CARDS */
    .opps-detailed-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .opp-full-card {
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px;
      background: #FFFFFF;
    }
    .opp-card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .opp-full-title {
      font-size: 1rem;
      font-weight: 700;
      color: #101B35;
      margin: 0 0 2px 0;
    }
    .opp-full-service {
      font-size: 0.76rem;
      color: #64748B;
    }
    .opp-val-badge {
      font-size: 1.1rem;
      font-weight: 800;
      color: #16A34A;
    }
    .opp-stage-tracker {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 0.78rem;
      color: #64748B;
    }
    .opp-summary-text {
      font-size: 0.84rem;
      color: #475569;
      margin-bottom: 12px;
    }
    .opp-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px dashed #E2E8F0;
      font-size: 0.8rem;
    }

    /* ACTIVITIES TIMELINE */
    .activities-timeline {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .timeline-entry {
      display: flex;
      gap: 14px;
      padding: 12px 14px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      background: #FFFFFF;
    }
    .timeline-entry.completed {
      background: #F8FAFC;
      border-left: 3px solid #16A34A;
    }
    .t-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #EFF6FF;
      color: #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .t-entry-content {
      flex: 1;
    }
    .t-entry-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .t-entry-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #101B35;
    }
    .t-entry-time {
      font-size: 0.74rem;
      color: #94A3B8;
    }
    .t-entry-desc {
      font-size: 0.82rem;
      color: #475569;
      margin: 0 0 6px 0;
    }
    .t-entry-outcome {
      font-size: 0.76rem;
      color: #16A34A;
      background: #F0FDF4;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .t-entry-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.74rem;
      color: #64748B;
    }

    /* MEETINGS */
    .meetings-full-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .meeting-block-card {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px;
      background: #FFFFFF;
    }
    .mb-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .mb-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #101B35;
      margin: 4px 0 0 0;
    }
    .mb-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 0.78rem;
      color: #64748B;
      margin-bottom: 8px;
    }
    .mb-meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mb-meta .material-icons {
      font-size: 15px;
      color: #94A3B8;
    }
    .mb-agenda {
      font-size: 0.82rem;
      color: #334155;
      background: #F8FAFC;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .mb-minutes-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      font-size: 0.82rem;
    }
    .mb-minutes-box h5 {
      margin: 0 0 6px 0;
      font-size: 0.84rem;
      color: #166534;
      font-weight: 700;
    }
    .mb-minutes-box p {
      margin: 0 0 4px 0;
      color: #15803D;
    }
    .next-act-highlight {
      font-weight: 700;
      color: #14532D !important;
    }
    .mb-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px dashed #E2E8F0;
      font-size: 0.76rem;
      color: #64748B;
    }

    /* HISTORY */
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 6px;
    }
    .history-item {
      display: flex;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .h-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #2563EB;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .h-content {
      flex: 1;
    }
    .h-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .h-action {
      font-weight: 700;
      font-size: 0.84rem;
      color: #101B35;
    }
    .h-time {
      font-size: 0.72rem;
      color: #94A3B8;
    }
    .h-notes {
      font-size: 0.8rem;
      color: #475569;
      margin: 0 0 2px 0;
    }
    .h-author {
      font-size: 0.72rem;
      color: #64748B;
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
    .spacer {
      flex: 1;
    }
  `]
})
export class ClientProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  activeTab = signal<ProfileTab>('overview');
  client = signal<Client | null>(null);
  opportunities = signal<SalesOpportunity[]>([]);
  activities = signal<SalesActivity[]>([]);
  meetings = signal<SalesMeeting[]>([]);
  history = signal<StageHistoryEntry[]>([]);

  showScheduleModal = signal(false);
  activeMinutesMeeting = signal<SalesMeeting | null>(null);
  selectedOppForStage = signal<SalesOpportunity | null>(null);
  selectedOppForConvert = signal<SalesOpportunity | null>(null);
  showNewOppModal = signal(false);
  showNoteModal = signal(false);
  showAddActivityModal = signal(false);

  newOppTitle = '';
  newOppService = 'Custom Software Development';
  newOppValue = 500000;

  newNoteContent = '';

  newActTitle = '';
  newActType: any = 'CALL';
  newActDate = new Date().toISOString().split('T')[0];

  documents = signal<{ name: string; type: string; opportunity: string; date: string; url: string }[]>([
    { name: 'Initial Requirement Scope v1.pdf', type: 'Requirements', opportunity: 'Primary Opportunity', date: '2026-10-05', url: '#' },
    { name: 'Architecture & Technical Proposal v2.pdf', type: 'Proposal', opportunity: 'Primary Opportunity', date: '2026-10-10', url: '#' },
    { name: 'Commercial Quotation v1.2.pdf', type: 'Quotation', opportunity: 'Primary Opportunity', date: '2026-10-11', url: '#' }
  ]);

  clientOpportunities = computed(() => {
    const c = this.client();
    if (!c) return [];
    return this.opportunities().filter(o => o.clientId === c.id);
  });

  clientActivities = computed(() => {
    const c = this.client();
    if (!c) return [];
    return this.activities().filter(a => a.clientId === c.id);
  });

  clientMeetings = computed(() => {
    const c = this.client();
    if (!c) return [];
    return this.meetings().filter(m => m.clientId === c.id);
  });

  clientHistory = computed(() => {
    const oppIds = this.clientOpportunities().map(o => o.id);
    return this.history().filter(h => oppIds.includes(h.opportunityId));
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadClient(id);
      }
    });

    this.route.queryParamMap.subscribe(qp => {
      const tab = qp.get('tab') as ProfileTab;
      if (tab) {
        this.activeTab.set(tab);
      }
    });
  }

  loadClient(id: string): void {
    this.salesService.getClientById(id).subscribe(c => {
      if (c) {
        this.client.set(c);
      }
    });
    this.salesService.getOpportunities().subscribe(o => this.opportunities.set(o));
    this.salesService.getActivities().subscribe(a => this.activities.set(a));
    this.salesService.getSalesMeetings().subscribe(m => this.meetings.set(m));
    this.salesService.stageHistory$.subscribe(h => this.history.set(h));
  }

  refresh(): void {
    const c = this.client();
    if (c) this.loadClient(c.id);
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  getStatusClass(status: string): string {
    if (status === 'CUSTOMER') return 'badge-success';
    if (status === 'PROSPECT') return 'badge-info';
    if (status === 'LEAD') return 'badge-cyan';
    return 'badge-gray';
  }

  getStageClass(stage: SalesPipelineStage): string {
    if (stage === 'CLOSED_WON') return 'badge-success';
    if (stage === 'CLOSED_LOST') return 'badge-danger';
    if (stage === 'NEGOTIATION' || stage === 'PROPOSAL_QUOTATION') return 'badge-warning';
    return 'badge-info';
  }

  formatStage(stage: SalesPipelineStage): string {
    return stage.replace(/_/g, ' ');
  }

  formatMeetingType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  getActivityIcon(type: string): string {
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

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    const idx = (name || 'U').charCodeAt(0) % colors.length;
    return colors[idx];
  }

  openMeetingModal(): void {
    this.showScheduleModal.set(true);
  }

  openMinutesModal(m: SalesMeeting): void {
    this.activeMinutesMeeting.set(m);
  }

  openStageModal(opp: SalesOpportunity): void {
    this.selectedOppForStage.set(opp);
  }

  openConvertModal(opp: SalesOpportunity): void {
    this.selectedOppForConvert.set(opp);
  }

  completeActivity(act: SalesActivity): void {
    this.salesService.completeActivity(act.id, 'Completed from Client Profile').subscribe(() => {
      this.refresh();
    });
  }

  saveNewOpp(): void {
    const c = this.client();
    if (!c || !this.newOppTitle.trim()) return;

    this.salesService.createOpportunity({
      clientId: c.id,
      clientName: c.companyName,
      title: this.newOppTitle,
      serviceType: this.newOppService,
      requestedServices: [this.newOppService],
      estimatedValue: this.newOppValue,
      contactPerson: c.contactPerson,
      contactPhone: c.phone,
      contactEmail: c.email,
      leadSource: c.leadSource,
      stage: 'QUALIFIED'
    }).subscribe(() => {
      this.showNewOppModal.set(false);
      this.newOppTitle = '';
      this.refresh();
    });
  }

  saveNote(): void {
    const c = this.client();
    if (!c || !this.newNoteContent.trim()) return;

    const updatedNotes = c.notes ? `${c.notes}\n\n[${new Date().toLocaleDateString('en-IN')}]: ${this.newNoteContent}` : this.newNoteContent;
    this.salesService.updateClient(c.id, { notes: updatedNotes }).subscribe(() => {
      this.showNoteModal.set(false);
      this.newNoteContent = '';
      this.refresh();
    });
  }

  saveActivity(): void {
    const c = this.client();
    if (!c || !this.newActTitle.trim()) return;

    this.salesService.createActivity({
      clientId: c.id,
      clientName: c.companyName,
      type: this.newActType,
      title: this.newActTitle,
      dueAt: `${this.newActDate}T11:00:00Z`
    }).subscribe(() => {
      this.showAddActivityModal.set(false);
      this.newActTitle = '';
      this.refresh();
    });
  }

  addSampleDoc(): void {
    const name = prompt('Enter document title (e.g. Master Service Agreement v1.pdf):');
    if (!name) return;
    this.documents.update(docs => [
      { name, type: 'Contract', opportunity: 'Primary Opportunity', date: new Date().toISOString().split('T')[0], url: '#' },
      ...docs
    ]);
  }
}
