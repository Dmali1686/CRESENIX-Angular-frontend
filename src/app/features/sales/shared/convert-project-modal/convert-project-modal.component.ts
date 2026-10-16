import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SalesService } from '../../../../core/services/sales.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { SalesOpportunity, ProjectHandoverPayload } from '../../../../shared/models/index';

@Component({
  selector: 'app-convert-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card modal-md" (click)="$event.stopPropagation()">
        <!-- MODAL HEADER -->
        <div class="modal-header">
          <div class="m-title">
            <span class="material-icons success-icon">rocket_launch</span>
            <div>
              <h3>Convert Deal into Project</h3>
              <p class="m-subtitle">Seamless handover from Sales Opportunity to Project Pipeline</p>
            </div>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body">
          <div class="deal-summary-banner">
            <div class="deal-meta">
              <span class="deal-client">{{ opportunity.clientName }}</span>
              <h4 class="deal-title">{{ opportunity.title }}</h4>
            </div>
            <div class="deal-value-pill">
              <span class="val-label">Deal Value</span>
              <span class="val-amount">₹{{ (finalAgreedValue || opportunity.estimatedValue || 0).toLocaleString('en-IN') }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Project Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="projectName" class="form-control" placeholder="e.g. ABC Technologies CRM System" />
            </div>
            <div class="form-group">
              <label class="form-label">Project Code <span class="required">*</span></label>
              <input type="text" [(ngModel)]="projectCode" class="form-control" placeholder="e.g. PRJ-CRM-202" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Final Agreed Contract Value (₹) <span class="required">*</span></label>
              <input type="number" [(ngModel)]="finalAgreedValue" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Assign Project Manager <span class="required">*</span></label>
              <select [(ngModel)]="managerId" class="form-control">
                @for (emp of managers(); track emp.id) {
                  <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || 'PM' }})</option>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Project Start Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="startDate" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Target Delivery Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="targetDate" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Approved Scope & Technical Deliverables <span class="required">*</span></label>
            <textarea [(ngModel)]="approvedScope" rows="3" class="form-control" placeholder="Key deliverables, agreed milestones, and architectural specs..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Sales Handover Notes for Delivery Team</label>
            <textarea [(ngModel)]="handoverNotes" rows="2" class="form-control" placeholder="Client nuances, key stakeholder preferences, promised deadlines..."></textarea>
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
          <button type="button" class="btn btn-gradient" (click)="confirmConversion()" [disabled]="converting()">
            @if (converting()) {
              <span class="spinner-sm"></span> Converting...
            } @else {
              <span class="material-icons">check_circle</span> Approve & Create Project
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
      max-width: 620px;
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
    .success-icon {
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
    .deal-summary-banner {
      background: linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%);
      border: 1px solid #DBEAFE;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .deal-client {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #2563EB;
    }
    .deal-title {
      margin: 2px 0 0 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #101B35;
    }
    .deal-value-pill {
      text-align: right;
    }
    .val-label {
      display: block;
      font-size: 0.72rem;
      color: #64748B;
      font-weight: 500;
    }
    .val-amount {
      font-size: 1.15rem;
      font-weight: 800;
      color: #16A34A;
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
export class ConvertProjectModalComponent implements OnInit {
  @Input({ required: true }) opportunity!: SalesOpportunity;
  @Output() close = new EventEmitter<void>();
  @Output() converted = new EventEmitter<any>();

  private salesService = inject(SalesService);
  private empService = inject(EmployeeService);
  private router = inject(Router);

  projectName = '';
  projectCode = '';
  finalAgreedValue = 0;
  managerId = 'u2'; // Priya Mehta default PM
  startDate = new Date().toISOString().split('T')[0];
  targetDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  approvedScope = '';
  handoverNotes = '';

  converting = signal(false);
  error = signal<string | null>(null);
  managers = signal<any[]>([]);

  ngOnInit(): void {
    if (this.opportunity) {
      this.projectName = this.opportunity.title;
      this.projectCode = 'PRJ-' + this.opportunity.clientName.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
      this.finalAgreedValue = this.opportunity.estimatedValue || 250000;
      this.approvedScope = this.opportunity.requirementSummary || `${this.opportunity.serviceType} for ${this.opportunity.clientName}`;
      this.handoverNotes = `Deal closed successfully by ${this.opportunity.assignedToName}. Client contact: ${this.opportunity.contactPerson} (${this.opportunity.contactPhone}).`;
    }

    this.empService.getEmployees().subscribe(res => {
      if (res && Array.isArray(res)) {
        this.managers.set(res);
      }
    });
  }

  confirmConversion(): void {
    this.error.set(null);
    if (!this.projectName.trim()) {
      this.error.set('Please provide a project name');
      return;
    }
    if (!this.approvedScope.trim()) {
      this.error.set('Please specify approved scope and deliverables');
      return;
    }

    this.converting.set(true);

    const payload: ProjectHandoverPayload = {
      opportunityId: this.opportunity.id,
      clientId: this.opportunity.clientId,
      projectName: this.projectName,
      projectCode: this.projectCode,
      description: this.approvedScope,
      approvedScope: this.approvedScope,
      finalAgreedValue: this.finalAgreedValue,
      managerId: this.managerId,
      startDate: this.startDate,
      targetDate: this.targetDate,
      priority: this.opportunity.priority || 'HIGH',
      handoverNotes: this.handoverNotes
    };

    this.salesService.convertToProject(payload).subscribe({
      next: (project) => {
        this.converting.set(false);
        this.converted.emit(project);
        this.close.emit();
        // Redirect to Project Pipeline
        this.router.navigate(['/projects/pipeline']);
      },
      error: (err) => {
        this.converting.set(false);
        this.error.set(err.message || 'Failed to convert opportunity to project');
      }
    });
  }
}
