import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Client, ClientStatus, LeadSource } from '../../../shared/models/index';
import { AddClientModalComponent } from '../shared/add-client-modal/add-client-modal.component';
import { ScheduleMeetingModalComponent } from '../shared/schedule-meeting-modal/schedule-meeting-modal.component';

@Component({
  selector: 'app-client-directory',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    AddClientModalComponent,
    ScheduleMeetingModalComponent
  ],
  template: `
    <div class="client-directory-container">
      <!-- HEADER -->
      <div class="directory-header">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Client Directory</h1>
            <span class="count-badge">{{ filteredClients().length }} Clients</span>
          </div>
          <p class="page-subtitle">Central registry of potential and active software development clients</p>
        </div>

        <div class="header-actions">
          <a routerLink="/sales/pipeline" class="btn btn-outline btn-sm">
            <span class="material-icons">view_kanban</span> Pipeline Board
          </a>
          <button class="btn btn-gradient btn-sm" (click)="showAddModal.set(true)">
            <span class="material-icons">person_add</span> + Add Client
          </button>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="directory-toolbar">
        <div class="search-wrap">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search by company, contact person, city, email..." [(ngModel)]="searchQuery" />
          @if (searchQuery) {
            <button class="clear-btn" (click)="searchQuery = ''"><span class="material-icons">close</span></button>
          }
        </div>

        <div class="filters-row">
          <select [(ngModel)]="selectedStatus" class="toolbar-select">
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CUSTOMER">Customer</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select [(ngModel)]="selectedOwner" class="toolbar-select">
            <option value="">All Owners</option>
            @for (emp of salesEmployees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
            }
          </select>

          <select [(ngModel)]="selectedSource" class="toolbar-select">
            <option value="">All Lead Sources</option>
            <option value="WEBSITE_ENQUIRY">Website</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="REFERRAL">Referral</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="COLD_CALLING">Cold Calling</option>
            <option value="ADVERTISEMENT">Ads</option>
            <option value="EXISTING_CLIENT">Existing Client</option>
          </select>

          @if (searchQuery || selectedStatus || selectedOwner || selectedSource) {
            <button class="btn-reset" (click)="resetFilters()">
              <span class="material-icons">filter_alt_off</span> Reset
            </button>
          }
        </div>
      </div>

      <!-- CLIENTS TABLE -->
      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client / Company</th>
                <th>Primary Contact</th>
                <th>Industry & City</th>
                <th>Requested Services</th>
                <th>Assigned Owner</th>
                <th>Deal Opportunities</th>
                <th>Next Follow-up</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of filteredClients(); track c.id) {
                <tr class="client-table-row" [routerLink]="['/sales/clients', c.id]">
                  <!-- COMPANY -->
                  <td>
                    <div class="company-cell">
                      <div class="company-avatar" [style.background]="getAvatarColor(c.companyName)">
                        {{ c.companyName.charAt(0) }}
                      </div>
                      <div class="company-text">
                        <span class="company-title">{{ c.companyName }}</span>
                        @if (c.website) {
                          <span class="company-link" (click)="$event.stopPropagation()">
                            <a [href]="c.website" target="_blank">{{ formatUrl(c.website) }}</a>
                          </span>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- PRIMARY CONTACT -->
                  <td>
                    <div class="contact-cell">
                      <span class="contact-name">{{ c.contactPerson }}</span>
                      <span class="contact-role text-muted">{{ c.designation || 'Contact Person' }}</span>
                      <div class="contact-links" (click)="$event.stopPropagation()">
                        @if (c.phone) {
                          <a [href]="'tel:' + c.phone" class="quick-icon-btn" title="Call">
                            <span class="material-icons">call</span>
                          </a>
                        }
                        @if (c.whatsapp) {
                          <a [href]="'https://wa.me/' + cleanPhone(c.whatsapp)" target="_blank" class="quick-icon-btn text-success" title="WhatsApp">
                            <span class="material-icons">chat</span>
                          </a>
                        }
                        @if (c.email) {
                          <a [href]="'mailto:' + c.email" class="quick-icon-btn" title="Email">
                            <span class="material-icons">mail</span>
                          </a>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- INDUSTRY & CITY -->
                  <td>
                    <div class="industry-cell">
                      <span class="industry-name">{{ c.industry || 'Technology' }}</span>
                      <span class="city-name text-muted">
                        <span class="material-icons location-icon">place</span> {{ c.city }}
                      </span>
                    </div>
                  </td>

                  <!-- REQUESTED SERVICES -->
                  <td>
                    <div class="services-stack">
                      @for (srv of (c.serviceRequirements || []).slice(0, 2); track srv) {
                        <span class="service-tag">{{ srv }}</span>
                      }
                      @if ((c.serviceRequirements || []).length > 2) {
                        <span class="service-tag more">+{{ c.serviceRequirements.length - 2 }}</span>
                      }
                    </div>
                  </td>

                  <!-- ASSIGNED OWNER -->
                  <td>
                    <div class="owner-cell">
                      <div class="avatar avatar-xs" [style.background]="getAvatarColor(c.assignedToName)">
                        {{ c.assignedToName.charAt(0) }}
                      </div>
                      <span class="owner-name">{{ c.assignedToName }}</span>
                    </div>
                  </td>

                  <!-- OPPORTUNITIES COUNT & VALUE -->
                  <td>
                    <div class="opp-stat-cell">
                      <span class="opp-val">₹{{ ((c.totalValue || 0) / 100000).toFixed(1) }}L</span>
                      <span class="opp-count text-muted">{{ c.opportunitiesCount || 1 }} deal(s)</span>
                    </div>
                  </td>

                  <!-- NEXT FOLLOW-UP -->
                  <td>
                    <div class="followup-cell">
                      @if (c.nextFollowUpAt) {
                        <span class="fu-date" [class.is-overdue]="isOverdue(c.nextFollowUpAt)">
                          <span class="material-icons">event</span>
                          {{ formatShortDate(c.nextFollowUpAt) }}
                        </span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </div>
                  </td>

                  <!-- STATUS -->
                  <td>
                    <span class="badge" [class]="getStatusClass(c.status)">{{ c.status }}</span>
                  </td>

                  <!-- ACTIONS -->
                  <td class="text-right" (click)="$event.stopPropagation()">
                    <div class="row-actions">
                      <button class="icon-btn-sm" (click)="openScheduleModal(c)" title="Schedule Meeting / Visit">
                        <span class="material-icons">event</span>
                      </button>
                      <a [routerLink]="['/sales/clients', c.id]" class="icon-btn-sm" title="View Profile">
                        <span class="material-icons">chevron_right</span>
                      </a>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9">
                    <div class="empty-state-table">
                      <span class="material-icons">business</span>
                      <h4>No clients match your filter criteria</h4>
                      <p>Try modifying your search or click "+ Add Client" to create a new record.</p>
                      <button class="btn btn-outline btn-sm mt-2" (click)="resetFilters()">Reset Filters</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    @if (showAddModal()) {
      <app-add-client-modal (close)="showAddModal.set(false)" (clientCreated)="refresh()" />
    }

    @if (selectedClientForMeeting()) {
      <app-schedule-meeting-modal
        [preselectedClientId]="selectedClientForMeeting()!.id"
        (close)="selectedClientForMeeting.set(null)"
        (scheduled)="refresh()"
      />
    }
  `,
  styles: [`
    .client-directory-container {
      padding: 24px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .directory-header {
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
    .directory-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #FFFFFF;
      padding: 12px 16px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 7px 12px;
      width: 320px;
    }
    .search-wrap .material-icons {
      font-size: 18px;
      color: #94A3B8;
    }
    .search-wrap input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.85rem;
      width: 100%;
      color: #172033;
    }
    .clear-btn {
      background: none;
      border: none;
      padding: 0;
      color: #94A3B8;
      cursor: pointer;
      display: flex;
    }
    .filters-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-select {
      padding: 7px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.82rem;
      background: #FFFFFF;
      color: #334155;
      outline: none;
      cursor: pointer;
    }
    .toolbar-select:focus {
      border-color: #2563EB;
    }
    .btn-reset {
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

    /* TABLE */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
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
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 0.84rem;
      vertical-align: middle;
    }
    .client-table-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .client-table-row:hover {
      background: #F8FAFC;
    }

    .company-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .company-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
      flex-shrink: 0;
    }
    .company-text {
      display: flex;
      flex-direction: column;
    }
    .company-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #101B35;
    }
    .company-link a {
      font-size: 0.74rem;
      color: #2563EB;
      text-decoration: none;
    }
    .company-link a:hover {
      text-decoration: underline;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
    }
    .contact-name {
      font-weight: 600;
      color: #172033;
    }
    .contact-role {
      font-size: 0.74rem;
    }
    .contact-links {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .quick-icon-btn {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      text-decoration: none;
      transition: all 0.15s;
    }
    .quick-icon-btn:hover {
      background: #E2E8F0;
      color: #2563EB;
    }
    .quick-icon-btn .material-icons {
      font-size: 13px;
    }

    .industry-cell {
      display: flex;
      flex-direction: column;
    }
    .industry-name {
      font-weight: 600;
      color: #334155;
    }
    .city-name {
      font-size: 0.74rem;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .location-icon {
      font-size: 13px;
    }

    .services-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 220px;
    }
    .service-tag {
      font-size: 0.7rem;
      background: #EFF6FF;
      color: #1D4ED8;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .service-tag.more {
      background: #F1F5F9;
      color: #475569;
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
      font-size: 0.7rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .owner-name {
      font-size: 0.8rem;
      color: #475569;
    }

    .opp-stat-cell {
      display: flex;
      flex-direction: column;
    }
    .opp-val {
      font-weight: 700;
      color: #16A34A;
      font-size: 0.88rem;
    }
    .opp-count {
      font-size: 0.72rem;
    }

    .followup-cell {
      font-size: 0.78rem;
    }
    .fu-date {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #475569;
    }
    .fu-date .material-icons {
      font-size: 14px;
      color: #94A3B8;
    }
    .fu-date.is-overdue {
      color: #DC2626;
      font-weight: 600;
    }
    .fu-date.is-overdue .material-icons {
      color: #DC2626;
    }

    .row-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .icon-btn-sm {
      background: none;
      border: none;
      padding: 5px;
      border-radius: 6px;
      color: #64748B;
      cursor: pointer;
      display: flex;
    }
    .icon-btn-sm:hover {
      background: #E2E8F0;
      color: #101B35;
    }

    .empty-state-table {
      text-align: center;
      padding: 40px 20px;
      color: #64748B;
    }
    .empty-state-table .material-icons {
      font-size: 40px;
      color: #94A3B8;
      margin-bottom: 8px;
    }
    .empty-state-table h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      color: #101B35;
    }
  `]
})
export class ClientDirectoryComponent implements OnInit {
  private salesService = inject(SalesService);
  private empService = inject(EmployeeService);

