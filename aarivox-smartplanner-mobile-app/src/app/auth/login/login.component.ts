import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonCheckbox, 
  IonIcon, 
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonCheckbox,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true]
    });

    addIcons({ eyeOutline, eyeOffOutline, mailOutline, lockClosedOutline });
  }

  togglePasswordVisibility() {
    this.showPassword.update(val => !val);
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      const success = await this.authService.login(email, password, rememberMe);
      if (success) {
        this.router.navigate(['/app/dashboard']);
      } else {
        this.errorMessage.set('Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred during login.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    alert('Reset link has been sent to your email address (mock implementation).');
  }
}
