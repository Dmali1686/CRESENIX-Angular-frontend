import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../../shared/models/index';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    this.router.navigate(['/auth/login']);
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: UserRole[] = route.data['roles'] ?? [];
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return false;
    }
    if (allowedRoles.length === 0) return true;
    const userRole = this.auth.userRole;
    if (userRole && allowedRoles.includes(userRole)) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.auth.isAuthenticated()) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}
