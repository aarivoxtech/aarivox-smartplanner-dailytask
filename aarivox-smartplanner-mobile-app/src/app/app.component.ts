import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { GlobalLoaderComponent } from './shared/components/global-loader/global-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, GlobalLoaderComponent],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      <app-global-loader></app-global-loader>
    </ion-app>
  `
})
export class AppComponent {}
