// ================================================================
// CRESENIX SOLUTIONS — Sales CRM Service (Connected to Live Go API)
// ================================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, catchError, map, tap } from 'rxjs';
import {
  Client,
  SalesOpportunity,
  SalesActivity,
  SalesMeeting,
  StageHistoryEntry,
  SalesPipelineStage,
  SalesMeetingMinutes,
  ProjectHandoverPayload,
  SalesDashboardMetrics
} from '../../shared/models/index';
import {
  MOCK_CLIENTS,
  MOCK_OPPORTUNITIES,
  MOCK_SALES_ACTIVITIES,
  MOCK_SALES_MEETINGS,
  MOCK_STAGE_HISTORY
} from '../mocks/index';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ProjectService } from './project.service';

const STORAGE_KEYS = {
  CLIENTS: 'cresenix_sales_clients_v2',
  OPPORTUNITIES: 'cresenix_sales_opportunities_v2',
  ACTIVITIES: 'cresenix_sales_activities_v2',
  MEETINGS: 'cresenix_sales_meetings_v2',
  HISTORY: 'cresenix_sales_stage_history_v2',
};

// ── DTO Mappers (PostgreSQL Snake_case <-> Angular CamelCase) ─

function mapBackendClient(raw: any): Client {
  return {
    id: raw.id,
    clientType: raw.client_type || raw.clientType || 'COMPANY',
    companyName: raw.company_name || raw.companyName || '',
    contactPerson: raw.contact_person || raw.contactPerson || '',
    designation: raw.designation || '',
    email: raw.email || '',
    phone: raw.phone || '',
    whatsapp: raw.whatsapp || '',
    website: raw.website || '',
    industry: raw.industry || '',
    city: raw.city || '',
    address: raw.address || '',
    leadSource: raw.lead_source || raw.leadSource || 'WEBSITE_ENQUIRY',
    sourceDetails: raw.source_details || raw.sourceDetails || '',
    status: raw.status || 'LEAD',
    assignedTo: raw.assigned_to || raw.assignedTo || '',
    assignedToName: raw.assigned_to_name || raw.assignedToName || 'Unassigned',
    serviceRequirements: raw.service_requirements || raw.serviceRequirements || [],
    businessProblem: raw.business_problem || raw.businessProblem || '',
    detailedRequirements: raw.detailed_requirements || raw.detailedRequirements || '',
    hasExistingSystem: raw.has_existing_system || raw.hasExistingSystem || 'NOT_SURE',
    referenceUrl: raw.reference_url || raw.referenceUrl || '',
    preferredTimeline: raw.preferred_timeline || raw.preferredTimeline || '',
    estimatedBudgetRange: raw.estimated_budget_range || raw.estimatedBudgetRange || '',
    budgetConfirmation: raw.budget_confirmation || raw.budgetConfirmation || 'APPROXIMATE',
    nextFollowUpAt: raw.next_follow_up_at || raw.nextFollowUpAt,
    lastActivityAt: raw.last_activity_at || raw.lastActivityAt,
    opportunitiesCount: raw.opportunities_count ?? raw.opportunitiesCount ?? 0,
    totalValue: raw.total_value ?? raw.totalValue ?? 0,
    notes: raw.notes || '',
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString()
  };
}

function mapBackendOpportunity(raw: any): SalesOpportunity {
  return {
    id: raw.id,
    title: raw.title || '',
    clientId: raw.client_id || raw.clientId || '',
    clientName: raw.client_name || raw.clientName || '',
    clientType: raw.client_type || raw.clientType || 'COMPANY',
    contactPerson: raw.contact_person || raw.contactPerson || '',
    contactPhone: raw.contact_phone || raw.contactPhone || '',
    contactEmail: raw.contact_email || raw.contactEmail || '',
    serviceType: raw.service_type || raw.serviceType || 'Custom Software Development',
    requestedServices: raw.requested_services || raw.requestedServices || [],
    leadSource: raw.lead_source || raw.leadSource || 'WEBSITE_ENQUIRY',
    stage: raw.stage || 'NEW_LEAD',
    stageDays: raw.stage_days ?? raw.stageDays ?? 0,
    stageUpdatedAt: raw.stage_updated_at || raw.stageUpdatedAt || new Date().toISOString(),
    estimatedValue: raw.estimated_value ?? raw.estimatedValue ?? 0,
    priority: raw.priority || 'MEDIUM',
    assignedTo: raw.assigned_to || raw.assignedTo || '',
    assignedToName: raw.assigned_to_name || raw.assignedToName || '',
    expectedCloseDate: raw.expected_close_date ? String(raw.expected_close_date).split('T')[0] : (raw.expectedCloseDate || ''),
    decisionMaker: raw.decision_maker || raw.decisionMaker || '',
    decisionMakerRole: raw.decision_maker_role || raw.decisionMakerRole || '',
    budgetStatus: raw.budget_status || raw.budgetStatus || '',
    requirementSummary: raw.requirement_summary || raw.requirementSummary || '',
    nextAction: raw.next_action || raw.nextAction || '',
    nextFollowUpAt: raw.next_follow_up_at || raw.nextFollowUpAt,
    nextMeetingAt: raw.next_meeting_at || raw.nextMeetingAt,
    nextMeetingType: raw.next_meeting_type || raw.nextMeetingType,
    proposalStatus: raw.proposal_status || raw.proposalStatus || 'NOT_STARTED',
    proposalValue: raw.proposal_value ?? raw.proposalValue,
    proposalSentAt: raw.proposal_sent_at || raw.proposalSentAt,
    lostReason: raw.lost_reason || raw.lostReason,
    lostNotes: raw.lost_notes || raw.lostNotes,
    isConvertedToProject: raw.is_converted_to_project ?? raw.isConvertedToProject ?? false,
    convertedProjectId: raw.converted_project_id || raw.convertedProjectId,
    convertedAt: raw.converted_at || raw.convertedAt,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString()
  };
}

