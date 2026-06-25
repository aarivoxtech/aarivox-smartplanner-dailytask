import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  moonOutline, 
  sunnyOutline, 
  notificationsOutline, 
  volumeHighOutline,
  volumeMuteOutline,
  lockClosedOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  darkMode = signal(false);
  soundEnabled = signal(true);
  pushEnabled = signal(true);

  constructor() {
    addIcons({
      moonOutline,
      sunnyOutline,
      notificationsOutline,
      volumeHighOutline,
      volumeMuteOutline,
      lockClosedOutline
    });
  }

  ngOnInit() {
    const darkTheme = localStorage.getItem('aarivox_dark_theme') === 'true';
    this.darkMode.set(darkTheme);
    this.applyTheme(darkTheme);

    const sound = localStorage.getItem('aarivox_sound_enabled') !== 'false';
    this.soundEnabled.set(sound);

    const push = localStorage.getItem('aarivox_push_enabled') !== 'false';
    this.pushEnabled.set(push);
  }

  toggleTheme() {
    const nextVal = !this.darkMode();
    this.darkMode.set(nextVal);
    localStorage.setItem('aarivox_dark_theme', String(nextVal));
    this.applyTheme(nextVal);
  }

  private applyTheme(isDark: boolean) {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  toggleSound() {
    const nextVal = !this.soundEnabled();
    this.soundEnabled.set(nextVal);
    localStorage.setItem('aarivox_sound_enabled', String(nextVal));
  }

  togglePush() {
    const nextVal = !this.pushEnabled();
    this.pushEnabled.set(nextVal);
    localStorage.setItem('aarivox_push_enabled', String(nextVal));
  }
}
