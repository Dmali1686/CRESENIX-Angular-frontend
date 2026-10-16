import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

type SettingsTab = 'profile' | 'general' | 'roles' | 'notifications';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">
            {{ activeTab() === 'profile' ? 'Profile & Account Settings' : 'System Settings' }}
          </h1>
          <p class="page-subtitle">
            {{ activeTab() === 'profile' 
              ? 'Manage your personal identity, contact information, credentials, and work metrics' 
              : 'Company profile, role-based access control, and workspace configurations' }}
          </p>
        </div>
        <div class="page-actions">
          @if (activeTab() === 'profile') {
            <button class="btn btn-gradient btn-sm" (click)="saveProfile()" [disabled]="savingProfile()">
              <span class="material-icons">{{ savingProfile() ? 'sync' : 'save' }}</span>
              {{ savingProfile() ? 'Saving Profile...' : 'Save Profile Changes' }}
            </button>
          } @else if (activeTab() === 'general') {
            <button class="btn btn-gradient btn-sm" (click)="saveSettings()">
              <span class="material-icons">save</span> Save Changes
            </button>
          }
        </div>
      </div>

      <!-- TABS -->
      <div class="settings-tabs">
        <button class="s-tab" [class.active]="activeTab() === 'profile'" (click)="setTab('profile')">
          <span class="material-icons">account_circle</span> My Profile
        </button>
        <button class="s-tab" [class.active]="activeTab() === 'general'" (click)="setTab('general')">
          <span class="material-icons">business</span> Organization
        </button>
        <button class="s-tab" [class.active]="activeTab() === 'roles'" (click)="setTab('roles')">
          <span class="material-icons">admin_panel_settings</span> Roles & Access
        </button>
        <button class="s-tab" [class.active]="activeTab() === 'notifications'" (click)="setTab('notifications')">
          <span class="material-icons">notifications</span> Notifications
        </button>
      </div>

      <!-- ALERTS -->
      @if (successMsg()) {
        <div class="alert alert-success animate-fade-in">
          <span class="material-icons">check_circle</span>
          <span>{{ successMsg() }}</span>
          <button class="alert-close" (click)="successMsg.set('')">
            <span class="material-icons">close</span>
          </button>
        </div>
      }
      @if (errorMsg()) {
        <div class="alert alert-error animate-fade-in">
          <span class="material-icons">error_outline</span>
          <span>{{ errorMsg() }}</span>
          <button class="alert-close" (click)="errorMsg.set('')">
            <span class="material-icons">close</span>
          </button>
        </div>
      }

      <!-- TAB: MY PROFILE -->
      @if (activeTab() === 'profile') {
        <!-- HERO PROFILE BANNER -->
        <div class="card profile-hero-card">
          <div class="profile-hero-left">
            <div class="profile-hero-avatar-wrap">
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" alt="Avatar" class="profile-hero-avatar-img" (error)="onAvatarImgError()" />
              } @else {
                <div class="profile-hero-avatar-fallback" [style.background]="getAvatarGradient()">
                  {{ getInitials() }}
                </div>
              }
              <div class="status-indicator-badge" title="Active Account"></div>
            </div>
            <div class="profile-hero-details">
              <div class="hero-name-row">
                <h2 class="profile-hero-name">{{ firstName() }} {{ lastName() }}</h2>
                <span class="badge" [ngClass]="getRoleBadgeClass(role())">
                  <span class="material-icons badge-icon">{{ getRoleIcon(role()) }}</span>
                  {{ formatRole(role()) }}
                </span>
              </div>
              <p class="profile-hero-sub">
                <span class="hero-desig">{{ designation() || 'Team Member' }}</span>
                @if (department()) {
                  <span class="dot-separator">•</span>
                  <span class="hero-dept">{{ department() }}</span>
                }
              </p>
              <div class="hero-meta-chips">
                <span class="meta-chip">
                  <span class="material-icons">email</span> {{ email() }}
                </span>
                @if (phone()) {
                  <span class="meta-chip">
                    <span class="material-icons">phone</span> {{ phone() }}
                  </span>
                }
                @if (lastLogin()) {
                  <span class="meta-chip muted">
                    <span class="material-icons">history</span> Last active {{ lastLogin() }}
                  </span>
                }
              </div>
            </div>
          </div>

          <div class="profile-hero-stats">
            <div class="hero-stat-box">
              <span class="stat-number text-blue">{{ activeTaskCount() }}</span>
              <span class="stat-label">Active Tasks</span>
            </div>
            <div class="hero-stat-box">
              <span class="stat-number text-success">{{ completedTaskCount() }}</span>
              <span class="stat-label">Tasks Done</span>
            </div>
            <div class="hero-stat-box">
              <span class="stat-number text-cyan">{{ onTimeDeliveryRate() }}%</span>
              <span class="stat-label">On-Time Rate</span>
            </div>
            <div class="hero-stat-box">
              <span class="stat-number text-navy">{{ assignedProjectCount() }}</span>
              <span class="stat-label">Projects</span>
            </div>
          </div>
        </div>

        <div class="settings-grid">
          <!-- CARD 1: EDIT PERSONAL DETAILS -->
          <div class="card settings-card">
            <div class="card-header-row">
              <h3 class="card-title">
                <span class="material-icons title-icon">badge</span>
                Personal Information
              </h3>
              <span class="card-title-badge">Editable</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="firstName" class="form-control" placeholder="First Name" />
              </div>
              <div class="form-group">
                <label>Last Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="lastName" class="form-control" placeholder="Last Name" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email Address <span class="required">*</span></label>
                <input type="email" [(ngModel)]="email" class="form-control" placeholder="name@cresenix.com" />
                <span class="field-hint">Used for sign-in and receiving email notifications</span>
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" [(ngModel)]="phone" class="form-control" placeholder="+91 98765 43210" />
                <span class="field-hint">Used for mobile alerts and team communications</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Designation / Role Title</label>
                <input type="text" [(ngModel)]="designation" class="form-control" placeholder="e.g. Senior Project Manager" />
              </div>
              <div class="form-group">
                <label>Department</label>
                <select [(ngModel)]="department" class="form-control">
                  <option value="Administration">Administration</option>
                  <option value="Management">Management</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Design">Design</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="IT">IT Support</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Profile Avatar URL</label>
              <div class="avatar-input-row">
                <input type="url" [(ngModel)]="avatarUrl" class="form-control" placeholder="https://images.unsplash.com/..." />
                @if (avatarUrl()) {
                  <button type="button" class="btn btn-secondary btn-sm" (click)="avatarUrl.set('')">Clear</button>
                }
              </div>
              <span class="field-hint">Provide an image URL or leave empty to use your default colored initials avatar</span>
            </div>

            <div class="form-group">
              <label>Assigned System Role</label>
              <div class="role-readonly-box">
                <span class="material-icons lock-icon">lock</span>
                <span class="role-text">{{ formatRole(role()) }}</span>
                <span class="role-sub">Access privileges are managed by System Super Administrators</span>
              </div>
            </div>

            <div class="form-action-bar">
              <button class="btn btn-gradient" (click)="saveProfile()" [disabled]="savingProfile()">
                <span class="material-icons">{{ savingProfile() ? 'sync' : 'save' }}</span>
                {{ savingProfile() ? 'Saving Changes...' : 'Save Profile Details' }}
              </button>
            </div>
          </div>

          <!-- CARD 2: CHANGE PASSWORD / SECURITY -->
          <div class="card settings-card">
            <div class="card-header-row">
              <h3 class="card-title">
                <span class="material-icons title-icon">lock_reset</span>
                Security & Password
              </h3>
              <span class="card-title-badge">Security</span>
            </div>
            <p class="section-desc">Ensure your account uses a secure password to safeguard company access.</p>

            @if (passwordSuccessMsg()) {
              <div class="alert alert-success animate-fade-in">
                <span class="material-icons">check_circle</span>
                <span>{{ passwordSuccessMsg() }}</span>
              </div>
            }
            @if (passwordErrorMsg()) {
              <div class="alert alert-error animate-fade-in">
                <span class="material-icons">error_outline</span>
                <span>{{ passwordErrorMsg() }}</span>
              </div>
            }

            <div class="form-group">
              <label>Current Password</label>
              <div class="password-input-wrap">
                <input 
                  [type]="showCurrentPassword() ? 'text' : 'password'" 
                  [(ngModel)]="currentPassword" 
                  class="form-control" 
                  placeholder="Enter current password" 
                />
                <button type="button" class="pwd-toggle-btn" (click)="showCurrentPassword.set(!showCurrentPassword())">
                  <span class="material-icons">{{ showCurrentPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>New Password</label>
              <div class="password-input-wrap">
                <input 
                  [type]="showNewPassword() ? 'text' : 'password'" 
                  [(ngModel)]="newPassword" 
                  class="form-control" 
                  placeholder="Enter new password (min. 6 characters)" 
                />
                <button type="button" class="pwd-toggle-btn" (click)="showNewPassword.set(!showNewPassword())">
                  <span class="material-icons">{{ showNewPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <span class="field-hint">Must contain at least 6 characters</span>
            </div>

            <div class="form-group">
              <label>Confirm New Password</label>
              <div class="password-input-wrap">
                <input 
                  [type]="showConfirmPassword() ? 'text' : 'password'" 
                  [(ngModel)]="confirmPassword" 
                  class="form-control" 
                  placeholder="Repeat new password" 
                />
                <button type="button" class="pwd-toggle-btn" (click)="showConfirmPassword.set(!showConfirmPassword())">
                  <span class="material-icons">{{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div class="form-action-bar">
              <button 
                class="btn btn-secondary" 
                (click)="changePassword()" 
                [disabled]="savingPassword() || !currentPassword() || !newPassword()"
              >
                <span class="material-icons">{{ savingPassword() ? 'sync' : 'vpn_key' }}</span>
                {{ savingPassword() ? 'Updating Password...' : 'Change Password' }}
              </button>
            </div>

            <div class="security-tips-box">
              <span class="material-icons tips-icon">shield</span>
              <div class="tips-text">
                <span class="tips-title">Account Security Tip</span>
                <p>Never share your credentials. For enterprise accounts, use a unique alphanumeric password with symbols.</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: GENERAL COMPANY PROFILE -->
      @if (activeTab() === 'general') {
        <div class="settings-grid">
          <div class="card settings-card">
            <h3 class="card-title">Company Profile</h3>

            <div class="form-group">
              <label>Organization Name</label>
              <input type="text" [(ngModel)]="companyName" class="form-control" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Corporate Domain</label>
                <input type="text" [(ngModel)]="companyDomain" class="form-control" />
              </div>
              <div class="form-group">
                <label>Timezone</label>
                <select [(ngModel)]="timezone" class="form-control">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="America/New_York">America/New_York (EST -05:00)</option>
                  <option value="Europe/London">Europe/London (GMT +00:00)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Standard Work Hours</label>
                <input type="text" [(ngModel)]="workHours" class="form-control" />
              </div>
              <div class="form-group">
                <label>Sprint Cadence</label>
                <select [(ngModel)]="sprintLength" class="form-control">
                  <option value="2_WEEKS">2 Weeks (Bi-weekly)</option>
                  <option value="1_WEEK">1 Week (Weekly)</option>
                  <option value="3_WEEKS">3 Weeks</option>
                </select>
              </div>
            </div>

            <div class="form-action-bar">
              <button class="btn btn-gradient btn-sm" (click)="saveSettings()">
                <span class="material-icons">save</span> Save Organization Details
              </button>
            </div>
          </div>

          <div class="card settings-card">
            <h3 class="card-title">Brand Identity</h3>
            <div class="brand-preview-box">
              <div class="brand-logo-preview">
                <span class="brand-icon material-icons">corporate_fare</span>
                <div class="brand-text">
                  <span class="brand-title">CRESENIX SOLUTIONS</span>
                  <span class="brand-sub">Enterprise Management Hub</span>
                </div>
              </div>
              <p class="brand-note">
                Color scheme adheres to brand tokens: Primary Blue (#2563EB), Accent Cyan (#06B6D4), and Deep Navy (#0F172A).
              </p>
            </div>
          </div>
        </div>
      }

      <!-- TAB: ROLES & ACCESS CONTROL -->
      @if (activeTab() === 'roles') {
        <div class="card settings-card">
          <h3 class="card-title">Role-Based Access Control Matrix (RBAC)</h3>
          <p class="section-desc">Configured capabilities per user role in Cresenix Solutions</p>

          <table class="rbac-table">
            <thead>
              <tr>
                <th>Feature / Module</th>
                <th>Super Admin</th>
                <th>Admin (Project Manager)</th>
                <th>Employee (Contributor)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Task Management</strong> (Assign, Edit, Reassign)</td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-success">check_circle</span> Project Scope</td>
                <td><span class="material-icons text-info">radio_button_checked</span> Assigned Only</td>
              </tr>
              <tr>
                <td><strong>Project Pipeline</strong> (Create, Move Stages, Close)</td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-success">check_circle</span> Assigned Projects</td>
                <td><span class="material-icons text-muted">visibility</span> Read-only</td>
              </tr>
              <tr>
                <td><strong>Meeting Management & MoM</strong> (Schedule, Turn to Tasks)</td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-info">radio_button_checked</span> Attend & View</td>
              </tr>
              <tr>
                <td><strong>User & Role Management</strong></td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-muted">remove</span> Restricted</td>
                <td><span class="material-icons text-muted">remove</span> Restricted</td>
              </tr>
              <tr>
                <td><strong>Executive Reports & Export</strong></td>
                <td><span class="material-icons text-success">check_circle</span> Full</td>
                <td><span class="material-icons text-success">check_circle</span> Team Reports</td>
                <td><span class="material-icons text-muted">remove</span> Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      }

      <!-- TAB: NOTIFICATIONS -->
      @if (activeTab() === 'notifications') {
        <div class="card settings-card max-card">
          <h3 class="card-title">Notification Preferences</h3>

          <div class="pref-list">
            <div class="pref-item">
              <div>
                <span class="pref-title">Task Assignment Alerts</span>
                <span class="pref-desc">Instant notification whenever a task is assigned or reassigned to you</span>
              </div>
              <input type="checkbox" checked />
            </div>

            <div class="pref-item">
              <div>
                <span class="pref-title">Deadline Approaching Reminders</span>
                <span class="pref-desc">Alert 24 hours prior to scheduled task or milestone deadlines</span>
              </div>
              <input type="checkbox" checked />
            </div>

            <div class="pref-item">
              <div>
                <span class="pref-title">Meeting Minutes & Action Items</span>
                <span class="pref-desc">Notification when minutes are logged or an action item is converted into your task</span>
              </div>
              <input type="checkbox" checked />
            </div>

            <div class="pref-item">
              <div>
                <span class="pref-title">Daily Morning Digest</span>
                <span class="pref-desc">Summary of today's meetings and high-priority deliverables delivered at 9:00 AM</span>
              </div>
              <input type="checkbox" checked />
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 8px;

      .s-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        .material-icons {
          font-size: 18px;
        }

        &:hover {
          background: #F8FAFC;
          color: var(--color-navy);
        }

        &.active {
          background: var(--color-light-blue);
          color: var(--color-blue);
        }
      }
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      font-weight: 500;

      .material-icons {
        font-size: 20px;
      }

      .alert-close {
        margin-left: auto;
        background: transparent;
        border: none;
        cursor: pointer;
        color: inherit;
        display: flex;
        align-items: center;
        padding: 0;
        opacity: 0.7;
        &:hover { opacity: 1; }
        .material-icons { font-size: 16px; }
      }

      &.alert-success {
        background: #F0FDF4;
        color: #16A34A;
        border: 1px solid #BBF7D0;
      }

      &.alert-error {
        background: #FEF2F2;
        color: #DC2626;
        border: 1px solid #FECACA;
      }
    }

    /* PROFILE HERO BANNER */
    .profile-hero-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 24px 28px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
      border: 1px solid var(--color-border);
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(16, 27, 53, 0.04);

      .profile-hero-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .profile-hero-avatar-wrap {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);

        .profile-hero-avatar-img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #FFFFFF;
        }

        .profile-hero-avatar-fallback {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 1px;
          border: 2px solid #FFFFFF;
        }

        .status-indicator-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #16A34A;
          border: 2px solid #FFFFFF;
        }
      }

      .profile-hero-details {
        .hero-name-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;

          .profile-hero-name {
            font-size: 20px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
            letter-spacing: -0.3px;
          }
        }

        .profile-hero-sub {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;

          .hero-desig {
            font-weight: 600;
            color: var(--color-navy);
          }

          .dot-separator {
            color: var(--color-border-strong);
          }
        }

        .hero-meta-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;

          .meta-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
            color: var(--color-text-secondary);
            background: #FFFFFF;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid var(--color-border);

            .material-icons {
              font-size: 14px;
              color: var(--color-blue);
            }

            &.muted {
              color: var(--color-text-muted);
              .material-icons { color: var(--color-text-muted); }
            }
          }
        }
      }

      .profile-hero-stats {
        display: flex;
        gap: 14px;

        .hero-stat-box {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 12px 18px;
          text-align: center;
          min-width: 86px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

          .stat-number {
            display: block;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 2px;

            &.text-blue { color: var(--color-blue); }
            &.text-success { color: var(--color-success); }
            &.text-cyan { color: var(--color-cyan); }
            &.text-navy { color: var(--color-navy); }
          }

          .stat-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        }
      }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;

      .badge-icon {
        font-size: 13px;
      }

      &.badge-super-admin {
        background: linear-gradient(135deg, #4338CA 0%, #6366F1 100%);
        color: #FFFFFF;
      }

      &.badge-admin {
        background: #EFF6FF;
        color: #2563EB;
        border: 1px solid #BFDBFE;
      }

      &.badge-sales {
        background: #FFFBEB;
        color: #D97706;
        border: 1px solid #FDE68A;
      }

      &.badge-employee {
        background: #ECFDF5;
        color: #059669;
        border: 1px solid #A7F3D0;
      }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .settings-card {
      padding: 26px;
      border-radius: 12px;

      &.max-card {
        max-width: 760px;
      }

      .card-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--color-border);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 700;
        color: var(--color-navy);
        margin: 0;

        .title-icon {
          font-size: 18px;
          color: var(--color-blue);
        }
      }

      .card-title-badge {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-muted);
        background: #F1F5F9;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .section-desc {
        font-size: 12.5px;
        color: var(--color-text-muted);
        margin: -6px 0 18px 0;
        line-height: 1.4;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 16px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-secondary);

        .required {
          color: var(--color-error);
        }
      }

      .form-control {
        padding: 9px 12px;
        border: 1.5px solid var(--color-border);
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: var(--color-navy);
        background: #FFFFFF;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;

        &:focus {
          border-color: var(--color-blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        &::placeholder {
          color: var(--color-text-muted);
        }
      }

      .field-hint {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-top: 2px;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .avatar-input-row {
      display: flex;
      gap: 8px;
      align-items: center;

      .form-control {
        flex: 1;
      }
    }

    .password-input-wrap {
      position: relative;
      display: flex;
      align-items: center;

      .form-control {
        width: 100%;
        padding-right: 40px;
      }

      .pwd-toggle-btn {
        position: absolute;
        right: 8px;
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border-radius: 4px;
        &:hover { color: var(--color-navy); }
        .material-icons { font-size: 18px; }
      }
    }

    .role-readonly-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #F8FAFC;
      border: 1px dashed var(--color-border);
      border-radius: 8px;

      .lock-icon {
        font-size: 16px;
        color: var(--color-text-muted);
      }

      .role-text {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .role-sub {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-left: auto;
      }
    }

    .form-action-bar {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #F1F5F9;
      display: flex;
      justify-content: flex-end;
    }

    .security-tips-box {
      margin-top: 20px;
      padding: 12px 14px;
      background: #F8FAFC;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      display: flex;
      gap: 12px;

      .tips-icon {
        font-size: 22px;
        color: var(--color-blue);
      }

      .tips-text {
        .tips-title {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-navy);
          margin-bottom: 2px;
        }

        p {
          font-size: 11.5px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.4;
        }
      }
    }

    .brand-preview-box {
      padding: 20px;
      background: #F8FAFC;
      border-radius: 12px;
      border: 1px solid var(--color-border);

      .brand-logo-preview {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;

        .brand-icon {
          font-size: 36px;
          color: var(--color-blue);
        }

        .brand-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-navy);
          display: block;
          letter-spacing: 0.5px;
        }

        .brand-sub {
          font-size: 11px;
          color: var(--color-text-muted);
          display: block;
        }
      }

      .brand-note {
        font-size: 12px;
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin: 0;
      }
    }

    .rbac-table {
      width: 100%;
      border-collapse: collapse;

      th {
        text-align: left;
        padding: 12px;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-muted);
        border-bottom: 1px solid var(--color-border);
      }

      td {
        padding: 14px 12px;
        font-size: 13px;
        border-bottom: 1px solid #F8FAFC;

        .material-icons {
          font-size: 18px;
          vertical-align: middle;
          margin-right: 4px;
        }
      }
    }

    .pref-list {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .pref-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 0;
        border-bottom: 1px solid #F8FAFC;

        .pref-title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy);
          margin-bottom: 2px;
        }

        .pref-desc {
          display: block;
          font-size: 12px;
          color: var(--color-text-muted);
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--color-blue);
          cursor: pointer;
        }
      }
    }

    @media (max-width: 960px) {
      .profile-hero-card {
        flex-direction: column;
        align-items: flex-start;

        .profile-hero-stats {
          width: 100%;
          justify-content: space-between;
        }
      }

      .settings-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .profile-hero-left {
        flex-direction: column;
        align-items: flex-start;
      }

      .profile-hero-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  activeTab = signal<SettingsTab>('profile');

  // Loading & Action states
  loadingProfile = signal<boolean>(false);
  savingProfile = signal<boolean>(false);
  savingPassword = signal<boolean>(false);

  // Status feedback messages
  successMsg = signal<string>('');
  errorMsg = signal<string>('');
  passwordSuccessMsg = signal<string>('');
  passwordErrorMsg = signal<string>('');

  // Profile data signals
  firstName = signal<string>('');
  lastName = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');
  designation = signal<string>('');
  department = signal<string>('Engineering');
  avatarUrl = signal<string>('');
  role = signal<string>('EMPLOYEE');
  lastLogin = signal<string>('');

  // Performance KPI signals
  activeTaskCount = signal<number>(0);
  completedTaskCount = signal<number>(0);
  onTimeDeliveryRate = signal<number>(100);
  assignedProjectCount = signal<number>(0);

  // Password fields
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  // Organization settings
  companyName = 'CRESENIX SOLUTIONS';
  companyDomain = 'cresenix.com';
  timezone = 'Asia/Kolkata';
  workHours = '09:30 AM – 06:30 PM';
  sprintLength = '2_WEEKS';

  ngOnInit(): void {
    // Check for query param ?tab=
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as SettingsTab;
      if (tab && ['profile', 'general', 'roles', 'notifications'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });

    this.loadProfile();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  loadProfile(): void {
    this.loadingProfile.set(true);

    // Initial populate from currentUser signal if present
    const curr = this.authService.currentUser();
    if (curr) {
      this.firstName.set(curr.firstName || '');
      this.lastName.set(curr.lastName || '');
      this.email.set(curr.email || '');
      this.phone.set(curr.phone || '');
      this.designation.set(curr.designation || '');
      this.department.set(curr.department || 'Engineering');
      this.avatarUrl.set(curr.avatar || '');
      this.role.set(curr.role || 'EMPLOYEE');
    }

    // Fetch full live profile from backend API
    this.authService.getProfile().subscribe({
      next: (u) => {
        this.loadingProfile.set(false);
        if (u) {
          this.firstName.set(u.first_name || '');
          this.lastName.set(u.last_name || '');
          this.email.set(u.email || '');
          this.phone.set(u.phone || '');
          this.designation.set(u.designation || '');
          this.department.set(u.department || 'Engineering');
          this.avatarUrl.set(u.avatar_url || '');
          this.role.set(u.role || 'EMPLOYEE');
          this.activeTaskCount.set(u.active_task_count ?? 0);
          this.completedTaskCount.set(u.completed_task_count ?? 0);
          this.onTimeDeliveryRate.set(u.on_time_delivery_rate ?? 100);
          this.assignedProjectCount.set(u.assigned_project_count ?? 0);

          if (u.last_login_at) {
            try {
              const dt = new Date(u.last_login_at);
              this.lastLogin.set(dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
            } catch {
              this.lastLogin.set('');
            }
          }
        }
      },
      error: () => {
        this.loadingProfile.set(false);
      }
    });
  }

  saveProfile(): void {
    this.successMsg.set('');
    this.errorMsg.set('');

    const first = this.firstName().trim();
    const last = this.lastName().trim();
    const emailVal = this.email().trim();

    if (!first || !last || !emailVal) {
      this.errorMsg.set('First name, last name, and email are required fields.');
      return;
    }

    this.savingProfile.set(true);

    const payload = {
      first_name: first,
      last_name: last,
      email: emailVal,
      phone: this.phone().trim(),
      designation: this.designation().trim(),
      department: this.department(),
      avatar_url: this.avatarUrl().trim()
    };

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.successMsg.set('Profile details updated successfully!');
        setTimeout(() => {
          if (this.successMsg() === 'Profile details updated successfully!') {
            this.successMsg.set('');
          }
        }, 5000);
      },
      error: (err) => {
        this.savingProfile.set(false);
        const backendMsg = err?.error?.error || err?.message || 'Failed to update profile. Please try again.';
        this.errorMsg.set(backendMsg);
      }
    });
  }

  changePassword(): void {
    this.passwordSuccessMsg.set('');
    this.passwordErrorMsg.set('');

    const cur = this.currentPassword().trim();
    const next = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (!cur) {
      this.passwordErrorMsg.set('Please enter your current password.');
      return;
    }

    if (!next || next.length < 6) {
      this.passwordErrorMsg.set('New password must be at least 6 characters long.');
      return;
    }

    if (next !== confirm) {
      this.passwordErrorMsg.set('New password and confirmation do not match.');
      return;
    }

    this.savingPassword.set(true);

    const payload = {
      current_password: cur,
      new_password: next
    };

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSuccessMsg.set('Password successfully updated!');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        setTimeout(() => {
          if (this.passwordSuccessMsg() === 'Password successfully updated!') {
            this.passwordSuccessMsg.set('');
          }
        }, 5000);
      },
      error: (err) => {
        this.savingPassword.set(false);
        const backendMsg = err?.error?.error || err?.message || 'Failed to update password. Verify your current password.';
        this.passwordErrorMsg.set(backendMsg);
      }
    });
  }

  saveSettings(): void {
    this.successMsg.set('System settings saved successfully!');
    setTimeout(() => this.successMsg.set(''), 4000);
  }

  onAvatarImgError(): void {
    this.avatarUrl.set('');
  }

  getInitials(): string {
    const f = this.firstName().charAt(0).toUpperCase() || 'U';
    const l = this.lastName().charAt(0).toUpperCase() || '';
    return `${f}${l}`;
  }

  getAvatarGradient(): string {
    const roleVal = this.role();
    if (roleVal === 'SUPER_ADMIN') {
      return 'linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #8B5CF6 100%)';
    }
    if (roleVal === 'ADMIN') {
      return 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)';
    }
    if (roleVal === 'SALES') {
      return 'linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)';
    }
    return 'linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)';
  }

  formatRole(role: string): string {
    if (!role) return 'Contributor';
    return role.replace(/_/g, ' ');
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN': return 'badge-super-admin';
      case 'ADMIN': return 'badge-admin';
      case 'SALES': return 'badge-sales';
      default: return 'badge-employee';
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN': return 'stars';
      case 'ADMIN': return 'shield';
      case 'SALES': return 'trending_up';
      default: return 'person';
    }
  }
}