function mapBackendActivity(raw: any): SalesActivity {
  return {
    id: raw.id,
    clientId: raw.client_id || raw.clientId || '',
    clientName: raw.client_name || raw.clientName || '',
    opportunityId: raw.opportunity_id || raw.opportunityId,
    opportunityTitle: raw.opportunity_title || raw.opportunityTitle,
    type: raw.type || 'CALL',
    title: raw.title || '',
    description: raw.description || '',
    dueAt: raw.due_at || raw.dueAt || new Date().toISOString(),
    completedAt: raw.completed_at || raw.completedAt,
    status: raw.status || 'PENDING',
    outcome: raw.outcome || '',
    assignedTo: raw.assigned_to || raw.assignedTo || '',
    assignedToName: raw.assigned_to_name || raw.assignedToName || '',
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString()
  };
}

function mapBackendMeeting(raw: any): SalesMeeting {
  let date = '';
  let startTime = '';
  let endTime = '';
  if (raw.start_time) {
    const d = new Date(raw.start_time);
    date = d.toISOString().split('T')[0];
    startTime = d.toTimeString().substring(0, 5);
  } else if (raw.date) {
    date = raw.date;
    startTime = raw.startTime || '10:00';
  }
  if (raw.end_time) {
    const d = new Date(raw.end_time);
    endTime = d.toTimeString().substring(0, 5);
  } else if (raw.endTime) {
    endTime = raw.endTime;
  }

  let minutes = undefined;
  if (raw.minutes) {
    minutes = {
      discussionSummary: raw.minutes.discussion_summary || raw.minutes.discussionSummary || '',
      requirementsIdentified: raw.minutes.requirements_identified || raw.minutes.requirementsIdentified || '',
      concernsOrObjections: raw.minutes.concerns_or_objections || raw.minutes.concernsOrObjections || '',
      agreedDecisions: raw.minutes.agreed_decisions || raw.minutes.agreedDecisions || '',
      nextAction: raw.minutes.next_action || raw.minutes.nextAction || '',
      actionOwner: raw.minutes.action_owner || raw.minutes.actionOwner || '',
      actionDueDate: raw.minutes.action_due_date || raw.minutes.actionDueDate,
      nextFollowUpAt: raw.minutes.next_follow_up_at || raw.minutes.nextFollowUpAt
    };
  }

  return {
    id: raw.id,
    title: raw.title || '',
    clientId: raw.client_id || raw.clientId || '',
    clientName: raw.client_name || raw.clientName || '',
    opportunityId: raw.opportunity_id || raw.opportunityId,
    opportunityTitle: raw.opportunity_title || raw.opportunityTitle,
    type: raw.type || 'DISCOVERY_CALL',
    status: raw.status || 'SCHEDULED',
    date: date || new Date().toISOString().split('T')[0],
    startTime: startTime || '10:00',
    endTime: endTime || '11:00',
    timezone: raw.timezone || 'Asia/Kolkata (IST)',
    organizerId: raw.organizer_id || raw.organizerId || '',
    organizerName: raw.organizer_name || raw.organizerName || '',
    internalParticipants: raw.internal_participants || raw.internalParticipants || [],
    clientParticipants: raw.client_participants || raw.clientParticipants || [],
    location: raw.location || '',
    meetingUrl: raw.meeting_url || raw.meetingUrl || '',
    agenda: raw.agenda || '',
    notes: raw.notes || '',
    reminderMinutes: raw.reminder_minutes ?? raw.reminderMinutes ?? 15,
    visitAddress: raw.visit_address || raw.visitAddress,
    visitPurpose: raw.visit_purpose || raw.visitPurpose,
    expectedArrivalTime: raw.expected_arrival_time || raw.expectedArrivalTime,
    minutes: minutes,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString()
  };
}

