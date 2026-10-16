import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { SalesOpportunity, Client, SalesPipelineStage } from '../../../shared/models/index';

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="sales-reports-container">
      <!-- HEADER -->
      <div class="reports-header">
        <div>
          <h1 class="page-title">Sales Analytics & Conversion Reports</h1>
          <p class="page-subtitle">Understand pipeline health, channel acquisition efficiency, and deal velocity</p>
        </div>
        <div class="header-actions">
          <a routerLink="/sales/pipeline" class="btn btn-outline btn-sm">
            <span class="material-icons">view_kanban</span> Pipeline Board
          </a>
        </div>
      </div>

      <!-- TOP PERFORMANCE KPIS -->
      <div class="report-kpi-grid">
        <div class="card kpi-box">
          <span class="kpi-label">Total Pipeline Value</span>
          <span class="kpi-val text-blue">₹{{ (totalActiveValue() / 100000).toFixed(1) }}L</span>
          <span class="kpi-sub">Across {{ activeOppsCount() }} active opportunities</span>
        </div>
        <div class="card kpi-box">
          <span class="kpi-label">Win Rate</span>
          <span class="kpi-val text-green">{{ winRate() }}%</span>
          <span class="kpi-sub">{{ wonCount() }} won vs {{ lostCount() }} lost</span>
        </div>
        <div class="card kpi-box">
          <span class="kpi-label">Average Deal Size</span>
          <span class="kpi-val text-indigo">₹{{ (averageDealSize() / 100000).toFixed(1) }}L</span>
          <span class="kpi-sub">Per closed opportunity</span>
        </div>
        <div class="card kpi-box">
          <span class="kpi-label">Won Revenue (This Month)</span>
          <span class="kpi-val text-cyan">₹{{ (wonRevenue() / 100000).toFixed(1) }}L</span>
          <span class="kpi-sub">Ready for project handover</span>
        </div>
      </div>

      <!-- ANALYTICS CARDS GRID -->
      <div class="analytics-cards-grid">
        <!-- 1. LEAD SOURCE PERFORMANCE -->
        <div class="card report-card">
          <div class="card-title-line">
            <span class="material-icons header-icon text-blue">pie_chart</span>
            <div>
              <h3 class="card-title">Lead Acquisition Channels</h3>
              <p class="card-sub">Which channels produce high-value client enquiries</p>
            </div>
          </div>

          <div class="channel-stats-list">
            @for (src of channelStats(); track src.name) {
              <div class="channel-stat-row">
                <div class="cs-meta">
                  <span class="cs-name">{{ src.name }}</span>
                  <span class="cs-deals">{{ src.count }} leads</span>
                </div>
                <div class="cs-bar-wrap">
                  <div class="cs-bar-fill" [style.width.%]="src.percent"></div>
                </div>
                <span class="cs-val">₹{{ (src.value / 100000).toFixed(1) }}L</span>
              </div>
            }
          </div>
        </div>

        <!-- 2. STAGE DISTRIBUTION BREAKDOWN -->
        <div class="card report-card">
          <div class="card-title-line">
            <span class="material-icons header-icon text-indigo">account_tree</span>
            <div>
              <h3 class="card-title">Pipeline Stage Distribution</h3>
              <p class="card-sub">Active deals across the 9 pipeline stages</p>
            </div>
          </div>

          <div class="stage-stats-table-wrap">
            <table class="stage-stats-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Deals</th>
                  <th>Total Value</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                @for (stg of stageBreakdown(); track stg.key) {
                  <tr>
                    <td>
                      <div class="stg-name-cell">
                        <span class="stg-dot" [style.background]="stg.color"></span>
                        <span>{{ stg.label }}</span>
                      </div>
                    </td>
                    <td><span class="badge badge-gray">{{ stg.count }}</span></td>
                    <td><strong>₹{{ (stg.value / 100000).toFixed(1) }}L</strong></td>
                    <td>{{ stg.share }}%</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. LOST OPPORTUNITY ANALYSIS -->
        <div class="card report-card">
          <div class="card-title-line">
            <span class="material-icons header-icon text-red">assessment</span>
            <div>
              <h3 class="card-title">Lost Deal Analysis & Objections</h3>
              <p class="card-sub">Key reasons why opportunities were closed lost</p>
            </div>
          </div>

          <div class="lost-reasons-list">
            @for (loss of lostReasonsList(); track loss.reason) {
              <div class="lost-reason-row">
                <div class="lr-header">
                  <span class="lr-title">{{ loss.reason }}</span>
                  <span class="lr-count">{{ loss.count }} deal(s)</span>
                </div>
                <p class="lr-notes">{{ loss.notes }}</p>
              </div>
            } @empty {
              <div class="empty-state-sm">No lost deals recorded</div>
            }
          </div>
        </div>

        <!-- 4. SALES TEAM PERFORMANCE -->
        <div class="card report-card">
          <div class="card-title-line">
            <span class="material-icons header-icon text-green">military_tech</span>
            <div>
              <h3 class="card-title">Sales Team Contribution</h3>
              <p class="card-sub">Deal ownership, activity volume, and closed revenue</p>
            </div>
          </div>

          <div class="team-contrib-list">
            @for (rep of teamRepStats(); track rep.name) {
              <div class="team-rep-card">
                <div class="rep-avatar" [style.background]="getAvatarColor(rep.name)">
                  {{ rep.name.charAt(0) }}
                </div>
                <div class="rep-info">
                  <span class="rep-name">{{ rep.name }}</span>
                  <span class="rep-deals">{{ rep.oppCount }} active opportunities</span>
                </div>
                <div class="rep-stats">
                  <span class="rep-won text-green">{{ rep.wonCount }} Won</span>
                  <span class="rep-val">₹{{ (rep.totalVal / 100000).toFixed(1) }}L Managed</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sales-reports-container {
      padding: 24px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .reports-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }
    .page-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #101B35;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0;
    }

    .report-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .kpi-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 1.7rem;
      font-weight: 800;
      color: #101B35;
      line-height: 1.2;
    }
    .kpi-sub {
      font-size: 0.74rem;
      color: #94A3B8;
      margin-top: 4px;
    }

    .analytics-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .report-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .card-title-line {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .header-icon {
      font-size: 26px;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #101B35;
      margin: 0;
    }
    .card-sub {
      font-size: 0.76rem;
      color: #64748B;
      margin: 0;
    }

    /* CHANNEL STATS */
    .channel-stats-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .channel-stat-row {
      display: grid;
      grid-template-columns: 140px 1fr 80px;
      align-items: center;
      gap: 12px;
    }
    .cs-meta {
      display: flex;
      flex-direction: column;
    }
    .cs-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: #101B35;
    }
    .cs-deals {
      font-size: 0.7rem;
      color: #64748B;
    }
    .cs-bar-wrap {
      height: 8px;
      background: #F1F5F9;
      border-radius: 4px;
      overflow: hidden;
    }
    .cs-bar-fill {
      height: 100%;
      background: #2563EB;
      border-radius: 4px;
    }
    .cs-val {
      font-size: 0.82rem;
      font-weight: 700;
      color: #101B35;
      text-align: right;
    }

    /* STAGE TABLE */
    .stage-stats-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .stage-stats-table th {
      text-align: left;
      padding: 8px 10px;
      background: #F8FAFC;
      color: #64748B;
      font-size: 0.72rem;
      text-transform: uppercase;
      border-bottom: 1px solid #E2E8F0;
    }
    .stage-stats-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .stg-name-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #101B35;
    }
    .stg-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* LOST REASONS */
    .lost-reasons-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lost-reason-row {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .lr-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .lr-title {
      font-weight: 700;
      font-size: 0.82rem;
      color: #991B1B;
    }
    .lr-count {
      font-size: 0.72rem;
      font-weight: 700;
      color: #DC2626;
    }
    .lr-notes {
      font-size: 0.76rem;
      color: #7F1D1D;
      margin: 0;
    }

    /* TEAM CONTRIB */
    .team-contrib-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .team-rep-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #FFFFFF;
    }
    .rep-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      color: #FFFFFF;
      font-size: 0.88rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rep-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .rep-name {
      font-size: 0.86rem;
      font-weight: 700;
      color: #101B35;
    }
    .rep-deals {
      font-size: 0.74rem;
      color: #64748B;
    }
    .rep-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .rep-won {
      font-size: 0.78rem;
      font-weight: 700;
    }
    .rep-val {
      font-size: 0.78rem;
      font-weight: 600;
      color: #101B35;
    }

    @media (max-width: 1024px) {
      .analytics-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SalesReportsComponent implements OnInit {
  private salesService = inject(SalesService);

  opportunities = signal<SalesOpportunity[]>([]);
  clients = signal<Client[]>([]);

  ngOnInit(): void {
    this.salesService.getOpportunities().subscribe(o => this.opportunities.set(o));
    this.salesService.getClients().subscribe(c => this.clients.set(c));
  }

  activeOpps = computed(() => {
    return this.opportunities().filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST');
  });

  activeOppsCount = computed(() => this.activeOpps().length);

  totalActiveValue = computed(() => {
    return this.activeOpps().reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
  });

  wonCount = computed(() => {
    return this.opportunities().filter(o => o.stage === 'CLOSED_WON').length;
  });

  lostCount = computed(() => {
    return this.opportunities().filter(o => o.stage === 'CLOSED_LOST').length;
  });

  wonRevenue = computed(() => {
    return this.opportunities()
      .filter(o => o.stage === 'CLOSED_WON')
      .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
  });

  winRate = computed(() => {
    const totalClosed = this.wonCount() + this.lostCount();
    if (totalClosed === 0) return 0;
    return Math.round((this.wonCount() / totalClosed) * 100);
  });

  averageDealSize = computed(() => {
    const won = this.opportunities().filter(o => o.stage === 'CLOSED_WON');
    if (won.length === 0) return 0;
    return Math.round(this.wonRevenue() / won.length);
  });

  channelStats = computed(() => {
    const opps = this.opportunities();
    const map: Record<string, { count: number; value: number }> = {};
    opps.forEach(o => {
      const src = o.leadSource || 'OTHER';
      if (!map[src]) map[src] = { count: 0, value: 0 };
      map[src].count++;
      map[src].value += (o.estimatedValue || 0);
    });

    const maxVal = Math.max(...Object.values(map).map(v => v.value), 1);
    return Object.entries(map).map(([name, data]) => ({
      name: name.replace(/_/g, ' '),
      count: data.count,
      value: data.value,
      percent: Math.round((data.value / maxVal) * 100)
    })).sort((a, b) => b.value - a.value);
  });

  stageBreakdown = computed(() => {
    const opps = this.opportunities();
    const totalVal = opps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0) || 1;
    const stages: { key: SalesPipelineStage; label: string; color: string }[] = [
      { key: 'NEW_LEAD', label: '1. New Lead', color: '#06B6D4' },
      { key: 'CONTACTED', label: '2. Contacted', color: '#3B82F6' },
      { key: 'QUALIFIED', label: '3. Qualified', color: '#6366F1' },
      { key: 'DISCOVERY_SCHEDULED', label: '4. Discovery Sched.', color: '#8B5CF6' },
      { key: 'DISCOVERY_COMPLETED', label: '5. Discovery Done', color: '#A855F7' },
      { key: 'PROPOSAL_QUOTATION', label: '6. Proposal', color: '#EC4899' },
      { key: 'NEGOTIATION', label: '7. Negotiation', color: '#F59E0B' },
      { key: 'CLOSED_WON', label: '8. Won', color: '#16A34A' },
      { key: 'CLOSED_LOST', label: '9. Lost', color: '#DC2626' },
    ];

    return stages.map(s => {
      const filtered = opps.filter(o => o.stage === s.key);
      const val = filtered.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
      return {
        ...s,
        count: filtered.length,
        value: val,
        share: Math.round((val / totalVal) * 100)
      };
    });
  });

  lostReasonsList = computed(() => {
    return this.opportunities()
      .filter(o => o.stage === 'CLOSED_LOST')
      .map(o => ({
        reason: o.lostReason || 'Client chose to postpone',
        count: 1,
        notes: o.lostNotes || `Client: ${o.clientName}`
      }));
  });

  teamRepStats = computed(() => {
    const opps = this.opportunities();
    const map: Record<string, { oppCount: number; wonCount: number; totalVal: number }> = {};
    opps.forEach(o => {
      const rep = o.assignedToName || 'Sales Rep';
      if (!map[rep]) map[rep] = { oppCount: 0, wonCount: 0, totalVal: 0 };
      map[rep].oppCount++;
      if (o.stage === 'CLOSED_WON') map[rep].wonCount++;
      map[rep].totalVal += (o.estimatedValue || 0);
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.totalVal - a.totalVal);
  });

  getAvatarColor(name: string): string {
    const colors = ['#2563EB', '#06B6D4', '#6366F1', '#16A34A', '#D97706', '#8B5CF6'];
    const idx = (name || 'U').charCodeAt(0) % colors.length;
    return colors[idx];
  }
}
