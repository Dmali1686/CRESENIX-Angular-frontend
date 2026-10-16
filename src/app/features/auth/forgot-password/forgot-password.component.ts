import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <img src="/cresenix-logo.jpg" alt="CRESENIX" class="auth-logo" />
        <h2>Forgot Password</h2>
        <p class="auth-desc">Enter your work email and we'll send you a reset link.</p>

        @if (!sent()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <div class="form-group">
              <label for="fp-email">Email Address <span class="required">*</span></label>
              <input id="fp-email" type="email" formControlName="email" class="form-control" placeholder="you@cresenix.com" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <span class="form-error"><span class="material-icons">error_outline</span>Enter a valid email</span>
              }
            </div>
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()" style="width:100%;justify-content:center">
              @if (loading()) { <span class="spinner"></span> Sending... } @else { Send Reset Link }
            </button>
          </form>
        } @else {
          <div class="success-state">
            <span class="material-icons success-icon">mark_email_read</span>
            <p>Check your inbox! We've sent a reset link to <strong>{{ form.get('email')?.value }}</strong>.</p>
          </div>
        }

        <a routerLink="/auth/login" class="back-link"><span class="material-icons">arrow_back</span> Back to Login</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--color-bg); padding:24px; }
    .auth-card { background:white; border-radius:16px; border:1px solid var(--color-border); box-shadow:var(--shadow-lg); padding:40px; width:100%; max-width:420px; text-align:center; }
    .auth-logo { height:48px; border-radius:8px; margin-bottom:20px; }
    h2 { font-size:1.5rem; font-weight:700; color:var(--color-navy); margin-bottom:8px; }
    .auth-desc { font-size:14px; color:var(--color-text-secondary); margin-bottom:28px; }
    .auth-form { text-align:left; }
    .success-state { padding:24px 0; .success-icon { font-size:56px; color:var(--color-success); display:block; margin-bottom:12px; } p { font-size:14px; color:var(--color-text-secondary); line-height:1.6; } }
    .back-link { display:inline-flex; align-items:center; gap:4px; margin-top:20px; font-size:13px; color:var(--color-blue); text-decoration:none; &:hover { text-decoration:underline; } .material-icons { font-size:16px; } }
    .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.4); border-top-color:white; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class ForgotPasswordComponent {
  sent = signal(false);
  loading = signal(false);
  form;
  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe(() => { this.loading.set(false); this.sent.set(true); });
  }
}
