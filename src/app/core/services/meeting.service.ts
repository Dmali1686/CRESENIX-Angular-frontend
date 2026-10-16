import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map, BehaviorSubject, catchError, tap } from 'rxjs';
import {
  Meeting, CreateMeetingRequest, MeetingFilters,
  PaginatedResponse, MeetingMinutes, MeetingActionItem
} from '../../shared/models/index';
import { MOCK_MEETINGS, MOCK_MEETING_MINUTES } from '../mocks/index';
import { environment } from '../../../environments/environment';

export function mapBackendMeeting(m: any): Meeting {
  const startD = m.start_time ? new Date(m.start_time) : new Date();
  const endD = m.end_time ? new Date(m.end_time) : new Date();

  const pad = (n: number) => n < 10 ? '0' + n : String(n);
  const year = startD.getFullYear();
  const month = pad(startD.getMonth() + 1);
  const day = pad(startD.getDate());
  const dateStr = `${year}-${month}-${day}`;
  const startTimeStr = `${pad(startD.getHours())}:${pad(startD.getMinutes())}`;
  const endTimeStr = `${pad(endD.getHours())}:${pad(endD.getMinutes())}`;

  return {
    id: m.id,
    title: m.title,
    description: m.description || '',
    projectId: m.project_id || undefined,
    projectName: m.project_name || '',
    type: m.meeting_type,
    status: m.status,
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    organizerId: m.organizer_id,
    organizerName: m.organizer_name || '',
    participants: (m.participants || []).map((p: any) => ({
      userId: p.user_id,
      userName: p.name || p.user_id,
      status: p.status || 'PENDING'
    })),
    location: m.location || '',
    meetingUrl: m.meeting_url || '',
    agenda: m.agenda || '',
    hasMinutes: false,
    actionItemCount: 0,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private http = inject(HttpClient);
  private meetings = new BehaviorSubject<Meeting[]>(environment.useBackendApi ? [] : MOCK_MEETINGS);
  meetings$ = this.meetings.asObservable();

  constructor() {
    if (environment.useBackendApi) {
      this.refreshMeetings();
    }
  }

  refreshMeetings(): void {
    this.http.get<{ data: any[]; total: number }>(`${environment.apiUrl}/meetings?page_size=100&sort=asc`).pipe(
      map(res => (res.data || []).map(mapBackendMeeting)),
      catchError(() => of([]))
    ).subscribe(list => {
      this.meetings.next(list || []);
    });
  }

  getMeetings(filters?: MeetingFilters): Observable<PaginatedResponse<Meeting>> {
    if (environment.useBackendApi) {
      let params = new HttpParams()
        .set('page', String(filters?.page ?? 1))
        .set('page_size', String(filters?.limit ?? 50));

      if (filters?.projectId) params = params.set('project_id', filters.projectId);
      if (filters?.status) params = params.set('status', filters.status);
      if (filters?.sort) params = params.set('sort', filters.sort);

      return this.http.get<{ data: any[]; total: number; page: number; page_size: number; total_pages: number }>(
        `${environment.apiUrl}/meetings`, { params }
      ).pipe(
        map(res => {
          let list = (res.data || []).map(mapBackendMeeting);
          if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(m => m.title.toLowerCase().includes(q));
          }
          if (filters?.type) list = list.filter(m => m.type === filters.type);
          if (filters?.status) list = list.filter(m => m.status === filters.status);

          return {
            data: list,
            total: res.total,
            page: res.page,
            limit: res.page_size,
            totalPages: res.total_pages
          };
        }),
        tap(paginated => {
          if (paginated.data.length > 0) {
            this.meetings.next(paginated.data);
          }
        }),
        catchError(() => this.fallbackGetMeetings(filters))
      );
    }

    return this.fallbackGetMeetings(filters);
  }

  private fallbackGetMeetings(filters?: MeetingFilters): Observable<PaginatedResponse<Meeting>> {
    return this.meetings$.pipe(
      map(all => {
        let filtered = [...all];
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(m => m.title.toLowerCase().includes(q));
        }
        if (filters?.type) filtered = filtered.filter(m => m.type === filters.type);
        if (filters?.status) filtered = filtered.filter(m => m.status === filters.status);
        if (filters?.projectId) filtered = filtered.filter(m => m.projectId === filters.projectId);
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

  getMeetingById(id: string): Observable<Meeting | undefined> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/meetings/${id}`).pipe(
        map(res => mapBackendMeeting(res)),
        catchError(() => {
          const current = this.meetings.getValue();
          return of(current.find(m => m.id === id));
        })
      );
    }

    return this.meetings$.pipe(
      map(all => all.find(m => m.id === id)),
      delay(200)
    );
  }

  scheduleMeeting(request: CreateMeetingRequest): Observable<Meeting> {
    if (environment.useBackendApi) {
      const startIso = new Date(`${request.date}T${request.startTime}:00`).toISOString();
      const endIso = new Date(`${request.date}T${request.endTime}:00`).toISOString();

      const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const validParticipants = (request.participantIds || []).filter(id => isUuid(id));

      let mType = request.type as string;
      if (mType === 'CLIENT_CALL') mType = 'CLIENT';
      if (mType === 'GENERAL') mType = 'OTHER';

      const payload = {
        title: request.title,
        description: request.description || '',
        project_id: isUuid(request.projectId) ? request.projectId : null,
        meeting_type: mType,
        start_time: startIso,
        end_time: endIso,
        location: request.location || '',
        meeting_url: request.meetingUrl || '',
        agenda: request.agenda || '',
        participant_ids: validParticipants
      };

      return this.http.post<any>(`${environment.apiUrl}/meetings`, payload).pipe(
        map(res => {
          const created = mapBackendMeeting(res);
          const current = this.meetings.getValue();
          this.meetings.next([created, ...current]);
          return created;
        }),
        tap(() => {
          this.refreshMeetings();
        }),
        catchError(() => this.fallbackScheduleMeeting(request))
      );
    }

    return this.fallbackScheduleMeeting(request);
  }

  private fallbackScheduleMeeting(request: CreateMeetingRequest): Observable<Meeting> {
    const newMeeting: Meeting = {
      ...request,
      id: 'm_' + Date.now(),
      status: 'SCHEDULED',
      participants: (request.participantIds ?? []).map(id => ({
        userId: id,
        userName: id,
        status: 'PENDING' as const
      })),
      hasMinutes: false,
      actionItemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const current = this.meetings.getValue();
    this.meetings.next([newMeeting, ...current]);
    return of(newMeeting).pipe(delay(300));
  }

  getMeetingMinutes(meetingId: string): Observable<MeetingMinutes> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/meetings/${meetingId}/minutes`).pipe(
        map(res => this.mapBackendMinutes(res)),
        catchError(() => of({
          id: '',
          meetingId,
          summary: '',
          decisions: '',
          discussionPoints: '',
          openQuestions: '',
          canEdit: false,
          actionItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as MeetingMinutes))
      );
    }
    return of({
      id: 'mock_min',
      meetingId,
      summary: '',
      decisions: '',
      discussionPoints: '',
      openQuestions: '',
      canEdit: true,
      actionItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveMeetingMinutes(meetingId: string, minutes: Partial<MeetingMinutes>): Observable<MeetingMinutes> {
    if (environment.useBackendApi) {
      const payload = {
        summary: minutes.summary || '',
        decisions: minutes.decisions || '',
        discussion_points: minutes.discussionPoints || '',
        open_questions: minutes.openQuestions || ''
      };

      return this.http.post<any>(`${environment.apiUrl}/meetings/${meetingId}/minutes`, payload).pipe(
        map(res => this.mapBackendMinutes(res)),
        catchError(() => this.fallbackSaveMinutes(meetingId, minutes))
      );
    }

    return this.fallbackSaveMinutes(meetingId, minutes);
  }

  addActionItem(meetingId: string, item: { description: string; assigneeId?: string; dueDate?: string; priority?: string; relatedProject?: string }): Observable<MeetingActionItem> {
    if (environment.useBackendApi) {
      const payload = {
        description: item.description,
        assignee_id: item.assigneeId,
        due_date: item.dueDate,
        priority: item.priority || 'MEDIUM',
        related_project: item.relatedProject
      };
      return this.http.post<any>(`${environment.apiUrl}/meetings/${meetingId}/action-items`, payload).pipe(
        map(res => this.mapBackendActionItem(res))
      );
    }
    const mockItem: MeetingActionItem = {
      id: 'ai_' + Date.now(),
      meetingId,
      description: item.description,
      assigneeId: item.assigneeId || '',
      dueDate: item.dueDate || '',
      priority: (item.priority as any) || 'MEDIUM',
      status: 'OPEN'
    };
    return of(mockItem);
  }

  deleteActionItem(meetingId: string, itemId: string): Observable<void> {
    if (environment.useBackendApi) {
      return this.http.delete<void>(`${environment.apiUrl}/meetings/${meetingId}/action-items/${itemId}`);
    }
    return of(undefined);
  }

  convertActionItemToTask(meetingId: string, itemId: string): Observable<{ actionItem: MeetingActionItem; taskId: string }> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/meetings/${meetingId}/action-items/${itemId}/convert`, {}).pipe(
        map(res => ({
          actionItem: this.mapBackendActionItem(res.action_item),
          taskId: res.task_id
        }))
      );
    }
    return of({
      actionItem: {
        id: itemId,
        meetingId,
        description: 'Mock Task',
        assigneeId: '',
        dueDate: '',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        convertedTaskId: 'mock_task_1'
      },
      taskId: 'mock_task_1'
    });
  }

  private mapBackendMinutes(res: any): MeetingMinutes {
    return {
      id: res.id || '',
      meetingId: res.meeting_id,
      summary: res.summary || '',
      decisions: res.decisions || '',
      discussionPoints: res.discussion_points || '',
      openQuestions: res.open_questions || '',
      recordedBy: res.recorded_by || undefined,
      recordedByName: res.recorded_by_name || undefined,
      canEdit: res.can_edit ?? true,
      actionItems: (res.action_items || []).map((ai: any) => this.mapBackendActionItem(ai)),
      createdAt: res.created_at || new Date().toISOString(),
      updatedAt: res.updated_at || new Date().toISOString()
    };
  }

  private mapBackendActionItem(ai: any): MeetingActionItem {
    return {
      id: ai.id,
      meetingId: ai.meeting_id,
      description: ai.description,
      assigneeId: ai.assignee_id || '',
      assigneeName: ai.assignee_name || '',
      dueDate: ai.due_date_str || (ai.due_date ? String(ai.due_date).substring(0, 10) : ''),
      priority: ai.priority || 'MEDIUM',
      status: ai.status || 'OPEN',
      projectId: ai.related_project || undefined,
      projectName: ai.project_name || undefined,
      convertedTaskId: ai.converted_task_id || undefined
    };
  }

  private fallbackSaveMinutes(meetingId: string, minutes: Partial<MeetingMinutes>): Observable<MeetingMinutes> {
    const saved: MeetingMinutes = {
      id: 'min_' + Date.now(),
      meetingId,
      actionItems: [],
      ...minutes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as MeetingMinutes;
    return of(saved).pipe(delay(200));
  }

  getUpcomingMeetings(userId?: string): Observable<Meeting[]> {
    return this.meetings$.pipe(
      map(all => all.filter(m => m.status === 'SCHEDULED'))
    );
  }

  addParticipant(meetingId: string, userId: string): Observable<Meeting> {
    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/meetings/${meetingId}/participants`, { user_id: userId }).pipe(
        map(res => {
          const updated = mapBackendMeeting(res);
          const current = this.meetings.getValue();
          const idx = current.findIndex(m => m.id === meetingId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.meetings.next(next);
          }
          return updated;
        }),
        tap(() => this.refreshMeetings())
      );
    }
    return of(this.meetings.getValue().find(m => m.id === meetingId)!);
  }

  removeParticipant(meetingId: string, userId: string): Observable<Meeting> {
    if (environment.useBackendApi) {
      return this.http.delete<any>(`${environment.apiUrl}/meetings/${meetingId}/participants/${userId}`).pipe(
        map(res => {
          const updated = mapBackendMeeting(res);
          const current = this.meetings.getValue();
          const idx = current.findIndex(m => m.id === meetingId);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.meetings.next(next);
          }
          return updated;
        }),
        tap(() => this.refreshMeetings())
      );
    }
    return of(this.meetings.getValue().find(m => m.id === meetingId)!);
  }

  getMeetingsByDate(date: string): Observable<Meeting[]> {
    return this.meetings$.pipe(
      map(all => all.filter(m => m.date === date))
    );
  }

  cancelMeeting(id: string): Observable<Meeting> {
    return this.updateMeeting(id, { status: 'CANCELLED' });
  }

  updateMeeting(id: string, updates: Partial<Meeting>): Observable<Meeting> {
    if (environment.useBackendApi) {
      const payload: any = {};
      if (updates.title) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status) payload.status = updates.status;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.meetingUrl !== undefined) payload.meeting_url = updates.meetingUrl;
      if (updates.agenda !== undefined) payload.agenda = updates.agenda;

      if (updates.date && updates.startTime) {
        payload.start_time = new Date(`${updates.date}T${updates.startTime}:00`).toISOString();
      }
      if (updates.date && updates.endTime) {
        payload.end_time = new Date(`${updates.date}T${updates.endTime}:00`).toISOString();
      }

      return this.http.patch<any>(`${environment.apiUrl}/meetings/${id}`, payload).pipe(
        map(res => {
          const updated = mapBackendMeeting(res);
          const current = this.meetings.getValue();
          const idx = current.findIndex(m => m.id === id);
          if (idx !== -1) {
            const next = [...current];
            next[idx] = updated;
            this.meetings.next(next);
          }
          return updated;
        }),
        catchError(() => this.fallbackUpdateMeeting(id, updates))
      );
    }

    return this.fallbackUpdateMeeting(id, updates);
  }

  private fallbackUpdateMeeting(id: string, updates: Partial<Meeting>): Observable<Meeting> {
    const current = this.meetings.getValue();
    const idx = current.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Meeting not found');
    const updated = { ...current[idx], ...updates, updatedAt: new Date().toISOString() };
    const next = [...current];
    next[idx] = updated;
    this.meetings.next(next);
    return of(updated).pipe(delay(200));
  }

  deleteMeeting(id: string): Observable<void> {
    if (environment.useBackendApi) {
      return this.http.delete<void>(`${environment.apiUrl}/meetings/${id}`).pipe(
        tap(() => {
          const current = this.meetings.getValue();
          this.meetings.next(current.filter(m => m.id !== id));
        }),
        catchError(() => {
          const current = this.meetings.getValue();
          this.meetings.next(current.filter(m => m.id !== id));
          return of(undefined);
        })
      );
    }

    const current = this.meetings.getValue();
    this.meetings.next(current.filter(m => m.id !== id));
    return of(undefined).pipe(delay(200));
  }
}
