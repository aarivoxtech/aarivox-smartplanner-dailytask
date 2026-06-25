import { Injectable, signal, computed, inject } from '@angular/core';
import { UserProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);

  // Signals for state
  private currentUserSignal = signal<UserProfile | null>(null);
  
  // Public read-only signals
  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => this.currentUserSignal() !== null);

  private firebaseAuth: any = null;

  constructor() {
    this.loadSession();
    this.initFirebase();
  }

  private loadSession() {
    const savedUser = localStorage.getItem('aarivox_current_user');
    if (savedUser) {
      try {
        this.currentUserSignal.set(JSON.parse(savedUser));
        // If logged in, initialize push notification listeners
        setTimeout(() => {
          this.notificationService.initPushNotifications();
        }, 1000);
      } catch (e) {
        this.logout();
      }
    }
  }

  private async initFirebase() {
    if (environment.firebase.apiKey && environment.firebase.apiKey !== 'YOUR_API_KEY') {
      try {
        const { initializeApp } = await import('firebase/app');
        const { getAuth } = await import('firebase/auth');
        const app = initializeApp(environment.firebase);
        this.firebaseAuth = getAuth(app);
        console.log('Firebase client SDK initialized successfully.');
      } catch (error) {
        console.warn('Firebase client SDK failed to load. Operating in Development Bypass mode.', error);
      }
    } else {
      console.log('Firebase credentials are placeholders. Operating in Development Bypass mode.');
    }
  }

  async login(email: string, password: string, rememberMe: boolean): Promise<boolean> {
    try {
      let idToken: string;

      // 1. Authenticate with Firebase if configured
      if (this.firebaseAuth) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
        idToken = await userCredential.user.getIdToken();
      } else {
        // Fallback bypass token for local dev/testing
        idToken = 'mock-token-' + email;
      }

      // 2. Synchronize with backend API and get JWT using the generic ApiService (pass password for DB verification)
      const backendResponse = await firstValueFrom(
        this.apiService.post<any>('auth/login', { idToken, password })
      );

      if (backendResponse && backendResponse.token) {
        // Save JWT to session and storage
        sessionStorage.setItem('aarivox_auth_token', backendResponse.token);
        localStorage.setItem('aarivox_auth_token', backendResponse.token);

        // Convert backend user profile to frontend model
        const user = backendResponse.user;
        const profile: UserProfile = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber || '',
          settings: {
            notificationsEnabled: true,
            alarmEnabled: true,
            alarmSound: 'Chime'
          }
        };

        this.currentUserSignal.set(profile);

        if (rememberMe) {
          localStorage.setItem('aarivox_current_user', JSON.stringify(profile));
        }

        // Initialize notification handlers
        this.notificationService.initPushNotifications();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login request failed: ', error);
      throw new Error(error.error || error.message || 'Authentication failed. Please verify your credentials.');
    }
  }

  async register(fullName: string, email: string, mobileNumber: string, password: string): Promise<boolean> {
    try {
      let idToken: string;

      // 1. Authenticate with Firebase if configured
      if (this.firebaseAuth) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
        idToken = await userCredential.user.getIdToken();
      } else {
        // Fallback bypass token for local dev/testing
        idToken = 'mock-token-' + email;
      }

      // 2. Register on backend database using the generic ApiService (pass password to store in DB)
      const backendResponse = await firstValueFrom(
        this.apiService.post<any>('auth/register', { 
          idToken, 
          fullName, 
          mobileNumber,
          password
        })
      );

      if (backendResponse && backendResponse.token) {
        // Automatically login the registered user session
        sessionStorage.setItem('aarivox_auth_token', backendResponse.token);
        localStorage.setItem('aarivox_auth_token', backendResponse.token);

        const user = backendResponse.user;
        const profile: UserProfile = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber || '',
          settings: {
            notificationsEnabled: true,
            alarmEnabled: true,
            alarmSound: 'Chime'
          }
        };

        this.currentUserSignal.set(profile);
        localStorage.setItem('aarivox_current_user', JSON.stringify(profile));
        
        // Initialize notifications
        this.notificationService.initPushNotifications();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Registration failed: ', error);
      throw new Error(error.error || error.message || 'Registration failed. User may already exist.');
    }
  }

  async updateProfile(fullName: string, mobileNumber: string, email?: string): Promise<boolean> {
    try {
      const current = this.currentUserSignal();
      if (!current) return false;

      const token = sessionStorage.getItem('aarivox_auth_token') || localStorage.getItem('aarivox_auth_token');
      if (token) {
        // Mock sync
        const updated: UserProfile = {
          ...current,
          fullName,
          mobileNumber,
          email: email || current.email
        };
        this.currentUserSignal.set(updated);
        localStorage.setItem('aarivox_current_user', JSON.stringify(updated));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update profile failed: ', error);
      return false;
    }
  }

  async updateSettings(settings: UserProfile['settings']): Promise<boolean> {
    const current = this.currentUserSignal();
    if (current) {
      const updated: UserProfile = {
        ...current,
        settings
      };
      this.currentUserSignal.set(updated);
      localStorage.setItem('aarivox_current_user', JSON.stringify(updated));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('aarivox_current_user');
    localStorage.removeItem('aarivox_auth_token');
    sessionStorage.removeItem('aarivox_auth_token');
  }
}
