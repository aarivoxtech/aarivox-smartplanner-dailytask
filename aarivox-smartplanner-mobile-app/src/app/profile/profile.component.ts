import { Component, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonToggle, 
  IonSelect, 
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  phonePortraitOutline, 
  notificationsOutline, 
  volumeHighOutline, 
  logOutOutline, 
  createOutline, 
  saveOutline, 
  closeOutline,
  settingsOutline,
  analyticsOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-profile',
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
    IonIcon,
    IonToggle,
    IonSelect,
    IonSelectOption
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  isEditing = signal(false);

  profileForm: FormGroup;
  settingsForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      mobileNumber: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });

    this.settingsForm = this.fb.group({
      notificationsEnabled: [true],
      alarmEnabled: [true],
      alarmSound: ['Chime']
    });

    addIcons({
      personOutline,
      mailOutline,
      phonePortraitOutline,
      notificationsOutline,
      volumeHighOutline,
      logOutOutline,
      createOutline,
      saveOutline,
      closeOutline,
      settingsOutline,
      analyticsOutline,
      chevronForwardOutline
    });

    // React to changes in user profile and patch form values
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue({
          fullName: user.fullName,
          mobileNumber: user.mobileNumber,
          email: user.email
        });
        
        this.settingsForm.patchValue({
          notificationsEnabled: user.settings.notificationsEnabled,
          alarmEnabled: user.settings.alarmEnabled,
          alarmSound: user.settings.alarmSound
        }, { emitEvent: false }); // Avoid infinite triggers
      }
    });
  }

  toggleEdit() {
    this.isEditing.update(val => !val);
  }

  async saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { fullName, mobileNumber, email } = this.profileForm.value;
    const success = await this.authService.updateProfile(fullName, mobileNumber, email);
    if (success) {
      this.isEditing.set(false);
      alert('Profile updated successfully!');
    }
  }

  async onSettingChange() {
    const settings = this.settingsForm.value;
    await this.authService.updateSettings(settings);
  }

  onLogout() {
    if (confirm('Are you sure you want to log out?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
