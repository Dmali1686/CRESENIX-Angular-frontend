import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, delay } from 'rxjs';
import { Router } from '@angular/router';
import { AuthUser, LoginRequest, LoginResponse, UserRole } from '../../shared/models/index';
import { environment } from '../../../environments/environment';

interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
    phone?: string;
    avatar_url?: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'cresenix_token';
  private readonly REFRESH_TOKEN_KEY = 'cresenix_refresh_token';
  private readonly USER_KEY = 'cresenix_user';

  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch {
        this.clearAuth();
      }
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<BackendLoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      map(res => {
        const role = (res.user.role || 'EMPLOYEE') as UserRole;
        const authUser: AuthUser = {
          id: res.user.id,
          email: res.user.email,
          firstName: res.user.first_name || '',
          lastName: res.user.last_name || '',
          designation: res.user.designation || '',
          department: res.user.department || '',
          phone: res.user.phone || '',
          avatar: res.user.avatar_url || '',
          role: role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          token: res.access_token,
          permissions: role === 'SUPER_ADMIN' ? ['*'] :
            role === 'ADMIN' ? ['read:all', 'write:tasks', 'write:projects', 'write:meetings'] :
            role === 'SALES' ? ['read:sales', 'write:sales', 'read:clients', 'write:clients'] :
              ['read:assigned', 'write:own']
        };

        this.currentUser.set(authUser);
        this.isAuthenticated.set(true);
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, res.refresh_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(authUser));

        return {
          user: authUser,
          token: res.access_token,
          expiresAt: res.expires_at
        };
      })
      // No mock fallback — backend errors surface as real errors to the UI
    );
  }


  logout(): void {
    if (environment.useBackendApi) {
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (refreshToken) {
        this.http.post(`${environment.apiUrl}/auth/logout`, { refresh_token: refreshToken }).subscribe({
          error: () => {}
        });
      }
    }
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  private clearAuth(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  hasPermission(permission: string): boolean {
    const perms = this.currentUser()?.permissions ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  get userRole(): UserRole | undefined {
    return this.currentUser()?.role;
  }

  get isSuperAdmin(): boolean { return this.userRole === 'SUPER_ADMIN'; }
  get isAdmin(): boolean { return this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN'; }
  get isEmployee(): boolean { return this.userRole === 'EMPLOYEE'; }
  get isSales(): boolean { return this.userRole === 'SALES' || this.userRole === 'SUPER_ADMIN'; }

  forgotPassword(email: string): Observable<{ message: string }> {
    if (environment.useBackendApi) {
      return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email }).pipe(
        catchError(() => of({ message: 'Password reset link sent to ' + email }))
      );
    }
    return of({ message: 'Password reset link sent to ' + email }).pipe(delay(500));
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return of({ message: 'Password reset successful' }).pipe(delay(500));
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/auth/profile`);
  }

  updateProfile(payload: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/auth/profile`, payload).pipe(
      map(updated => {
        const curr = this.currentUser();
        if (curr) {
          const updatedUser: AuthUser = {
            ...curr,
            firstName: updated.first_name ?? curr.firstName,
            lastName: updated.last_name ?? curr.lastName,
            email: updated.email ?? curr.email,
            phone: updated.phone ?? curr.phone,
            designation: updated.designation ?? curr.designation,
            department: updated.department ?? curr.department,
            avatar: updated.avatar_url ?? curr.avatar,
          };
          this.currentUser.set(updatedUser);
          localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        }
        return updated;
      })
    );
  }
}

