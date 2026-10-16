// ================================================================
// CRESENIX SOLUTIONS — Sales CRM TypeScript Models
// ================================================================

export type ClientType = 'COMPANY' | 'INDIVIDUAL';

export type ClientStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'INACTIVE';

export type LeadSource =
  | 'WEBSITE_ENQUIRY'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'REFERRAL'
  | 'COLD_CALLING'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'ADVERTISEMENT'
  | 'EXISTING_CLIENT'
  | 'WALK_IN'
  | 'OTHER';

export type SalesPipelineStage =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'DISCOVERY_SCHEDULED'
  | 'DISCOVERY_COMPLETED'
  | 'PROPOSAL_QUOTATION'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type OpportunityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ServiceCategory =
  | 'Website Development'
  | 'Web Application Development'
  | 'Android / iOS Application Development'
  | 'Custom Software Development'
  | 'ERP Development'
  | 'CRM Development'
  | 'Learning Management System'
  | 'AI Solutions'
  | 'Business Automation'
  | 'Digital Marketing / Ads Management'
  | 'Maintenance and Support'
  | 'Other / Custom Requirement';

export type BudgetConfirmation = 'CONFIRMED' | 'APPROXIMATE' | 'NOT_DISCUSSED';

export type ExistingSystemStatus = 'YES' | 'NO' | 'NOT_SURE';

export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MESSAGE'
  | 'MEETING'
  | 'CLIENT_VISIT'
  | 'OFFICE_VISIT'
  | 'PROPOSAL_FOLLOWUP'
  | 'GENERAL_FOLLOWUP'
  | 'NOTE';

export type ActivityStatus = 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';

export type SalesMeetingType =
  | 'DISCOVERY_CALL'
  | 'REQUIREMENT_GATHERING'
  | 'PRODUCT_DEMO'
  | 'TECHNICAL_DISCUSSION'
  | 'PROPOSAL_PRESENTATION'
  | 'NEGOTIATION'
  | 'CLIENT_OFFICE_VISIT'
  | 'CRESENIX_OFFICE_VISIT'
  | 'FOLLOWUP_MEETING'
  | 'OTHER';

export type SalesMeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';

export type ProposalStatus = 'NOT_STARTED' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

// ----------------------------------------------------------------
// CLIENT MODEL
// ----------------------------------------------------------------
export interface Client {
  id: string;
  clientType: ClientType;
  companyName: string;
  contactPerson: string;
  designation?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  industry?: string;
  city: string;
  address?: string;

  leadSource: LeadSource;
  sourceDetails?: string;
  status: ClientStatus;

  assignedTo: string;
  assignedToName: string;
  assignedToAvatar?: string;

  // Requirement highlights
  serviceRequirements: string[];
  businessProblem?: string;
  detailedRequirements?: string;
  hasExistingSystem?: ExistingSystemStatus;
  referenceUrl?: string;
  preferredTimeline?: string;
  estimatedBudgetRange?: string;
  budgetConfirmation?: BudgetConfirmation;

  // Activity & follow-up tracking
  nextFollowUpAt?: string;
  lastActivityAt?: string;
  opportunitiesCount?: number;
  totalValue?: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------
// SALES OPPORTUNITY MODEL
// ----------------------------------------------------------------
export interface SalesOpportunity {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientType?: ClientType;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;

  serviceType: string;
  requestedServices: string[];
  leadSource: LeadSource;
  stage: SalesPipelineStage;
  stageDays: number;
  stageUpdatedAt?: string;

  estimatedValue: number;
  priority: OpportunityPriority;

  assignedTo: string;
  assignedToName: string;
  assignedToAvatar?: string;

  expectedCloseDate: string;
  decisionMaker?: string;
  decisionMakerRole?: string;
  budgetStatus: string;
  requirementSummary?: string;

  nextAction: string;
  nextFollowUpAt?: string;
  nextMeetingAt?: string;
  nextMeetingType?: SalesMeetingType;

  proposalStatus: ProposalStatus;
  proposalValue?: number;
  proposalSentAt?: string;

  lostReason?: string;
  lostNotes?: string;

  isConvertedToProject: boolean;
  convertedProjectId?: string;
  convertedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------
// STAGE HISTORY ENTRY
// ----------------------------------------------------------------
export interface StageHistoryEntry {
  id: string;
  opportunityId: string;
  fromStage?: SalesPipelineStage;
  toStage: SalesPipelineStage;
  changedBy: string;
  changedByName: string;
  notes?: string;
  timestamp: string;
}

// ----------------------------------------------------------------
// SALES ACTIVITY / FOLLOW-UP MODEL
// ----------------------------------------------------------------
export interface SalesActivity {
  id: string;
  clientId: string;
  clientName: string;
  opportunityId?: string;
  opportunityTitle?: string;
  type: ActivityType;
  title: string;
  description?: string;
  dueAt: string;
  completedAt?: string;
  status: ActivityStatus;
  outcome?: string;
  assignedTo: string;
  assignedToName: string;
  createdAt: string;
}

// ----------------------------------------------------------------
// SALES MEETING & MINUTES MODEL
// ----------------------------------------------------------------
export interface SalesMeetingMinutes {
  discussionSummary: string;
  requirementsIdentified: string;
  concernsOrObjections?: string;
  agreedDecisions: string;
  nextAction: string;
  actionOwner: string;
  actionDueDate?: string;
  nextFollowUpAt?: string;
}

export interface SalesMeeting {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  opportunityId?: string;
  opportunityTitle?: string;
  type: SalesMeetingType;
  status: SalesMeetingStatus;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  organizerId: string;
  organizerName: string;
  internalParticipants: string[];
  clientParticipants: string[];
  location?: string;
  meetingUrl?: string;
  agenda?: string;
  notes?: string;
  reminderMinutes?: number;

  // Office visit specifics
  visitAddress?: string;
  visitPurpose?: string;
  expectedArrivalTime?: string;

  // Minutes / Outcome
  minutes?: SalesMeetingMinutes;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------
// PROJECT HANDOVER PAYLOAD (Closed Won Conversion)
// ----------------------------------------------------------------
export interface ProjectHandoverPayload {
  opportunityId: string;
  clientId: string;
  projectName: string;
  projectCode: string;
  description: string;
  approvedScope: string;
  finalAgreedValue: number;
  managerId: string;
  teamId?: string;
  startDate: string;
  targetDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  handoverNotes: string;
}

// ----------------------------------------------------------------
// SALES DASHBOARD DATA MODEL
// ----------------------------------------------------------------
export interface SalesDashboardMetrics {
  totalAssignedLeads: number;
  newLeads: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  meetingsScheduled: number;
  activeOpportunities: number;
  dealsWonThisMonth: number;
  totalPipelineValue: number;
  wonValueThisMonth: number;
}
