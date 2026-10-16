import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { SalesOpportunity, SalesPipelineStage } from '../../../../shared/models/index';

@Component({
  selector: 'app-stage-change-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
        <!-- MODAL HEADER -->
        <div class="modal-header">
          <div class="m-title">
            <span class="material-icons brand-icon">swap_horiz</span>
            <div>
              <h3>Update Pipeline Stage</h3>
              <p class="m-subtitle">{{ opportunity.clientName }} — {{ opportunity.title }}</p>
            </div>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body">
          <div class="stage-transition-preview">
            <span class="stage-badge current">{{ formatStage(opportunity.stage) }}</span>
            <span class="material-icons arrow">arrow_forward</span>
            <span class="stage-badge target" [class.won]="targetStage === 'CLOSED_WON'" [class.lost]="targetStage === 'CLOSED_LOST'">
              {{ formatStage(targetStage) }}
            </span>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">New Stage <span class="required">*</span></label>
            <select [(ngModel)]="targetStage" class="form-control">
              @for (stg of allStages; track stg.key) {
                <option [value]="stg.key">{{ stg.label }}</option>
              }
            </select>
          </div>

          @if (targetStage === 'CLOSED_LOST') {
            <div class="alert-box-lost animate-fade-in mt-3">
              <div class="form-group mb-2">
                <label class="form-label text-danger">Reason for Lost Opportunity <span class="required">*</span></label>
                <select [(ngModel)]="lostReasonCategory" class="form-control">
                  <option value="Client chose competitor">Client chose competitor</option>
                  <option value="Budget insufficient / price too high">Budget insufficient / price too high</option>
                  <option value="Project postponed / cancelled internally">Project postponed / cancelled internally</option>
                  <option value="Scope mismatch / tech stack requirement">Scope mismatch / tech stack requirement</option>
                  <option value="Client unresponsive / no decision">Client unresponsive / no decision</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Additional Loss Notes</label>
                <textarea [(ngModel)]="lostNotes" rows="2" class="form-control" placeholder="Provide context on why this deal didn't close..."></textarea>
              </div>
            </div>
          }

          @if (targetStage === 'CLOSED_WON') {
            <div class="alert-box-won animate-fade-in mt-3">
              <div class="form-group mb-2">
                <label class="form-label text-success">Final Agreed Deal Value (₹) <span class="required">*</span></label>
                <input type="number" [(ngModel)]="finalAgreedValue" class="form-control" />
              </div>
              <p class="won-hint">
                <span class="material-icons">info</span>
                Marking this opportunity as Closed Won will enable the <strong>Convert to Project</strong> action for the delivery team.
              </p>
            </div>
          }

          <div class="form-group mt-3">
            <label class="form-label">Transition Notes (Logged into History)</label>
            <textarea [(ngModel)]="notes" rows="2" class="form-control" placeholder="Why is the opportunity advancing or shifting stages?"></textarea>
          </div>

          @if (error()) {
            <div class="alert alert-danger mt-2">
              <span class="material-icons">error_outline</span>
              <span>{{ error() }}</span>
            </div>
          }
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
          <div class="spacer"></div>
          <button type="button" class="btn btn-primary" (click)="saveTransition()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner-sm"></span> Updating...
            } @else {
              <span class="material-icons">check</span> Confirm Stage Change
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
      max-width: 520px;
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
    .stage-transition-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 14px;
      background: #F8FAFC;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
    }
    .stage-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .stage-badge.current {
      background: #F1F5F9;
      color: #475569;
    }
    .stage-badge.target {
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #BFDBFE;
    }
    .stage-badge.target.won {
      background: #F0FDF4;
      color: #16A34A;
      border-color: #BBF7D0;
    }
    .stage-badge.target.lost {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #FECACA;
    }
    .arrow {
      color: #94A3B8;
      font-size: 20px;
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
    .alert-box-lost {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      padding: 12px;
    }
    .alert-box-won {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 12px;
    }
    .won-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: #15803D;
      margin: 8px 0 0 0;
    }
    .won-hint .material-icons {
      font-size: 16px;
    }
    .text-danger {
      color: #DC2626;
    }
    .text-success {
      color: #16A34A;
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
  `]
})
export class StageChangeModalComponent implements OnInit {
  @Input({ required: true }) opportunity!: SalesOpportunity;
  @Input() initialTargetStage?: SalesPipelineStage;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<SalesOpportunity>();

  private salesService = inject(SalesService);

  targetStage: SalesPipelineStage = 'QUALIFIED';
  notes = '';
  lostReasonCategory = 'Budget insufficient / price too high';
  lostNotes = '';
  finalAgreedValue = 0;

  saving = signal(false);
  error = signal<string | null>(null);

  allStages: { key: SalesPipelineStage; label: string }[] = [
    { key: 'NEW_LEAD', label: '1. New Lead' },
    { key: 'CONTACTED', label: '2. Contacted' },
    { key: 'QUALIFIED', label: '3. Qualified' },
    { key: 'DISCOVERY_SCHEDULED', label: '4. Discovery Scheduled' },
    { key: 'DISCOVERY_COMPLETED', label: '5. Discovery Completed' },
    { key: 'PROPOSAL_QUOTATION', label: '6. Proposal / Quotation' },
    { key: 'NEGOTIATION', label: '7. Negotiation' },
    { key: 'CLOSED_WON', label: '8. Closed Won' },
    { key: 'CLOSED_LOST', label: '9. Closed Lost' },
  ];

  ngOnInit(): void {
    if (this.initialTargetStage) {
      this.targetStage = this.initialTargetStage;
    } else {
      this.targetStage = this.opportunity.stage;
    }
    this.finalAgreedValue = this.opportunity.estimatedValue || 250000;
  }

  formatStage(stage: SalesPipelineStage): string {
    const item = this.allStages.find(s => s.key === stage);
    return item ? item.label : stage;
  }

  saveTransition(): void {
    this.error.set(null);
    if (this.targetStage === 'CLOSED_LOST') {
      if (!this.lostReasonCategory) {
        this.error.set('Please select a loss reason');
        return;
      }
    }

    this.saving.set(true);

    const lostCombined = this.targetStage === 'CLOSED_LOST'
      ? `${this.lostReasonCategory}${this.lostNotes ? ': ' + this.lostNotes : ''}`
      : undefined;

    this.salesService.updateStage(
      this.opportunity.id,
      this.targetStage,
      this.notes || `Moved from ${this.opportunity.stage} to ${this.targetStage}`,
      lostCombined,
      this.targetStage === 'CLOSED_WON' ? { finalValue: this.finalAgreedValue } : undefined
    ).subscribe({
      next: (opp) => {
        this.saving.set(false);
        this.updated.emit(opp);
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.message || 'Failed to update stage');
      }
    });
  }
}