  clients = signal<Client[]>([]);
  salesEmployees = signal<any[]>([]);

  searchQuery = '';
  selectedStatus = '';
  selectedOwner = '';
  selectedSource = '';

  showAddModal = signal(false);
  selectedClientForMeeting = signal<Client | null>(null);

  filteredClients = computed(() => {
    let list = this.clients();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q))
      );
    }

    if (this.selectedStatus) {
      list = list.filter(c => c.status === this.selectedStatus);
    }

    if (this.selectedOwner) {
      list = list.filter(c => c.assignedTo === this.selectedOwner);
    }

    if (this.selectedSource) {
      list = list.filter(c => c.leadSource === this.selectedSource);
    }

    return list;
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
    this.salesService.getClients().subscribe(list => this.clients.set(list));
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedOwner = '';
    this.selectedSource = '';
  }

  formatUrl(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  cleanPhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  formatShortDate(iso?: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }

  isOverdue(iso?: string): boolean {
    if (!iso) return false;
    return new Date(iso).getTime() < Date.now();
  }

  getStatusClass(status: ClientStatus): string {
    if (status === 'CUSTOMER') return 'badge-success';
    if (status === 'PROSPECT') return 'badge-info';
    if (status === 'LEAD') return 'badge-cyan';
    return 'badge-gray';
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    const idx = (name || 'U').charCodeAt(0) % colors.length;
    return colors[idx];
  }

  openScheduleModal(c: Client): void {
    this.selectedClientForMeeting.set(c);
  }
}
