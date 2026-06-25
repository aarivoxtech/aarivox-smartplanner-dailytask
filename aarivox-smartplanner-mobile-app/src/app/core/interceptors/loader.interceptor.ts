import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '../services/loader.service';
import { finalize } from 'rxjs';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  
  // Custom header to skip loader for silent/background tasks if needed
  const skipLoader = req.headers.has('X-Skip-Loader');
  const cleanHeaders = req.headers.delete('X-Skip-Loader');
  
  const clonedReq = req.clone({ headers: cleanHeaders });
  
  if (!skipLoader) {
    loaderService.show();
  }
  
  return next(clonedReq).pipe(
    finalize(() => {
      if (!skipLoader) {
        loaderService.hide();
      }
    })
  );
};
