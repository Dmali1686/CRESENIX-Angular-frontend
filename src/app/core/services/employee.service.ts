import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, BehaviorSubject, catchError, tap } from 'rxjs';
import { Employee, Team } from '../../shared/models/index';
import { MOCK_EMPLOYEES, MOCK_TEAMS } from '../mocks/index';
import { environment } from '../../../environments/environment';

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'SALES';
}

export function mapBackendUserToEmployee(u: any): Employee {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    designation: u.designation || '',
    department: u.department || '',
    role: u.role || 'EMPLOYEE',
    isActive: u.is_active ?? true,
    activeTaskCount: u.active_task_count ?? 0,
    completedTaskCount: u.completed_task_count ?? 0,
    onTimeDeliveryRate: u.on_time_delivery_rate ?? 100,
    assignedProjectIds: [],
    assignedProjectNames: u.assigned_project_names || [],
    joinedAt: u.created_at
  };
}

export function mapBackendTeam(t: any): Team {
  return {
    id: t.id,
    name: t.name,
    description: t.description || '',
    leadId: t.lead_id || '',
    leadName: t.lead_name || '',
    memberCount: t.member_count || 0,
    projectCount: 2,
    createdAt: t.created_at
  };
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private employees = new BehaviorSubject<Employee[]>(environment.useBackendApi ? [] : MOCK_EMPLOYEES);
  employees$ = this.employees.asObservable();

  constructor() {
    if (environment.useBackendApi) {
      this.refreshEmployees();
    }
  }

  refreshEmployees(): void {
    this.http.get<{ data: any[]; total: number }>(`${environment.apiUrl}/users?page_size=100`).pipe(
      map(res => (res.data || []).map(mapBackendUserToEmployee)),
      catchError(() => of([]))
    ).subscribe(list => {
      this.employees.next(list || []);
    });
  }

  getEmployees(search?: string): Observable<Employee[]> {
    if (environment.useBackendApi && search) {
      return this.http.get<{ data: any[] }>(`${environment.apiUrl}/users?search=${encodeURIComponent(search)}`).pipe(
        map(res => (res.data || []).map(mapBackendUserToEmployee)),
        catchError(() => this.fallbackFilter(search))
      );
    }

    return this.employees$.pipe(
      map(all => {
        if (!search) return all;
        const q = search.toLowerCase();
        return all.filter(e =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.designation?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q)
        );
      })
    );
  }

  private fallbackFilter(search: string): Observable<Employee[]> {
    const q = search.toLowerCase();
    const current = this.employees.getValue();
    return of(current.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    ));
  }

  getEmployeeById(id: string): Observable<Employee | undefined> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/users/${id}`).pipe(
        map(res => mapBackendUserToEmployee(res)),
        catchError(() => {
          const current = this.employees.getValue();
          return of(current.find(e => e.id === id));
        })
      );
    }

    return this.employees$.pipe(
      map(all => all.find(e => e.id === id)),
      delay(200)
    );
  }

  /**
   * createEmployee — POST /api/v1/users (SUPER_ADMIN only)
   * Adds the new user to the local list on success.
   */
  createEmployee(req: CreateEmployeeRequest): Observable<Employee> {
    const payload = {
      email: req.email,
      password: req.password,
      first_name: req.firstName,
      last_name: req.lastName,
      designation: req.designation,
      department: req.department,
      phone: req.phone,
      role: req.role
    };

    if (environment.useBackendApi) {
      return this.http.post<any>(`${environment.apiUrl}/users`, payload).pipe(
        map(res => mapBackendUserToEmployee(res)),
        tap(emp => {
          const current = this.employees.getValue();
          this.employees.next([emp, ...current]);
        }),
        catchError(err => {
          // Re-throw with parsed error message
          const msg = err?.error?.error || 'Failed to create user';
          throw new Error(msg);
        })
      );
    }

    // Mock fallback
    const mock: Employee = {
      id: 'emp_' + Date.now(),
      firstName: req.firstName,
      lastName: req.lastName,
      email: req.email,
      designation: req.designation,
      department: req.department,
      role: req.role,
      isActive: true,
      activeTaskCount: 0,
      assignedProjectIds: [],
      assignedProjectNames: [],
      joinedAt: new Date().toISOString()
    };
    const current = this.employees.getValue();
    this.employees.next([mock, ...current]);
    return of(mock).pipe(delay(400));
  }

  /**
   * updateEmployeeStatus — PATCH /api/v1/users/{id}
   * Toggle active/inactive.
   */
  updateEmployeeStatus(id: string, isActive: boolean): Observable<Employee> {
    if (environment.useBackendApi) {
      return this.http.patch<any>(`${environment.apiUrl}/users/${id}`, { is_active: isActive }).pipe(
        map(res => mapBackendUserToEmployee(res)),
        tap(updated => {
          const current = this.employees.getValue();
          this.employees.next(current.map(e => e.id === id ? updated : e));
        }),
        catchError(() => of(this.employees.getValue().find(e => e.id === id)!))
      );
    }
    const current = this.employees.getValue();
    const updated = current.map(e => e.id === id ? { ...e, isActive } : e);
    this.employees.next(updated);
    return of(updated.find(e => e.id === id)!).pipe(delay(200));
  }

  getTeams(): Observable<Team[]> {
    if (environment.useBackendApi) {
      return this.http.get<{ data: any[] }>(`${environment.apiUrl}/teams`).pipe(
        map(res => (res.data || []).map(mapBackendTeam)),
        catchError(() => of(MOCK_TEAMS))
      );
    }
    return of(MOCK_TEAMS).pipe(delay(200));
  }

  getTeamById(id: string): Observable<Team | undefined> {
    if (environment.useBackendApi) {
      return this.http.get<any>(`${environment.apiUrl}/teams/${id}`).pipe(
        map(res => mapBackendTeam(res)),
        catchError(() => of(MOCK_TEAMS.find(t => t.id === id)))
      );
    }
    return of(MOCK_TEAMS.find(t => t.id === id)).pipe(delay(200));
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName ? firstName.charAt(0) : ''}${lastName ? lastName.charAt(0) : ''}`.toUpperCase();
  }
}