function mapBackendHistory(raw: any): StageHistoryEntry {
  return {
    id: raw.id,
    opportunityId: raw.opportunity_id || raw.opportunityId || '',
    fromStage: raw.from_stage || raw.fromStage,
    toStage: raw.to_stage || raw.toStage,
    changedBy: raw.changed_by || raw.changedBy || '',
    changedByName: raw.changed_by_name || raw.changedByName || '',
    notes: raw.notes || '',
    timestamp: raw.timestamp || raw.created_at || new Date().toISOString()
  };
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private projectService = inject(ProjectService);

  private clientsSubject = new BehaviorSubject<Client[]>(this.loadInitial<Client>(STORAGE_KEYS.CLIENTS, MOCK_CLIENTS));
  private opportunitiesSubject = new BehaviorSubject<SalesOpportunity[]>(this.loadInitial<SalesOpportunity>(STORAGE_KEYS.OPPORTUNITIES, MOCK_OPPORTUNITIES));
  private activitiesSubject = new BehaviorSubject<SalesActivity[]>(this.loadInitial<SalesActivity>(STORAGE_KEYS.ACTIVITIES, MOCK_SALES_ACTIVITIES));
  private meetingsSubject = new BehaviorSubject<SalesMeeting[]>(this.loadInitial<SalesMeeting>(STORAGE_KEYS.MEETINGS, MOCK_SALES_MEETINGS));
  private historySubject = new BehaviorSubject<StageHistoryEntry[]>(this.loadInitial<StageHistoryEntry>(STORAGE_KEYS.HISTORY, MOCK_STAGE_HISTORY));

  clients$ = this.clientsSubject.asObservable();
  opportunities$ = this.opportunitiesSubject.asObservable();
  activities$ = this.activitiesSubject.asObservable();
  meetings$ = this.meetingsSubject.asObservable();
  stageHistory$ = this.historySubject.asObservable();

  constructor() {
    // Sync real database records from Go API on boot
    if (environment.useBackendApi) {
      this.clearLocalCache(); // flush stale mock/localStorage data
      this.syncFromBackend();
    }
  }

  /** Clears all sales CRM keys from localStorage so mock data never leaks in */
  private clearLocalCache(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }

  private loadInitial<T>(key: string, fallback: T[]): T[] {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T[];
      }
    } catch (e) {
      console.warn('Error reading sales cache from localStorage', e);
    }
    return [...fallback];
  }

  private persist<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist sales data to localStorage', e);
    }
  }

  /**
   * Refreshes all Sales CRM entities from PostgreSQL database via Go REST APIs
   */
  syncFromBackend(): void {
    if (!environment.useBackendApi) return;

    // 1. Clients
    this.http.get<any[]>(`${environment.apiUrl}/sales/clients`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendClient);
        this.clientsSubject.next(mapped);
        this.persist(STORAGE_KEYS.CLIENTS, mapped);
      }
    });

    // 2. Opportunities
    this.http.get<any[]>(`${environment.apiUrl}/sales/opportunities`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendOpportunity);
        this.opportunitiesSubject.next(mapped);
        this.persist(STORAGE_KEYS.OPPORTUNITIES, mapped);
      }
    });

    // 3. Activities
    this.http.get<any[]>(`${environment.apiUrl}/sales/activities`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendActivity);
        this.activitiesSubject.next(mapped);
        this.persist(STORAGE_KEYS.ACTIVITIES, mapped);
      }
    });

    // 4. Meetings
    this.http.get<any[]>(`${environment.apiUrl}/sales/meetings`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendMeeting);
        this.meetingsSubject.next(mapped);
        this.persist(STORAGE_KEYS.MEETINGS, mapped);
      }
    });

    // 5. Stage History
    this.http.get<any[]>(`${environment.apiUrl}/sales/stage-history`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendHistory);
        this.historySubject.next(mapped);
        this.persist(STORAGE_KEYS.HISTORY, mapped);
      }
    });
  }

  // --------------------------------------------------------------
  // CLIENTS
  // --------------------------------------------------------------
  getClients(): Observable<Client[]> {
    return this.clients$;
  }

  getClientById(id: string): Observable<Client | undefined> {
    return this.clients$.pipe(
      map(list => list.find(c => c.id === id))
    );
  }

  createClient(payload: Partial<Client>): Observable<Client> {
    const user = this.auth.currentUser();

    const backendPayload = {
      client_type: payload.clientType || 'COMPANY',
      company_name: payload.companyName || 'Unnamed Client',
      contact_person: payload.contactPerson || 'Contact Person',
      designation: payload.designation || '',
      email: payload.email || '',
      phone: payload.phone || '',
      whatsapp: payload.whatsapp || payload.phone || '',
      website: payload.website || '',
      industry: payload.industry || 'Technology',
      city: payload.city || 'Mumbai',
      address: payload.address || '',
      lead_source: payload.leadSource || 'WEBSITE_ENQUIRY',
      source_details: payload.sourceDetails || '',
      status: payload.status || 'LEAD',
      assigned_to: payload.assignedTo || (user ? user.id : null),
      service_requirements: payload.serviceRequirements || ['Custom Software Development'],
      business_problem: payload.businessProblem || '',
      detailed_requirements: payload.detailedRequirements || '',
      has_existing_system: payload.hasExistingSystem || 'NOT_SURE',
      reference_url: payload.referenceUrl || '',
      preferred_timeline: payload.preferredTimeline || 'Within 30 days',
      estimated_budget_range: payload.estimatedBudgetRange || '₹15L - ₹25L',
      budget_confirmation: payload.budgetConfirmation || 'APPROXIMATE',
      next_follow_up_at: payload.nextFollowUpAt || null,
      notes: payload.notes || ''
    };

    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/sales/clients`, backendPayload).pipe(
        map(res => mapBackendClient(res)),
        tap(newClient => {
          const current = this.clientsSubject.getValue();
          const updated = [newClient, ...current.filter(c => c.id !== newClient.id)];
          this.clientsSubject.next(updated);
          this.persist(STORAGE_KEYS.CLIENTS, updated);
        }),
        catchError(err => {
          console.warn('Backend client create error, using optimistic local object', err);
          const fallbackClient: Client = {
            id: 'c-' + Date.now().toString(36),
            clientType: payload.clientType || 'COMPANY',
            companyName: payload.companyName || 'Unnamed Client',
            contactPerson: payload.contactPerson || 'Contact Person',
            designation: payload.designation || '',
            email: payload.email || '',
            phone: payload.phone || '',
            whatsapp: payload.whatsapp || payload.phone || '',
            website: payload.website || '',
            industry: payload.industry || 'Technology',
            city: payload.city || 'Mumbai',
            address: payload.address || '',
            leadSource: payload.leadSource || 'WEBSITE_ENQUIRY',
            sourceDetails: payload.sourceDetails || '',
            status: payload.status || 'LEAD',
            assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
            assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
            serviceRequirements: payload.serviceRequirements || ['Custom Software Development'],
            businessProblem: payload.businessProblem || '',
            detailedRequirements: payload.detailedRequirements || '',
            hasExistingSystem: payload.hasExistingSystem || 'NOT_SURE',
            referenceUrl: payload.referenceUrl || '',
            preferredTimeline: payload.preferredTimeline || 'Within 30 days',
            estimatedBudgetRange: payload.estimatedBudgetRange || '₹15L - ₹25L',
            budgetConfirmation: payload.budgetConfirmation || 'APPROXIMATE',
            nextFollowUpAt: payload.nextFollowUpAt,
            lastActivityAt: new Date().toISOString(),
            opportunitiesCount: 0,
            totalValue: 0,
            notes: payload.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const current = this.clientsSubject.getValue();
          const updated = [fallbackClient, ...current];
          this.clientsSubject.next(updated);
          this.persist(STORAGE_KEYS.CLIENTS, updated);
          return of(fallbackClient);
        })
      );
    }

    // Local fallback
    const localClient: Client = {
      id: 'c-' + Date.now().toString(36),
      clientType: payload.clientType || 'COMPANY',
      companyName: payload.companyName || 'Unnamed Client',
      contactPerson: payload.contactPerson || 'Contact Person',
      designation: payload.designation || '',
      email: payload.email || '',
      phone: payload.phone || '',
      whatsapp: payload.whatsapp || payload.phone || '',
      website: payload.website || '',
      industry: payload.industry || 'Technology',
      city: payload.city || 'Mumbai',
      address: payload.address || '',
      leadSource: payload.leadSource || 'WEBSITE_ENQUIRY',
      sourceDetails: payload.sourceDetails || '',
      status: payload.status || 'LEAD',
      assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
      assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
      serviceRequirements: payload.serviceRequirements || ['Custom Software Development'],
      businessProblem: payload.businessProblem || '',
      detailedRequirements: payload.detailedRequirements || '',
      hasExistingSystem: payload.hasExistingSystem || 'NOT_SURE',
      referenceUrl: payload.referenceUrl || '',
      preferredTimeline: payload.preferredTimeline || 'Within 30 days',
      estimatedBudgetRange: payload.estimatedBudgetRange || '₹15L - ₹25L',
      budgetConfirmation: payload.budgetConfirmation || 'APPROXIMATE',
      nextFollowUpAt: payload.nextFollowUpAt,
      lastActivityAt: new Date().toISOString(),
      opportunitiesCount: 0,
      totalValue: 0,
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const current = this.clientsSubject.getValue();
    const updated = [localClient, ...current];
    this.clientsSubject.next(updated);
    this.persist(STORAGE_KEYS.CLIENTS, updated);
    return of(localClient);
  }

  updateClient(id: string, updates: Partial<Client>): Observable<Client> {
    const current = this.clientsSubject.getValue();
    const index = current.findIndex(c => c.id === id);

    const updatedClient: Client = index !== -1 ? {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString()
    } : (updates as Client);

    if (environment.useBackendApi) {
      const backendUpdates: any = {};
      if (updates.companyName) backendUpdates.company_name = updates.companyName;
      if (updates.contactPerson) backendUpdates.contact_person = updates.contactPerson;
      if (updates.designation) backendUpdates.designation = updates.designation;
      if (updates.email) backendUpdates.email = updates.email;
      if (updates.phone) backendUpdates.phone = updates.phone;
      if (updates.city) backendUpdates.city = updates.city;
      if (updates.status) backendUpdates.status = updates.status;
      if (updates.assignedTo) backendUpdates.assigned_to = updates.assignedTo;
      if (updates.notes) backendUpdates.notes = updates.notes;

      return this.http.patch<any>(`${environment.apiUrl}/sales/clients/${id}`, backendUpdates).pipe(
        map(res => mapBackendClient(res)),
        tap(saved => {
          if (index !== -1) {
            const updatedList = [...current];
            updatedList[index] = saved;
            this.clientsSubject.next(updatedList);
            this.persist(STORAGE_KEYS.CLIENTS, updatedList);
          }
        }),
        catchError(() => of(updatedClient))
      );
    }

    if (index !== -1) {
      const updatedList = [...current];
      updatedList[index] = updatedClient;
      this.clientsSubject.next(updatedList);
      this.persist(STORAGE_KEYS.CLIENTS, updatedList);
    }

    return of(updatedClient);
  }

  deleteClient(id: string): Observable<boolean> {
    if (environment.useBackendApi) {
      this.http.delete(`${environment.apiUrl}/sales/clients/${id}`).pipe(
        catchError(() => of(true))
      ).subscribe();
    }
    const current = this.clientsSubject.getValue();
    const updated = current.filter(c => c.id !== id);
    this.clientsSubject.next(updated);
    this.persist(STORAGE_KEYS.CLIENTS, updated);
    return of(true);
  }

  // --------------------------------------------------------------
  // SALES OPPORTUNITIES
  // --------------------------------------------------------------
  getOpportunities(): Observable<SalesOpportunity[]> {
    return this.opportunities$;
  }

  getOpportunityById(id: string): Observable<SalesOpportunity | undefined> {
    return this.opportunities$.pipe(
      map(list => list.find(o => o.id === id))
    );
  }

  getOpportunitiesByClientId(clientId: string): Observable<SalesOpportunity[]> {
    return this.opportunities$.pipe(
      map(list => list.filter(o => o.clientId === clientId))
    );
  }

  createOpportunity(payload: Partial<SalesOpportunity>): Observable<SalesOpportunity> {
    const user = this.auth.currentUser();

    const backendPayload = {
      client_id: payload.clientId,
      title: payload.title || 'New Software Opportunity',
      service_type: payload.serviceType || 'Custom Software Development',
      requested_services: payload.requestedServices || ['Custom Software Development'],
      lead_source: payload.leadSource || 'WEBSITE_ENQUIRY',
      stage: payload.stage || 'NEW_LEAD',
      estimated_value: Number(payload.estimatedValue) || 250000,
      priority: payload.priority || 'MEDIUM',
      assigned_to: payload.assignedTo || (user ? user.id : null),
      expected_close_date: payload.expectedCloseDate || null,
      decision_maker: payload.decisionMaker || '',
      decision_maker_role: payload.decisionMakerRole || '',
      budget_status: payload.budgetStatus || '',
      requirement_summary: payload.requirementSummary || '',
      next_action: payload.nextAction || 'Initial Discovery Call',
      next_follow_up_at: payload.nextFollowUpAt || null
    };

    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/sales/opportunities`, backendPayload).pipe(
        map(res => mapBackendOpportunity(res)),
        tap(newOpp => {
          const current = this.opportunitiesSubject.getValue();
          const updated = [newOpp, ...current.filter(o => o.id !== newOpp.id)];
          this.opportunitiesSubject.next(updated);
          this.persist(STORAGE_KEYS.OPPORTUNITIES, updated);
          if (newOpp.clientId) this.recalculateClientStats(newOpp.clientId);
        }),
        catchError(() => {
          const fallbackOpp: SalesOpportunity = {
            id: 'opp-' + Date.now().toString(36),
            title: payload.title || 'New Software Opportunity',
            clientId: payload.clientId || '',
            clientName: payload.clientName || 'Client Name',
            clientType: payload.clientType || 'COMPANY',
            contactPerson: payload.contactPerson || 'Contact Person',
            contactPhone: payload.contactPhone || '',
            contactEmail: payload.contactEmail || '',
            serviceType: payload.serviceType || 'Custom Software Development',
            requestedServices: payload.requestedServices || ['Custom Software Development'],
            leadSource: payload.leadSource || 'WEBSITE_ENQUIRY',
            stage: payload.stage || 'NEW_LEAD',
            stageDays: 0,
            stageUpdatedAt: new Date().toISOString(),
            estimatedValue: Number(payload.estimatedValue) || 250000,
            priority: payload.priority || 'MEDIUM',
            assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
            assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
            expectedCloseDate: payload.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            decisionMaker: payload.decisionMaker || '',
            decisionMakerRole: payload.decisionMakerRole || 'Stakeholder',
            budgetStatus: payload.budgetStatus || 'Budget discussed',
            requirementSummary: payload.requirementSummary || '',
            nextAction: payload.nextAction || 'Initial Discovery Call',
            nextFollowUpAt: payload.nextFollowUpAt || new Date(Date.now() + 2 * 86400000).toISOString(),
            proposalStatus: payload.proposalStatus || 'NOT_STARTED',
            proposalValue: payload.proposalValue,
            isConvertedToProject: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const current = this.opportunitiesSubject.getValue();
          const updated = [fallbackOpp, ...current];
          this.opportunitiesSubject.next(updated);
          this.persist(STORAGE_KEYS.OPPORTUNITIES, updated);
          return of(fallbackOpp);
        })
      );
    }

    const localOpp: SalesOpportunity = {
      id: 'opp-' + Date.now().toString(36),
      title: payload.title || 'New Software Opportunity',
      clientId: payload.clientId || '',
      clientName: payload.clientName || 'Client Name',
      clientType: payload.clientType || 'COMPANY',
      contactPerson: payload.contactPerson || 'Contact Person',
      contactPhone: payload.contactPhone || '',
      contactEmail: payload.contactEmail || '',
      serviceType: payload.serviceType || 'Custom Software Development',
      requestedServices: payload.requestedServices || ['Custom Software Development'],
      leadSource: payload.leadSource || 'WEBSITE_ENQUIRY',
      stage: payload.stage || 'NEW_LEAD',
      stageDays: 0,
      stageUpdatedAt: new Date().toISOString(),
      estimatedValue: Number(payload.estimatedValue) || 250000,
      priority: payload.priority || 'MEDIUM',
      assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
      assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
      expectedCloseDate: payload.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      decisionMaker: payload.decisionMaker || '',
      decisionMakerRole: payload.decisionMakerRole || 'Stakeholder',
      budgetStatus: payload.budgetStatus || 'Budget discussed',
      requirementSummary: payload.requirementSummary || '',
      nextAction: payload.nextAction || 'Initial Discovery Call',
      nextFollowUpAt: payload.nextFollowUpAt || new Date(Date.now() + 2 * 86400000).toISOString(),
      proposalStatus: payload.proposalStatus || 'NOT_STARTED',
      proposalValue: payload.proposalValue,
      isConvertedToProject: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const current = this.opportunitiesSubject.getValue();
    const updated = [localOpp, ...current];
    this.opportunitiesSubject.next(updated);
    this.persist(STORAGE_KEYS.OPPORTUNITIES, updated);
    return of(localOpp);
  }

  updateOpportunity(id: string, updates: Partial<SalesOpportunity>): Observable<SalesOpportunity> {
    const current = this.opportunitiesSubject.getValue();
    const index = current.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error(`Opportunity with ID ${id} not found`);
    }

    const updatedOpp: SalesOpportunity = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...current];
    updatedList[index] = updatedOpp;
    this.opportunitiesSubject.next(updatedList);
    this.persist(STORAGE_KEYS.OPPORTUNITIES, updatedList);

    if (updatedOpp.clientId) {
      this.recalculateClientStats(updatedOpp.clientId);
    }

    return of(updatedOpp);
  }

  updateStage(
    id: string,
    newStage: SalesPipelineStage,
    notes?: string,
    lostReason?: string,
    wonDetails?: { finalValue?: number }
  ): Observable<SalesOpportunity> {
    const current = this.opportunitiesSubject.getValue();
    const index = current.findIndex(o => o.id === id);
    const prev = index !== -1 ? current[index] : null;

    if (environment.useBackendApi) {
      const payload = {
        stage: newStage,
        lost_reason: lostReason || '',
        lost_notes: notes || '',
        notes: notes || `Moved to stage ${newStage}`
      };

      return this.http.patch<any>(`${environment.apiUrl}/sales/opportunities/${id}/stage`, payload).pipe(
        map(res => mapBackendOpportunity(res)),
        tap(savedOpp => {
          if (index !== -1) {
            const updatedList = [...current];
            updatedList[index] = savedOpp;
            this.opportunitiesSubject.next(updatedList);
            this.persist(STORAGE_KEYS.OPPORTUNITIES, updatedList);
          }
          // Refresh stage history
          this.refreshStageHistory(id);
        }),
        catchError(() => {
          // Local fallback
          return this.applyLocalStageChange(id, newStage, notes, lostReason, wonDetails);
        })
      );
    }

    return this.applyLocalStageChange(id, newStage, notes, lostReason, wonDetails);
  }

  private applyLocalStageChange(
    id: string,
    newStage: SalesPipelineStage,
    notes?: string,
    lostReason?: string,
    wonDetails?: { finalValue?: number }
  ): Observable<SalesOpportunity> {
    const current = this.opportunitiesSubject.getValue();
    const index = current.findIndex(o => o.id === id);
    if (index === -1) throw new Error(`Opportunity ${id} not found`);

    const prev = current[index];
    const updates: Partial<SalesOpportunity> = {
      stage: newStage,
      stageDays: 0,
      stageUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newStage === 'CLOSED_LOST') {
      updates.lostReason = lostReason || 'No reason provided';
      updates.proposalStatus = 'REJECTED';
    } else if (newStage === 'CLOSED_WON') {
      updates.proposalStatus = 'ACCEPTED';
      if (wonDetails?.finalValue) updates.estimatedValue = wonDetails.finalValue;
    }

    const updatedOpp: SalesOpportunity = { ...prev, ...updates };
    const updatedList = [...current];
    updatedList[index] = updatedOpp;
    this.opportunitiesSubject.next(updatedList);
    this.persist(STORAGE_KEYS.OPPORTUNITIES, updatedList);

    this.recordStageHistory({
      opportunityId: id,
      fromStage: prev.stage,
      toStage: newStage,
      notes: notes || (newStage === 'CLOSED_LOST' ? `Lost Reason: ${lostReason}` : `Moved to ${newStage}`)
    });

    return of(updatedOpp);
  }

  private recalculateClientStats(clientId: string): void {
    const opps = this.opportunitiesSubject.getValue().filter(o => o.clientId === clientId);
    const count = opps.length;
    const totalVal = opps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
    this.updateClient(clientId, {
      opportunitiesCount: count,
      totalValue: totalVal
    }).subscribe();
  }

  // --------------------------------------------------------------
  // STAGE HISTORY
  // --------------------------------------------------------------
  private recordStageHistory(entry: {
    opportunityId: string;
    fromStage?: SalesPipelineStage;
    toStage: SalesPipelineStage;
    notes?: string;
  }): void {
    const user = this.auth.currentUser();
    const newEntry: StageHistoryEntry = {
      id: 'sh-' + Date.now().toString(36),
      opportunityId: entry.opportunityId,
      fromStage: entry.fromStage,
      toStage: entry.toStage,
      changedBy: user?.id || 'u3',
      changedByName: user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel',
      notes: entry.notes,
      timestamp: new Date().toISOString()
    };

    const current = this.historySubject.getValue();
    const updated = [newEntry, ...current];
    this.historySubject.next(updated);
    this.persist(STORAGE_KEYS.HISTORY, updated);
  }

  private refreshStageHistory(opportunityId: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/sales/stage-history?opportunity_id=${opportunityId}`).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && Array.isArray(data)) {
        const mapped = data.map(mapBackendHistory);
        const current = this.historySubject.getValue().filter(h => h.opportunityId !== opportunityId);
        const merged = [...mapped, ...current];
        this.historySubject.next(merged);
        this.persist(STORAGE_KEYS.HISTORY, merged);
      }
    });
  }

  getStageHistory(opportunityId: string): Observable<StageHistoryEntry[]> {
    return this.stageHistory$.pipe(
      map(list => list.filter(h => h.opportunityId === opportunityId))
    );
  }

  // --------------------------------------------------------------
  // ACTIVITIES & FOLLOW-UPS
  // --------------------------------------------------------------
  getActivities(): Observable<SalesActivity[]> {
    return this.activities$;
  }

  createActivity(payload: Partial<SalesActivity>): Observable<SalesActivity> {
    const user = this.auth.currentUser();

    const backendPayload = {
      client_id: payload.clientId,
      opportunity_id: payload.opportunityId || null,
      type: payload.type || 'CALL',
      title: payload.title || 'Follow-up Activity',
      description: payload.description || '',
      due_at: payload.dueAt || new Date().toISOString(),
      assigned_to: payload.assignedTo || (user ? user.id : null)
    };

    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/sales/activities`, backendPayload).pipe(
        map(res => mapBackendActivity(res)),
        tap(newAct => {
          const current = this.activitiesSubject.getValue();
          const updated = [newAct, ...current.filter(a => a.id !== newAct.id)];
          this.activitiesSubject.next(updated);
          this.persist(STORAGE_KEYS.ACTIVITIES, updated);
          if (newAct.clientId) {
            this.updateClient(newAct.clientId, {
              nextFollowUpAt: newAct.dueAt,
              lastActivityAt: new Date().toISOString()
            }).subscribe();
          }
        }),
        catchError(() => {
          const fallbackAct: SalesActivity = {
            id: 'act-' + Date.now().toString(36),
            clientId: payload.clientId || '',
            clientName: payload.clientName || '',
            opportunityId: payload.opportunityId,
            opportunityTitle: payload.opportunityTitle,
            type: payload.type || 'CALL',
            title: payload.title || 'Follow-up Activity',
            description: payload.description || '',
            dueAt: payload.dueAt || new Date().toISOString(),
            status: 'PENDING',
            assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
            assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
            createdAt: new Date().toISOString()
          };
          const current = this.activitiesSubject.getValue();
          const updated = [fallbackAct, ...current];
          this.activitiesSubject.next(updated);
          this.persist(STORAGE_KEYS.ACTIVITIES, updated);
          return of(fallbackAct);
        })
      );
    }

    const localAct: SalesActivity = {
      id: 'act-' + Date.now().toString(36),
      clientId: payload.clientId || '',
      clientName: payload.clientName || '',
      opportunityId: payload.opportunityId,
      opportunityTitle: payload.opportunityTitle,
      type: payload.type || 'CALL',
      title: payload.title || 'Follow-up Activity',
      description: payload.description || '',
      dueAt: payload.dueAt || new Date().toISOString(),
      status: 'PENDING',
      assignedTo: payload.assignedTo || (user ? user.id : 'u3'),
      assignedToName: payload.assignedToName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
      createdAt: new Date().toISOString()
    };
    const current = this.activitiesSubject.getValue();
    const updated = [localAct, ...current];
    this.activitiesSubject.next(updated);
    this.persist(STORAGE_KEYS.ACTIVITIES, updated);
    return of(localAct);
  }

  completeActivity(id: string, outcome?: string): Observable<SalesActivity> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/sales/activities/${id}/complete`, { outcome }).pipe(
        map(res => mapBackendActivity(res)),
        tap(completedAct => {
          const current = this.activitiesSubject.getValue();
          const index = current.findIndex(a => a.id === id);
          if (index !== -1) {
            const updatedList = [...current];
            updatedList[index] = completedAct;
            this.activitiesSubject.next(updatedList);
            this.persist(STORAGE_KEYS.ACTIVITIES, updatedList);
          }
        }),
        catchError(() => this.applyLocalCompleteActivity(id, outcome))
      );
    }

    return this.applyLocalCompleteActivity(id, outcome);
  }

  private applyLocalCompleteActivity(id: string, outcome?: string): Observable<SalesActivity> {
    const current = this.activitiesSubject.getValue();
    const index = current.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Activity ${id} not found`);

    const updatedAct: SalesActivity = {
      ...current[index],
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      outcome: outcome || 'Completed successfully'
    };

    const updatedList = [...current];
    updatedList[index] = updatedAct;
    this.activitiesSubject.next(updatedList);
    this.persist(STORAGE_KEYS.ACTIVITIES, updatedList);

    if (updatedAct.clientId) {
      this.updateClient(updatedAct.clientId, {
        lastActivityAt: new Date().toISOString()
      }).subscribe();
    }

    return of(updatedAct);
  }

  rescheduleActivity(id: string, newDueAt: string): Observable<SalesActivity> {
    const current = this.activitiesSubject.getValue();
    const index = current.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Activity ${id} not found`);

    const updatedAct: SalesActivity = {
      ...current[index],
      status: 'PENDING',
      dueAt: newDueAt
    };

    const updatedList = [...current];
    updatedList[index] = updatedAct;
    this.activitiesSubject.next(updatedList);
    this.persist(STORAGE_KEYS.ACTIVITIES, updatedList);

    if (updatedAct.clientId) {
      this.updateClient(updatedAct.clientId, {
        nextFollowUpAt: newDueAt
      }).subscribe();
    }

    return of(updatedAct);
  }

  // --------------------------------------------------------------
  // SALES MEETINGS & VISITS
  // --------------------------------------------------------------
  getSalesMeetings(): Observable<SalesMeeting[]> {
    return this.meetings$;
  }

  scheduleMeeting(payload: Partial<SalesMeeting>): Observable<SalesMeeting> {
    const user = this.auth.currentUser();

    const startTimeISO = payload.date && payload.startTime
      ? `${payload.date}T${payload.startTime}:00Z`
      : new Date().toISOString();
    const endTimeISO = payload.date && payload.endTime
      ? `${payload.date}T${payload.endTime}:00Z`
      : new Date(Date.now() + 3600000).toISOString();

    const backendPayload = {
      client_id: payload.clientId,
      opportunity_id: payload.opportunityId || null,
      title: payload.title || 'Sales Discussion',
      type: payload.type || 'DISCOVERY_CALL',
      start_time: startTimeISO,
      end_time: endTimeISO,
      organizer_id: payload.organizerId || (user ? user.id : null),
      internal_participants: payload.internalParticipants || [user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'],
      client_participants: payload.clientParticipants || [],
      location: payload.location || '',
      meeting_url: payload.meetingUrl || '',
      agenda: payload.agenda || '',
      notes: payload.notes || '',
      visit_address: payload.visitAddress || '',
      visit_purpose: payload.visitPurpose || '',
      expected_arrival_time: payload.expectedArrivalTime || ''
    };

    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/sales/meetings`, backendPayload).pipe(
        map(res => mapBackendMeeting(res)),
        tap(newMeeting => {
          const current = this.meetingsSubject.getValue();
          const updated = [newMeeting, ...current.filter(m => m.id !== newMeeting.id)];
          this.meetingsSubject.next(updated);
          this.persist(STORAGE_KEYS.MEETINGS, updated);

          if (newMeeting.opportunityId) {
            this.updateOpportunity(newMeeting.opportunityId, {
              nextMeetingAt: startTimeISO,
              nextMeetingType: newMeeting.type,
              nextAction: `${newMeeting.type.replace(/_/g, ' ')}: ${newMeeting.title}`
            }).subscribe();
          }
        }),
        catchError(() => this.applyLocalScheduleMeeting(payload))
      );
    }

    return this.applyLocalScheduleMeeting(payload);
  }

  private applyLocalScheduleMeeting(payload: Partial<SalesMeeting>): Observable<SalesMeeting> {
    const user = this.auth.currentUser();
    const newMeeting: SalesMeeting = {
      id: 'sm-' + Date.now().toString(36),
      title: payload.title || 'Sales Discussion',
      clientId: payload.clientId || '',
      clientName: payload.clientName || '',
      opportunityId: payload.opportunityId,
      opportunityTitle: payload.opportunityTitle,
      type: payload.type || 'DISCOVERY_CALL',
      status: 'SCHEDULED',
      date: payload.date || new Date().toISOString().split('T')[0],
      startTime: payload.startTime || '11:00',
      endTime: payload.endTime || '12:00',
      timezone: payload.timezone || 'Asia/Kolkata (IST)',
      organizerId: payload.organizerId || (user ? user.id : 'u3'),
      organizerName: payload.organizerName || (user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'),
      internalParticipants: payload.internalParticipants || [user ? `${user.firstName} ${user.lastName}` : 'Arjun Patel'],
      clientParticipants: payload.clientParticipants || [],
      location: payload.location,
      meetingUrl: payload.meetingUrl,
      visitAddress: payload.visitAddress,
      visitPurpose: payload.visitPurpose,
      expectedArrivalTime: payload.expectedArrivalTime,
      agenda: payload.agenda || '',
      reminderMinutes: payload.reminderMinutes || 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const current = this.meetingsSubject.getValue();
    const updated = [newMeeting, ...current];
    this.meetingsSubject.next(updated);
    this.persist(STORAGE_KEYS.MEETINGS, updated);
    return of(newMeeting);
  }

  completeMeeting(id: string, minutes: SalesMeetingMinutes): Observable<SalesMeeting> {
    if (environment.useBackendApi) {
      const payload = {
        discussion_summary: minutes.discussionSummary,
        requirements_identified: minutes.requirementsIdentified,
        concerns_or_objections: minutes.concernsOrObjections || '',
        agreed_decisions: minutes.agreedDecisions,
        next_action: minutes.nextAction,
        action_owner: minutes.actionOwner,
        action_due_date: minutes.actionDueDate || null,
        next_follow_up_at: minutes.nextFollowUpAt || null
      };

      return this.http.patch<any>(`${environment.apiUrl}/sales/meetings/${id}/minutes`, payload).pipe(
        map(res => mapBackendMeeting(res)),
        tap(savedMeeting => {
          const current = this.meetingsSubject.getValue();
          const index = current.findIndex(m => m.id === id);
          if (index !== -1) {
            const updatedList = [...current];
            updatedList[index] = savedMeeting;
            this.meetingsSubject.next(updatedList);
            this.persist(STORAGE_KEYS.MEETINGS, updatedList);
          }
          if (savedMeeting.opportunityId && minutes.nextAction) {
            this.updateOpportunity(savedMeeting.opportunityId, {
              nextAction: minutes.nextAction,
              nextFollowUpAt: minutes.nextFollowUpAt,
              requirementSummary: minutes.requirementsIdentified || savedMeeting.opportunityTitle
            }).subscribe();
          }
        }),
        catchError(() => this.applyLocalCompleteMeeting(id, minutes))
      );
    }

    return this.applyLocalCompleteMeeting(id, minutes);
  }

  private applyLocalCompleteMeeting(id: string, minutes: SalesMeetingMinutes): Observable<SalesMeeting> {
    const current = this.meetingsSubject.getValue();
    const index = current.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Meeting ${id} not found`);

    const updatedMeeting: SalesMeeting = {
      ...current[index],
      status: 'COMPLETED',
      minutes: minutes,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...current];
    updatedList[index] = updatedMeeting;
    this.meetingsSubject.next(updatedList);
    this.persist(STORAGE_KEYS.MEETINGS, updatedList);

    if (updatedMeeting.opportunityId && minutes.nextAction) {
      this.updateOpportunity(updatedMeeting.opportunityId, {
        nextAction: minutes.nextAction,
        nextFollowUpAt: minutes.nextFollowUpAt,
        requirementSummary: minutes.requirementsIdentified || current[index].opportunityTitle
      }).subscribe();
    }

    return of(updatedMeeting);
  }

  cancelMeeting(id: string): Observable<SalesMeeting> {
    const current = this.meetingsSubject.getValue();
    const index = current.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Meeting ${id} not found`);

    const updatedMeeting: SalesMeeting = {
      ...current[index],
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...current];
    updatedList[index] = updatedMeeting;
    this.meetingsSubject.next(updatedList);
    this.persist(STORAGE_KEYS.MEETINGS, updatedList);

    return of(updatedMeeting);
  }

  // --------------------------------------------------------------
  // CONVERT TO PROJECT (Closed-Won Handover)
  // --------------------------------------------------------------
  convertToProject(payload: ProjectHandoverPayload): Observable<any> {
    if (environment.useBackendApi) {
      const backendPayload = {
        opportunity_id: payload.opportunityId,
        client_id: payload.clientId,
        project_name: payload.projectName,
        project_code: payload.projectCode,
        description: payload.description,
        approved_scope: payload.approvedScope,
        final_agreed_value: payload.finalAgreedValue,
        manager_id: payload.managerId,
        team_id: payload.teamId || null,
        start_date: payload.startDate,
        target_date: payload.targetDate,
        priority: payload.priority,
        handover_notes: payload.handoverNotes
      };

      return this.http.post<any>(`${environment.apiUrl}/sales/opportunities/${payload.opportunityId}/convert`, backendPayload).pipe(
        tap(res => {
          this.syncFromBackend();
          this.projectService.refreshProjects();
        }),
        catchError(() => this.applyLocalConvertToProject(payload))
      );
    }

    return this.applyLocalConvertToProject(payload);
  }

  private applyLocalConvertToProject(payload: ProjectHandoverPayload): Observable<any> {
    const opp = this.opportunitiesSubject.getValue().find(o => o.id === payload.opportunityId);
    if (!opp) throw new Error(`Opportunity ${payload.opportunityId} not found`);

    return this.projectService.createProject({
      name: payload.projectName,
      code: payload.projectCode,
      description: `${payload.description}\n\n[Sales Handover Notes]:\n${payload.handoverNotes}`,
      type: 'Client Project',
      clientOrDepartment: payload.clientId ? (opp.clientName) : 'Sales Client',
      managerId: payload.managerId,
      teamId: payload.teamId,
      priority: payload.priority,
      stage: 'APPROVED',
      startDate: payload.startDate,
      targetDate: payload.targetDate,
      estimatedBudget: payload.finalAgreedValue
    }).pipe(
      tap(createdProject => {
        this.updateOpportunity(payload.opportunityId, {
          stage: 'CLOSED_WON',
          isConvertedToProject: true,
          convertedProjectId: createdProject.id,
          convertedAt: new Date().toISOString(),
          proposalStatus: 'ACCEPTED',
          estimatedValue: payload.finalAgreedValue
        }).subscribe();

        this.createActivity({
          clientId: payload.clientId,
          clientName: opp.clientName,
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          type: 'NOTE',
          title: `Deal Handover: Converted to Project [${createdProject.code}] ${createdProject.name}`,
          description: `Handover approved at ₹${payload.finalAgreedValue.toLocaleString('en-IN')}. Target completion: ${payload.targetDate}.`,
          dueAt: new Date().toISOString()
        }).subscribe(act => this.completeActivity(act.id, 'Project created in Project Pipeline'));
      })
    );
  }

  // --------------------------------------------------------------
  // DASHBOARD METRICS CALCULATION
  // --------------------------------------------------------------
  getDashboardMetrics(): Observable<SalesDashboardMetrics> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/sales/dashboard`).pipe(
        map(res => ({
          totalAssignedLeads: res.total_assigned_leads ?? res.totalAssignedLeads ?? 0,
          newLeads: res.new_leads ?? res.newLeads ?? 0,
          followUpsDueToday: res.follow_ups_due_today ?? res.followUpsDueToday ?? 0,
          overdueFollowUps: res.overdue_follow_ups ?? res.overdueFollowUps ?? 0,
          meetingsScheduled: res.meetings_scheduled ?? res.meetingsScheduled ?? 0,
          activeOpportunities: res.active_opportunities ?? res.activeOpportunities ?? 0,
          dealsWonThisMonth: res.deals_won_this_month ?? res.dealsWonThisMonth ?? 0,
          totalPipelineValue: res.total_pipeline_value ?? res.totalPipelineValue ?? 0,
          wonValueThisMonth: res.won_value_this_month ?? res.wonValueThisMonth ?? 0
        })),
        catchError(() => of(this.calculateMetrics()))
      );
    }
    return of(this.calculateMetrics());
  }

  private calculateMetrics(): SalesDashboardMetrics {
    const clients = this.clientsSubject.getValue();
    const opportunities = this.opportunitiesSubject.getValue();
    const activities = this.activitiesSubject.getValue();
    const meetings = this.meetingsSubject.getValue();

    const todayStr = new Date().toISOString().split('T')[0];
    const now = Date.now();

    const totalLeads = clients.length;
    const newLeads = opportunities.filter(o => o.stage === 'NEW_LEAD').length;

    const followUpsToday = activities.filter(a => {
      if (a.status !== 'PENDING') return false;
      return a.dueAt.startsWith(todayStr);
    }).length;

    const overdueFollowUps = activities.filter(a => {
      if (a.status !== 'PENDING' && a.status !== 'OVERDUE') return false;
      const due = new Date(a.dueAt).getTime();
      return due < now && !a.dueAt.startsWith(todayStr);
    }).length;

    const meetingsScheduled = meetings.filter(m => m.status === 'SCHEDULED').length;
    const activeOpps = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage));
    const activeOppsCount = activeOpps.length;
    const pipelineValue = activeOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

    const wonOpps = opportunities.filter(o => o.stage === 'CLOSED_WON');
    const wonCount = wonOpps.length;
    const wonValue = wonOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

    return {
      totalAssignedLeads: totalLeads,
      newLeads: newLeads,
      followUpsDueToday: followUpsToday,
      overdueFollowUps: overdueFollowUps,
      meetingsScheduled: meetingsScheduled,
      activeOpportunities: activeOppsCount,
      dealsWonThisMonth: wonCount,
      totalPipelineValue: pipelineValue,
      wonValueThisMonth: wonValue
    };
  }
}
