import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Checks both signal and temporary fallback token in case page reloaded
  if (authService.isAuthenticated() || sessionStorage.getItem('aarivox_auth_token')) {
    return true;
  }

  // User is not authenticated, redirect to login page
  router.navigate(['/login']);
  return false;
};
