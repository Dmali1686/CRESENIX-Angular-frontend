import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map, catchError, BehaviorSubject, tap } from 'rxjs';
import {
  Project, CreateProjectRequest, ProjectFilters,
  PaginatedResponse, Milestone, CreateMilestonePayload
} from '../../shared/models/index';
import { MOCK_PROJECTS, MOCK_MILESTONES } from '../mocks/index';
import { environment } from '../../../environments/environment';

export function mapBackendProject(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description || '',
    type: (p.project_type || 'Internal') as any,
    clientOrDepartment: p.client_or_dept || '',
    managerId: p.manager_id || '',
    managerName: p.manager_name || '',
    teamId: p.team_id || undefined,
    teamName: p.team_name || undefined,
    priority: p.priority,
    stage: p.status,
    startDate: p.start_date ? p.start_date.split('T')[0] : '',
    targetDate: p.target_completion ? p.target_completion.split('T')[0] : '',
    progress: p.progress_percent || 0,
    openTaskCount: p.open_task_count || 0,
    totalTaskCount: p.open_task_count || 0,
    hasRisk: !!p.is_at_risk,
    riskLevel: p.is_at_risk ? 'MEDIUM' : undefined,
    memberCount: 3,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private projects = new BehaviorSubject<Project[]>(environment.useBackendApi ? [] : MOCK_PROJECTS);
  projects$ = this.projects.asObservable();

  constructor() {
    if (environment.useBackendApi) {
      this.refreshProjects();
    }
  }

  refreshProjects(): void {
    this.http.get<{ data: any[]; total: number }>(`${environment.apiUrl}/projects?page_size=100`).pipe(
      map(res => (res.data || []).map(mapBackendProject)),
      catchError(() => of([]))
    ).subscribe(list => {
      this.projects.next(list || []);
    });
  }

  getProjects(filters?: ProjectFilters): Observable<PaginatedResponse<Project>> {
    if (environment.useBackendApi) {
      let params = new HttpParams()
        .set('page', String(filters?.page ?? 1))
        .set('page_size', String(filters?.limit ?? 20));

      if (filters?.search) params = params.set('search', filters.search);
      if (filters?.stage) params = params.set('status', filters.stage);
      if (filters?.priority) params = params.set('priority', filters.priority);

      return this.http.get<{ data: any[]; total: number; page: number; page_size: number; total_pages: number }>(
        `${environment.apiUrl}/projects`, { params }
      ).pipe(
        map(res => {
          const mapped = (res.data || []).map(mapBackendProject);
          return {
            data: mapped,
            total: res.total,
            page: res.page,
            limit: res.page_size,
            totalPages: res.total_pages
          };
        }),
        tap(paginated => {
          if (paginated.data.length > 0) {
            this.projects.next(paginated.data);
          }
        }),
        catchError(() => this.fallbackGetProjects(filters))
      );
    }

    return this.fallbackGetProjects(filters);
  }

  private fallbackGetProjects(filters?: ProjectFilters): Observable<PaginatedResponse<Project>> {
    return this.projects$.pipe(
      map(all => {
        let filtered = [...all];
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
          );
        }
        if (filters?.stage) filtered = filtered.filter(p => p.stage === filters.stage);
        if (filters?.priority) filtered = filtered.filter(p => p.priority === filters.priority);
        if (filters?.managerId) filtered = filtered.filter(p => p.managerId === filters.managerId);
        if (filters?.teamId) filtered = filtered.filter(p => p.teamId === filters.teamId);
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 20;
        const start = (page - 1) * limit;
        return {
          data: filtered.slice(start, start + limit),
          total: filtered.length,
          page, limit,
          totalPages: Math.ceil(filtered.length / limit)
        };
      }),
      delay(200)
    );
  }

  getProjectById(id: string): Observable<Project | undefined> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/projects/${id}`).pipe(
        map(res => mapBackendProject(res)),
        catchError(() => {
          const current = this.projects.getValue();
          return of(current.find(p => p.id === id));
        })
      );
    }

    return this.projects$.pipe(
      map(all => all.find(p => p.id === id)),
      delay(200)
    );
  }

  createProject(request: CreateProjectRequest): Observable<Project> {
    if (environment.useBackendApi) {
      const payload = {
        name: request.name,
        code: request.code || 'PRJ-' + Math.floor(Math.random() * 1000),
        description: request.description,
        project_type: request.type || 'Internal',
        client_or_dept: request.clientOrDepartment,
        priority: request.priority,
        manager_id: request.managerId,
        team_id: request.teamId,
        start_date: request.startDate ? new Date(request.startDate).toISOString() : null,
        target_completion: request.targetDate ? new Date(request.targetDate).toISOString() : null
      };

      return this.http.post<any>(`${environment.apiUrl}/projects`, payload).pipe(
        map(res => {
          const project = mapBackendProject(res);
          const current = this.projects.getValue();
          this.projects.next([project, ...current]);
          return project;
        }),
        catchError(() => this.fallbackCreateProject(request))
      );
    }

    return this.fallbackCreateProject(request);
  }

  private fallbackCreateProject(request: CreateProjectRequest): Observable<Project> {
    const newProject: Project = {
      ...request,
      id: 'p_' + Date.now(),
      code: request.code ?? 'PRJ-' + Math.floor(Math.random() * 1000),
      progress: 0,
      openTaskCount: 0,
      totalTaskCount: 0,
      hasRisk: false,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Project;
    const current = this.projects.getValue();
    this.projects.next([newProject, ...current]);
    return of(newProject).pipe(delay(300));
  }

  updateProject(id: string, updates: Partial<Project>): Observable<Project> {
    if (environment.useBackendApi) {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.description) payload.description = updates.description;
      if (updates.stage) payload.status = updates.stage;
      if (updates.priority) payload.priority = updates.priority;
      if (updates.progress !== undefined) payload.progress_percent = updates.progress;
      if (updates.hasRisk !== undefined) payload.is_at_risk = updates.hasRisk;

      return this.http.patch<any>(`${environment.apiUrl}/projects/${id}`, payload).pipe(
        map(res => {
          const updated = mapBackendProject(res);
          const current = this.projects.getValue();
          const idx = current.findIndex(p => p.id === id);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.projects.next(next);
          }
          return updated;
        }),
        catchError(() => this.fallbackUpdateProject(id, updates))
      );
    }

    return this.fallbackUpdateProject(id, updates);
  }

  private fallbackUpdateProject(id: string, updates: Partial<Project>): Observable<Project> {
    const current = this.projects.getValue();
    const idx = current.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    const updated = { ...current[idx], ...updates, updatedAt: new Date().toISOString() };
    const next = [...current];
    next[idx] = updated;
    this.projects.next(next);
    return of(updated).pipe(delay(200));
  }

  deleteProject(id: string, passcode?: string): Observable<{ message: string }> {
    if (environment.useBackendApi) {
      const headers: { [header: string]: string } = {};
      if (passcode) {
        headers['X-Admin-Passcode'] = passcode;
      }
      return this.http.delete<{ message: string }>(`${environment.apiUrl}/projects/${id}`, {
        headers,
        params: passcode ? { passcode } : {}
      }).pipe(
        tap(() => {
          const current = this.projects.getValue();
          this.projects.next(current.filter(p => p.id !== id));
        })
      );
    }

    const current = this.projects.getValue();
    this.projects.next(current.filter(p => p.id !== id));
    return of({ message: 'project deleted successfully' });
  }

  getMilestones(projectId?: string): Observable<Milestone[]> {
    if (environment.useBackendApi) {
      const url = projectId
        ? `${environment.apiUrl}/milestones?project_id=${projectId}`
        : `${environment.apiUrl}/milestones`;
      return this.http.get<{ data: any[] }>(url).pipe(
        map(res => (res.data || []).map(this.mapMilestone)),
        catchError(err => {
          console.error('[CRESENIX DATA ENGINE] ❌ Error fetching milestones:', err);
          const filtered = projectId
            ? MOCK_MILESTONES.filter(m => m.projectId === projectId)
            : MOCK_MILESTONES;
          return of(filtered);
        })
      );
    }

    const filtered = projectId
      ? MOCK_MILESTONES.filter(m => m.projectId === projectId)
      : MOCK_MILESTONES;
    return of(filtered).pipe(delay(200));
  }

  updateMilestoneStatus(id: string, status: string): Observable<Milestone> {
    if (environment.useBackendApi) {
      return this.http.patch<any>(`${environment.apiUrl}/milestones/${id}/status`, { status }).pipe(
        map(res => this.mapMilestone(res.data || res))
      );
    }
    return of({ id, status } as any).pipe(delay(150));
  }

  createMilestone(payload: CreateMilestonePayload): Observable<Milestone> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/milestones`, payload).pipe(
        map(res => this.mapMilestone(res.data || res))
      );
    }
    const mockM: Milestone = {
      id: 'ms-' + Date.now(),
      projectId: payload.project_id,
      title: payload.name,
      description: payload.description,
      dueDate: payload.due_date,
      originalDueDate: payload.due_date,
      status: 'PENDING',
      scheduleCondition: 'ON_TRACK',
      completionRule: (payload.completion_rule as any) || 'ALL_TASKS_DONE',
      requiresApproval: payload.requires_approval ?? true,
      readyForVerification: false,
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      progressPercent: 0,
      ownerId: payload.owner_id || ''
    };
    return of(mockM).pipe(delay(200));
  }

  generateMilestonesFromTemplate(projectId: string, template: string): Observable<Milestone[]> {
    if (environment.useBackendApi) {
      return this.http.post<{ data: any[] }>(`${environment.apiUrl}/projects/${projectId}/milestones/generate`, { template }).pipe(
        map(res => (res.data || []).map(this.mapMilestone))
      );
    }
    return this.getMilestones(projectId);
  }

  private mapMilestone = (m: any): Milestone => {
    return {
      id: m.id,
      projectId: m.project_id,
      projectName: m.project_name || '',
      title: m.name || m.title || '',
      description: m.description || '',
      dueDate: m.due_date ? m.due_date.split('T')[0] : '',
      originalDueDate: m.original_due_date ? m.original_due_date.split('T')[0] : (m.due_date ? m.due_date.split('T')[0] : ''),
      ownerId: m.owner_id || '',
      ownerName: m.owner_name || '',
      status: m.status,
      scheduleCondition: m.schedule_condition || 'ON_TRACK',
      completionRule: m.completion_rule || 'ALL_TASKS_DONE',
      requiresApproval: m.requires_approval ?? true,
      readyForVerification: m.ready_for_verification ?? false,
      totalTasks: m.total_tasks ?? 0,
      completedTasks: m.completed_tasks ?? 0,
      blockedTasks: m.blocked_tasks ?? 0,
      progressPercent: m.progress_percent ?? 0,
      completedAt: m.completed_at,
      completedBy: m.completed_by,
      completedByName: m.completed_by_name || '',
    };
  };


  getProjectsByStage(): Observable<Record<string, Project[]>> {
    return this.projects$.pipe(
      map(all => {
        const groups: Record<string, Project[]> = {};
        all.forEach(p => {
          if (!groups[p.stage]) groups[p.stage] = [];
          groups[p.stage].push(p);
        });
        return groups;
      })
    );
  }
}
