import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = signal(0);
  
  // Computed signal to expose loader state reactively to OnPush components
  isLoading = computed(() => this.activeRequests() > 0);

  show() {
    this.activeRequests.update(count => count + 1);
  }

  hide() {
    this.activeRequests.update(count => Math.max(0, count - 1));
  }
}
