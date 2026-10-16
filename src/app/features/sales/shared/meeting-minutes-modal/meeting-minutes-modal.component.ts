import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { SalesMeeting, SalesMeetingMinutes } from '../../../../shared/models/index';

@Component({
  selector: 'app-meeting-minutes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card modal-md" (click)="$event.stopPropagation()">
        <!-- MODAL HEADER -->
        <div class="modal-header">
          <div class="m-title">
            <span class="material-icons brand-icon">task_alt</span>
            <div>
              <h3>Log Meeting Minutes & Outcome</h3>
              <p class="m-subtitle">{{ meeting.title }} ({{ meeting.clientName }})</p>
            </div>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Discussion Summary <span class="required">*</span></label>
            <textarea [(ngModel)]="discussionSummary" rows="3" class="form-control" placeholder="What key topics and problem statements were discussed during the meeting?"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Specific Client Requirements Identified</label>
            <textarea [(ngModel)]="requirementsIdentified" rows="2" class="form-control" placeholder="Features, integrations, architecture preferences, performance criteria..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Client Concerns or Objections Raised</label>
            <textarea [(ngModel)]="concernsOrObjections" rows="2" class="form-control" placeholder="Budget constraints, timeline worries, tech stack reservations..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Agreed Decisions & Scope Consensus</label>
            <textarea [(ngModel)]="agreedDecisions" rows="2" class="form-control" placeholder="What was mutually agreed between CRESENIX and client?"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Immediate Next Action <span class="required">*</span></label>
              <input type="text" [(ngModel)]="nextAction" class="form-control" placeholder="e.g. Send updated quotation and architecture deck" />
            </div>
            <div class="form-group">
              <label class="form-label">Responsible Person</label>
              <input type="text" [(ngModel)]="actionOwner" class="form-control" placeholder="e.g. Arjun Patel" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Action Due Date</label>
              <input type="date" [(ngModel)]="actionDueDate" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Next Scheduled Follow-up</label>
              <input type="date" [(ngModel)]="nextFollowUpAt" class="form-control" />
            </div>
          </div>

          @if (error()) {
            <div class="alert alert-danger">
              <span class="material-icons">error_outline</span>
              <span>{{ error() }}</span>
            </div>
          }
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
          <div class="spacer"></div>
          <button type="button" class="btn btn-primary" (click)="saveMinutes()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner-sm"></span> Saving...
            } @else {
              <span class="material-icons">check</span> Mark Completed & Save Minutes
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
      max-width: 600px;
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
      color: #16A34A;
      background: #F0FDF4;
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
export class MeetingMinutesModalComponent implements OnInit {
  @Input({ required: true }) meeting!: SalesMeeting;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SalesMeeting>();

  private salesService = inject(SalesService);

  discussionSummary = '';
  requirementsIdentified = '';
  concernsOrObjections = '';
  agreedDecisions = '';
  nextAction = '';
  actionOwner = '';
  actionDueDate = '';
  nextFollowUpAt = '';

  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.meeting.minutes) {
      const min = this.meeting.minutes;
      this.discussionSummary = min.discussionSummary || '';
      this.requirementsIdentified = min.requirementsIdentified || '';
      this.concernsOrObjections = min.concernsOrObjections || '';
      this.agreedDecisions = min.agreedDecisions || '';
      this.nextAction = min.nextAction || '';
      this.actionOwner = min.actionOwner || this.meeting.organizerName;
      this.actionDueDate = min.actionDueDate || '';
      this.nextFollowUpAt = min.nextFollowUpAt || '';
    } else {
      this.actionOwner = this.meeting.organizerName || 'Arjun Patel';
      this.actionDueDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      this.nextFollowUpAt = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    }
  }

  saveMinutes(): void {
    this.error.set(null);
    if (!this.discussionSummary.trim()) {
      this.error.set('Please provide a discussion summary');
      return;
    }
    if (!this.nextAction.trim()) {
      this.error.set('Please specify the agreed next action');
      return;
    }

    this.saving.set(true);

    const minutes: SalesMeetingMinutes = {
      discussionSummary: this.discussionSummary,
      requirementsIdentified: this.requirementsIdentified,
      concernsOrObjections: this.concernsOrObjections,
      agreedDecisions: this.agreedDecisions,
      nextAction: this.nextAction,
      actionOwner: this.actionOwner,
      actionDueDate: this.actionDueDate,
      nextFollowUpAt: this.nextFollowUpAt
    };

    this.salesService.completeMeeting(this.meeting.id, minutes).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.saved.emit(updated);
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.message || 'Failed to save meeting minutes');
      }
    });
  }
}
