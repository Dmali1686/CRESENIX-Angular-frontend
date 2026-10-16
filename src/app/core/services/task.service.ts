import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map, BehaviorSubject, catchError, tap, throwError } from 'rxjs';
import {
  Task, CreateTaskRequest, UpdateTaskStatusRequest,
  TaskFilters, PaginatedResponse, ChecklistItem, TaskComment
} from '../../shared/models/index';
import { MOCK_TASKS } from '../mocks/index';
import { environment } from '../../../environments/environment';

export function mapBackendTask(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    projectId: t.project_id || undefined,
    projectName: t.project_name || '',
    projectCode: t.project_code || '',
    assigneeId: t.primary_assignee_id || undefined,
    assigneeName: t.assignee_name || '',
    assigneeAvatar: t.assignee_avatar || undefined,
    status: t.status,
    priority: t.priority,
    startDate: t.start_date ? t.start_date.split('T')[0] : undefined,
    dueDate: t.due_date ? t.due_date.split('T')[0] : '',
    estimatedHours: t.estimated_hours || 0,
    actualHours: t.actual_hours || undefined,
    completedAt: t.completed_at || undefined,
    reviewRequestedAt: t.review_requested_at || undefined,
    checklist: (t.checklist || []).map((c: any) => ({
      id: c.id,
      text: c.content || c.text || '',
      completed: c.is_done ?? c.completed ?? false
    })),
    assignees: (t.assignees || []).map((a: any) => ({
      userId: a.user_id,
      name: a.name || '',
      avatar: a.avatar || '',
      role: a.role || 'COLLABORATOR'
    })),
    commentsCount: t.comments_count || 0,
    isBlocked: t.is_blocked ?? false,
    blockedReason: t.blocked_reason || '',
    createdBy: t.created_by || '',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private tasks = new BehaviorSubject<Task[]>(environment.useBackendApi ? [] : MOCK_TASKS);
  tasks$ = this.tasks.asObservable();

  constructor() {
    if (environment.useBackendApi) {
      this.refreshTasks();
    }
  }

  refreshTasks(): void {
    this.http.get<{ data: any[]; total: number }>(`${environment.apiUrl}/tasks?page_size=100`).pipe(
      map(res => (res.data || []).map(mapBackendTask)),
      catchError(() => of([]))
    ).subscribe(list => {
      this.tasks.next(list || []);
    });
  }

  getTasks(filters?: TaskFilters): Observable<PaginatedResponse<Task>> {
    if (environment.useBackendApi) {
      let params = new HttpParams()
        .set('page', String(filters?.page ?? 1))
        .set('page_size', String(filters?.limit ?? 20));

      if (filters?.search) params = params.set('search', filters.search);
      if (filters?.status) params = params.set('status', filters.status);
      if (filters?.priority) params = params.set('priority', filters.priority);
      if (filters?.projectId) params = params.set('project_id', filters.projectId);
      if (filters?.assigneeId) params = params.set('assignee_id', filters.assigneeId);
      const sortVal = filters?.sort || filters?.sortBy;
      if (sortVal) params = params.set('sort', sortVal);

      return this.http.get<{ data: any[]; total: number; page: number; page_size: number; total_pages: number }>(
        `${environment.apiUrl}/tasks`, { params }
      ).pipe(
        map(res => ({
          data: (res.data || []).map(mapBackendTask),
          total: res.total,
          page: res.page,
          limit: res.page_size,
          totalPages: res.total_pages
        })),
        tap(paginated => {
          if (paginated.data.length > 0) {
            this.tasks.next(paginated.data);
          }
        }),
        catchError(() => this.fallbackGetTasks(filters))
      );
    }

    return this.fallbackGetTasks(filters);
  }

  private fallbackGetTasks(filters?: TaskFilters): Observable<PaginatedResponse<Task>> {
    return this.tasks$.pipe(
      map(all => {
        let filtered = [...all];
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.projectName?.toLowerCase().includes(q));
        }
        if (filters?.status) filtered = filtered.filter(t => t.status === filters.status);
        if (filters?.priority) filtered = filtered.filter(t => t.priority === filters.priority);
        if (filters?.projectId) filtered = filtered.filter(t => t.projectId === filters.projectId);
        if (filters?.assigneeId) filtered = filtered.filter(t => t.assigneeId === filters.assigneeId);
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

  getMyTasks(userId: string): Observable<Task[]> {
    if (environment.useBackendApi) {
      return this.http.get<{ data: any[] }>(`${environment.apiUrl}/tasks/my`).pipe(
        map(res => (res.data || []).map(mapBackendTask)),
        catchError(() => {
          return this.tasks$.pipe(map(all => all.filter(t => t.assigneeId === userId || t.createdBy === userId)));
        })
      );
    }

    return this.tasks$.pipe(
      map(all => all.filter(t => t.assigneeId === userId || t.createdBy === userId)),
      delay(200)
    );
  }

  getTaskById(id: string): Observable<Task | undefined> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/tasks/${id}`).pipe(
        map(res => mapBackendTask(res)),
        catchError(() => {
          const current = this.tasks.getValue();
          return of(current.find(t => t.id === id));
        })
      );
    }

    return this.tasks$.pipe(
      map(all => all.find(t => t.id === id)),
      delay(200)
    );
  }

  getTasksByProject(projectId: string): Observable<Task[]> {
    return this.getTasks({ projectId, limit: 100 }).pipe(
      map(res => res.data)
    );
  }

  createTask(request: CreateTaskRequest): Observable<Task> {
    if (environment.useBackendApi) {
      const payload = {
        title: request.title,
        description: request.description,
        project_id: request.projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.projectId) ? request.projectId : null,
        primary_assignee_id: request.assigneeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.assigneeId) ? request.assigneeId : null,
        assignee_ids: (request.assigneeIds || []).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)),
        priority: request.priority,
        status: request.status || 'BACKLOG',
        due_date: request.dueDate ? (request.dueDate.includes('T') ? request.dueDate : `${request.dueDate}T00:00:00Z`) : null,
        estimated_hours: request.estimatedHours || 0
      };

      return this.http.post<any>(`${environment.apiUrl}/tasks`, payload).pipe(
        map(res => {
          const created = mapBackendTask(res);
          const current = this.tasks.getValue();
          this.tasks.next([created, ...current]);
          return created;
        }),
        catchError(() => this.fallbackCreateTask(request))
      );
    }

    return this.fallbackCreateTask(request);
  }

  private fallbackCreateTask(request: CreateTaskRequest): Observable<Task> {
    const newTask: Task = {
      ...request,
      id: 'task_' + Date.now(),
      commentsCount: 0,
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Task;

    const current = this.tasks.getValue();
    this.tasks.next([newTask, ...current]);
    return of(newTask).pipe(delay(300));
  }

  updateTaskStatus(taskId: string, request: UpdateTaskStatusRequest): Observable<Task> {
    if (environment.useBackendApi) {
      const payload: any = { status: request.status };
      if (request.note) payload.comment = request.note;
      return this.http.patch<any>(`${environment.apiUrl}/tasks/${taskId}/status`, payload).pipe(
        map(res => {
          const updated = mapBackendTask(res);
          const current = this.tasks.getValue();
          const idx = current.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.tasks.next(next);
          }
          return updated;
        }),
        catchError(err => {
          if (err && err.status && err.status !== 0) {
            return throwError(() => err);
          }
          return this.fallbackUpdateStatus(taskId, request);
        })
      );
    }

    return this.fallbackUpdateStatus(taskId, request);
  }

  private fallbackUpdateStatus(taskId: string, request: UpdateTaskStatusRequest): Observable<Task> {
    const current = this.tasks.getValue();
    const idx = current.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');

    const updated = {
      ...current[idx],
      status: request.status,
      updatedAt: new Date().toISOString(),
      ...(request.status === 'DONE' ? { completedAt: new Date().toISOString() } : {})
    };
    const next = [...current];
    next[idx] = updated;
    this.tasks.next(next);
    return of(updated).pipe(delay(200));
  }

  updateTask(taskId: string, updates: Partial<Task>): Observable<Task> {
    if (environment.useBackendApi) {
      const payload: any = {};
      if (updates.title) payload.title = updates.title;
      if (updates.description) payload.description = updates.description;
      if (updates.assigneeId) payload.primary_assignee_id = updates.assigneeId;
      if (updates.status) payload.status = updates.status;
      if (updates.priority) payload.priority = updates.priority;
      if (updates.dueDate) payload.due_date = updates.dueDate.includes('T') ? updates.dueDate : `${updates.dueDate}T00:00:00Z`;

      return this.http.patch<any>(`${environment.apiUrl}/tasks/${taskId}`, payload).pipe(
        map(res => {
          const updated = mapBackendTask(res);
          const current = this.tasks.getValue();
          const idx = current.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.tasks.next(next);
          }
          return updated;
        }),
        catchError(err => {
          if (err && err.status && err.status !== 0) {
            return throwError(() => err);
          }
          return this.fallbackUpdateTask(taskId, updates);
        })
      );
    }

    return this.fallbackUpdateTask(taskId, updates);
  }

  addAssignee(taskId: string, userId: string, role = 'COLLABORATOR'): Observable<Task> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/tasks/${taskId}/assignees`, { user_id: userId, role }).pipe(
        map(res => {
          const updated = mapBackendTask(res);
          const current = this.tasks.getValue();
          const idx = current.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.tasks.next(next);
          }
          return updated;
        })
      );
    }
    return of(this.tasks.getValue().find(t => t.id === taskId)!);
  }

  removeAssignee(taskId: string, userId: string): Observable<Task> {
    if (environment.useBackendApi) {
      return this.http.delete<any>(`${environment.apiUrl}/tasks/${taskId}/assignees/${userId}`).pipe(
        map(res => {
          const updated = mapBackendTask(res);
          const current = this.tasks.getValue();
          const idx = current.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.tasks.next(next);
          }
          return updated;
        })
      );
    }
    return of(this.tasks.getValue().find(t => t.id === taskId)!);
  }

  private fallbackUpdateTask(taskId: string, updates: Partial<Task>): Observable<Task> {
    const current = this.tasks.getValue();
    const idx = current.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    const updated = { ...current[idx], ...updates, updatedAt: new Date().toISOString() };
    const next = [...current];
    next[idx] = updated;
    this.tasks.next(next);
    return of(updated).pipe(delay(200));
  }

  deleteTask(taskId: string): Observable<void> {
    if (environment.useBackendApi) {
      return this.http.delete<void>(`${environment.apiUrl}/tasks/${taskId}`).pipe(
        tap(() => {
          const current = this.tasks.getValue();
          this.tasks.next(current.filter(t => t.id !== taskId));
        }),
        catchError(() => {
          const current = this.tasks.getValue();
          this.tasks.next(current.filter(t => t.id !== taskId));
          return of(undefined);
        })
      );
    }

    const current = this.tasks.getValue();
    this.tasks.next(current.filter(t => t.id !== taskId));
    return of(undefined).pipe(delay(200));
  }

  getTasksByStatus(status: Task['status']): Observable<Task[]> {
    return this.tasks$.pipe(
      map(all => all.filter(t => t.status === status))
    );
  }

  getComments(taskId: string): Observable<TaskComment[]> {
    if (environment.useBackendApi) {
      return this.http.get<{ data: any[] }>(`${environment.apiUrl}/tasks/${taskId}/comments`).pipe(
        map(res => (res.data || []).map((c: any) => ({
          id: c.id,
          taskId: c.task_id,
          userId: c.author_id,
          userName: c.author_name || 'Anonymous',
          content: c.content,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }))),
        catchError(() => of([]))
      );
    }
    return of([]);
  }

  addComment(taskId: string, content: string): Observable<TaskComment> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/tasks/${taskId}/comments`, { content }).pipe(
        map(c => ({
          id: c.id,
          taskId: c.task_id,
          userId: c.author_id,
          userName: c.author_name || 'You',
          content: c.content,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }))
      );
    }
    const mockComment: TaskComment = {
      id: 'cm_' + Date.now(),
      taskId,
      userId: 'u1',
      userName: 'Rahul Sharma (You)',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return of(mockComment);
  }

  addChecklistItem(taskId: string, content: string): Observable<ChecklistItem> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/tasks/${taskId}/checklist`, { content }).pipe(
        map(c => ({
          id: c.id,
          text: c.content,
          completed: c.is_done
        }))
      );
    }
    return of({ id: 'chk_' + Date.now(), text: content, completed: false });
  }

  toggleChecklistItem(taskId: string, itemId: string): Observable<ChecklistItem> {
    if (environment.useBackendApi) {
      return this.http.patch<any>(`${environment.apiUrl}/tasks/${taskId}/checklist/${itemId}`, {}).pipe(
        map(c => ({
          id: c.id,
          text: c.content,
          completed: c.is_done
        }))
      );
    }
    return of({ id: itemId, text: '', completed: true });
  }

  deleteChecklistItem(taskId: string, itemId: string): Observable<void> {
    if (environment.useBackendApi) {
      return this.http.delete<void>(`${environment.apiUrl}/tasks/${taskId}/checklist/${itemId}`);
    }
    return of(undefined);
  }

  toggleChecklist(taskId: string, itemId: string): Observable<Task> {
    const current = this.tasks.getValue();
    const idx = current.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    const task = current[idx];
    const checklist = (task.checklist ?? []).map(c =>
      c.id === itemId ? { ...c, completed: !c.completed } : c
    );
    return this.updateTask(taskId, { checklist });
  }
}
