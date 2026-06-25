import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Try retrieving the backend JWT token from sessionStorage or localStorage
  const token = sessionStorage.getItem('aarivox_auth_token') || localStorage.getItem('aarivox_auth_token');
  
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }
  
  return next(req);
};
