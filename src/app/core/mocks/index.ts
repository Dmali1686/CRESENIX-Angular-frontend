// ================================================================
// CRESENIX SOLUTIONS — Mock Data
// All mock data is isolated here; replace with real API calls later
// ================================================================

import {
  User, AuthUser, Task, Project, Meeting, Employee, Team,
  Notification, SuperAdminDashboard, AdminDashboard, EmployeeDashboard,
  DashboardKpi, ActivityItem, Milestone, TeamWorkloadItem,
  MeetingMinutes, MeetingActionItem
} from '../../shared/models/index';

// ----------------------------------------------------------------
// USERS
// ----------------------------------------------------------------
export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'superadmin@cresenix.com', firstName: 'Rahul', lastName: 'Sharma', role: 'SUPER_ADMIN', designation: 'CEO', department: 'Management', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'u2', email: 'admin@cresenix.com', firstName: 'Priya', lastName: 'Mehta', role: 'ADMIN', designation: 'Project Manager', department: 'Operations', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'u3', email: 'arjun@cresenix.com', firstName: 'Arjun', lastName: 'Patel', role: 'SALES', designation: 'Senior Sales Executive', department: 'Sales', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'u4', email: 'kavita@cresenix.com', firstName: 'Kavita', lastName: 'Nair', role: 'EMPLOYEE', designation: 'UI/UX Designer', department: 'Design', isActive: true, createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
  { id: 'u5', email: 'ravi@cresenix.com', firstName: 'Ravi', lastName: 'Kumar', role: 'EMPLOYEE', designation: 'QA Engineer', department: 'Quality', isActive: true, createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
  { id: 'u6', email: 'sneha@cresenix.com', firstName: 'Sneha', lastName: 'Joshi', role: 'EMPLOYEE', designation: 'Backend Developer', department: 'Engineering', isActive: true, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { id: 'u7', email: 'admin2@cresenix.com', firstName: 'Vikram', lastName: 'Singh', role: 'ADMIN', designation: 'Engineering Lead', department: 'Engineering', isActive: true, createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
];

export const MOCK_CURRENT_USER: AuthUser = {
  ...MOCK_USERS[0],
  token: 'mock-jwt-token-super-admin',
  permissions: ['*']
};

// ----------------------------------------------------------------
// EMPLOYEES
// ----------------------------------------------------------------
export const MOCK_EMPLOYEES: Employee[] = MOCK_USERS.map(u => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  designation: u.designation,
  department: u.department,
  role: u.role,
  isActive: u.isActive,
  activeTaskCount: Math.floor(Math.random() * 10) + 1,
  assignedProjectIds: ['p1', 'p2'],
  assignedProjectNames: ['EmpFlow Pro', 'CRM Upgrade'],
  joinedAt: u.createdAt
}));

// ----------------------------------------------------------------
// TEAMS
// ----------------------------------------------------------------
export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'Engineering', description: 'Frontend and backend developers', leadId: 'u7', leadName: 'Vikram Singh', memberCount: 4, projectCount: 3, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't2', name: 'Design', description: 'UI/UX design team', leadId: 'u4', leadName: 'Kavita Nair', memberCount: 2, projectCount: 2, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't3', name: 'Quality Assurance', description: 'Testing and quality control', leadId: 'u5', leadName: 'Ravi Kumar', memberCount: 2, projectCount: 3, createdAt: '2024-02-01T00:00:00Z' },
];

