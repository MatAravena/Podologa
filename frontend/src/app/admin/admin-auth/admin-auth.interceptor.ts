import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthService } from './admin-auth.service';
import { environment } from '../../../environments/environment';

export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuthService);
  const token = auth.token();

  // Only attach token to requests going to our API
  if (token && req.url.startsWith(environment.apiUrl)) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authReq);
  }
  return next(req);
};
