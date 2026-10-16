import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingService } from '../../../core/services/meeting.service';
import { Meeting, MeetingMinutes } from '../../../shared/models/index';

@Component({
  selector: 'app-meeting-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Meeting Archives & History</h1>
          <p class="page-subtitle">Comprehensive archive of concluded meetings, minutes, and decisions</p>
        </div>
        <div class="page-actions">
          <a routerLink="/meetings/calendar" class="btn btn-outline btn-sm">
            <span class="material-icons">calendar_month</span> Schedule
          </a>
          <a routerLink="/meetings/minutes" class="btn btn-gradient btn-sm">
            <span class="material-icons">description</span> Open Minutes Editor
          </a>
        </div>
      </div>

      <!-- SEARCH BAR -->
      <div class="search-bar-row">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search archive by keyword, agenda topic or attendee..." [(ngModel)]="searchQuery" (ngModelChange)="filterHistory()" />
        </div>
      </div>

      <!-- ARCHIVE LIST -->
      <div class="archive-list">
        @for (m of filtered(); track m.id) {
          <div class="card archive-card" [routerLink]="['/meetings', m.id]">
            <div class="archive-left">
              <div class="date-badge-box">
                <span class="d-month">{{ getMonth(m.date) }}</span>
                <span class="d-day">{{ getDay(m.date) }}</span>
              </div>
              <div class="archive-info">
                <div class="type-pill-row">
                  <span class="badge badge-done">{{ m.type }}</span>
                  <span class="project-tag">{{ m.projectName || 'General' }}</span>
                </div>
                <h3 class="archive-title">{{ m.title }}</h3>
                <p class="archive-desc">{{ m.description || 'Session completed and archived with minutes recorded.' }}</p>
              </div>
            </div>

            <div class="archive-right">
              <div class="meta-stat">
                <span class="stat-num">{{ m.participants.length }}</span>
                <span class="stat-lbl">Attendees</span>
              </div>
              <div class="meta-stat">
                <span class="stat-num">{{ m.actionItemCount }}</span>
                <span class="stat-lbl">Action Items</span>
              </div>
              <button class="btn btn-outline btn-xs" [disabled]="exportingId() === m.id" (click)="$event.stopPropagation(); downloadMoM(m)">
                @if (exportingId() === m.id) {
                  <span class="material-icons spin">sync</span> Exporting...
                } @else {
                  <span class="material-icons">download</span> Export MoM
                }
              </button>
            </div>
          </div>
        } @empty {
          <div class="card empty-state">
            <span class="material-icons empty-icon text-muted">history</span>
            <p class="empty-title">No archived sessions found matching search</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-bar-row {
      margin-bottom: 20px;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 8px 14px;
        max-width: 480px;

        &:focus-within { border-color: var(--color-blue); }
        .material-icons { font-size: 18px; color: var(--color-text-muted); }
        input {
          border: none;
          outline: none;
          font-size: 13px;
          flex: 1;
          background: transparent;
        }
      }
    }

    .archive-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .archive-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      cursor: pointer;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .archive-left {
        display: flex;
        align-items: center;
        gap: 20px;

        .date-badge-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          background: #EFF6FF;
          border-radius: 10px;
          border: 1px solid #DBEAFE;

          .d-month {
            font-size: 10px;
            font-weight: 700;
            color: var(--color-blue);
            text-transform: uppercase;
          }

          .d-day {
            font-size: 18px;
            font-weight: 800;
            color: var(--color-navy);
          }
        }

        .archive-info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .type-pill-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .project-tag {
              font-size: 11px;
              color: var(--color-text-muted);
            }
          }

          .archive-title {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .archive-desc {
            margin: 0;
            font-size: 12px;
            color: var(--color-text-secondary);
            max-width: 600px;
          }
        }
      }

      .archive-right {
        display: flex;
        align-items: center;
        gap: 24px;

        .meta-stat {
          display: flex;
          flex-direction: column;
          align-items: center;

          .stat-num {
            font-size: 16px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .stat-lbl {
            font-size: 10px;
            color: var(--color-text-muted);
            text-transform: uppercase;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .archive-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        .archive-right {
          width: 100%;
          justify-content: space-between;
        }
      }
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class MeetingHistoryComponent implements OnInit {
  meetings = signal<Meeting[]>([]);
  filtered = signal<Meeting[]>([]);
  searchQuery = '';
  exportingId = signal<string | null>(null);

  constructor(private meetingService: MeetingService) {}

  ngOnInit(): void {
    this.meetingService.getMeetings().subscribe(res => {
      this.meetings.set(res.data);
      this.filtered.set(res.data);
    });
  }

  filterHistory(): void {
    const q = this.searchQuery.toLowerCase();
    this.filtered.set(
      this.meetings().filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      )
    );
  }

  getMonth(dateStr: string): string {
    return new Date(dateStr).toLocaleString('default', { month: 'short' });
  }

  getDay(dateStr: string): string {
    return new Date(dateStr).getDate().toString();
  }

  downloadMoM(m: Meeting): void {
    this.exportingId.set(m.id);
    this.meetingService.getMeetingMinutes(m.id).subscribe({
      next: (minutes) => {
        this.exportingId.set(null);
        this.generateMoMDocument(m, minutes);
      },
      error: () => {
        this.exportingId.set(null);
        this.generateMoMDocument(m, null);
      }
    });
  }

  private generateMoMDocument(m: Meeting, minutes: MeetingMinutes | null): void {
    const attendees = (m.participants || []).map(p => p.userName || p.userId || 'Attendee');
    const points = (minutes?.discussionPoints || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const decisions = (minutes?.decisions || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const actionItems = minutes?.actionItems || [];

    const actionItemsHtml = actionItems.length > 0 ? `
      <table class="action-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>Action Item / Task</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${actionItems.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${this.escapeHtml(item.description)}</strong></td>
              <td>${this.escapeHtml(item.assigneeName || 'Unassigned')}</td>
              <td>${item.dueDate ? item.dueDate.split('T')[0] : 'N/A'}</td>
              <td><span class="badge badge-${(item.priority || 'MEDIUM').toLowerCase()}">${item.priority}</span></td>
              <td><span class="badge badge-${(item.status || 'OPEN').toLowerCase()}">${item.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : `<p class="empty-note">No action items recorded for this session.</p>`;

    const discussionHtml = points.length > 0 ? `
      <ul class="points-list">
        ${points.map(pt => `<li>${this.escapeHtml(pt)}</li>`).join('')}
      </ul>
    ` : `<p class="empty-note">${m.description ? this.escapeHtml(m.description) : 'No detailed discussion points recorded.'}</p>`;

    const decisionsHtml = decisions.length > 0 ? `
      <div class="decision-box">
        <ul style="margin:0; padding-left:20px;">
          ${decisions.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
        </ul>
      </div>
    ` : `<p class="empty-note">No formal decisions recorded for this session.</p>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Minutes of Meeting - ${this.escapeHtml(m.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 32px 16px;
    }
    .mom-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-group h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-group p {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .doc-badge {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
    }
    .meeting-hero {
      margin-bottom: 24px;
    }
    .meeting-hero h2 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .meeting-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 28px;
    }
    .grid-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .grid-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-val {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 0 0 12px 0;
    }
    .attendee-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .attendee-pill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .points-list {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.6;
      color: #334155;
    }
    .points-list li {
      margin-bottom: 6px;
    }
    .decision-box {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      border-radius: 0 6px 6px 0;
      padding: 14px 16px;
      font-size: 13px;
      color: #14532d;
      line-height: 1.5;
    }
    .action-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .action-table th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      font-weight: 700;
      color: #475569;
    }
    .action-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      color: #1e293b;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .badge-high, .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-low { background: #e0f2fe; color: #0284c7; }
    .badge-completed { background: #dcfce7; color: #16a34a; }
    .badge-in_progress, .badge-open { background: #eff6ff; color: #2563eb; }
    .empty-note {
      font-size: 12px;
      color: #94a3b8;
      font-style: italic;
      margin: 0;
    }
    .footer-bar {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
    .print-actions {
      margin-bottom: 20px;
      text-align: right;
    }
    .print-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      body { background: white; padding: 0; }
      .mom-container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .print-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="mom-container">
    <div class="print-actions">
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header-bar">
      <div class="brand-group">
        <h1>CRESENIX SOLUTIONS</h1>
        <p>Executive Minutes of Meeting (MoM) Archive</p>
      </div>
      <span class="doc-badge">Official Record</span>
    </div>

    <div class="meeting-hero">
      <h2>${this.escapeHtml(m.title)}</h2>
      <div class="meeting-grid">
        <div class="grid-item">
          <span class="grid-label">Date & Time</span>
          <span class="grid-val">${m.date} · ${m.startTime} - ${m.endTime}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Project</span>
          <span class="grid-val">${this.escapeHtml(m.projectName || 'General / Internal')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Meeting Type</span>
          <span class="grid-val">${m.type}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Organizer</span>
          <span class="grid-val">${this.escapeHtml(m.organizerName || 'Organizer')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Location / Link</span>
          <span class="grid-val">${this.escapeHtml(m.location || m.meetingUrl || 'Conference Session')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Recorded By</span>
          <span class="grid-val">${this.escapeHtml(minutes?.recordedByName || m.organizerName || 'Super Admin')}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Attendees (${attendees.length})</h3>
      <div class="attendee-list">
        ${attendees.map(a => `<span class="attendee-pill">${this.escapeHtml(a)}</span>`).join('')}
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Discussion Points & Notes</h3>
      ${discussionHtml}
    </div>

    <div class="section">
      <h3 class="section-title">Agreed Decisions</h3>
      ${decisionsHtml}
    </div>

    <div class="section">
      <h3 class="section-title">Action Items (${actionItems.length})</h3>
      ${actionItemsHtml}
    </div>

    <div class="footer-bar">
      <span>Generated by Cresenix Solutions Enterprise Platform</span>
      <span>${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
    </div>
  </div>
</body>
</html>`;

    // 1. Trigger Direct File Download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = m.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `MoM_${safeTitle}_${m.date}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 2. Open Print / Save as PDF Preview Tab
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 350);
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
