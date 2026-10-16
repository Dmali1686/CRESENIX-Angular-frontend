import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { Client, SalesOpportunity, SalesMeeting, SalesMeetingType } from '../../../../shared/models/index';

@Component({
  selector: 'app-schedule-meeting-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card modal-md" (click)="$event.stopPropagation()">
        <!-- MODAL HEADER -->
        <div class="modal-header">
          <div class="m-title">
            <span class="material-icons brand-icon">event_available</span>
            <div>
              <h3>Schedule Sales Meeting / Visit</h3>
              <p class="m-subtitle">Coordinate discovery calls, product demos, or on-site client visits</p>
            </div>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Client <span class="required">*</span></label>
              <select [(ngModel)]="selectedClientId" (change)="onClientChange()" class="form-control">
                <option value="">Select Client...</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.companyName }} ({{ c.contactPerson }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Associated Opportunity</label>
              <select [(ngModel)]="selectedOpportunityId" class="form-control">
                <option value="">None / General Discussion</option>
                @for (o of clientOpportunities(); track o.id) {
                  <option [value]="o.id">{{ o.title }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Meeting / Visit Title <span class="required">*</span></label>
              <input type="text" [(ngModel)]="title" placeholder="e.g. Discovery & Architecture Review" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Meeting Type <span class="required">*</span></label>
              <select [(ngModel)]="meetingType" class="form-control">
                @for (t of meetingTypes; track t.key) {
                  <option [value]="t.key">{{ t.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="date" class="form-control" />
            </div>
            <div class="time-range-group">
              <div class="form-group">
                <label class="form-label">Start Time <span class="required">*</span></label>
                <input type="time" [(ngModel)]="startTime" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">End Time <span class="required">*</span></label>
                <input type="time" [(ngModel)]="endTime" class="form-control" />
              </div>
            </div>
          </div>

          <!-- PHYSICAL OFFICE VISIT FIELDS -->
          @if (isPhysicalVisit()) {
            <div class="visit-banner animate-fade-in">
              <div class="form-group">
                <label class="form-label">
                  {{ meetingType === 'CLIENT_OFFICE_VISIT' ? 'Client Office Visit Address' : 'Meeting Location at CRESENIX HQ' }}
                  <span class="required">*</span>
                </label>
                <input type="text" [(ngModel)]="visitAddress" placeholder="e.g. Platina Level 5, BKC Mumbai or Conference Room Alpha" class="form-control" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Expected Arrival Time</label>
                  <input type="time" [(ngModel)]="expectedArrivalTime" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Purpose of Physical Visit</label>
                  <input type="text" [(ngModel)]="visitPurpose" placeholder="e.g. Stakeholder walkthrough, office tour" class="form-control" />
                </div>
              </div>
            </div>
          } @else {
            <div class="form-group">
              <label class="form-label">Online Meeting URL (Google Meet / Zoom / Teams)</label>
              <div class="input-with-icon">
                <span class="material-icons input-icon">link</span>
                <input type="url" [(ngModel)]="meetingUrl" placeholder="https://meet.google.com/xyz-abc" class="form-control" />
              </div>
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Internal CRESENIX Participants</label>
              <input type="text" [(ngModel)]="internalParticipants" placeholder="e.g. Arjun Patel, Vikram Singh" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Client Participants</label>
              <input type="text" [(ngModel)]="clientParticipants" placeholder="e.g. Rahul Sharma (VP Tech), Priya (Lead)" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Agenda & Key Discussion Topics</label>
            <textarea [(ngModel)]="agenda" rows="3" placeholder="1. Review current pain points&#10;2. Architecture walkthrough&#10;3. Next steps" class="form-control"></textarea>
          </div>

          @if (validationError()) {
            <div class="alert alert-danger">
              <span class="material-icons">error_outline</span>
              <span>{{ validationError() }}</span>
            </div>
          }
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
          <div class="spacer"></div>
          <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner-sm"></span> Scheduling...
            } @else {
              <span class="material-icons">event</span> Confirm & Schedule
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
      border-radius: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #F8FAFC;
    }
    .m-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      font-size: 26px;
      color: #2563EB;
      background: #EFF6FF;
      padding: 8px;
      border-radius: 10px;
    }
    .m-title h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #101B35;
    }
    .m-subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: #64748B;
    }
    .icon-btn {
      background: none;
      border: none;
      color: #64748B;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 12px;
    }
    .time-range-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #172033;
      margin-bottom: 5px;
    }
    .required {
      color: #DC2626;
    }
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      background: #FFFFFF;
    }
    .form-control:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .input-with-icon {
      position: relative;
    }
    .input-with-icon .input-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
      font-size: 18px;
    }
    .input-with-icon input {
      padding-left: 36px;
    }
    .visit-banner {
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      background: #F8FAFC;
    }
    .spacer {
      flex: 1;
    }
    .alert-danger {
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #B91C1C;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class ScheduleMeetingModalComponent implements OnInit {
  @Input() preselectedClientId?: string;
  @Input() preselectedOpportunityId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() scheduled = new EventEmitter<SalesMeeting>();

  private salesService = inject(SalesService);

  clients = signal<Client[]>([]);
  opportunities = signal<SalesOpportunity[]>([]);
  clientOpportunities = signal<SalesOpportunity[]>([]);

  selectedClientId = '';
  selectedOpportunityId = '';
  title = '';
  meetingType: SalesMeetingType = 'DISCOVERY_CALL';
  date = new Date().toISOString().split('T')[0];
  startTime = '11:00';
  endTime = '12:00';
  meetingUrl = '';
  visitAddress = '';
  visitPurpose = '';
  expectedArrivalTime = '';
  internalParticipants = 'Arjun Patel';
  clientParticipants = '';
  agenda = '';

  saving = signal(false);
  validationError = signal<string | null>(null);

  meetingTypes: { key: SalesMeetingType; label: string }[] = [
    { key: 'DISCOVERY_CALL', label: 'Discovery Call (Online)' },
    { key: 'REQUIREMENT_GATHERING', label: 'Requirement Gathering' },
    { key: 'PRODUCT_DEMO', label: 'Product / Prototype Demo' },
    { key: 'TECHNICAL_DISCUSSION', label: 'Technical Architecture Review' },
    { key: 'PROPOSAL_PRESENTATION', label: 'Proposal & Commercials Presentation' },
    { key: 'NEGOTIATION', label: 'Contract & Scope Negotiation' },
    { key: 'CLIENT_OFFICE_VISIT', label: 'Client Office Visit (On-Site)' },
    { key: 'CRESENIX_OFFICE_VISIT', label: 'Client Visiting CRESENIX HQ' },
    { key: 'FOLLOWUP_MEETING', label: 'General Follow-up Meeting' },
    { key: 'OTHER', label: 'Other Discussion' }
  ];

  ngOnInit(): void {
    this.salesService.getClients().subscribe(list => this.clients.set(list));
    this.salesService.getOpportunities().subscribe(list => this.opportunities.set(list));

    if (this.preselectedClientId) {
      this.selectedClientId = this.preselectedClientId;
      this.onClientChange();
    }
    if (this.preselectedOpportunityId) {
      this.selectedOpportunityId = this.preselectedOpportunityId;
    }
  }

  onClientChange(): void {
    const opps = this.opportunities().filter(o => o.clientId === this.selectedClientId);
    this.clientOpportunities.set(opps);
    if (opps.length > 0 && !this.selectedOpportunityId) {
      this.selectedOpportunityId = opps[0].id;
    }
    const client = this.clients().find(c => c.id === this.selectedClientId);
    if (client) {
      this.title = `Discovery Discussion: ${client.companyName}`;
      this.clientParticipants = `${client.contactPerson} (${client.designation || 'Client'})`;
      if (client.address) {
        this.visitAddress = client.address;
      }
    }
  }

  isPhysicalVisit(): boolean {
    return this.meetingType === 'CLIENT_OFFICE_VISIT' || this.meetingType === 'CRESENIX_OFFICE_VISIT';
  }

  submit(): void {
    this.validationError.set(null);
    if (!this.selectedClientId) {
      this.validationError.set('Please select a client');
      return;
    }
    if (!this.title.trim()) {
      this.validationError.set('Please provide a meeting title');
      return;
    }
    if (this.isPhysicalVisit() && !this.visitAddress.trim()) {
      this.validationError.set('Please specify the visit address or HQ location');
      return;
    }

    this.saving.set(true);

    const client = this.clients().find(c => c.id === this.selectedClientId);
    const opp = this.opportunities().find(o => o.id === this.selectedOpportunityId);

    const payload: Partial<SalesMeeting> = {
      clientId: this.selectedClientId,
      clientName: client?.companyName || 'Client',
      opportunityId: this.selectedOpportunityId || undefined,
      opportunityTitle: opp?.title || undefined,
      title: this.title,
      type: this.meetingType,
      date: this.date,
      startTime: this.startTime,
      endTime: this.endTime,
      meetingUrl: this.isPhysicalVisit() ? undefined : this.meetingUrl,
      visitAddress: this.isPhysicalVisit() ? this.visitAddress : undefined,
      visitPurpose: this.isPhysicalVisit() ? this.visitPurpose : undefined,
      expectedArrivalTime: this.expectedArrivalTime,
      internalParticipants: this.internalParticipants.split(',').map(s => s.trim()).filter(Boolean),
      clientParticipants: this.clientParticipants.split(',').map(s => s.trim()).filter(Boolean),
      agenda: this.agenda
    };

    this.salesService.scheduleMeeting(payload).subscribe({
      next: (m) => {
        this.saving.set(false);
        this.scheduled.emit(m);
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.validationError.set(err.message || 'Failed to schedule meeting');
      }
    });
  }
}
