import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import {
  ClientType,
  LeadSource,
  ServiceCategory,
  ExistingSystemStatus,
  BudgetConfirmation,
  Client
} from '../../../../shared/models/index';

@Component({
  selector: 'app-add-client-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
        <!-- MODAL HEADER -->
        <div class="modal-header">
          <div class="m-title">
            <span class="material-icons brand-icon">person_add</span>
            <div>
              <h3>Add New Client</h3>
              <p class="m-subtitle">Capture client details, service needs, and immediate next action</p>
            </div>
          </div>
          <button class="icon-btn" (click)="close.emit()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- STEP WIZARD BAR -->
        <div class="wizard-stepper">
          <div class="wizard-step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1" (click)="goToStep(1)">
            <span class="step-num">1</span>
            <span class="step-label">Basic Info</span>
          </div>
          <div class="step-line" [class.filled]="currentStep() > 1"></div>

          <div class="wizard-step" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2" (click)="goToStep(2)">
            <span class="step-num">2</span>
            <span class="step-label">Lead Source</span>
          </div>
          <div class="step-line" [class.filled]="currentStep() > 2"></div>

          <div class="wizard-step" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3" (click)="goToStep(3)">
            <span class="step-num">3</span>
            <span class="step-label">Requirements</span>
          </div>
          <div class="step-line" [class.filled]="currentStep() > 3"></div>

          <div class="wizard-step" [class.active]="currentStep() === 4" (click)="goToStep(4)">
            <span class="step-num">4</span>
            <span class="step-label">Next Action</span>
          </div>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body">
          <!-- STEP 1: BASIC INFORMATION -->
          @if (currentStep() === 1) {
            <div class="step-content animate-fade-in">
              <div class="form-group mb-4">
                <label class="form-label">Client Type <span class="required">*</span></label>
                <div class="type-toggle-group">
                  <button type="button" class="type-btn" [class.active]="clientType === 'COMPANY'" (click)="clientType = 'COMPANY'">
                    <span class="material-icons">business</span>
                    <span>Company / Business</span>
                  </button>
                  <button type="button" class="type-btn" [class.active]="clientType === 'INDIVIDUAL'" (click)="clientType = 'INDIVIDUAL'">
                    <span class="material-icons">person</span>
                    <span>Individual / Founder</span>
                  </button>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">
                    {{ clientType === 'COMPANY' ? 'Company Name' : 'Business / Brand Name' }}
                    <span class="required">*</span>
                  </label>
                  <input type="text" [(ngModel)]="companyName" placeholder="e.g. ABC Technologies Pvt. Ltd." class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Industry / Domain</label>
                  <input type="text" [(ngModel)]="industry" placeholder="e.g. Fintech, Healthcare, E-Commerce" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Contact Person Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="contactPerson" placeholder="e.g. Rahul Sharma" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Designation / Role</label>
                  <input type="text" [(ngModel)]="designation" placeholder="e.g. VP Technology, Managing Director" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Business Email <span class="required">*</span></label>
                  <input type="email" [(ngModel)]="email" placeholder="e.g. rahul@abctech.com" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number <span class="required">*</span></label>
                  <input type="tel" [(ngModel)]="phone" placeholder="e.g. +91 98201 44521" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">WhatsApp Number (if different)</label>
                  <input type="tel" [(ngModel)]="whatsapp" placeholder="e.g. +91 98201 44521" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Company Website</label>
                  <input type="url" [(ngModel)]="website" placeholder="https://example.com" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">City / Location <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="city" placeholder="e.g. Mumbai, Pune, Bengaluru" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Office Address</label>
                  <input type="text" [(ngModel)]="address" placeholder="e.g. BKC G-Block, Mumbai 400051" class="form-control" />
                </div>
              </div>
            </div>
          }

          <!-- STEP 2: LEAD SOURCE -->
          @if (currentStep() === 2) {
            <div class="step-content animate-fade-in">
              <label class="form-label mb-2">How did we receive this lead? <span class="required">*</span></label>
              <div class="pills-grid mb-4">
                @for (src of leadSources; track src.key) {
                  <button type="button" class="pill-btn" [class.selected]="leadSource === src.key" (click)="leadSource = src.key">
                    <span class="material-icons pill-icon">{{ src.icon }}</span>
                    <span>{{ src.label }}</span>
                  </button>
                }
              </div>

              <div class="form-group">
                <label class="form-label">Source Details / Referral Notes</label>
                <input type="text" [(ngModel)]="sourceDetails" placeholder="e.g. Inbound inquiry from website contact form, or referred by Dr. Alok" class="form-control" />
              </div>

              <div class="form-row mt-3">
                <div class="form-group">
                  <label class="form-label">Assign Sales Owner <span class="required">*</span></label>
                  <select [(ngModel)]="assignedTo" class="form-control">
                    @for (emp of salesEmployees(); track emp.id) {
                      <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.designation || 'Sales' }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Initial Lead Status</label>
                  <select [(ngModel)]="clientStatus" class="form-control">
                    <option value="LEAD">New Lead</option>
                    <option value="PROSPECT">Qualified Prospect</option>
                    <option value="CUSTOMER">Existing Customer</option>
                  </select>
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Initial Lead Notes</label>
                <textarea [(ngModel)]="notes" rows="2" placeholder="Key observations from first interaction..." class="form-control"></textarea>
              </div>
            </div>
          }

          <!-- STEP 3: SERVICE REQUIREMENTS -->
          @if (currentStep() === 3) {
            <div class="step-content animate-fade-in">
              <label class="form-label mb-2">What services does the client need? <span class="required">*</span></label>
              <p class="form-hint mb-3">Select all service capabilities that apply to this opportunity:</p>
              
              <div class="services-chips-grid mb-4">
                @for (srv of availableServices; track srv) {
                  <div class="service-chip" [class.checked]="isServiceSelected(srv)" (click)="toggleService(srv)">
                    <span class="material-icons chip-check">{{ isServiceSelected(srv) ? 'check_box' : 'check_box_outline_blank' }}</span>
                    <span>{{ srv }}</span>
                  </div>
                }
              </div>

              <div class="form-group">
                <label class="form-label">What core problem does the client want to solve?</label>
                <textarea [(ngModel)]="businessProblem" rows="2" placeholder="e.g. Manual spreadsheets causing lead leakage and dispatch delays..." class="form-control"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Detailed Project Requirements</label>
                <textarea [(ngModel)]="detailedRequirements" rows="3" placeholder="Key functionality, user roles, integrations (e.g. WhatsApp API, Payment gateway, ERP sync)..." class="form-control"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Do they already have an existing system?</label>
                  <select [(ngModel)]="hasExistingSystem" class="form-control">
                    <option value="YES">Yes (Replacing / Upgrading)</option>
                    <option value="NO">No (Building Fresh from Scratch)</option>
                    <option value="NOT_SURE">Not Sure / To Be Evaluated</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Reference App / Website URL</label>
                  <input type="url" [(ngModel)]="referenceUrl" placeholder="https://example.com" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">When do they want to start?</label>
                  <select [(ngModel)]="preferredTimeline" class="form-control">
                    <option value="Immediately">Immediately (Within 7–14 days)</option>
                    <option value="Within 30 days">Within 30 days</option>
                    <option value="Within 3 months">Within 3 months</option>
                    <option value="Later / Undecided">Later / Exploratory</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Estimated Budget Range</label>
                  <select [(ngModel)]="estimatedBudgetRange" class="form-control">
                    <option value="Not discussed">Not Discussed Yet</option>
                    <option value="Below ₹50,000">Below ₹50,000</option>
                    <option value="₹50,000–₹1 lakh">₹50,000 – ₹1 Lakh</option>
                    <option value="₹1–5 lakh">₹1 – ₹5 Lakh</option>
                    <option value="₹5–10 lakh">₹5 – ₹10 Lakh</option>
                    <option value="Above ₹10 lakh">Above ₹10 Lakh</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- STEP 4: NEXT ACTION -->
          @if (currentStep() === 4) {
            <div class="step-content animate-fade-in">
              <label class="form-label mb-2">Choose the immediate next step for this client <span class="required">*</span></label>
              <p class="form-hint mb-3">Every active lead should have a clear follow-up or scheduled meeting:</p>

              <div class="next-action-cards">
                @for (act of nextActions; track act.key) {
                  <div class="action-card" [class.selected]="selectedNextAction === act.key" (click)="selectedNextAction = act.key">
                    <div class="action-icon-circle" [style.background]="act.bg" [style.color]="act.color">
                      <span class="material-icons">{{ act.icon }}</span>
                    </div>
                    <div class="action-card-text">
                      <span class="act-title">{{ act.title }}</span>
                      <span class="act-desc">{{ act.desc }}</span>
                    </div>
                    <span class="material-icons check-mark">{{ selectedNextAction === act.key ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                  </div>
                }
              </div>

              @if (selectedNextAction !== 'SAVE_ONLY') {
                <div class="form-row mt-4 p-3 bg-light rounded">
                  <div class="form-group">
                    <label class="form-label">Follow-up / Meeting Date</label>
                    <input type="date" [(ngModel)]="nextActionDate" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Time</label>
                    <input type="time" [(ngModel)]="nextActionTime" class="form-control" />
                  </div>
                </div>
              }

              @if (validationError()) {
                <div class="alert alert-danger mt-3">
                  <span class="material-icons">error_outline</span>
                  <span>{{ validationError() }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer">
          @if (currentStep() > 1) {
            <button type="button" class="btn btn-outline" (click)="prevStep()">
              <span class="material-icons">arrow_back</span> Back
            </button>
          } @else {
            <button type="button" class="btn btn-outline" (click)="saveDraft()">
              <span class="material-icons">drafts</span> Save as Draft
            </button>
          }

          <div class="spacer"></div>

          @if (currentStep() < 4) {
            <button type="button" class="btn btn-primary" (click)="nextStep()">
              Continue <span class="material-icons">arrow_forward</span>
            </button>
          } @else {
            <button type="button" class="btn btn-gradient" (click)="submitClient()" [disabled]="saving()">
              @if (saving()) {
                <span class="spinner-sm"></span> Saving...
              } @else {
                <span class="material-icons">check_circle</span> Create Client & Opportunity
              }
            </button>
          }
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
      z-index: 999;
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
      max-width: 760px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px;
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
      font-size: 28px;
      color: #2563EB;
      background: #EFF6FF;
      padding: 8px;
      border-radius: 10px;
    }
    .m-title h3 {
      margin: 0;
      font-size: 1.15rem;
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
      display: flex;
    }
    .icon-btn:hover {
      background: #E2E8F0;
      color: #101B35;
    }
    .wizard-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 32px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
    }
    .wizard-step {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #F1F5F9;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .step-label {
      font-size: 0.82rem;
      color: #64748B;
      font-weight: 600;
    }
    .wizard-step.active .step-num {
      background: #2563EB;
      color: #FFFFFF;
    }
    .wizard-step.active .step-label {
      color: #2563EB;
    }
    .wizard-step.completed .step-num {
      background: #16A34A;
      color: #FFFFFF;
    }
    .step-line {
      flex: 1;
      height: 2px;
      background: #E2E8F0;
      margin: 0 12px;
    }
    .step-line.filled {
      background: #16A34A;
    }
    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    .type-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .type-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      border: 2px solid #E2E8F0;
      background: #FFFFFF;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 0.2s;
    }
    .type-btn.active {
      border-color: #2563EB;
      background: #EFF6FF;
      color: #2563EB;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #172033;
      margin-bottom: 6px;
    }
    .required {
      color: #DC2626;
    }
    .form-hint {
      font-size: 0.8rem;
      color: #64748B;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 14px;
    }
    .form-group {
      margin-bottom: 14px;
    }
    .form-control {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #172033;
      outline: none;
      background: #FFFFFF;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .pills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
    }
    .pill-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      border-radius: 8px;
      font-size: 0.82rem;
      color: #475569;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .pill-btn:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }
    .pill-btn.selected {
      border-color: #2563EB;
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 600;
    }
    .pill-icon {
      font-size: 18px;
    }
    .services-chips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px;
    }
    .service-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      font-size: 0.82rem;
      cursor: pointer;
      user-select: none;
      background: #FFFFFF;
      transition: all 0.15s;
    }
    .service-chip:hover {
      border-color: #94A3B8;
    }
    .service-chip.checked {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #1D4ED8;
      font-weight: 600;
    }
    .chip-check {
      font-size: 18px;
      color: #64748B;
    }
    .service-chip.checked .chip-check {
      color: #2563EB;
    }
    .next-action-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .action-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-card:hover {
      border-color: #CBD5E1;
      background: #F8FAFC;
    }
    .action-card.selected {
      border-color: #2563EB;
      background: #EFF6FF;
    }
    .action-icon-circle {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .action-card-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .act-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #101B35;
    }
    .act-desc {
      font-size: 0.78rem;
      color: #64748B;
    }
    .check-mark {
      color: #94A3B8;
    }
    .action-card.selected .check-mark {
      color: #2563EB;
    }
    .modal-footer {
      padding: 14px 24px;
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
      padding: 10px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }
  `]
})
export class AddClientModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() clientCreated = new EventEmitter<Client>();

  private salesService = inject(SalesService);
  private empService = inject(EmployeeService);

  currentStep = signal(1);
  saving = signal(false);
  validationError = signal<string | null>(null);

  // Form Fields
  clientType: ClientType = 'COMPANY';
  companyName = '';
  industry = '';
  contactPerson = '';
  designation = '';
  email = '';
  phone = '';
  whatsapp = '';
  website = '';
  city = '';
  address = '';

  leadSource: LeadSource = 'WEBSITE_ENQUIRY';
  sourceDetails = '';
  assignedTo = 'u3';
  clientStatus: 'LEAD' | 'PROSPECT' | 'CUSTOMER' = 'LEAD';
  notes = '';

  selectedServices: string[] = ['Custom Software Development'];
  businessProblem = '';
  detailedRequirements = '';
  hasExistingSystem: ExistingSystemStatus = 'NO';
  referenceUrl = '';
  preferredTimeline = 'Within 30 days';
  estimatedBudgetRange = '₹1–5 lakh';

  selectedNextAction = 'SCHEDULE_DISCOVERY_CALL';
  nextActionDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  nextActionTime = '11:00';

  salesEmployees = signal<any[]>([]);

  leadSources: { key: LeadSource; label: string; icon: string }[] = [
    { key: 'WEBSITE_ENQUIRY', label: 'Website Enquiry', icon: 'language' },
    { key: 'LINKEDIN', label: 'LinkedIn', icon: 'share' },
    { key: 'INSTAGRAM', label: 'Instagram', icon: 'photo_camera' },
    { key: 'REFERRAL', label: 'Referral', icon: 'handshake' },
    { key: 'COLD_CALLING', label: 'Cold Calling', icon: 'call' },
    { key: 'WHATSAPP', label: 'WhatsApp', icon: 'chat' },
    { key: 'EMAIL', label: 'Direct Email', icon: 'email' },
    { key: 'ADVERTISEMENT', label: 'Google / Meta Ads', icon: 'campaign' },
    { key: 'EXISTING_CLIENT', label: 'Existing Client', icon: 'repeat' },
    { key: 'WALK_IN', label: 'Walk-in / Office Visit', icon: 'storefront' },
    { key: 'OTHER', label: 'Other', icon: 'more_horiz' },
  ];

  availableServices: ServiceCategory[] = [
    'Website Development',
    'Web Application Development',
    'Android / iOS Application Development',
    'Custom Software Development',
    'ERP Development',
    'CRM Development',
    'Learning Management System',
    'AI Solutions',
    'Business Automation',
    'Digital Marketing / Ads Management',
    'Maintenance and Support',
    'Other / Custom Requirement'
  ];

  nextActions = [
    {
      key: 'SCHEDULE_DISCOVERY_CALL',
      title: 'Schedule Discovery Call (Online)',
      desc: 'Set up an introductory video/phone call to explore requirements',
      icon: 'videocam',
      bg: '#EFF6FF',
      color: '#2563EB'
    },
    {
      key: 'SCHEDULE_CLIENT_VISIT',
      title: 'Schedule Client Office Visit',
      desc: 'Plan an on-site visit to the client’s office to review workflow',
      icon: 'directions_car',
      bg: '#F5F3FF',
      color: '#7C3AED'
    },
    {
      key: 'SCHEDULE_CRESENIX_VISIT',
      title: 'Client Visiting CRESENIX Office',
      desc: 'Invite the client to CRESENIX development headquarters',
      icon: 'corporate_fare',
      bg: '#ECFDF5',
      color: '#059669'
    },
    {
      key: 'CREATE_FOLLOWUP',
      title: 'Create Follow-up Reminder',
      desc: 'Add a high-priority task in Today’s Activities to follow up',
      icon: 'alarm',
      bg: '#FFFBEB',
      color: '#D97706'
    },
    {
      key: 'SAVE_ONLY',
      title: 'Save without Scheduling',
      desc: 'Store client profile into directory for future outreach',
      icon: 'check',
      bg: '#F1F5F9',
      color: '#64748B'
    }
  ];

  constructor() {
    this.empService.getEmployees().subscribe(res => {
      if (res && Array.isArray(res)) {
        this.salesEmployees.set(res);
      }
    });
  }

  isServiceSelected(srv: string): boolean {
    return this.selectedServices.includes(srv);
  }

  toggleService(srv: string): void {
    if (this.isServiceSelected(srv)) {
      this.selectedServices = this.selectedServices.filter(s => s !== srv);
    } else {
      this.selectedServices = [...this.selectedServices, srv];
    }
  }

  goToStep(step: number): void {
    if (step > this.currentStep()) {
      if (!this.validateStep(this.currentStep())) return;
    }
    this.currentStep.set(step);
    this.validationError.set(null);
  }

  nextStep(): void {
    if (!this.validateStep(this.currentStep())) return;
    this.currentStep.update(s => s + 1);
    this.validationError.set(null);
  }

  prevStep(): void {
    this.currentStep.update(s => Math.max(1, s - 1));
    this.validationError.set(null);
  }

  validateStep(step: number): boolean {
    this.validationError.set(null);
    if (step === 1) {
      if (!this.companyName.trim()) {
        this.validationError.set('Please enter company or business name');
        return false;
      }
      if (!this.contactPerson.trim()) {
        this.validationError.set('Please enter contact person name');
        return false;
      }
      if (!this.email.trim() && !this.phone.trim()) {
        this.validationError.set('Please provide either an email or phone number to reach the client');
        return false;
      }
      if (!this.city.trim()) {
        this.validationError.set('Please enter client city');
        return false;
      }
    }
    if (step === 3) {
      if (this.selectedServices.length === 0) {
        this.validationError.set('Please select at least one required service category');
        return false;
      }
    }
    return true;
  }

  saveDraft(): void {
    if (!this.companyName && !this.contactPerson) {
      this.validationError.set('Provide at least a company name or contact person to save draft');
      return;
    }
    this.createClientRecord('DRAFT');
  }

  submitClient(): void {
    if (!this.validateStep(1) || !this.validateStep(3)) return;
    this.createClientRecord('ACTIVE');
  }

  private createClientRecord(mode: 'DRAFT' | 'ACTIVE'): void {
    this.saving.set(true);

    const emp = this.salesEmployees().find(e => e.id === this.assignedTo);
    const assignedName = emp ? `${emp.firstName} ${emp.lastName}` : 'Arjun Patel';

    // Approximate numeric value for opportunity calculation
    const budgetMap: Record<string, number> = {
      'Below ₹50,000': 40000,
      '₹50,000–₹1 lakh': 80000,
      '₹1–5 lakh': 300000,
      '₹5–10 lakh': 750000,
      'Above ₹10 lakh': 1500000,
      'Not discussed': 250000
    };
    const approxVal = budgetMap[this.estimatedBudgetRange] || 250000;

    const followUpISO = this.nextActionDate
      ? `${this.nextActionDate}T${this.nextActionTime}:00Z`
      : undefined;

    this.salesService.createClient({
      clientType: this.clientType,
      companyName: this.companyName,
      industry: this.industry,
      contactPerson: this.contactPerson,
      designation: this.designation,
      email: this.email,
      phone: this.phone,
      whatsapp: this.whatsapp || this.phone,
      website: this.website,
      city: this.city,
      address: this.address,
      leadSource: this.leadSource,
      sourceDetails: this.sourceDetails,
      status: this.clientStatus,
      assignedTo: this.assignedTo,
      assignedToName: assignedName,
      serviceRequirements: this.selectedServices,
      businessProblem: this.businessProblem,
      detailedRequirements: this.detailedRequirements,
      hasExistingSystem: this.hasExistingSystem,
      referenceUrl: this.referenceUrl,
      preferredTimeline: this.preferredTimeline,
      estimatedBudgetRange: this.estimatedBudgetRange,
      budgetConfirmation: this.estimatedBudgetRange === 'Not discussed' ? 'NOT_DISCUSSED' : 'APPROXIMATE',
      nextFollowUpAt: followUpISO,
      notes: this.notes
    }).subscribe(newClient => {
      // Also automatically initialize a corresponding Sales Opportunity!
      this.salesService.createOpportunity({
        clientId: newClient.id,
        clientName: newClient.companyName,
        clientType: newClient.clientType,
        title: `${this.selectedServices[0] || 'Software Solution'} for ${newClient.companyName}`,
        contactPerson: newClient.contactPerson,
        contactPhone: newClient.phone,
        contactEmail: newClient.email,
        serviceType: this.selectedServices[0] || 'Custom Software Development',
        requestedServices: this.selectedServices,
        leadSource: newClient.leadSource,
        stage: 'NEW_LEAD',
        estimatedValue: approxVal,
        priority: 'MEDIUM',
        assignedTo: this.assignedTo,
        assignedToName: assignedName,
        requirementSummary: this.businessProblem || this.detailedRequirements || 'Initial lead captured via Add Client wizard',
        nextAction: this.selectedNextAction === 'SCHEDULE_CLIENT_VISIT'
          ? 'Client Office Visit'
          : this.selectedNextAction === 'SCHEDULE_DISCOVERY_CALL'
          ? 'Online Discovery Call'
          : 'Follow-up Call'
      }).subscribe(opp => {
        // Trigger follow-up / meeting creation if requested
        if (this.selectedNextAction === 'SCHEDULE_DISCOVERY_CALL' && followUpISO) {
          this.salesService.scheduleMeeting({
            clientId: newClient.id,
            clientName: newClient.companyName,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            title: `Discovery Call: ${newClient.companyName}`,
            type: 'DISCOVERY_CALL',
            date: this.nextActionDate,
            startTime: this.nextActionTime,
            endTime: '11:45',
            agenda: this.businessProblem || 'Requirements discovery session'
          }).subscribe();
        } else if (this.selectedNextAction === 'SCHEDULE_CLIENT_VISIT' && followUpISO) {
          this.salesService.scheduleMeeting({
            clientId: newClient.id,
            clientName: newClient.companyName,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            title: `Client Office Visit: ${newClient.companyName}`,
            type: 'CLIENT_OFFICE_VISIT',
            date: this.nextActionDate,
            startTime: this.nextActionTime,
            endTime: '12:30',
            visitAddress: this.address || `${this.city} Office`,
            visitPurpose: 'On-site workflow demonstration and stakeholder discussion'
          }).subscribe();
        } else if (this.selectedNextAction === 'CREATE_FOLLOWUP' && followUpISO) {
          this.salesService.createActivity({
            clientId: newClient.id,
            clientName: newClient.companyName,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            type: 'CALL',
            title: `Follow-up Call with ${newClient.contactPerson}`,
            description: this.notes || 'Discuss project scope and schedule discovery',
            dueAt: followUpISO
          }).subscribe();
        }

        this.saving.set(false);
        this.clientCreated.emit(newClient);
        this.close.emit();
      });
    });
  }
}
