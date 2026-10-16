import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../core/services/employee.service';
import { Team } from '../../shared/models/index';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Teams & Squads</h1>
          <p class="page-subtitle">Organizational units, leads, project ownership, and team capacity</p>
        </div>
        <div class="page-actions">
          <a routerLink="/employees/directory" class="btn btn-outline btn-sm">
            <span class="material-icons">badge</span> Employee Directory
          </a>
          <button class="btn btn-gradient btn-sm" (click)="showCreateModal.set(true)">
            <span class="material-icons">group_add</span> Create Team
          </button>
        </div>
      </div>

      <!-- TEAMS GRID -->
      <div class="teams-grid">
        @for (team of teams(); track team.id) {
          <div class="card team-card">
            <div class="team-header">
              <div class="team-icon-box">
                <span class="material-icons">diversity_3</span>
              </div>
              <div class="team-title-wrap">
                <h3 class="team-name">{{ team.name }}</h3>
                <span class="team-desc">{{ team.description }}</span>
              </div>
            </div>

            <!-- Team Lead Section -->
            <div class="lead-box">
              <div class="avatar avatar-sm">{{ team.leadName ? team.leadName.charAt(0) : 'L' }}</div>
              <div class="lead-info">
                <span class="lead-name">{{ team.leadName }}</span>
                <span class="lead-role">Team Lead</span>
              </div>
            </div>

            <!-- Stats -->
            <div class="team-stats-row">
              <div class="stat-unit">
                <span class="s-val">{{ team.memberCount }}</span>
                <span class="s-lbl">Members</span>
              </div>
              <div class="stat-unit">
                <span class="s-val">{{ team.projectCount }}</span>
                <span class="s-lbl">Projects</span>
              </div>
              <div class="stat-unit">
                <span class="s-val">88%</span>
                <span class="s-lbl">Capacity</span>
              </div>
            </div>

            <div class="team-footer">
              <a routerLink="/employees/directory" class="view-members-btn">
                <span class="material-icons">group</span> View Squad
              </a>
              <a routerLink="/projects/all" class="view-projects-btn">
                <span class="material-icons">folder_open</span> Projects
              </a>
            </div>
          </div>
        }
      </div>

      <!-- CREATE TEAM MODAL -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="m-title">
                <span class="material-icons">groups</span>
                <h3>Create New Team</h3>
              </div>
              <button class="icon-btn" (click)="showCreateModal.set(false)"><span class="material-icons">close</span></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Team Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newTeamName" placeholder="e.g. Mobile & Cloud Squad" class="form-control" />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newTeamDesc" rows="3" placeholder="Mission, scope and core technologies..." class="form-control"></textarea>
              </div>
              <div class="form-group">
                <label>Designated Lead</label>
                <select [(ngModel)]="newTeamLead" class="form-control">
                  <option value="Vikram Singh">Vikram Singh (Engineering Lead)</option>
                  <option value="Priya Mehta">Priya Mehta (Project Manager)</option>
                  <option value="Kavita Nair">Kavita Nair (Design Lead)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showCreateModal.set(false)">Cancel</button>
              <button class="btn btn-gradient" (click)="saveTeam()" [disabled]="!newTeamName.trim()">Form Team</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .team-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .team-header {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 16px;

        .team-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #EFF6FF;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-blue);

          .material-icons {
            font-size: 24px;
          }
        }

        .team-title-wrap {
          flex: 1;

          .team-name {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .team-desc {
            font-size: 12px;
            color: var(--color-text-secondary);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }
      }

      .lead-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: #F8FAFC;
        border-radius: 8px;
        margin-bottom: 16px;

        .lead-info {
          display: flex;
          flex-direction: column;

          .lead-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-navy);
          }

          .lead-role {
            font-size: 11px;
            color: var(--color-text-muted);
          }
        }
      }

      .team-stats-row {
        display: flex;
        justify-content: space-around;
        padding: 12px 0;
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 16px;

        .stat-unit {
          display: flex;
          flex-direction: column;
          align-items: center;

          .s-val {
            font-size: 16px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .s-lbl {
            font-size: 11px;
            color: var(--color-text-muted);
          }
        }
      }

      .team-footer {
        display: flex;
        justify-content: space-between;

        .view-members-btn, .view-projects-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-blue);
          text-decoration: none;

          .material-icons {
            font-size: 16px;
          }

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(4px);
    }

    .modal-card {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.25);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);

      .m-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-blue);

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-navy);
        }
      }
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .form-control {
          padding: 8px 12px;
          border: 1.5px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          font-family: 'Inter', sans-serif;

          &:focus { border-color: var(--color-blue); }
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid var(--color-border);
    }
  `]
})
export class TeamsComponent implements OnInit {
  teams = signal<Team[]>([]);
  showCreateModal = signal(false);

  newTeamName = '';
  newTeamDesc = '';
  newTeamLead = 'Vikram Singh';

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.employeeService.getTeams().subscribe(t => this.teams.set(t));
  }

  saveTeam(): void {
    if (!this.newTeamName.trim()) return;
    const newT: Team = {
      id: 't_' + Date.now(),
      name: this.newTeamName,
      description: this.newTeamDesc,
      leadId: 'u7',
      leadName: this.newTeamLead,
      memberCount: 3,
      projectCount: 1,
      createdAt: new Date().toISOString()
    };
    this.teams.update(list => [...list, newT]);
    this.showCreateModal.set(false);
    this.newTeamName = '';
    this.newTeamDesc = '';
  }
}
