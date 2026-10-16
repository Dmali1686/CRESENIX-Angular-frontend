import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-page">
      <!-- Left Panel -->
      <div class="login-left">
        <div class="login-left-content">
          <div class="login-brand">
            <img src="/cresenix-logo.jpg" alt="CRESENIX SOLUTIONS" class="login-logo" />
          </div>
          <h1 class="login-tagline">Manage Projects.<br>Deliver Excellence.</h1>
          <p class="login-desc">
            The unified workspace for CRESENIX SOLUTIONS — streamlining tasks, projects, and meetings for every team member.
          </p>
          <div class="login-features">
            <div class="feature-pill">
              <span class="material-icons">task_alt</span>
              Task Management
            </div>
            <div class="feature-pill">
              <span class="material-icons">account_tree</span>
              Project Pipeline
            </div>
            <div class="feature-pill">
              <span class="material-icons">groups</span>
              Meetings
            </div>
          </div>
          <div class="login-visual">
            <div class="visual-card">
              <div class="vc-header">
                <span class="material-icons">analytics</span>
                <span>Q4 Overview</span>
              </div>
              <div class="vc-stats">
                <div class="vc-stat"><span class="vc-val">12</span><span class="vc-lbl">Projects</span></div>
                <div class="vc-stat"><span class="vc-val">84</span><span class="vc-lbl">Tasks</span></div>
                <div class="vc-stat"><span class="vc-val">94%</span><span class="vc-lbl">On Track</span></div>
              </div>
              <div class="vc-bar-group">
                <div class="vc-bar"><div class="vc-fill" style="width:82%;background:var(--color-cyan)"></div></div>
                <div class="vc-bar"><div class="vc-fill" style="width:65%;background:var(--color-blue)"></div></div>
                <div class="vc-bar"><div class="vc-fill" style="width:91%;background:var(--color-violet)"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel — Login Form -->
      <div class="login-right">
        <div class="login-form-wrap">
          <div class="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your CRESENIX workspace</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form" novalidate>
            <div class="form-group">
              <label for="email">Email Address <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-icons input-icon">email</span>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-control has-icon"
                  placeholder="you@cresenix.com"
                  autocomplete="email"
                  [class.error]="emailError"
                />
              </div>
              @if (emailError) {
                <span class="form-error"><span class="material-icons">error_outline</span>{{ emailError }}</span>
              }
            </div>

            <div class="form-group">
              <label for="password">Password <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-icons input-icon">lock</span>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  class="form-control has-icon has-icon-right"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  [class.error]="passwordError"
                />
                <button type="button" class="toggle-password" (click)="showPassword.update(v => !v)">
                  <span class="material-icons">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (passwordError) {
                <span class="form-error"><span class="material-icons">error_outline</span>{{ passwordError }}</span>
              }
            </div>

            <div class="form-row">
              <label class="checkbox-wrap">
                <input type="checkbox" formControlName="rememberMe" />
                <span>Remember me</span>
              </label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
            </div>

            @if (errorMsg()) {
              <div class="alert" [class.alert-error]="errorType() === 'credentials'" [class.alert-warning]="errorType() === 'server'">
                <span class="material-icons">{{ errorType() === 'server' ? 'cloud_off' : 'lock' }}</span>
                {{ errorMsg() }}
              </div>
            }

            <button type="submit" class="btn btn-gradient btn-lg login-btn" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span>
                Signing in...
              } @else {
                <span class="material-icons">login</span>
                Sign In
              }
            </button>
          </form>

          <p class="login-footer-note">
            © 2026 CRESENIX SOLUTIONS. Internal use only.
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  showPassword = signal(false);
  loading = signal(false);
  errorMsg = signal('');
  errorType = signal<'credentials' | 'server' | ''>('');

  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      rememberMe: [false]
    });
  }

  get emailError(): string {
    const ctrl = this.loginForm.get('email');
    if (ctrl?.invalid && ctrl.touched) {
      if (ctrl.errors?.['required']) return 'Email is required';
      if (ctrl.errors?.['email']) return 'Enter a valid email address';
    }
    return '';
  }

  get passwordError(): string {
    const ctrl = this.loginForm.get('password');
    if (ctrl?.invalid && ctrl.touched) {
      if (ctrl.errors?.['required']) return 'Password is required';
      if (ctrl.errors?.['minlength']) return 'Password must be at least 4 characters';
    }
    return '';
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMsg.set('');
    this.errorType.set('');

    const { email, password, rememberMe } = this.loginForm.value;
    this.auth.login({ email, password, rememberMe }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        if (status === 401 || status === 403) {
          this.errorType.set('credentials');
          this.errorMsg.set('Invalid email or password. Please check your credentials.');
        } else if (status === 0 || status >= 500) {
          this.errorType.set('server');
          this.errorMsg.set('Cannot reach the server. Please ensure the backend is running.');
        } else {
          this.errorType.set('credentials');
          this.errorMsg.set('Login failed. Please try again.');
        }
      }
    });
  }
}
