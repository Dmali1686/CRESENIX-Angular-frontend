import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService, CreateEmployeeRequest } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Employee } from '../../../shared/models/index';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Employee Directory</h1>
          <p class="page-subtitle">Company team members, roles, workload, and project assignments</p>
        </div>
        <div class="page-actions">
          <div class="view-toggle">
            <button class="toggle-btn" [class.active]="viewMode() === 'cards'" (click)="viewMode.set('cards')">
              <span class="material-icons">grid_view</span>
            </button>
            <button class="toggle-btn" [class.active]="viewMode() === 'table'" (click)="viewMode.set('table')">
              <span class="material-icons">table_rows</span>
            </button>
          </div>
          <a routerLink="/teams" class="btn btn-outline btn-sm">
            <span class="material-icons">groups</span> Teams
          </a>
          <!-- Only Super Admin sees "Create User" -->
          @if (isSuperAdmin()) {
            <button class="btn btn-gradient btn-sm" id="create-user-btn" (click)="openCreateModal()">
              <span class="material-icons">person_add</span> Add User
            </button>
          }
        </div>
      </div>

      <!-- FILTERS -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search by name, email or designation..." [(ngModel)]="searchQuery" (ngModelChange)="filterEmployees()" />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="deptFilter" (ngModelChange)="filterEmployees()" class="filter-select">
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="Operations">Operations</option>
            <option value="Quality">Quality</option>
            <option value="Management">Management</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
          </select>
          <select [(ngModel)]="roleFilter" (ngModelChange)="filterEmployees()" class="filter-select">
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="SALES">Sales</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
        <div class="emp-count-badge">
          <span class="material-icons">people</span>
          {{ filteredEmployees().length }} of {{ employees().length }}
        </div>
      </div>

      <!-- CARDS VIEW -->
      @if (viewMode() === 'cards') {
        <div class="employees-grid">
          @for (emp of filteredEmployees(); track emp.id) {
            <div class="card emp-card" [routerLink]="['/employees', emp.id]">
              <div class="emp-top">
                <div class="avatar avatar-md" [style.background]="getAvatarColor(emp.firstName)">
                  {{ emp.firstName.charAt(0) }}{{ emp.lastName.charAt(0) }}
                </div>
                <div class="emp-badges">
                  <span class="badge" [class]="getRoleBadgeClass(emp.role)">{{ fmtRole(emp.role) }}</span>
                  @if (!emp.isActive) {
                    <span class="badge badge-danger">Inactive</span>
                  }
                </div>
              </div>

              <div class="emp-info">
                <h3 class="emp-name">{{ emp.firstName }} {{ emp.lastName }}</h3>
                <span class="emp-designation">{{ emp.designation || 'Specialist' }}</span>
                <span class="emp-dept"><span class="material-icons">domain</span> {{ emp.department || 'Operations' }}</span>
              </div>

              <div class="emp-stats">
                <div class="emp-stat-box">
                  <span class="stat-num">{{ emp.activeTaskCount }}</span>
                  <span class="stat-lbl">Active Tasks</span>
                </div>
                <div class="emp-stat-box">
                  <span class="stat-num">{{ emp.assignedProjectIds?.length || 0 }}</span>
                  <span class="stat-lbl">Projects</span>
                </div>
              </div>

              <div class="emp-footer">
                <span class="emp-email">{{ emp.email }}</span>
                @if (isSuperAdmin()) {
                  <div class="emp-actions" (click)="$event.stopPropagation()">
                    <button class="icon-btn-xs" title="Edit user" (click)="openEditStatus(emp)">
                      <span class="material-icons">{{ emp.isActive ? 'person_off' : 'how_to_reg' }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="card empty-state" style="grid-column: 1/-1">
              <span class="material-icons empty-icon text-muted">person_search</span>
              <p class="empty-title">No employees match the filter criteria</p>
            </div>
          }
        </div>
      } @else {
        <!-- TABLE VIEW -->
        <div class="card data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Email</th>
                @if (isSuperAdmin()) { <th>Actions</th> }
              </tr>
            </thead>
            <tbody>
              @for (emp of filteredEmployees(); track emp.id) {
                <tr [routerLink]="['/employees', emp.id]">
                  <td>
                    <div class="emp-table-cell">
                      <div class="avatar avatar-sm" [style.background]="getAvatarColor(emp.firstName)">
                        {{ emp.firstName.charAt(0) }}
                      </div>
                      <span class="table-name">{{ emp.firstName }} {{ emp.lastName }}</span>
                    </div>
                  </td>
                  <td><span class="badge" [class]="getRoleBadgeClass(emp.role)">{{ fmtRole(emp.role) }}</span></td>
                  <td>{{ emp.department }}</td>
                  <td>{{ emp.designation }}</td>
                  <td>
                    <span class="status-dot" [class.active]="emp.isActive" [class.inactive]="!emp.isActive"></span>
                    {{ emp.isActive ? 'Active' : 'Inactive' }}
                  </td>
                  <td class="text-secondary">{{ emp.email }}</td>
                  @if (isSuperAdmin()) {
                    <td (click)="$event.stopPropagation()">
                      <button class="btn btn-outline btn-xs" (click)="openEditStatus(emp)">
                        {{ emp.isActive ? 'Deactivate' : 'Activate' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- CREATE USER MODAL -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    @if (showCreateModal()) {
      <div class="modal-backdrop" (click)="closeCreateModal()">
        <div class="modal-card create-user-modal" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="modal-header">
            <div class="modal-header-icon">
              <span class="material-icons">person_add</span>
            </div>
            <div>
              <h2 class="modal-title">Create New User</h2>
              <p class="modal-subtitle">Add a new team member to the system</p>
            </div>
            <button class="modal-close" (click)="closeCreateModal()">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Success Banner -->
            @if (createSuccess()) {
              <div class="alert-banner success">
                <span class="material-icons">check_circle</span>
                User <strong>{{ createSuccess() }}</strong> created successfully!
              </div>
            }
            <!-- Error Banner -->
            @if (createError()) {
              <div class="alert-banner error">
                <span class="material-icons">error</span>
                {{ createError() }}
              </div>
            }

            <form (ngSubmit)="submitCreateUser()" #createForm="ngForm" autocomplete="off" novalidate>

              <!-- Row 1: First & Last Name -->
              <div class="form-row">
                <div class="form-field">
                  <label for="cu-fname">First Name <span class="req">*</span></label>
                  <input id="cu-fname" type="text" [(ngModel)]="form.firstName" name="firstName"
                         placeholder="e.g. Priya" required #fnameCtrl="ngModel"
                         [class.invalid]="fnameCtrl.invalid && fnameCtrl.touched" />
                  @if (fnameCtrl.invalid && fnameCtrl.touched) {
                    <span class="field-error">First name is required</span>
                  }
                </div>
                <div class="form-field">
                  <label for="cu-lname">Last Name</label>
                  <input id="cu-lname" type="text" [(ngModel)]="form.lastName" name="lastName"
                         placeholder="e.g. Sharma" />
                </div>
              </div>

              <!-- Row 2: Email & Phone -->
              <div class="form-row">
                <div class="form-field">
                  <label for="cu-email">Email Address <span class="req">*</span></label>
                  <input id="cu-email" type="email" [(ngModel)]="form.email" name="email"
                         placeholder="user@cresenix.com" required email #emailCtrl="ngModel"
                         [class.invalid]="emailCtrl.invalid && emailCtrl.touched" />
                  @if (emailCtrl.invalid && emailCtrl.touched) {
                    <span class="field-error">Valid email is required</span>
                  }
                </div>
                <div class="form-field">
                  <label for="cu-phone">Phone Number</label>
                  <input id="cu-phone" type="tel" [(ngModel)]="form.phone" name="phone"
                         placeholder="+91 98765 43210" />
                </div>
              </div>

              <!-- Row 3: Password -->
              <div class="form-row">
                <div class="form-field full">
                  <label for="cu-pass">Password <span class="req">*</span></label>
                  <div class="pass-wrap">
                    <input id="cu-pass" [type]="showPassword() ? 'text' : 'password'"
                           [(ngModel)]="form.password" name="password"
                           placeholder="Min. 8 characters" required minlength="8"
                           #passCtrl="ngModel"
                           [class.invalid]="passCtrl.invalid && passCtrl.touched" />
                    <button type="button" class="pass-toggle" (click)="showPassword.set(!showPassword())">
                      <span class="material-icons">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                  @if (passCtrl.invalid && passCtrl.touched) {
                    <span class="field-error">Password must be at least 8 characters</span>
                  }
                  <div class="pass-strength" [class]="getPassStrengthClass()">
                    <div class="strength-bar">
                      <div class="strength-fill" [style.width]="getPassStrengthPct() + '%'"></div>
                    </div>
                    <span class="strength-label">{{ getPassStrengthLabel() }}</span>
                  </div>
                </div>
              </div>

              <!-- Row 4: Role -->
              <div class="form-row">
                <div class="form-field full">
                  <label>Role <span class="req">*</span></label>
                  <div class="role-pills">
                    @for (r of roles; track r.value) {
                      <button type="button" class="role-pill"
                              [class.selected]="form.role === r.value"
                              (click)="form.role = r.value">
                        <span class="material-icons">{{ r.icon }}</span>
                        <span class="rp-label">{{ r.label }}</span>
                        <span class="rp-desc">{{ r.desc }}</span>
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Row 5: Department & Designation -->
              <div class="form-row">
                <div class="form-field">
                  <label for="cu-dept">Department</label>
                  <select id="cu-dept" [(ngModel)]="form.department" name="department" class="filter-select full">
                    <option value="">Select department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Operations">Operations</option>
                    <option value="Quality">Quality</option>
                    <option value="Management">Management</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div class="form-field">
                  <label for="cu-desig">Designation</label>
                  <input id="cu-desig" type="text" [(ngModel)]="form.designation" name="designation"
                         placeholder="e.g. Senior Developer" />
                </div>
              </div>

              <!-- Actions -->
              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
                <button type="submit" class="btn btn-gradient" id="submit-create-user"
                        [disabled]="createForm.invalid || creating()">
                  @if (creating()) {
                    <span class="spinner"></span> Creating...
                  } @else {
                    <span class="material-icons">person_add</span> Create User
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- TOGGLE STATUS CONFIRM -->
    @if (confirmStatusEmp()) {
      <div class="modal-backdrop" (click)="confirmStatusEmp.set(null)">
        <div class="modal-card confirm-modal" (click)="$event.stopPropagation()">
          <div class="confirm-icon" [class.deactivate]="confirmStatusEmp()!.isActive">
            <span class="material-icons">{{ confirmStatusEmp()!.isActive ? 'person_off' : 'how_to_reg' }}</span>
          </div>
          <h3>{{ confirmStatusEmp()!.isActive ? 'Deactivate' : 'Activate' }} User?</h3>
          <p>Are you sure you want to {{ confirmStatusEmp()!.isActive ? 'deactivate' : 'activate' }}
             <strong>{{ confirmStatusEmp()!.firstName }} {{ confirmStatusEmp()!.lastName }}</strong>?</p>
          <div class="modal-actions">
            <button class="btn btn-outline" (click)="confirmStatusEmp.set(null)">Cancel</button>
            <button class="btn" [class]="confirmStatusEmp()!.isActive ? 'btn-danger' : 'btn-gradient'"
                    (click)="toggleStatus()">
              Confirm
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-actions { display: flex; gap: 8px; align-items: center; }

    .emp-count-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      background: white;
      border: 1.5px solid var(--color-border);
      border-radius: 20px;
      padding: 5px 12px;
      white-space: nowrap;
      .material-icons { font-size: 15px; }
    }

    .view-toggle {
      display: flex;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      .toggle-btn {
        background: transparent; border: none; padding: 6px 10px;
        cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center;
        .material-icons { font-size: 18px; }
        &.active { background: var(--color-light-blue); color: var(--color-blue); }
      }
    }

    .filters-bar {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
      .search-box {
        display: flex; align-items: center; gap: 8px;
        background: white; border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md); padding: 8px 14px;
        flex: 1; min-width: 240px; max-width: 420px;
        &:focus-within { border-color: var(--color-blue); }
        .material-icons { font-size: 18px; color: var(--color-text-muted); }
        input { border: none; outline: none; font-size: 13px; flex: 1; background: transparent; }
      }
      .filter-group { display: flex; gap: 8px; }
      .filter-select {
        padding: 8px 12px; border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md); background: white;
        font-family: 'Inter', sans-serif; font-size: 13px; outline: none; cursor: pointer;
        &.full { width: 100%; }
        &:focus { border-color: var(--color-blue); }
      }
    }

    .employees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .emp-card {
      padding: 24px; cursor: pointer; display: flex; flex-direction: column;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
      &:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--color-blue); }
      .emp-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
      .emp-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
      .emp-info {
        margin-bottom: 16px;
        .emp-name { margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: var(--color-navy); }
        .emp-designation { display: block; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 6px; }
        .emp-dept { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-text-muted); .material-icons { font-size: 14px; } }
      }
      .emp-stats {
        display: flex; gap: 12px; padding: 12px; background: #F8FAFC; border-radius: 8px; margin-bottom: 16px;
        .emp-stat-box { flex: 1; display: flex; flex-direction: column; align-items: center;
          .stat-num { font-size: 16px; font-weight: 700; color: var(--color-navy); }
          .stat-lbl { font-size: 11px; color: var(--color-text-muted); }
        }
      }
      .emp-footer {
        padding-top: 12px; border-top: 1px solid var(--color-border);
        display: flex; align-items: center; justify-content: space-between;
        .emp-email { font-size: 12px; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; flex: 1; }
        .emp-actions { display: flex; gap: 4px; flex-shrink: 0; }
      }
    }

    .icon-btn-xs {
      background: transparent; border: 1px solid var(--color-border); cursor: pointer;
      color: var(--color-text-muted); padding: 4px; border-radius: 6px; display: flex;
      .material-icons { font-size: 15px; }
      &:hover { background: #FEF2F2; color: #DC2626; border-color: #DC2626; }
    }

    .emp-table-cell { display: flex; align-items: center; gap: 10px;
      .table-name { font-weight: 600; color: var(--color-navy); font-size: 13px; }
    }

    .status-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px;
      &.active { background: #10B981; }
      &.inactive { background: #94A3B8; }
    }

    .btn-xs { padding: 3px 10px; font-size: 11px; border-radius: 5px; }
    .btn-danger { background: #DC2626; color: white; border: none; cursor: pointer; border-radius: 8px; padding: 10px 20px; font-weight: 600; font-size: 14px; }

    /* ─── MODAL BASE ─── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55);
      backdrop-filter: blur(4px); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
    @keyframes modal-up {
      from { transform: translateY(24px); opacity: 0 }
      to   { transform: translateY(0);    opacity: 1 }
    }

    .modal-card {
      background: white; border-radius: 18px; width: 100%; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
      animation: modal-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    }

    /* ─── CREATE USER MODAL ─── */
    .create-user-modal { max-width: 680px; }

    .modal-header {
      display: flex; align-items: center; gap: 16px; padding: 28px 32px 20px;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, #F0F7FF, #EEF2FF);
      border-radius: 18px 18px 0 0;
      .modal-header-icon {
        width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
        background: linear-gradient(135deg, #2B6CB0, #6366F1);
        display: flex; align-items: center; justify-content: center;
        .material-icons { color: white; font-size: 24px; }
      }
      .modal-title { margin: 0 0 3px; font-size: 20px; font-weight: 800; color: #1E3A5F; }
      .modal-subtitle { margin: 0; font-size: 13px; color: #64748B; }
      .modal-close {
        margin-left: auto; background: transparent; border: none; cursor: pointer;
        color: #94A3B8; padding: 4px; border-radius: 8px;
        .material-icons { font-size: 22px; }
        &:hover { background: #FEF2F2; color: #DC2626; }
      }
    }

    .modal-body { padding: 28px 32px; }

    /* Alert banners */
    .alert-banner {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      border-radius: 10px; margin-bottom: 20px; font-size: 13px; font-weight: 600;
      .material-icons { font-size: 18px; }
      &.success { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
      &.error   { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
    }

    /* Form layout */
    .form-row {
      display: flex; gap: 16px; margin-bottom: 20px;
      @media (max-width: 560px) { flex-direction: column; }
    }
    .form-field {
      flex: 1; display: flex; flex-direction: column; gap: 5px;
      &.full { flex: 0 0 100%; }
      label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
      .req { color: #EF4444; }
      input, select {
        padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px;
        font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border 0.15s;
        &:focus { border-color: #2B6CB0; box-shadow: 0 0 0 3px rgba(43,108,176,0.12); }
        &.invalid { border-color: #EF4444; }
        &::placeholder { color: #CBD5E1; }
      }
      .field-error { font-size: 11px; color: #EF4444; font-weight: 600; }
    }

    /* Password field */
    .pass-wrap { position: relative; display: flex; align-items: center;
      input { flex: 1; padding-right: 44px; }
      .pass-toggle {
        position: absolute; right: 10px; background: transparent; border: none; cursor: pointer;
        color: #94A3B8; padding: 2px; display: flex;
        .material-icons { font-size: 18px; }
        &:hover { color: #2B6CB0; }
      }
    }
    .pass-strength {
      display: flex; align-items: center; gap: 8px; margin-top: 6px;
      .strength-bar { flex: 1; height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden; }
      .strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
      .strength-label { font-size: 10px; font-weight: 700; color: #94A3B8; min-width: 42px; text-align: right; }
      &.weak   .strength-fill { background: #EF4444; }
      &.fair   .strength-fill { background: #F59E0B; }
      &.good   .strength-fill { background: #3B82F6; }
      &.strong .strength-fill { background: #10B981; }
    }

    /* Role pills */
    .role-pills { display: flex; gap: 10px; flex-wrap: wrap; }
    .role-pill {
      flex: 1; min-width: 140px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
      padding: 12px 16px; border: 2px solid #E2E8F0; border-radius: 12px;
      background: white; cursor: pointer; transition: all 0.15s; text-align: left;
      .material-icons { font-size: 20px; color: #94A3B8; }
      .rp-label { font-size: 13px; font-weight: 700; color: #1E3A5F; }
      .rp-desc  { font-size: 11px; color: #94A3B8; }
      &:hover { border-color: #2B6CB0; background: #F0F7FF; }
      &.selected {
        border-color: #2B6CB0; background: linear-gradient(135deg, #EFF6FF, #EEF2FF);
        .material-icons { color: #2B6CB0; }
        .rp-label { color: #2B6CB0; }
      }
    }

    /* Modal actions */
    .modal-actions {
      display: flex; gap: 12px; justify-content: flex-end;
      padding-top: 20px; border-top: 1px solid var(--color-border); margin-top: 8px;
    }

    /* Spinner */
    .spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: white;
      border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Confirm modal */
    .confirm-modal {
      max-width: 380px; padding: 32px; text-align: center;
      h3 { font-size: 18px; font-weight: 800; color: #1E3A5F; margin: 16px 0 8px; }
      p  { font-size: 14px; color: #64748B; margin: 0 0 24px; }
      .modal-actions { border: none; padding-top: 0; justify-content: center; }
    }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 50%; margin: 0 auto;
      display: flex; align-items: center; justify-content: center;
      background: #DBEAFE;
      .material-icons { font-size: 28px; color: #2563EB; }
      &.deactivate { background: #FEF2F2; .material-icons { color: #DC2626; } }
    }
  `]
})
export class DirectoryComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  employees = signal<Employee[]>([]);
  filteredEmployees = signal<Employee[]>([]);
  viewMode = signal<'cards' | 'table'>('cards');

  searchQuery = '';
  deptFilter  = '';
  roleFilter  = '';

  // Modal state
  showCreateModal = signal(false);
  creating = signal(false);
  createSuccess = signal('');
  createError = signal('');
  showPassword = signal(false);
  confirmStatusEmp = signal<Employee | null>(null);

  isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPER_ADMIN');

  roles = [
    { value: 'EMPLOYEE',    label: 'Employee',    icon: 'person',          desc: 'Regular team member' },
    { value: 'SALES',       label: 'Sales',       icon: 'trending_up',     desc: 'Sales CRM & client pipeline' },
    { value: 'ADMIN',       label: 'Admin',       icon: 'manage_accounts', desc: 'Manage projects & tasks' },
    { value: 'SUPER_ADMIN', label: 'Super Admin', icon: 'admin_panel_settings', desc: 'Full system access' },
  ] as const;

  form: CreateEmployeeRequest = this.blankForm();

  ngOnInit(): void {
    this.employeeService.getEmployees().subscribe(res => {
      this.employees.set(res);
      this.filteredEmployees.set(res);
    });
  }

  // ── Filtering ─────────────────────────────────────────────────
  filterEmployees(): void {
    let list = this.employees();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.designation && e.designation.toLowerCase().includes(q))
      );
    }
    if (this.deptFilter) list = list.filter(e => e.department === this.deptFilter);
    if (this.roleFilter) list = list.filter(e => e.role === this.roleFilter);
    this.filteredEmployees.set(list);
  }

  // ── Create User Modal ─────────────────────────────────────────
  openCreateModal(): void {
    this.form = this.blankForm();
    this.createSuccess.set('');
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    if (this.creating()) return;
    this.showCreateModal.set(false);
  }

  submitCreateUser(): void {
    if (!this.form.firstName || !this.form.email || !this.form.password) return;
    this.creating.set(true);
    this.createError.set('');
    this.createSuccess.set('');

    this.employeeService.createEmployee(this.form).subscribe({
      next: (emp) => {
        this.creating.set(false);
        this.createSuccess.set(`${emp.firstName} ${emp.lastName}`);
        // Re-fetch full list from server to avoid duplicates
        this.employeeService.getEmployees().subscribe(res => {
          this.employees.set(res);
          this.filteredEmployees.set(res);
        });
        // Auto-close after 2s
        setTimeout(() => this.showCreateModal.set(false), 2000);
      },
      error: (err: Error) => {
        this.creating.set(false);
        this.createError.set(err.message || 'Failed to create user. Please try again.');
      }
    });
  }

  private blankForm(): CreateEmployeeRequest {
    return {
      firstName: '', lastName: '', email: '', phone: '',
      password: '', role: 'EMPLOYEE', designation: '', department: ''
    };
  }

  // ── Password Strength ─────────────────────────────────────────
  getPassStrengthPct(): number {
    const p = this.form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score += 25;
    if (p.length >= 12) score += 15;
    if (/[A-Z]/.test(p)) score += 20;
    if (/[0-9]/.test(p)) score += 20;
    if (/[^A-Za-z0-9]/.test(p)) score += 20;
    return Math.min(score, 100);
  }

  getPassStrengthClass(): string {
    const pct = this.getPassStrengthPct();
    if (pct >= 80) return 'strong';
    if (pct >= 55) return 'good';
    if (pct >= 30) return 'fair';
    return 'weak';
  }

  getPassStrengthLabel(): string {
    const c = this.getPassStrengthClass();
    return { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' }[c] ?? '';
  }

  // ── Status Toggle ─────────────────────────────────────────────
  openEditStatus(emp: Employee): void {
    this.confirmStatusEmp.set(emp);
  }

  toggleStatus(): void {
    const emp = this.confirmStatusEmp();
    if (!emp) return;
    this.employeeService.updateEmployeeStatus(emp.id, !emp.isActive).subscribe(() => {
      this.confirmStatusEmp.set(null);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  getRoleBadgeClass(r: string): string {
    return { SUPER_ADMIN: 'badge-blocked', ADMIN: 'badge-inreview', SALES: 'badge-done', EMPLOYEE: 'badge-inprogress' }[r] ?? '';
  }

  fmtRole(r: string): string {
    return r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#10B981', '#F59E0B', '#8B5CF6'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
