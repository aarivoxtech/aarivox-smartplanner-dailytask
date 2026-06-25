import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred.';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side/network error
        errorMessage = `Network issue: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            // Check if the 401 is due to invalid credentials on login endpoint
            if (req.url.includes('/auth/login')) {
              errorMessage = typeof error.error === 'string' ? error.error : (error.error?.message || 'Invalid credentials.');
            } else {
              errorMessage = 'Session expired. Please log in again.';
              authService.logout();
              router.navigate(['/login']);
            }
            break;
          case 403:
            errorMessage = 'Access denied. You do not have permissions for this action.';
            break;
          case 404:
            errorMessage = 'The requested resource was not found on the server.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || `API error (${error.status}): ${error.message}`;
        }
      }

      console.error('API Error Intercepted:', error);
      
      // Dispatch alert to user's system inbox only for background/API system errors, not standard user login validation errors
      if (!req.url.includes('/auth/login')) {
        notificationService.addNotification(
          '⚠️ System Alert',
          errorMessage,
          'high'
        );
      }

      return throwError(() => new Error(errorMessage));
    })
  );
};
