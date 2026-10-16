// ================================================================
// CRESENIX SOLUTIONS — Shared TypeScript Models
// ================================================================

// ----------------------------------------------------------------
// USER & AUTH MODELS
// ----------------------------------------------------------------
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'SALES';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  designation?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  token: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

// ----------------------------------------------------------------
// TASK MODELS
// ----------------------------------------------------------------
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  reviewRequestedAt?: string;
  parentTaskId?: string;
  dependencies?: string[];
  checklist?: ChecklistItem[];
  tags?: string[];
  attachments?: Attachment[];
  commentsCount?: number;
  assignees?: { userId: string; name: string; avatar?: string; role: string }[];
  isBlocked?: boolean;
  blockedReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  predecessorId: string;
  predecessorTitle: string;
  dependentId: string;
  dependentTitle: string;
  status: 'BLOCKING' | 'RESOLVED';
  blockingReason?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  parentTaskId?: string;
  dependencies?: string[];
  checklist?: Omit<ChecklistItem, 'id'>[];
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  note?: string;
}

// ----------------------------------------------------------------
// PROJECT MODELS
// ----------------------------------------------------------------
export type ProjectStage = 'PROPOSED' | 'APPROVED' | 'PLANNING' | 'IN_PROGRESS' | 'TESTING' | 'CLIENT_REVIEW' | 'DELIVERED' | 'ON_HOLD' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  clientOrDepartment?: string;
  managerId: string;
  managerName?: string;
  teamId?: string;
  teamName?: string;
  priority: ProjectPriority;
  stage: ProjectStage;
  startDate: string;
  targetDate: string;
  estimatedBudget?: number;
  progress: number;
  openTaskCount: number;
  totalTaskCount: number;
  hasRisk: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  memberCount?: number;
  milestoneCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  designation?: string;
  role: 'MANAGER' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  dueDate: string;
  originalDueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'OVERDUE';
  scheduleCondition?: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'COMPLETED';
  completionRule?: 'ALL_TASKS_DONE' | 'MANUAL_CONFIRMATION';
  requiresApproval?: boolean;
  readyForVerification?: boolean;
  totalTasks?: number;
  completedTasks?: number;
  blockedTasks?: number;
  progressPercent?: number;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface CreateMilestonePayload {
  project_id: string;
  name: string;
  description?: string;
  due_date: string;
  completion_rule?: string;
  requires_approval?: boolean;
  owner_id?: string;
}


export interface ProjectRisk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ownerId: string;
  ownerName?: string;
  mitigationPlan?: string;
  resolutionDate?: string;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED';
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  code?: string;
  description?: string;
  type?: string;
  clientOrDepartment?: string;
  managerId: string;
  teamId?: string;
  priority: ProjectPriority;
  stage: ProjectStage;
  startDate: string;
  targetDate: string;
  estimatedBudget?: number;
}

// ----------------------------------------------------------------
// MEETING MODELS
// ----------------------------------------------------------------
export type MeetingType = 'STANDUP' | 'PLANNING' | 'REVIEW' | 'RETROSPECTIVE' | 'CLIENT_CALL' | 'ONE_ON_ONE' | 'GENERAL';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  type: MeetingType;
  status: MeetingStatus;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  organizerId: string;
  organizerName?: string;
  participants: MeetingParticipant[];
  agenda?: string;
  meetingUrl?: string;
  location?: string;
  reminder?: number;
  hasMinutes: boolean;
  actionItemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  designation?: string;
  status: 'ACCEPTED' | 'DECLINED' | 'PENDING' | 'TENTATIVE';
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  summary?: string;
  decisions?: string;
  discussionPoints?: string;
  openQuestions?: string;
  recordedBy?: string;
  recordedByName?: string;
  canEdit?: boolean;
  actionItems: MeetingActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  description: string;
  assigneeId: string;
  assigneeName?: string;
  dueDate: string;
  priority: TaskPriority;
  projectId?: string;
  projectName?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  convertedTaskId?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  projectId?: string;
  type: MeetingType;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  organizerId: string;
  participantIds: string[];
  agenda?: string;
  meetingUrl?: string;
  location?: string;
  reminder?: number;
}

// ----------------------------------------------------------------
// EMPLOYEE & TEAM MODELS
// ----------------------------------------------------------------
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation?: string;
  department?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  activeTaskCount: number;
  completedTaskCount?: number;
  onTimeDeliveryRate?: number;
  assignedProjectIds?: string[];
  assignedProjectNames?: string[];
  teamId?: string;
  teamName?: string;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  leadId: string;
  leadName?: string;
  memberCount: number;
  projectCount: number;
  members?: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  designation?: string;
  role: 'LEAD' | 'MEMBER';
  activeTaskCount: number;
}

// ----------------------------------------------------------------
// NOTIFICATION MODEL
// ----------------------------------------------------------------
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT'
  | 'TASK_BLOCKED'
  | 'PROJECT_STAGE_CHANGED'
  | 'MEETING_INVITED'
  | 'MEETING_REMINDER'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'
  | 'MILESTONE_DUE'
  | 'ACTION_ITEM_ASSIGNED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: 'TASK' | 'PROJECT' | 'MEETING' | 'MILESTONE';
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------
// DASHBOARD MODELS
// ----------------------------------------------------------------
export interface SuperAdminDashboard {
  kpis: DashboardKpi[];
  projectPipeline: ProjectPipelineSummary[];
  teamWorkload: TeamWorkloadItem[];
  upcomingMeetings: Meeting[];
  overdueTask: Task[];
  recentActivity: ActivityItem[];
  upcomingMilestones: Milestone[];
}

export interface AdminDashboard {
  kpis: DashboardKpi[];
  myProjects: Project[];
  teamTasks: Task[];
  overdueTask: Task[];
  tasksAwaitingReview: Task[];
  upcomingMeetings: Meeting[];
  recentActivity: ActivityItem[];
  teamWorkload?: TeamWorkloadItem[];
}

export interface EmployeeDashboard {
  kpis: DashboardKpi[];
  myTasks: Task[];
  dueTodayTasks: Task[];
  upcomingMeetings: Meeting[];
  notifications: Notification[];
  recentProjectUpdates: ActivityItem[];
  assignedActionItems: MeetingActionItem[];
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: number;
  trendUp?: boolean;
  route?: string;
}

export interface ProjectPipelineSummary {
  stage: ProjectStage;
  count: number;
  projects: Pick<Project, 'id' | 'name' | 'code' | 'priority' | 'progress' | 'hasRisk'>[];
}

export interface TeamWorkloadItem {
  userId: string;
  userName: string;
  userAvatar?: string;
  designation?: string;
  taskCount: number;
  completedCount: number;
  overdueCount: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  targetType: 'TASK' | 'PROJECT' | 'MEETING' | 'MILESTONE';
  targetId: string;
  timestamp: string;
}

// ----------------------------------------------------------------
// API RESPONSE MODELS
// ----------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface TaskFilters extends PaginationParams {
  projectId?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
  teamId?: string;
  search?: string;
}

export interface ProjectFilters extends PaginationParams {
  stage?: ProjectStage;
  managerId?: string;
  teamId?: string;
  priority?: ProjectPriority;
  search?: string;
}

export interface MeetingFilters extends PaginationParams {
  type?: MeetingType;
  status?: MeetingStatus;
  projectId?: string;
  organizerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ----------------------------------------------------------------
// ATTACHMENT MODEL
// ----------------------------------------------------------------
export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ----------------------------------------------------------------
// SALES CRM MODELS
// ----------------------------------------------------------------
export * from './sales.models';