// ----------------------------------------------------------------
// PROJECTS
// ----------------------------------------------------------------
export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'EmpFlow Pro', code: 'EFP-001', description: 'Employee management system redesign and modernization', type: 'Internal', clientOrDepartment: 'HR', managerId: 'u2', managerName: 'Priya Mehta', teamId: 't1', teamName: 'Engineering', priority: 'HIGH', stage: 'IN_PROGRESS', startDate: '2026-08-01', targetDate: '2026-12-31', progress: 65, openTaskCount: 12, totalTaskCount: 28, hasRisk: false, memberCount: 5, milestoneCount: 4, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'p2', name: 'CRM Upgrade', code: 'CRM-002', description: 'Customer relationship management system upgrade', type: 'Client', clientOrDepartment: 'Sales', managerId: 'u2', managerName: 'Priya Mehta', teamId: 't1', teamName: 'Engineering', priority: 'CRITICAL', stage: 'TESTING', startDate: '2026-06-01', targetDate: '2026-11-15', progress: 82, openTaskCount: 5, totalTaskCount: 35, hasRisk: true, riskLevel: 'MEDIUM', memberCount: 6, milestoneCount: 5, createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z' },
  { id: 'p3', name: 'Mobile App v2', code: 'MOB-003', description: 'Second version of the mobile application with new features', type: 'Internal', clientOrDepartment: 'Product', managerId: 'u7', managerName: 'Vikram Singh', teamId: 't1', teamName: 'Engineering', priority: 'MEDIUM', stage: 'PLANNING', startDate: '2026-10-01', targetDate: '2027-03-31', progress: 15, openTaskCount: 20, totalTaskCount: 22, hasRisk: false, memberCount: 4, milestoneCount: 6, createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'p4', name: 'Analytics Dashboard', code: 'ANA-004', description: 'Business intelligence and analytics dashboard', type: 'Internal', clientOrDepartment: 'Management', managerId: 'u2', managerName: 'Priya Mehta', priority: 'HIGH', stage: 'APPROVED', startDate: '2026-11-01', targetDate: '2027-02-28', progress: 5, openTaskCount: 2, totalTaskCount: 2, hasRisk: false, memberCount: 3, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' },
  { id: 'p5', name: 'API Integration Hub', code: 'API-005', description: 'Central hub for third-party API integrations', type: 'Internal', clientOrDepartment: 'Engineering', managerId: 'u7', managerName: 'Vikram Singh', teamId: 't1', teamName: 'Engineering', priority: 'MEDIUM', stage: 'CLIENT_REVIEW', startDate: '2026-05-01', targetDate: '2026-10-31', progress: 92, openTaskCount: 2, totalTaskCount: 25, hasRisk: true, riskLevel: 'LOW', memberCount: 3, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' },
  { id: 'p6', name: 'Security Audit 2026', code: 'SEC-006', description: 'Annual security audit and compliance review', type: 'Internal', clientOrDepartment: 'IT', managerId: 'u2', managerName: 'Priya Mehta', priority: 'CRITICAL', stage: 'PROPOSED', startDate: '2026-11-15', targetDate: '2026-12-15', progress: 0, openTaskCount: 0, totalTaskCount: 0, hasRisk: false, memberCount: 0, createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
];

// ----------------------------------------------------------------
// TASKS
// ----------------------------------------------------------------
export const MOCK_TASKS: Task[] = [
  { id: 'task1', title: 'Design new login screen mockup', description: 'Create high-fidelity mockup for the new login experience', projectId: 'p1', projectName: 'EmpFlow Pro', projectCode: 'EFP-001', assigneeId: 'u4', assigneeName: 'Kavita Nair', status: 'IN_PROGRESS', priority: 'HIGH', startDate: '2026-10-08', dueDate: '2026-10-15', estimatedHours: 16, commentsCount: 3, checklist: [{ id: 'c1', text: 'Create wireframe', completed: true }, { id: 'c2', text: 'Design high-fidelity screens', completed: false }, { id: 'c3', text: 'Get stakeholder approval', completed: false }], createdBy: 'u2', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z' },
  { id: 'task2', title: 'Implement JWT authentication', description: 'Set up JWT token-based authentication with refresh tokens', projectId: 'p1', projectName: 'EmpFlow Pro', projectCode: 'EFP-001', assigneeId: 'u3', assigneeName: 'Arjun Patel', status: 'DONE', priority: 'CRITICAL', startDate: '2026-09-20', dueDate: '2026-10-01', estimatedHours: 24, actualHours: 22, completedAt: '2026-09-30T00:00:00Z', commentsCount: 8, createdBy: 'u2', createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' },
  { id: 'task3', title: 'Write API documentation for user endpoints', description: 'Create comprehensive OpenAPI documentation', projectId: 'p1', projectName: 'EmpFlow Pro', projectCode: 'EFP-001', assigneeId: 'u3', assigneeName: 'Arjun Patel', status: 'TODO', priority: 'MEDIUM', startDate: '2026-10-13', dueDate: '2026-10-20', estimatedHours: 8, commentsCount: 0, createdBy: 'u2', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'task4', title: 'Fix critical CRM data sync bug', description: 'Data is not syncing properly between CRM and backend', projectId: 'p2', projectName: 'CRM Upgrade', projectCode: 'CRM-002', assigneeId: 'u6', assigneeName: 'Sneha Joshi', status: 'BLOCKED', priority: 'CRITICAL', startDate: '2026-10-05', dueDate: '2026-10-12', estimatedHours: 12, commentsCount: 5, createdBy: 'u2', createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z' },
  { id: 'task5', title: 'UAT testing for CRM module 3', description: 'User acceptance testing for the third module', projectId: 'p2', projectName: 'CRM Upgrade', projectCode: 'CRM-002', assigneeId: 'u5', assigneeName: 'Ravi Kumar', status: 'IN_REVIEW', priority: 'HIGH', startDate: '2026-10-07', dueDate: '2026-10-16', estimatedHours: 20, commentsCount: 2, createdBy: 'u7', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' },
  { id: 'task6', title: 'Mobile app architecture planning', description: 'Define the architecture for the mobile app v2', projectId: 'p3', projectName: 'Mobile App v2', projectCode: 'MOB-003', assigneeId: 'u3', assigneeName: 'Arjun Patel', status: 'IN_PROGRESS', priority: 'HIGH', startDate: '2026-10-01', dueDate: '2026-10-18', estimatedHours: 32, commentsCount: 4, createdBy: 'u7', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'task7', title: 'Dashboard UI wireframes', description: 'Create wireframes for the analytics dashboard', projectId: 'p4', projectName: 'Analytics Dashboard', projectCode: 'ANA-004', assigneeId: 'u4', assigneeName: 'Kavita Nair', status: 'TODO', priority: 'MEDIUM', startDate: '2026-11-02', dueDate: '2026-11-10', estimatedHours: 24, commentsCount: 0, createdBy: 'u2', createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' },
  { id: 'task8', title: 'API performance optimization', description: 'Optimize slow API endpoints identified in monitoring', projectId: 'p5', projectName: 'API Integration Hub', projectCode: 'API-005', assigneeId: 'u6', assigneeName: 'Sneha Joshi', status: 'BACKLOG', priority: 'LOW', startDate: '2026-10-15', dueDate: '2026-10-25', estimatedHours: 16, commentsCount: 1, createdBy: 'u7', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' },
  { id: 'task9', title: 'Review login screen design', description: 'Review and provide feedback on login screen mockup', projectId: 'p1', projectName: 'EmpFlow Pro', projectCode: 'EFP-001', assigneeId: 'u2', assigneeName: 'Priya Mehta', status: 'TODO', priority: 'MEDIUM', dueDate: '2026-10-16', estimatedHours: 2, commentsCount: 0, createdBy: 'u4', createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' },
  { id: 'task10', title: 'Setup CI/CD pipeline', description: 'Configure automated build and deployment pipeline', projectId: 'p1', projectName: 'EmpFlow Pro', projectCode: 'EFP-001', assigneeId: 'u3', assigneeName: 'Arjun Patel', status: 'TODO', priority: 'HIGH', dueDate: '2026-10-14', estimatedHours: 8, commentsCount: 0, createdBy: 'u7', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z' },
];

// ----------------------------------------------------------------
// MEETINGS
// ----------------------------------------------------------------
export const MOCK_MEETINGS: Meeting[] = [
  { id: 'm1', title: 'Sprint Planning — EmpFlow Pro', description: 'Plan tasks for the upcoming sprint', projectId: 'p1', projectName: 'EmpFlow Pro', type: 'PLANNING', status: 'SCHEDULED', date: '2026-10-13', startTime: '10:00', endTime: '11:30', organizerId: 'u2', organizerName: 'Priya Mehta', participants: [{ userId: 'u3', userName: 'Arjun Patel', status: 'ACCEPTED' }, { userId: 'u4', userName: 'Kavita Nair', status: 'ACCEPTED' }, { userId: 'u7', userName: 'Vikram Singh', status: 'ACCEPTED' }], meetingUrl: 'https://meet.google.com/mock-link', hasMinutes: false, actionItemCount: 0, createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'm2', title: 'Daily Standup — Engineering', type: 'STANDUP', status: 'SCHEDULED', date: '2026-10-13', startTime: '09:00', endTime: '09:15', organizerId: 'u7', organizerName: 'Vikram Singh', participants: [{ userId: 'u3', userName: 'Arjun Patel', status: 'ACCEPTED' }, { userId: 'u6', userName: 'Sneha Joshi', status: 'ACCEPTED' }], meetingUrl: 'https://meet.google.com/standup-eng', hasMinutes: false, actionItemCount: 0, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'm3', title: 'CRM Client Review', description: 'Review CRM progress with the client', projectId: 'p2', projectName: 'CRM Upgrade', type: 'REVIEW', status: 'COMPLETED', date: '2026-10-10', startTime: '14:00', endTime: '15:00', organizerId: 'u2', organizerName: 'Priya Mehta', participants: [{ userId: 'u5', userName: 'Ravi Kumar', status: 'ACCEPTED' }, { userId: 'u6', userName: 'Sneha Joshi', status: 'ACCEPTED' }], hasMinutes: true, actionItemCount: 3, createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'm4', title: 'Q4 Project Review', description: 'Review all Q4 project statuses and risks', type: 'GENERAL', status: 'SCHEDULED', date: '2026-10-15', startTime: '11:00', endTime: '12:30', organizerId: 'u1', organizerName: 'Rahul Sharma', participants: [{ userId: 'u2', userName: 'Priya Mehta', status: 'ACCEPTED' }, { userId: 'u7', userName: 'Vikram Singh', status: 'ACCEPTED' }], hasMinutes: false, actionItemCount: 0, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' },
  { id: 'm5', title: 'Mobile App Kickoff', description: 'Project kickoff for Mobile App v2', projectId: 'p3', projectName: 'Mobile App v2', type: 'PLANNING', status: 'SCHEDULED', date: '2026-10-14', startTime: '15:00', endTime: '16:00', organizerId: 'u7', organizerName: 'Vikram Singh', participants: [{ userId: 'u3', userName: 'Arjun Patel', status: 'ACCEPTED' }, { userId: 'u4', userName: 'Kavita Nair', status: 'PENDING' }], meetingUrl: 'https://meet.google.com/mob-kickoff', hasMinutes: false, actionItemCount: 0, createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
];

// ----------------------------------------------------------------
// MILESTONES
// ----------------------------------------------------------------
export const MOCK_MILESTONES: Milestone[] = [
  { id: 'ms1', projectId: 'p1', projectName: 'EmpFlow Pro', title: 'UI Design Completed', description: 'All screen designs approved', dueDate: '2026-10-20', ownerId: 'u4', ownerName: 'Kavita Nair', status: 'IN_PROGRESS' },
  { id: 'ms2', projectId: 'p1', projectName: 'EmpFlow Pro', title: 'Backend API Complete', description: 'All REST endpoints implemented', dueDate: '2026-11-15', ownerId: 'u7', ownerName: 'Vikram Singh', status: 'PENDING' },
  { id: 'ms3', projectId: 'p2', projectName: 'CRM Upgrade', title: 'Testing Phase Complete', description: 'All UAT tests passed', dueDate: '2026-10-25', ownerId: 'u5', ownerName: 'Ravi Kumar', status: 'IN_PROGRESS' },
  { id: 'ms4', projectId: 'p2', projectName: 'CRM Upgrade', title: 'Production Release', description: 'Deployment to production environment', dueDate: '2026-11-15', ownerId: 'u2', ownerName: 'Priya Mehta', status: 'PENDING' },
  { id: 'ms5', projectId: 'p5', projectName: 'API Integration Hub', title: 'Client Signoff', description: 'Final client approval received', dueDate: '2026-10-31', ownerId: 'u7', ownerName: 'Vikram Singh', status: 'IN_PROGRESS' },
];

// ----------------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------------
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'TASK_OVERDUE', title: 'Task Overdue', message: 'Fix critical CRM data sync bug is overdue', referenceType: 'TASK', referenceId: 'task4', isRead: false, createdAt: '2026-10-12T08:00:00Z' },
  { id: 'n2', userId: 'u1', type: 'MEETING_REMINDER', title: 'Meeting in 30 minutes', message: 'Sprint Planning — EmpFlow Pro starts soon', referenceType: 'MEETING', referenceId: 'm1', isRead: false, createdAt: '2026-10-13T09:30:00Z' },
  { id: 'n3', userId: 'u1', type: 'PROJECT_STAGE_CHANGED', title: 'Project Stage Changed', message: 'CRM Upgrade moved to Testing', referenceType: 'PROJECT', referenceId: 'p2', isRead: true, createdAt: '2026-10-09T14:00:00Z' },
  { id: 'n4', userId: 'u1', type: 'MILESTONE_DUE', title: 'Milestone Due Soon', message: 'UI Design Completed is due on Oct 20', referenceType: 'MILESTONE', referenceId: 'ms1', isRead: false, createdAt: '2026-10-12T09:00:00Z' },
  { id: 'n5', userId: 'u1', type: 'TASK_COMMENT', title: 'New Comment', message: 'Arjun Patel commented on JWT authentication task', referenceType: 'TASK', referenceId: 'task2', isRead: true, createdAt: '2026-10-11T16:30:00Z' },
];

// ----------------------------------------------------------------
// ACTIVITY
// ----------------------------------------------------------------
export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', userId: 'u3', userName: 'Arjun Patel', action: 'completed', target: 'Implement JWT authentication', targetType: 'TASK', targetId: 'task2', timestamp: '2026-10-11T15:30:00Z' },
  { id: 'a2', userId: 'u4', userName: 'Kavita Nair', action: 'updated status of', target: 'Design new login screen mockup', targetType: 'TASK', targetId: 'task1', timestamp: '2026-10-11T14:00:00Z' },
  { id: 'a3', userId: 'u2', userName: 'Priya Mehta', action: 'scheduled meeting', target: 'Sprint Planning — EmpFlow Pro', targetType: 'MEETING', targetId: 'm1', timestamp: '2026-10-10T11:00:00Z' },
  { id: 'a4', userId: 'u5', userName: 'Ravi Kumar', action: 'moved', target: 'UAT testing for CRM module 3 to In Review', targetType: 'TASK', targetId: 'task5', timestamp: '2026-10-12T10:00:00Z' },
  { id: 'a5', userId: 'u7', userName: 'Vikram Singh', action: 'created task', target: 'Mobile app architecture planning', targetType: 'TASK', targetId: 'task6', timestamp: '2026-10-10T09:00:00Z' },
];

// ----------------------------------------------------------------
// DASHBOARD DATA
// ----------------------------------------------------------------
export const MOCK_SUPER_ADMIN_DASHBOARD: SuperAdminDashboard = {
  kpis: [
    { id: 'k1', label: 'Active Projects', value: 5, icon: 'folder', color: '#2563EB', trend: 2, trendUp: true, route: '/projects' },
    { id: 'k2', label: 'Open Tasks', value: 42, icon: 'task_alt', color: '#06B6D4', trend: 5, trendUp: false, route: '/tasks' },
    { id: 'k3', label: 'Overdue Tasks', value: 3, icon: 'warning', color: '#DC2626', trend: 1, trendUp: false, route: '/tasks' },
    { id: 'k4', label: 'Completed This Week', value: 18, icon: 'check_circle', color: '#16A34A', trend: 4, trendUp: true, route: '/tasks' },
    { id: 'k5', label: 'Upcoming Meetings', value: 4, icon: 'videocam', color: '#6366F1', route: '/meetings' },
    { id: 'k6', label: 'Projects at Risk', value: 2, icon: 'error_outline', color: '#D97706', route: '/projects' },
  ],
  projectPipeline: [
    { stage: 'PROPOSED', count: 1, projects: [] },
    { stage: 'APPROVED', count: 1, projects: [] },
    { stage: 'PLANNING', count: 1, projects: [] },
    { stage: 'IN_PROGRESS', count: 1, projects: [] },
    { stage: 'TESTING', count: 1, projects: [] },
    { stage: 'CLIENT_REVIEW', count: 1, projects: [] },
  ],
  teamWorkload: [
    { userId: 'u3', userName: 'Arjun Patel', designation: 'Senior Developer', taskCount: 8, completedCount: 12, overdueCount: 0 },
    { userId: 'u4', userName: 'Kavita Nair', designation: 'UI/UX Designer', taskCount: 5, completedCount: 8, overdueCount: 1 },
    { userId: 'u5', userName: 'Ravi Kumar', designation: 'QA Engineer', taskCount: 6, completedCount: 10, overdueCount: 0 },
    { userId: 'u6', userName: 'Sneha Joshi', designation: 'Backend Developer', taskCount: 9, completedCount: 7, overdueCount: 2 },
  ],
  upcomingMeetings: MOCK_MEETINGS.filter(m => m.status === 'SCHEDULED').slice(0, 3),
  overdueTask: MOCK_TASKS.filter(t => t.status === 'BLOCKED'),
  recentActivity: MOCK_ACTIVITY,
  upcomingMilestones: MOCK_MILESTONES.filter(ms => ms.status !== 'COMPLETED').slice(0, 4),
};

export const MOCK_EMPLOYEE_DASHBOARD: EmployeeDashboard = {
  kpis: [
    { id: 'k1', label: 'Due Today', value: 2, icon: 'today', color: '#D97706', route: '/tasks/my-tasks' },
    { id: 'k2', label: 'In Progress', value: 3, icon: 'sync', color: '#2563EB', route: '/tasks/board' },
    { id: 'k3', label: 'Overdue', value: 1, icon: 'warning', color: '#DC2626', route: '/tasks/my-tasks' },
    { id: 'k4', label: 'Awaiting Review', value: 1, icon: 'rate_review', color: '#6366F1', route: '/tasks/review' },
  ],
  myTasks: MOCK_TASKS.filter(t => t.assigneeId === 'u3'),
  dueTodayTasks: MOCK_TASKS.filter(t => t.dueDate === '2026-10-13'),
  upcomingMeetings: MOCK_MEETINGS.filter(m => m.participants.some((p: any) => p.userId === 'u3')),
  notifications: MOCK_NOTIFICATIONS.slice(0, 4),
  recentProjectUpdates: MOCK_ACTIVITY.slice(0, 3),
  assignedActionItems: [],
};

export const MOCK_MEETING_MINUTES: MeetingMinutes = {
  id: 'min1',
  meetingId: 'm3',
  summary: 'CRM Upgrade project reviewed. Testing is 82% complete. A critical bug was identified in data sync.',
  decisions: '1. Bug fix to be prioritized this week. 2. Release date extended by one week.',
  discussionPoints: 'Team discussed testing coverage and identified gaps in edge case scenarios.',
  openQuestions: 'What is the rollback strategy if production deployment fails?',
  actionItems: [
    { id: 'ai1', meetingId: 'm3', description: 'Fix data sync bug', assigneeId: 'u6', assigneeName: 'Sneha Joshi', dueDate: '2026-10-15', priority: 'CRITICAL', projectId: 'p2', projectName: 'CRM Upgrade', status: 'IN_PROGRESS' },
    { id: 'ai2', meetingId: 'm3', description: 'Write rollback procedure documentation', assigneeId: 'u7', assigneeName: 'Vikram Singh', dueDate: '2026-10-17', priority: 'HIGH', projectId: 'p2', projectName: 'CRM Upgrade', status: 'OPEN' },
    { id: 'ai3', meetingId: 'm3', description: 'Re-run UAT after bug fix', assigneeId: 'u5', assigneeName: 'Ravi Kumar', dueDate: '2026-10-18', priority: 'HIGH', projectId: 'p2', projectName: 'CRM Upgrade', status: 'OPEN' },
  ],
  createdAt: '2026-10-10T16:00:00Z',
  updatedAt: '2026-10-10T16:30:00Z',
};

// ----------------------------------------------------------------
// SALES CRM MOCKS
// ----------------------------------------------------------------
export * from './sales.mock';
