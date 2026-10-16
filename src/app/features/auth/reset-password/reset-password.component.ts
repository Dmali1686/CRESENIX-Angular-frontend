import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <img src="/cresenix-logo.jpg" alt="CRESENIX" class="auth-logo" />
        <h2>Reset Password</h2>
        <p class="auth-desc">Create a new password for your account.</p>
        @if (!done()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" text-align="left">
            <div class="form-group">
              <label for="np">New Password <span class="required">*</span></label>
              <input id="np" type="password" formControlName="password" class="form-control" placeholder="New password" />
            </div>
            <div class="form-group">
              <label for="cp">Confirm Password <span class="required">*</span></label>
              <input id="cp" type="password" formControlName="confirm" class="form-control" placeholder="Confirm password" />
              @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
                <span class="form-error"><span class="material-icons">error_outline</span>Passwords do not match</span>
              }
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center">Reset Password</button>
          </form>
        } @else {
          <div class="success-state">
            <span class="material-icons success-icon">check_circle</span>
            <p>Your password has been reset. <a routerLink="/auth/login">Sign in now →</a></p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-bg);padding:24px}.auth-card{background:white;border-radius:16px;border:1px solid var(--color-border);box-shadow:var(--shadow-lg);padding:40px;width:100%;max-width:400px;text-align:center}.auth-logo{height:48px;border-radius:8px;margin-bottom:20px}.auth-form{text-align:left}.success-state{padding:24px 0;.success-icon{font-size:56px;color:var(--color-success);display:block;margin-bottom:12px}p{font-size:14px;color:var(--color-text-secondary);a{color:var(--color-blue)}}}h2{font-size:1.5rem;font-weight:700;color:var(--color-navy);margin-bottom:8px}.auth-desc{font-size:14px;color:var(--color-text-secondary);margin-bottom:24px}`]
})
export class ResetPasswordComponent {
  done = signal(false);
  form;
  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({ password: ['', [Validators.required, Validators.minLength(8)]], confirm: ['', Validators.required] }, { validators: (g) => g.get('password')?.value !== g.get('confirm')?.value ? { mismatch: true } : null });
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.done.set(true);
  }
}
